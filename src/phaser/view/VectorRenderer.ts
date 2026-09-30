import Phaser from 'phaser';
import { getActiveShipFrame, getShipFrameWeaponIdentity } from '../../game/progression/shipFrames';
import { getDroneOrbitRadius } from '../../game/simulation/state';
import { getExplorationZone } from '../../game/simulation/zones';
import type { AsteroidState, AsteroidVariant, BossMinionState, BossType, BulletState, DroneState, FlameWaveState, GameState, LevelShockwaveState, ParticleState, SaucerState, ShipState, Vec2 } from '../../game/simulation/types';
import { balance } from '../../game/balance';
import { getSaucerTelegraphSeconds } from '../../game/simulation/systems/enemies';
import { getWorldViewScale } from '../../game/simulation/view';
import { MAX_ASTEROID_VISUAL_EVENTS } from '../../game/simulation/events';
import { SurvivalEventRenderer } from './SurvivalEventRenderer';
import {
  NIVITRON_HAND_DIAMOND_RADIUS,
  NIVITRON_HAND_GAME_SIZE,
  NIVITRON_HAND_ORIGIN,
  NIVITRON_HAND_TEXTURE_KEY,
  createNivitronHandDataUri
} from './nivitronHandShape';

const MAX_DETAILED_DRONES = 36;
const MAX_SWARM_DOTS = 42;
const SIMPLE_BULLET_THRESHOLD = 90;
const ASTEROID_FLASH_SECONDS = 0.22;
const ASTEROID_DESTROY_SECONDS = 0.38;

type AsteroidSnapshot = {
  hp: number;
  maxHp: number;
  position: Vec2;
  radius: number;
  variant: AsteroidVariant;
  bossType?: BossType;
};

type AsteroidFlash = AsteroidSnapshot & {
  startedAt: number;
  duration: number;
  kind: 'hit' | 'destroyed';
  damageRatio: number;
};

export class VectorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly nivitronHandImage: Phaser.GameObjects.Image;
  private readonly asteroidSnapshots = new Map<number, AsteroidSnapshot>();
  private readonly asteroidFlashes = new Map<number, AsteroidFlash>();
  private visualState: GameState | null = null;
  private visualZone = -1;
  private readonly survivalEventRenderer: SurvivalEventRenderer;

  constructor(private readonly scene: Phaser.Scene) {
    this.nivitronHandImage = scene.add.image(0, 0, '__MISSING');
    this.nivitronHandImage.setOrigin(NIVITRON_HAND_ORIGIN.x, NIVITRON_HAND_ORIGIN.y);
    this.nivitronHandImage.setDepth(0.95);
    this.nivitronHandImage.setVisible(false);

    if (scene.textures.exists(NIVITRON_HAND_TEXTURE_KEY)) {
      this.nivitronHandImage.setTexture(NIVITRON_HAND_TEXTURE_KEY);
    } else {
      scene.textures.once(`addtexture-${NIVITRON_HAND_TEXTURE_KEY}`, () => {
        this.nivitronHandImage.setTexture(NIVITRON_HAND_TEXTURE_KEY);
      });
      scene.textures.addBase64(NIVITRON_HAND_TEXTURE_KEY, createNivitronHandDataUri());
    }

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1);

    this.survivalEventRenderer = new SurvivalEventRenderer(this.graphics, {
      getViewScale: (state) => this.getViewScale(state),
      toScreenX: (state, worldX) => this.toScreenX(state, worldX),
      toScreenY: (state, worldY) => this.toScreenY(state, worldY),
      isCircleOnScreen: (state, worldX, worldY, radius) => this.isCircleOnScreen(state, worldX, worldY, radius),
      drawArcSegments: (x, y, radius, startAngle, arcLength, segments) =>
        this.drawArcSegments(x, y, radius, startAngle, arcLength, segments)
    });
  }

  clear(): void {
    this.graphics.clear();
    this.asteroidSnapshots.clear();
    this.asteroidFlashes.clear();
  }

  render(state: GameState, thrusting: boolean, swipeIndicator: { start: Vec2; current: Vec2; power: number; inverted?: boolean } | null = null): void {
    this.graphics.clear();
    this.nivitronHandImage.setVisible(false);
    const now = this.scene.time.now / 1000;
    this.updateAsteroidReadabilityState(state, now);
    this.drawZoneFieldTint(state);
    this.drawGridGlow(state);
    state.survivalEvents.forEach((event) => this.survivalEventRenderer.drawTimedEvent(state, event));

    state.asteroids.forEach((asteroid) => {
      if (this.isCircleOnScreen(state, asteroid.position.x, asteroid.position.y, asteroid.radius + 12)) {
        this.drawAsteroid(state, asteroid);
      }
    });
    state.hazards.forEach((hazard) => {
      if (this.isCircleOnScreen(state, hazard.position.x, hazard.position.y, hazard.radius + 18)) {
        this.survivalEventRenderer.drawHazard(state, hazard);
      }
    });
    this.drawAsteroidFlashes(state, now);
    state.bullets.forEach((bullet) => {
      if (this.isCircleOnScreen(state, bullet.position.x, bullet.position.y, bullet.radius + 8)) {
        this.drawBullet(state, bullet, state.bullets.length > SIMPLE_BULLET_THRESHOLD);
      }
    });
    state.particles.forEach((particle) => {
      if (this.isCircleOnScreen(state, particle.position.x, particle.position.y, particle.size + 4)) {
        this.drawParticle(state, particle);
      }
    });
    state.flameWaves.forEach((wave) => this.drawFlameWave(state, wave));
    state.levelShockwaves.forEach((shockwave) => this.drawLevelShockwave(state, shockwave));
    this.drawDrones(state);

    if (state.saucer?.alive) {
      this.drawSaucer(state, state.saucer);
    }
    state.bossMinions.forEach((minion) => this.drawBossMinion(state, minion));

    if (state.pendingBoss) {
      this.drawPendingBossWarning(state);
    }

    if (swipeIndicator) {
      this.drawSwipeImpulseIndicator(swipeIndicator);
    }

    if (state.ship.alive) {
      this.drawShipAuraWeapon(state);
      this.drawWraithPhaseShield(state);
      this.drawRunCardBarriers(state);
      this.drawShip(state, state.ship, thrusting);
    }
  }

  private drawGridGlow(state: GameState): void {
    const zone = getExplorationZone(state);
    this.graphics.lineStyle(1, zone.identity.accentColor, 0.012 + zone.identity.fieldTintAlpha * 0.12);
    const viewScale = this.getViewScale(state);
    const gap = 96 * viewScale;
    const xOffset = ((-state.camera.x * viewScale + state.width / 2) % gap + gap) % gap;
    const yOffset = ((-state.camera.y * viewScale + state.height / 2) % gap + gap) % gap;

    for (let x = xOffset; x < state.width; x += gap) {
      this.graphics.lineBetween(x, 0, x, state.height);
    }
    for (let y = yOffset; y < state.height; y += gap) {
      this.graphics.lineBetween(0, y, state.width, y);
    }
  }

  private drawZoneFieldTint(state: GameState): void {
    const zone = getExplorationZone(state);
    this.graphics.fillStyle(zone.identity.fieldTintColor, zone.identity.fieldTintAlpha);
    this.graphics.fillRect(0, 0, state.width, state.height);
  }

  private drawShip(state: GameState, ship: ShipState, thrusting: boolean): void {
    const blink = ship.invulnerableFor > 0 && Math.floor(ship.invulnerableFor * 14) % 2 === 0;
    if (blink) {
      return;
    }

    const viewScale = this.getViewScale(state);
    if (state.progression.activeShipFrameId === 'nivitron') {
      this.drawNivitronHand(state, ship, viewScale);
      this.drawNivitronTurret(state, ship);
    } else if (state.progression.activeShipFrameId === 'hisoka') {
      this.drawHisokaShip(state, ship, viewScale);
    } else {
      const frame = getActiveShipFrame(state.progression);
      const shipX = this.toScreenX(state, ship.position.x);
      const shipY = this.toScreenY(state, ship.position.y);
      const points = frame.shape
        .map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, ship.rotation, shipX, shipY));

      this.graphics.lineStyle(2, 0xf2fbff, 0.96);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
      this.graphics.closePath();
      this.graphics.strokePath();

      if (frame.id !== 'vector' && frame.rarity !== 'legendary') {
        this.graphics.fillStyle(0xf5fdff, 0.28);
        this.graphics.fillCircle(shipX, shipY, 4 * viewScale);
        this.graphics.lineStyle(1.2, 0xf5fdff, 0.72);
        this.graphics.strokeCircle(shipX, shipY, 4 * viewScale);
      }
    }

    if (state.progression.deflectorLevel > 0) {
      this.drawDeflector(state, ship);
    }

    this.drawShieldBubble(state, ship);

    if (thrusting) {
      const flameA = this.rotatePoint(-10 * viewScale, 6 * viewScale, ship.rotation, this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y));
      const flameB = this.rotatePoint((-24 - Math.random() * 9) * viewScale, 0, ship.rotation, this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y));
      const flameC = this.rotatePoint(-10 * viewScale, -6 * viewScale, ship.rotation, this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y));
      this.graphics.lineStyle(2, 0x9fdcff, 0.78);
      this.graphics.beginPath();
      this.graphics.moveTo(flameA.x, flameA.y);
      this.graphics.lineTo(flameB.x, flameB.y);
      this.graphics.lineTo(flameC.x, flameC.y);
      this.graphics.strokePath();
    }
  }

  private drawHisokaShip(state: GameState, ship: ShipState, viewScale: number): void {
    const shipX = this.toScreenX(state, ship.position.x);
    const shipY = this.toScreenY(state, ship.position.y);
    const hull = getActiveShipFrame(state.progression).shape
      .map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, ship.rotation, shipX, shipY));
    const inner = getActiveShipFrame(state.progression).shape
      .map((point) => this.rotatePoint(point.x * 0.52 * viewScale, point.y * 0.46 * viewScale, ship.rotation, shipX, shipY));
    const pulse = 0.5 + Math.sin(this.scene.time.now * 0.006) * 0.5;

    this.graphics.fillStyle(0xff4fd8, 0.08 + pulse * 0.04);
    this.graphics.beginPath();
    this.graphics.moveTo(hull[0].x, hull[0].y);
    hull.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(2, 0xff4fd8, 0.94);
    this.graphics.beginPath();
    this.graphics.moveTo(hull[0].x, hull[0].y);
    hull.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    this.graphics.lineStyle(1, 0xfff1a8, 0.34 + pulse * 0.2);
    this.graphics.beginPath();
    this.graphics.moveTo(inner[0].x, inner[0].y);
    inner.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    const topFang = this.rotatePoint(-7 * viewScale, -12 * viewScale, ship.rotation, shipX, shipY);
    const bottomFang = this.rotatePoint(-7 * viewScale, 12 * viewScale, ship.rotation, shipX, shipY);
    const nose = this.rotatePoint(16 * viewScale, 0, ship.rotation, shipX, shipY);
    this.graphics.lineStyle(2, 0xff8fe7, 0.58);
    this.graphics.lineBetween(topFang.x, topFang.y, nose.x, nose.y);
    this.graphics.lineBetween(bottomFang.x, bottomFang.y, nose.x, nose.y);

    const core = [
      { x: 2, y: -5 },
      { x: 7, y: 0 },
      { x: 2, y: 5 },
      { x: -4, y: 0 }
    ].map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, ship.rotation, shipX, shipY));
    this.graphics.fillStyle(0xfff1a8, 0.78);
    this.graphics.beginPath();
    this.graphics.moveTo(core[0].x, core[0].y);
    core.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.fillPath();
  }

  private drawShipAuraWeapon(state: GameState): void {
    if (getShipFrameWeaponIdentity(state.progression) !== 'aura') {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, state.ship.position.x);
    const y = this.toScreenY(state, state.ship.position.y);
    const pulse = 0.5 + Math.sin(this.scene.time.now * 0.0048) * 0.5;
    this.graphics.fillStyle(0xff8a4c, 0.18 + pulse * 0.08);
    this.graphics.fillCircle(x, y, 5.5 * viewScale);
    this.graphics.lineStyle(1, 0xfff1a8, 0.34 + pulse * 0.18);
    this.graphics.strokeCircle(x, y, 8 * viewScale);
  }

  private drawWraithPhaseShield(state: GameState): void {
    if (getShipFrameWeaponIdentity(state.progression) !== 'phase') {
      return;
    }

    const ship = state.ship;
    const flash = Math.max(0, Math.min(1, ship.phaseShieldFlashFor / balance.ship.phaseShieldFlashSeconds));
    const ready = ship.phaseShieldCooldown <= 0;
    if (!ready && flash <= 0) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, ship.position.x);
    const y = this.toScreenY(state, ship.position.y);
    const radius = balance.ship.phaseShieldRadius * viewScale;
    const pulse = 0.5 + Math.sin(this.scene.time.now * 0.0056) * 0.5;

    if (ready) {
      this.graphics.lineStyle(1, 0xbba4ff, 0.16 + pulse * 0.14);
      this.graphics.strokeCircle(x, y, radius * (0.92 + pulse * 0.05));
      this.graphics.lineStyle(1, 0xf2fbff, 0.08 + pulse * 0.08);
      this.drawArcSegments(x, y, radius * 0.72, -Math.PI * 0.7 + pulse * 0.2, Math.PI * 1.1, 7);
    }

    if (flash > 0) {
      this.graphics.fillStyle(0x8c6dff, 0.04 * flash);
      this.graphics.fillCircle(x, y, radius * (1.15 + (1 - flash) * 0.38));
      this.graphics.lineStyle(3, 0xf2fbff, 0.72 * flash);
      this.graphics.strokeCircle(x, y, radius * (1.05 + (1 - flash) * 0.34));
      this.graphics.lineStyle(1, 0xc9fff2, 0.42 * flash);
      this.drawArcSegments(x, y, radius * (0.82 + (1 - flash) * 0.22), -Math.PI * 0.95, Math.PI * 1.9, 9);
    }
  }

  private drawNivitronHand(state: GameState, ship: ShipState, viewScale: number): void {
    const targetSize = NIVITRON_HAND_GAME_SIZE * viewScale;
    const sourceWidth = this.nivitronHandImage.width || 96;
    this.nivitronHandImage
      .setPosition(this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y))
      .setRotation(ship.rotation + Math.PI / 2)
      .setScale(targetSize / sourceWidth)
      .setVisible(true);
  }

  private drawNivitronTurret(state: GameState, ship: ShipState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, ship.position.x);
    const y = this.toScreenY(state, ship.position.y);
    const radius = NIVITRON_HAND_DIAMOND_RADIUS * viewScale;
    const corners = [0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((offset) => ({
      x: x + Math.cos(ship.turretAngle + offset) * radius,
      y: y + Math.sin(ship.turretAngle + offset) * radius
    }));

    this.graphics.fillStyle(0x92dfff, 0.46);
    this.graphics.beginPath();
    this.graphics.moveTo(corners[0].x, corners[0].y);
    this.graphics.lineTo(corners[1].x, corners[1].y);
    this.graphics.lineTo(x, y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.fillStyle(0xf2fbff, 0.86);
    this.graphics.beginPath();
    this.graphics.moveTo(corners[2].x, corners[2].y);
    this.graphics.lineTo(corners[3].x, corners[3].y);
    this.graphics.lineTo(x, y);
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(2, 0x83ffdc, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => this.graphics.lineTo(corner.x, corner.y));
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  private drawDeflector(state: GameState, ship: ShipState): void {
    const level = state.progression.deflectorLevel;
    const viewScale = this.getViewScale(state);
    const shipX = this.toScreenX(state, ship.position.x);
    const shipY = this.toScreenY(state, ship.position.y);
    const nose = this.rotatePoint((26 + level * 2) * viewScale, 0, ship.rotation, shipX, shipY);
    const left = this.rotatePoint(12 * viewScale, (-10 - level) * viewScale, ship.rotation, shipX, shipY);
    const right = this.rotatePoint(12 * viewScale, (10 + level) * viewScale, ship.rotation, shipX, shipY);

    this.graphics.lineStyle(2, 0x83ffdc, 0.58);
    this.graphics.beginPath();
    this.graphics.moveTo(left.x, left.y);
    this.graphics.lineTo(nose.x, nose.y);
    this.graphics.lineTo(right.x, right.y);
    this.graphics.strokePath();

    this.graphics.lineStyle(1, 0xd8fff5, 0.22);
    const coneLeft = this.rotatePoint(5 * viewScale, (-16 - level) * viewScale, ship.rotation, shipX, shipY);
    const coneRight = this.rotatePoint(5 * viewScale, (16 + level) * viewScale, ship.rotation, shipX, shipY);
    this.graphics.beginPath();
    this.graphics.moveTo(coneLeft.x, coneLeft.y);
    this.graphics.lineTo(nose.x, nose.y);
    this.graphics.lineTo(coneRight.x, coneRight.y);
    this.graphics.strokePath();
  }

  private drawShieldBubble(state: GameState, ship: ShipState): void {
    const shield = state.shieldBubble;
    if (!shield.active && !shield.broken && shield.hitFlashFor <= 0) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const shipX = this.toScreenX(state, ship.position.x);
    const shipY = this.toScreenY(state, ship.position.y);
    const radius = (ship.radius + balance.ship.shieldBubbleRadius) * viewScale;
    const flash = Math.max(0, Math.min(1, shield.hitFlashFor / balance.ship.shieldBubbleHitFlashSeconds));

    if (shield.active) {
      this.graphics.lineStyle(2, 0x92dfff, 0.48 + flash * 0.32);
      this.graphics.strokeCircle(shipX, shipY, radius + flash * 8 * viewScale);
      this.graphics.lineStyle(1, 0xd8fff5, 0.2 + flash * 0.36);
      this.graphics.strokeCircle(shipX, shipY, radius * 0.88);
      if (flash > 0) {
        this.graphics.lineStyle(2, 0xfff1a8, 0.68 * flash);
        this.drawArcSegments(shipX, shipY, radius + 12 * viewScale * (1 - flash), -Math.PI * 0.85, Math.PI * 1.7, 8);
      }
      return;
    }

    if (flash > 0) {
      this.graphics.lineStyle(3, 0xd8fff5, 0.72 * flash);
      this.graphics.strokeCircle(shipX, shipY, radius + (1 - flash) * 18 * viewScale);
      this.graphics.lineStyle(1, 0x92dfff, 0.42 * flash);
      this.graphics.strokeCircle(shipX, shipY, radius * 0.72);
      return;
    }

    if (!shield.broken || shield.rechargeFor <= 0) {
      return;
    }

    const rechargeProgress = 1 - Math.max(0, Math.min(1, shield.rechargeFor / balance.ship.shieldBubbleRechargeSeconds));
    this.graphics.lineStyle(1, 0x92dfff, 0.14 + rechargeProgress * 0.18);
    this.drawArcSegments(shipX, shipY, radius, -Math.PI / 2, Math.PI * 2 * rechargeProgress, 10);
  }

  private drawRunCardBarriers(state: GameState): void {
    const charges = state.runCards.shieldCharges;
    if (charges <= 0) {
      return;
    }
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, state.ship.position.x);
    const y = this.toScreenY(state, state.ship.position.y);
    const baseRadius = (state.ship.radius + 25) * viewScale;
    for (let index = 0; index < Math.min(charges, 8); index += 1) {
      this.graphics.lineStyle(1.5, 0x92dfff, Math.max(0.24, 0.68 - index * 0.07));
      this.graphics.strokeCircle(x, y, baseRadius + index * 1.5);
    }
  }

  private drawArcSegments(x: number, y: number, radius: number, startAngle: number, arcLength: number, segments: number): void {
    if (arcLength <= 0) {
      return;
    }

    const segmentCount = Math.max(1, Math.ceil(segments * (arcLength / (Math.PI * 2))));
    for (let index = 0; index < segmentCount; index += 1) {
      const segmentStart = startAngle + (index / segmentCount) * arcLength;
      const segmentEnd = startAngle + ((index + 0.58) / segmentCount) * arcLength;
      this.graphics.beginPath();
      this.graphics.arc(x, y, radius, segmentStart, Math.min(startAngle + arcLength, segmentEnd));
      this.graphics.strokePath();
    }
  }

  private drawAsteroid(state: GameState, asteroid: AsteroidState): void {
    const viewScale = this.getViewScale(state);
    if (asteroid.burn && asteroid.burn.seconds > 0) {
      const x = this.toScreenX(state, asteroid.position.x);
      const y = this.toScreenY(state, asteroid.position.y);
      const phase = this.scene.time.now / 170 + asteroid.id;
      this.graphics.lineStyle(2, 0xff783f, 0.55 + Math.sin(phase) * 0.15);
      this.drawArcSegments(x, y, (asteroid.radius + 5) * viewScale, phase * 0.2, Math.PI * 2, 7);
    }
    if (asteroid.bossType) {
      this.drawBossShip(state, asteroid, viewScale);
      return;
    }

    const count = asteroid.shape.length;
    const points = asteroid.shape.map((scale, index) => {
      const angle = asteroid.rotation + (index / count) * Math.PI * 2;
      const radius = asteroid.radius * scale * viewScale;
      return {
        x: this.toScreenX(state, asteroid.position.x) + Math.cos(angle) * radius,
        y: this.toScreenY(state, asteroid.position.y) + Math.sin(angle) * radius
      };
    });
    const asteroidX = this.toScreenX(state, asteroid.position.x);
    const asteroidY = this.toScreenY(state, asteroid.position.y);

    const color = this.getAsteroidColor(asteroid);
    const strokeColor = color;
    this.graphics.fillStyle(0x060b0e, 0.9);
    this.graphics.fillPoints(points, true);
    this.graphics.lineStyle(asteroid.size === 'small' ? 1.4 : 1.7, strokeColor, 0.82);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    this.graphics.lineStyle(1, strokeColor, asteroid.variant === 'common' ? 0.16 : 0.26);
    for (let i = 0; i < count && asteroid.size !== 'small'; i += 4) {
      const point = points[i];
      const next = points[(i + 2) % count];
      const innerX = asteroidX + (point.x - asteroidX) * 0.35;
      const innerY = asteroidY + (point.y - asteroidY) * 0.35;
      this.graphics.lineBetween(point.x, point.y, innerX, innerY);
      this.graphics.lineBetween(innerX, innerY, next.x, next.y);
    }

    if (asteroid.hp < asteroid.maxHp) {
      const damageRatio = 1 - asteroid.hp / asteroid.maxHp;
      this.drawAsteroidCracks(asteroid, asteroidX, asteroidY, viewScale, damageRatio);
    }

    this.drawAsteroidVariantMark(state, asteroid, asteroidX, asteroidY, viewScale);
  }

  private updateAsteroidReadabilityState(state: GameState, now: number): void {
    if (state !== this.visualState || state.progression.currentZoneIndex !== this.visualZone) {
      this.asteroidSnapshots.clear();
      this.asteroidFlashes.clear();
      state.asteroidDestructionEvents.length = 0;
      this.visualState = state;
      this.visualZone = state.progression.currentZoneIndex;
    }
    const currentIds = new Set<number>();

    state.asteroids.forEach((asteroid) => {
      currentIds.add(asteroid.id);
      const previous = this.asteroidSnapshots.get(asteroid.id);
      if (previous && asteroid.hp < previous.hp) {
        this.asteroidFlashes.set(asteroid.id, {
          ...this.createAsteroidSnapshot(asteroid),
          startedAt: now,
          duration: ASTEROID_FLASH_SECONDS,
          kind: 'hit',
          damageRatio: Math.max(0.12, Math.min(1, (previous.hp - asteroid.hp) / Math.max(1, previous.maxHp)))
        });
      }
      if (previous) {
        previous.hp = asteroid.hp;
        previous.maxHp = asteroid.maxHp;
        previous.position.x = asteroid.position.x;
        previous.position.y = asteroid.position.y;
      } else {
        this.asteroidSnapshots.set(asteroid.id, this.createAsteroidSnapshot(asteroid));
      }
    });

    this.asteroidSnapshots.forEach((_snapshot, id) => {
      if (!currentIds.has(id)) {
        this.asteroidSnapshots.delete(id);
      }
    });

    state.asteroidDestructionEvents.splice(0).forEach((event) => {
        this.asteroidFlashes.set(event.id, {
          ...event,
          startedAt: now,
          duration: ASTEROID_DESTROY_SECONDS,
          kind: 'destroyed',
          damageRatio: 1
        });
    });

    this.asteroidFlashes.forEach((flash, id) => {
      if (now - flash.startedAt > flash.duration) {
        this.asteroidFlashes.delete(id);
      }
    });
  }

  private createAsteroidSnapshot(asteroid: AsteroidState): AsteroidSnapshot {
    return {
      hp: asteroid.hp,
      maxHp: asteroid.maxHp,
      position: { ...asteroid.position },
      radius: asteroid.radius,
      variant: asteroid.variant,
      bossType: asteroid.bossType
    };
  }

  private drawAsteroidFlashes(state: GameState, now: number): void {
    while (this.asteroidFlashes.size > MAX_ASTEROID_VISUAL_EVENTS) {
      this.asteroidFlashes.delete(this.asteroidFlashes.keys().next().value!);
    }
    this.asteroidFlashes.forEach((flash) => {
      if (!this.isCircleOnScreen(state, flash.position.x, flash.position.y, flash.radius + 38)) {
        return;
      }

      const elapsed = now - flash.startedAt;
      const progress = Math.max(0, Math.min(1, elapsed / flash.duration));
      const fade = 1 - progress;
      const viewScale = this.getViewScale(state);
      const x = this.toScreenX(state, flash.position.x);
      const y = this.toScreenY(state, flash.position.y);
      const color = flash.bossType ? this.getBossSecondaryColor(flash.bossType) : this.getAsteroidColor({ variant: flash.variant } as AsteroidState);

      if (flash.kind === 'destroyed') {
        this.graphics.lineStyle(1.5, color, 0.65 * fade * fade);
        this.drawArcSegments(x, y, flash.radius * (0.82 + progress * 0.64) * viewScale, flash.startedAt, Math.PI * 2, 5);
        return;
      }

      this.graphics.lineStyle(2, 0xfff1a8, (0.38 + flash.damageRatio * 0.42) * fade);
      this.graphics.strokeCircle(x, y, flash.radius * (0.46 + progress * 0.28) * viewScale);
      this.graphics.lineStyle(1, color, 0.34 * fade);
      this.graphics.strokeCircle(x, y, flash.radius * (0.78 + progress * 0.18) * viewScale);
    });
  }

  private drawAsteroidCracks(asteroid: AsteroidState, asteroidX: number, asteroidY: number, viewScale: number, damageRatio: number): void {
    const crackCount = Math.min(5, Math.max(2, Math.ceil(damageRatio * 5)));
    this.graphics.lineStyle(1, 0xfff1a8, 0.18 + damageRatio * 0.32);
    for (let index = 0; index < crackCount; index += 1) {
      const angle = asteroid.rotation + index * (Math.PI * 2 / crackCount) + 0.35;
      const inner = asteroid.radius * (0.16 + index * 0.035) * viewScale;
      const outer = asteroid.radius * (0.5 + damageRatio * 0.18) * viewScale;
      this.graphics.lineBetween(
        asteroidX + Math.cos(angle) * inner,
        asteroidY + Math.sin(angle) * inner,
        asteroidX + Math.cos(angle + 0.16) * outer,
        asteroidY + Math.sin(angle + 0.16) * outer
      );
    }
  }

  private getAsteroidColor(asteroid: AsteroidState): number {
    if (asteroid.variant === 'metallic') {
      return 0xf1f5ff;
    }
    if (asteroid.variant === 'crystal') {
      return 0xb48cff;
    }
    if (asteroid.variant === 'dense') {
      return 0xffc36f;
    }
    return 0xd8f4ff;
  }

  private drawAsteroidVariantMark(
    state: GameState,
    asteroid: AsteroidState,
    asteroidX: number,
    asteroidY: number,
    viewScale: number
  ): void {
    if (asteroid.variant === 'common') {
      return;
    }

    if (asteroid.variant === 'metallic') {
      this.graphics.lineStyle(1, 0xf1f5ff, 0.52);
      this.graphics.strokeCircle(asteroidX, asteroidY, asteroid.radius * 0.34 * viewScale);
      return;
    }

    if (asteroid.variant === 'crystal') {
      const shardTop = this.rotatePoint(0, -asteroid.radius * 0.34 * viewScale, asteroid.rotation, asteroidX, asteroidY);
      const shardRight = this.rotatePoint(asteroid.radius * 0.22 * viewScale, 0, asteroid.rotation, asteroidX, asteroidY);
      const shardBottom = this.rotatePoint(0, asteroid.radius * 0.34 * viewScale, asteroid.rotation, asteroidX, asteroidY);
      const shardLeft = this.rotatePoint(-asteroid.radius * 0.22 * viewScale, 0, asteroid.rotation, asteroidX, asteroidY);
      this.graphics.lineStyle(1, 0xd9c7ff, 0.68);
      this.graphics.beginPath();
      this.graphics.moveTo(shardTop.x, shardTop.y);
      this.graphics.lineTo(shardRight.x, shardRight.y);
      this.graphics.lineTo(shardBottom.x, shardBottom.y);
      this.graphics.lineTo(shardLeft.x, shardLeft.y);
      this.graphics.closePath();
      this.graphics.strokePath();
      return;
    }

    this.graphics.lineStyle(2, 0xffc36f, 0.5);
    this.graphics.strokeCircle(asteroidX, asteroidY, asteroid.radius * 0.72 * viewScale);
    this.graphics.strokeCircle(asteroidX, asteroidY, asteroid.radius * 0.44 * viewScale);
  }

  private drawBossShip(state: GameState, boss: AsteroidState, viewScale: number): void {
    const x = this.toScreenX(state, boss.position.x);
    const y = this.toScreenY(state, boss.position.y);
    const scale = (boss.radius / 70) * viewScale;
    const primary = this.getBossPrimaryColor(boss.bossType);
    const secondary = this.getBossSecondaryColor(boss.bossType);
    const hull = boss.bossType === 'sentinel'
      ? [
          { x: 34, y: 0 },
          { x: 8, y: -24 },
          { x: -26, y: -18 },
          { x: -42, y: 0 },
          { x: -26, y: 18 },
          { x: 8, y: 24 }
        ]
      : boss.bossType === 'mothership'
      ? [
          { x: 44, y: 0 },
          { x: 22, y: -19 },
          { x: -34, y: -24 },
          { x: -70, y: -12 },
          { x: -86, y: 0 },
          { x: -70, y: 12 },
          { x: -34, y: 24 },
          { x: 22, y: 19 }
        ]
      : boss.bossType === 'prism'
        ? [
            { x: 38, y: 0 },
            { x: 12, y: -30 },
            { x: -18, y: -20 },
            { x: -38, y: 0 },
            { x: -18, y: 20 },
            { x: 12, y: 30 }
          ]
        : [
            { x: 40, y: 0 },
            { x: 12, y: -18 },
            { x: -18, y: -30 },
            { x: -48, y: -8 },
            { x: -48, y: 8 },
            { x: -18, y: 30 },
            { x: 12, y: 18 }
          ];
    const points = hull.map((point) => this.rotatePoint(point.x * scale, point.y * scale, boss.rotation, x, y));

    this.graphics.fillStyle(primary, 0.12);
    this.graphics.lineStyle(3, secondary, 0.88);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();

    const core = this.rotatePoint(5 * scale, 0, boss.rotation, x, y);
    this.graphics.fillStyle(primary, 0.75);
    this.graphics.fillCircle(core.x, core.y, 8 * scale);
    this.graphics.lineStyle(2, primary, 0.42);
    this.graphics.strokeCircle(core.x, core.y, 18 * scale);

    const leftWing = this.rotatePoint(-20 * scale, -20 * scale, boss.rotation, x, y);
    const rightWing = this.rotatePoint(-20 * scale, 20 * scale, boss.rotation, x, y);
    this.graphics.lineStyle(2, primary, 0.56);
    this.graphics.lineBetween(leftWing.x, leftWing.y, rightWing.x, rightWing.y);
    if (boss.bossType === 'mothership') {
      this.drawMothershipClaws(state, boss, x, y, scale, viewScale, primary, secondary);
    }

    if (boss.hp < boss.maxHp) {
      const alpha = 0.26 + (1 - boss.hp / boss.maxHp) * 0.34;
      this.graphics.lineStyle(2, 0xfff1a8, alpha);
      this.graphics.strokeCircle(x, y, boss.radius * 0.72 * viewScale);
    }

    if (boss.bossType === 'mothership' && (boss.bossTelegraphFor ?? 0) > 0) {
      this.drawMothershipTelegraph(state, boss, x, y, viewScale);
    }
    if (boss.bossType === 'sentinel' && boss.bossTelegraphKind === 'sentinelVolley' && (boss.bossTelegraphFor ?? 0) > 0) {
      this.drawSentinelTelegraph(boss, x, y, viewScale);
    }
    if (boss.bossType === 'crusher' && boss.bossTelegraphKind === 'crusherShockwave' && (boss.bossTelegraphFor ?? 0) > 0) {
      this.drawCrusherTelegraph(boss, x, y, viewScale);
    }
    if (boss.bossType === 'mothership' && (boss.bossBeamFor ?? 0) > 0) {
      this.drawMothershipBeam(state, boss, x, y, viewScale);
    }
  }

  private drawCrusherTelegraph(boss: AsteroidState, x: number, y: number, viewScale: number): void {
    const warn = 0.36 + 0.36 * Math.abs(Math.sin((boss.bossTelegraphFor ?? 0) * 13));
    const phase = boss.bossPhase ?? 1;
    const radius = boss.radius * (1.02 + phase * 0.16) * viewScale;
    this.graphics.lineStyle(4, 0xff8b6b, warn);
    this.graphics.strokeCircle(x, y, radius);
    this.graphics.lineStyle(2, 0xfff1a8, warn * 0.52);
    this.graphics.strokeCircle(x, y, radius * 0.72);
    if (phase >= 3) {
      this.graphics.lineStyle(1, 0xff8b6b, warn * 0.34);
      this.graphics.strokeCircle(x, y, radius * 1.24);
    }
  }

  private drawSentinelTelegraph(boss: AsteroidState, x: number, y: number, viewScale: number): void {
    const aim = boss.bossAimAngle ?? 0;
    const warn = 0.38 + 0.38 * Math.abs(Math.sin((boss.bossTelegraphFor ?? 0) * 16));
    const length = boss.radius * 3.2 * viewScale;
    this.graphics.lineStyle(3, 0x83ffdc, warn);
    this.graphics.lineBetween(x, y, x + Math.cos(aim) * length, y + Math.sin(aim) * length);
    if ((boss.bossPhase ?? 1) <= 1) {
      return;
    }

    const spread = (boss.bossPhase ?? 1) >= 3 ? 0.24 : 0.16;
    this.graphics.lineStyle(1, 0xd8fff5, warn * 0.58);
    this.graphics.lineBetween(x, y, x + Math.cos(aim - spread / 2) * length, y + Math.sin(aim - spread / 2) * length);
    this.graphics.lineBetween(x, y, x + Math.cos(aim + spread / 2) * length, y + Math.sin(aim + spread / 2) * length);
  }

  private drawMothershipTelegraph(state: GameState, boss: AsteroidState, x: number, y: number, viewScale: number): void {
    const warn = 0.32 + 0.42 * Math.abs(Math.sin((boss.bossTelegraphFor ?? 0) * 12));
    const warnColor = 0xff5cc8;
    const muzzle = this.getMothershipMuzzleScreenPosition(state, boss, viewScale);

    if (boss.bossTelegraphKind === 'beam') {
      const aim = boss.bossAimAngle ?? 0;
      const length = Math.max(window.innerWidth, window.innerHeight) * 0.8;
      this.graphics.lineStyle(7, warnColor, warn);
      this.graphics.lineBetween(x, y, x + Math.cos(aim) * length, y + Math.sin(aim) * length);
      return;
    }

    if (boss.bossTelegraphKind === 'aimedFan') {
      const aim = boss.bossAimAngle ?? 0;
      const length = boss.radius * 1.35 * viewScale;
      const spread = balance.bosses.mothership.fanSpreadRadians;
      this.graphics.lineStyle(2, warnColor, warn * 0.66);
      this.graphics.lineBetween(muzzle.x, muzzle.y, muzzle.x + Math.cos(aim) * length, muzzle.y + Math.sin(aim) * length);
      this.graphics.lineStyle(1, 0xffd0f0, warn * 0.42);
      this.graphics.lineBetween(muzzle.x, muzzle.y, muzzle.x + Math.cos(aim - spread / 2) * length, muzzle.y + Math.sin(aim - spread / 2) * length);
      this.graphics.lineBetween(muzzle.x, muzzle.y, muzzle.x + Math.cos(aim + spread / 2) * length, muzzle.y + Math.sin(aim + spread / 2) * length);
      return;
    }

    if (boss.bossTelegraphKind === 'summon') {
      const phase = boss.bossPhase ?? 1;
      const count = phase >= 3 ? 4 : 2;
      const forward = {
        x: Math.cos(boss.rotation),
        y: Math.sin(boss.rotation)
      };
      const side = {
        x: -forward.y,
        y: forward.x
      };
      const spacing = 34 * viewScale;
      const portalRadius = 12 * viewScale;
      this.graphics.lineStyle(2, 0xfff1a8, warn * 0.46);
      for (let index = 0; index < count; index += 1) {
        const lane = index - (count - 1) / 2;
        const portal = {
          x: muzzle.x + side.x * lane * spacing - forward.x * 18 * viewScale,
          y: muzzle.y + side.y * lane * spacing - forward.y * 18 * viewScale
        };
        this.graphics.lineStyle(2, 0xfff1a8, warn * 0.46);
        this.graphics.lineBetween(portal.x, portal.y, muzzle.x, muzzle.y);
        this.graphics.lineStyle(3, warnColor, warn * 0.82);
        this.graphics.strokePoints([
          { x: portal.x + forward.x * portalRadius, y: portal.y + forward.y * portalRadius },
          { x: portal.x + side.x * portalRadius * 0.8, y: portal.y + side.y * portalRadius * 0.8 },
          { x: portal.x - forward.x * portalRadius, y: portal.y - forward.y * portalRadius },
          { x: portal.x - side.x * portalRadius * 0.8, y: portal.y - side.y * portalRadius * 0.8 }
        ], true, true);
        this.graphics.fillStyle(0xff5cc8, warn * 0.16);
        this.graphics.fillCircle(portal.x, portal.y, portalRadius * 0.48);
      }
      this.graphics.lineStyle(2, 0xffd0f0, warn * 0.54);
      this.graphics.strokeCircle(muzzle.x, muzzle.y, 18 * viewScale);
      return;
    }

    this.graphics.lineStyle(3, warnColor, warn);
    this.graphics.strokeCircle(muzzle.x, muzzle.y, Math.min(boss.radius * 0.62 * viewScale, Math.max(window.innerWidth, window.innerHeight) * 0.32));
  }

  private drawMothershipClaws(
    state: GameState,
    boss: AsteroidState,
    x: number,
    y: number,
    scale: number,
    viewScale: number,
    primary: number,
    secondary: number
  ): void {
    const point = (px: number, py: number): Vec2 => this.rotatePoint(px * scale, py * scale, boss.rotation, x, y);
    const drawClawPlate = (coords: Vec2[], fillAlpha: number): void => {
      this.graphics.fillStyle(primary, fillAlpha);
      this.graphics.lineStyle(2, secondary, 0.78);
      this.graphics.beginPath();
      this.graphics.moveTo(coords[0].x, coords[0].y);
      coords.slice(1).forEach((coord) => this.graphics.lineTo(coord.x, coord.y));
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();
    };

    const topArmStart = point(6, -14);
    const topArmJoint = point(36, -36);
    const topClawInner = point(64, -20);
    const bottomArmStart = point(6, 14);
    const bottomArmJoint = point(36, 36);
    const bottomClawInner = point(64, 20);
    const muzzle = this.getMothershipMuzzleScreenPosition(state, boss, viewScale);

    this.graphics.lineStyle(3, secondary, 0.62);
    this.graphics.lineBetween(topArmStart.x, topArmStart.y, topArmJoint.x, topArmJoint.y);
    this.graphics.lineBetween(topArmJoint.x, topArmJoint.y, topClawInner.x, topClawInner.y);
    this.graphics.lineBetween(bottomArmStart.x, bottomArmStart.y, bottomArmJoint.x, bottomArmJoint.y);
    this.graphics.lineBetween(bottomArmJoint.x, bottomArmJoint.y, bottomClawInner.x, bottomClawInner.y);

    drawClawPlate([point(35, -42), point(86, -45), point(66, -25), point(42, -22)], 0.13);
    drawClawPlate([point(50, -17), point(92, -6), point(58, -2), point(40, -13)], 0.1);
    drawClawPlate([point(35, 42), point(86, 45), point(66, 25), point(42, 22)], 0.13);
    drawClawPlate([point(50, 17), point(92, 6), point(58, 2), point(40, 13)], 0.1);

    this.graphics.lineStyle(1, primary, 0.36);
    this.graphics.lineBetween(topClawInner.x, topClawInner.y, muzzle.x, muzzle.y);
    this.graphics.lineBetween(bottomClawInner.x, bottomClawInner.y, muzzle.x, muzzle.y);
    this.graphics.fillStyle(primary, 0.28);
    this.graphics.fillCircle(muzzle.x, muzzle.y, 13 * viewScale);
    this.graphics.lineStyle(2, 0xfff1a8, 0.5);
    this.graphics.strokeCircle(muzzle.x, muzzle.y, 21 * viewScale);
  }

  private getMothershipMuzzleScreenPosition(state: GameState, boss: AsteroidState, viewScale: number): Vec2 {
    const toShip = {
      x: state.ship.position.x - boss.position.x,
      y: state.ship.position.y - boss.position.y
    };
    const length = Math.max(1, Math.hypot(toShip.x, toShip.y));
    const raw = {
      x: boss.position.x + (toShip.x / length) * boss.radius * 0.72,
      y: boss.position.y + (toShip.y / length) * boss.radius * 0.72
    };
    const margin = balance.weapons.bulletCullMargin + balance.weapons.spawnOffset + 8;
    const world = {
      x: Math.max(state.camera.x - state.width / 2 + margin, Math.min(state.camera.x + state.width / 2 - margin, raw.x)),
      y: Math.max(state.camera.y - state.height / 2 + margin, Math.min(state.camera.y + state.height / 2 - margin, raw.y))
    };
    return {
      x: this.toScreenX(state, world.x),
      y: this.toScreenY(state, world.y)
    };
  }

  private drawMothershipBeam(state: GameState, boss: AsteroidState, x: number, y: number, viewScale: number): void {
    const cfg = balance.bosses.mothership;
    const angle = boss.bossBeamAngle ?? 0;
    const length = Math.max(state.width, state.height) * cfg.beamLengthMultiplier * viewScale;
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    const pulse = 0.5 + Math.sin(this.scene.time.now * 0.02) * 0.5;
    this.graphics.lineStyle(cfg.beamWidth * viewScale, 0xff4fd8, 0.12 + pulse * 0.06);
    this.graphics.lineBetween(x, y, endX, endY);
    this.graphics.lineStyle(Math.max(3, cfg.beamWidth * 0.28 * viewScale), 0xffd0f0, 0.58 + pulse * 0.18);
    this.graphics.lineBetween(x, y, endX, endY);
    this.graphics.lineStyle(1, 0xfff1a8, 0.44);
    this.graphics.lineBetween(x, y, endX, endY);
  }

  private drawBossMinion(state: GameState, minion: BossMinionState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, minion.position.x);
    const y = this.toScreenY(state, minion.position.y);
    const angle = Math.atan2(minion.velocity.y, minion.velocity.x);
    const hull = [
      { x: 16, y: 0 },
      { x: -8, y: -10 },
      { x: -4, y: 0 },
      { x: -8, y: 10 }
    ].map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, angle, x, y));
    this.graphics.fillStyle(0xff4fd8, 0.12);
    this.graphics.lineStyle(2, 0xff8fe7, 0.84);
    this.graphics.beginPath();
    this.graphics.moveTo(hull[0].x, hull[0].y);
    hull.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.strokePath();
    this.graphics.fillStyle(0xfff1a8, 0.62);
    this.graphics.fillCircle(x, y, 3.2 * viewScale);
  }

  private drawBullet(state: GameState, bullet: BulletState, simple = false): void {
    if (bullet.owner === 'boss' || bullet.owner === 'saucer') {
      this.drawHostileBullet(state, bullet);
      return;
    }

    const color = this.getBulletColor(bullet);
    const x = this.toScreenX(state, bullet.position.x);
    const y = this.toScreenY(state, bullet.position.y);
    const viewScale = this.getViewScale(state);

    if (bullet.critical) {
      this.graphics.lineStyle(1.5, 0xfff1a8, 0.85);
      this.graphics.strokeCircle(x, y, (bullet.radius + 3) * viewScale);
    }

    if (bullet.kind === 'playerRicochet') {
      const speed = Math.max(1, Math.hypot(bullet.velocity.x, bullet.velocity.y));
      const tail = {
        x: x - (bullet.velocity.x / speed) * (22 + bullet.radius * 2.6) * viewScale,
        y: y - (bullet.velocity.y / speed) * (22 + bullet.radius * 2.6) * viewScale
      };
      this.graphics.lineStyle(2, color, 0.62);
      this.graphics.lineBetween(tail.x, tail.y, x, y);
      this.graphics.fillStyle(color, 0.94);
      this.graphics.fillCircle(x, y, bullet.radius * viewScale);
      this.graphics.lineStyle(1, 0xfff1a8, 0.46);
      this.graphics.strokeCircle(x, y, (bullet.radius + 5) * viewScale);
      this.graphics.lineStyle(1, color, 0.25);
      this.graphics.strokeCircle(x, y, (bullet.radius + 9) * viewScale);
      return;
    }

    this.graphics.fillStyle(color, 0.95);
    this.graphics.fillCircle(x, y, bullet.radius * viewScale);
    if (simple && bullet.owner === 'drone') {
      return;
    }
    this.graphics.lineStyle(1, color, 0.45);
    this.graphics.strokeCircle(x, y, (bullet.radius + 4) * viewScale);
  }

  private drawHostileBullet(state: GameState, bullet: BulletState): void {
    const viewScale = this.getViewScale(state);
    const color = this.getBulletColor(bullet);
    const x = this.toScreenX(state, bullet.position.x);
    const y = this.toScreenY(state, bullet.position.y);
    const speed = Math.max(1, Math.hypot(bullet.velocity.x, bullet.velocity.y));
    const tail = {
      x: x - (bullet.velocity.x / speed) * (14 + bullet.radius * 1.8) * viewScale,
      y: y - (bullet.velocity.y / speed) * (14 + bullet.radius * 1.8) * viewScale
    };

    if (bullet.kind === 'ricochet') {
      this.graphics.lineStyle(2, 0xd9c7ff, 0.76);
      this.graphics.strokeCircle(x, y, (bullet.radius + 5) * viewScale);
      this.graphics.lineStyle(1, 0xfff1a8, 0.48);
      this.graphics.lineBetween(tail.x, tail.y, x, y);
      this.graphics.fillStyle(0xb48cff, 0.72);
      this.graphics.fillCircle(x, y, bullet.radius * viewScale);
      return;
    }

    this.graphics.lineStyle(2, color, bullet.owner === 'boss' ? 0.72 : 0.58);
    this.graphics.lineBetween(tail.x, tail.y, x, y);
    this.graphics.fillStyle(color, bullet.owner === 'boss' ? 0.92 : 0.86);
    this.graphics.fillCircle(x, y, bullet.radius * viewScale);
    this.graphics.lineStyle(1, bullet.owner === 'boss' ? 0xfff1a8 : 0xfffbcc, bullet.owner === 'boss' ? 0.58 : 0.42);
    this.graphics.strokeCircle(x, y, (bullet.radius + (bullet.owner === 'boss' ? 7 : 5)) * viewScale);
  }

  private getBulletColor(bullet: BulletState): number {
    if (bullet.kind === 'playerRicochet') {
      return 0xff4fd8;
    }
    if (bullet.kind === 'ricochet') {
      return 0xd9c7ff;
    }
    if (bullet.owner === 'boss') {
      return 0xff8b6b;
    }
    if (bullet.owner === 'saucer') {
      return 0xfffbcc;
    }
    if (bullet.kind === 'rail') {
      return 0x92dfff;
    }
    if (bullet.kind === 'flak') {
      return 0xffc36f;
    }
    if (bullet.kind === 'missile') {
      return 0xff8a4c;
    }
    if (bullet.kind === 'pellet') {
      return 0x92dfff;
    }
    if (bullet.owner === 'drone') {
      return 0x83ffdc;
    }
    return 0xf5fdff;
  }

  private getBossPrimaryColor(type: AsteroidState['bossType']): number {
    if (type === 'sentinel') {
      return 0x83ffdc;
    }
    if (type === 'prism') {
      return 0xb48cff;
    }
    if (type === 'mothership') {
      return 0xff5cc8;
    }
    return 0xff8b6b;
  }

  private getBossSecondaryColor(type: AsteroidState['bossType']): number {
    if (type === 'sentinel') {
      return 0xd8fff5;
    }
    if (type === 'prism') {
      return 0xd9c7ff;
    }
    if (type === 'mothership') {
      return 0xffd0f0;
    }
    return 0xfff1a8;
  }

  private drawDrones(state: GameState): void {
    if (state.drones.length <= MAX_DETAILED_DRONES) {
      state.drones.forEach((drone) => this.drawDrone(state, drone));
      return;
    }

    state.drones.slice(0, MAX_DETAILED_DRONES).forEach((drone) => this.drawDrone(state, drone));
    this.drawDroneSwarm(state, state.drones.slice(MAX_DETAILED_DRONES));
  }

  private drawDroneSwarm(state: GameState, drones: DroneState[]): void {
    const viewScale = this.getViewScale(state);
    const shipX = this.toScreenX(state, state.ship.position.x);
    const shipY = this.toScreenY(state, state.ship.position.y);
    const ringAlpha = Math.min(0.22, 0.08 + drones.length / 900);

    this.graphics.lineStyle(1, 0x83ffdc, ringAlpha);
    this.graphics.strokeCircle(shipX, shipY, getDroneOrbitRadius(state.progression, 0, 'sentry') * viewScale);
    this.graphics.strokeCircle(shipX, shipY, getDroneOrbitRadius(state.progression, 0, 'breaker') * viewScale);
    this.graphics.strokeCircle(shipX, shipY, getDroneOrbitRadius(state.progression, 0, 'ranger') * viewScale);

    const stride = Math.max(1, Math.ceil(drones.length / MAX_SWARM_DOTS));
    this.graphics.fillStyle(0x83ffdc, 0.38);
    for (let i = 0; i < drones.length; i += stride) {
      const drone = drones[i];
      this.graphics.fillCircle(this.toScreenX(state, drone.position.x), this.toScreenY(state, drone.position.y), 2.2 * viewScale);
    }
  }

  private drawDrone(state: GameState, drone: DroneState): void {
    const viewScale = this.getViewScale(state);
    const halfSize = 5 * viewScale;
    const x = this.toScreenX(state, drone.position.x);
    const y = this.toScreenY(state, drone.position.y);
    const color = this.getDroneColor(drone);
    this.graphics.lineStyle(1, color, 0.5);
    this.graphics.lineBetween(x, y, x - Math.cos(drone.angle) * 12 * viewScale, y - Math.sin(drone.angle) * 12 * viewScale);
    this.graphics.fillStyle(color, 0.18);
    this.graphics.fillRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);
    this.graphics.lineStyle(2, color, 0.9);
    this.graphics.strokeRect(x - halfSize, y - halfSize, halfSize * 2, halfSize * 2);

    if (drone.type === 'ranger') {
      this.graphics.lineStyle(1, color, 0.62);
      this.graphics.lineBetween(x - halfSize * 1.8, y - halfSize * 0.35, x + halfSize * 1.8, y + halfSize * 0.35);
      this.graphics.lineBetween(x - halfSize * 1.8, y + halfSize * 0.35, x + halfSize * 1.8, y - halfSize * 0.35);
    } else if (drone.type === 'breaker') {
      this.graphics.lineStyle(2, color, 0.62);
      this.graphics.strokeCircle(x, y, halfSize * 1.45);
    }
  }

  private getDroneColor(drone: DroneState): number {
    if (drone.type === 'ranger') {
      return 0x92dfff;
    }
    if (drone.type === 'breaker') {
      return 0xffc36f;
    }
    return 0x83ffdc;
  }

  private drawParticle(state: GameState, particle: ParticleState): void {
    const alpha = Math.max(0, 1 - particle.age / particle.ttl);
    const scale = this.getViewScale(state);
    const x = this.toScreenX(state, particle.position.x);
    const y = this.toScreenY(state, particle.position.y);
    const speed = Math.hypot(particle.velocity.x, particle.velocity.y);
    const length = Math.min(7, speed * 0.024) * alpha * scale;
    this.graphics.lineStyle(Math.max(1, particle.size * scale * 0.5), particle.id % 4 === 0 ? 0xffd59a : 0xc8e2e9, alpha * alpha * 0.85);
    this.graphics.lineBetween(x, y, x - particle.velocity.x / Math.max(1, speed) * length, y - particle.velocity.y / Math.max(1, speed) * length);
  }

  private drawFlameWave(state: GameState, wave: FlameWaveState): void {
    if (!this.isCircleOnScreen(state, wave.center.x, wave.center.y, wave.radius + 20)) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, wave.center.x);
    const y = this.toScreenY(state, wave.center.y);
    const radius = wave.radius * viewScale;
    const progress = Math.max(0, Math.min(1, wave.radius / Math.max(1, wave.maxRadius)));
    const lifeAlpha = Math.max(0, 1 - wave.age / Math.max(0.01, wave.ttl));
    const alpha = Math.min(0.9, lifeAlpha * (1 - progress * 0.22));
    const wobble = Math.sin(this.scene.time.now * 0.01 + wave.id * 0.73) * 0.08;

    this.graphics.fillStyle(0xff6a2a, alpha * 0.025);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.lineStyle(Math.max(1, 5 * viewScale), 0xff6a2a, alpha * 0.46);
    this.drawArcSegments(x, y, radius * (0.98 + wobble), -Math.PI * 0.92 + wave.age * 2.8, Math.PI * 1.72, 9);
    this.graphics.lineStyle(Math.max(1, 2.5 * viewScale), 0xffc36f, alpha * 0.68);
    this.drawArcSegments(x, y, radius * 0.88, -Math.PI * 0.35 - wave.age * 2.1, Math.PI * 1.4, 8);
    this.graphics.lineStyle(Math.max(1, 1.3 * viewScale), 0xfff1a8, alpha * 0.42);
    this.drawArcSegments(x, y, radius * 0.72, Math.PI * 0.22 + wave.age * 1.7, Math.PI * 1.08, 6);
  }

  private drawLevelShockwave(state: GameState, shockwave: LevelShockwaveState): void {
    if (!this.isCircleOnScreen(state, shockwave.center.x, shockwave.center.y, shockwave.radius + 16)) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, shockwave.center.x);
    const y = this.toScreenY(state, shockwave.center.y);
    const radius = shockwave.radius * viewScale;
    const progress = Math.max(0, Math.min(1, shockwave.radius / Math.max(1, shockwave.maxRadius)));
    const lifeAlpha = Math.max(0, 1 - shockwave.age / Math.max(0.01, shockwave.ttl));
    const alpha = Math.min(0.9, lifeAlpha * (1 - progress * 0.35));

    this.graphics.fillStyle(0xd7c7ff, alpha * 0.035);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.lineStyle(Math.max(1, 5 * viewScale), 0xd7c7ff, alpha * 0.52);
    this.graphics.strokeCircle(x, y, radius);
    this.graphics.lineStyle(Math.max(1, 2 * viewScale), 0x83ffdc, alpha * 0.72);
    this.graphics.strokeCircle(x, y, radius * 0.94);
    this.graphics.lineStyle(Math.max(1, 1.5 * viewScale), 0xf5fdff, alpha * 0.46);
    this.graphics.strokeCircle(x, y, radius * 0.72);
  }

  private drawSaucer(state: GameState, saucer: SaucerState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, saucer.position.x);
    const y = this.toScreenY(state, saucer.position.y);
    const isElite = saucer.kind === 'elite';
    const primary = isElite ? 0xff4fd8 : saucer.kind === 'sniper' ? 0xffb84d : saucer.kind === 'skirmisher' ? 0xff6659 : 0x92dfff;
    const secondary = isElite ? 0xffd8f7 : 0x92dfff;
    const width = isElite ? 30 : 24;
    const cap = isElite ? 13 : 12;
    const charge = (saucer.telegraphFor ?? 0) > 0
      ? 1 - (saucer.telegraphFor ?? 0) / getSaucerTelegraphSeconds(saucer.kind) : 0;
    const charging = (saucer.telegraphFor ?? 0) > 0;
    const angle = saucer.aimAngle ?? Math.atan2(state.ship.position.y - saucer.position.y, state.ship.position.x - saucer.position.x);
    const localPoint = (forward: number, side: number) => ({
      x: x + (Math.cos(angle) * forward - Math.sin(angle) * side) * viewScale,
      y: y + (Math.sin(angle) * forward + Math.cos(angle) * side) * viewScale
    });

    if (charging) {
      const offsets = isElite ? balance.saucer.elite.bulletAngleOffsets
        : saucer.kind === 'skirmisher' ? balance.saucer.skirmisher.bulletAngleOffsets : [0];
      this.graphics.lineStyle(2, primary, 0.5 + charge * 0.35);
      for (const offset of offsets) {
        const reach = saucer.kind === 'sniper' ? Math.hypot(state.width, state.height) / viewScale : 110;
        // Broken sight line cannot be mistaken for an active beam.
        for (let d = saucer.radius + 8; d < reach; d += 24) {
          this.graphics.lineBetween(x + Math.cos(angle + offset) * d * viewScale, y + Math.sin(angle + offset) * d * viewScale,
            x + Math.cos(angle + offset) * (d + 10) * viewScale, y + Math.sin(angle + offset) * (d + 10) * viewScale);
        }
      }
      this.graphics.lineStyle(2, primary, 0.9);
      this.graphics.beginPath();
      this.graphics.arc(x, y, (saucer.radius + 7) * viewScale, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * charge);
      this.graphics.strokePath();
    }
    this.graphics.fillStyle(primary, 0.12);
    if (saucer.kind === 'sniper' || saucer.kind === 'skirmisher') {
      const outline = saucer.kind === 'sniper'
        ? [[24, -5], [24, 5], [4, 5], [-15, 14], [-21, 0], [-15, -14], [4, -5]]
        : [[22, 0], [-16, 22], [-8, 4], [-20, 0], [-8, -4], [-16, -22]];
      const points = outline.map(([forward, side]) => localPoint(forward, side));
      this.graphics.lineStyle(2, primary, 1);
      this.graphics.fillPoints(points, true);
      this.graphics.strokePoints(points, true);
      const tail = localPoint(-19, 0);
      const exhaust = localPoint(charging && saucer.kind === 'sniper' ? -23 : -34, 0);
      this.graphics.lineStyle(3, primary, 0.4);
      this.graphics.lineBetween(tail.x, tail.y, exhaust.x, exhaust.y);
    } else {
      if (isElite) {
        this.graphics.lineStyle(2, primary, 0.65);
        this.graphics.strokeTriangle(x - 34 * viewScale, y, x - 22 * viewScale, y - 15 * viewScale, x - 22 * viewScale, y + 15 * viewScale);
        this.graphics.strokeTriangle(x + 34 * viewScale, y, x + 22 * viewScale, y - 15 * viewScale, x + 22 * viewScale, y + 15 * viewScale);
      }
      this.graphics.lineStyle(isElite ? 3 : 2, primary, 0.9);
      this.graphics.beginPath();
      this.graphics.moveTo(x - width * viewScale, y);
      this.graphics.lineTo(x - cap * viewScale, y - 9 * viewScale);
      this.graphics.lineTo(x + cap * viewScale, y - 9 * viewScale);
      this.graphics.lineTo(x + width * viewScale, y);
      this.graphics.lineTo(x + 10 * viewScale, y + 8 * viewScale);
      this.graphics.lineTo(x - 10 * viewScale, y + 8 * viewScale);
      this.graphics.closePath();
      this.graphics.strokePath();
      this.graphics.lineStyle(1, secondary, isElite ? 0.72 : 0.45);
      this.graphics.lineBetween(x - 18 * viewScale, y, x + 18 * viewScale, y);
      if (isElite) {
        this.graphics.lineBetween(x, y - 11 * viewScale, x, y + 10 * viewScale);
      }
    }
    this.graphics.fillStyle(charging ? 0xffffff : primary, 0.8);
    this.graphics.fillCircle(x, y, (2.5 + charge * 3) * viewScale);
    if ((saucer.shotFlashFor ?? 0) > 0) {
      this.graphics.lineStyle(2, 0xffffff, (saucer.shotFlashFor ?? 0) / 0.18);
      this.graphics.strokeCircle(x, y, (saucer.radius + 12 * (1 - (saucer.shotFlashFor ?? 0) / 0.18)) * viewScale);
    }
  }

  private drawPendingBossWarning(state: GameState): void {
    const pendingBoss = state.pendingBoss;
    if (!pendingBoss) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const rawX = this.toScreenX(state, pendingBoss.position.x);
    const rawY = this.toScreenY(state, pendingBoss.position.y);
    const margin = 28 * viewScale;
    const x = Math.max(margin, Math.min(state.width - margin, rawX));
    const y = Math.max(margin, Math.min(state.height - margin, rawY));
    const angle = Math.atan2(state.height / 2 - y, state.width / 2 - x);
    const pulse = 0.72 + Math.sin(pendingBoss.spawnIn * 10) * 0.18;
    const color = this.getBossPrimaryColor(pendingBoss.bossType);
    const warningRadius = (24 + Math.max(0, 3 - pendingBoss.spawnIn) * 12) * viewScale;

    this.graphics.fillStyle(color, 0.12 + pulse * 0.08);
    this.graphics.lineStyle(2, color, 0.8);
    this.graphics.fillCircle(x, y, 18 * viewScale);
    this.graphics.strokeCircle(x, y, 18 * viewScale);
    this.graphics.lineStyle(2, 0xfff1a8, 0.18 + pulse * 0.28);
    this.graphics.strokeCircle(x, y, warningRadius);
    this.graphics.lineStyle(1, color, 0.2);
    this.graphics.lineBetween(x, y, state.width / 2, state.height / 2);

    const arrow = [
      { x: 18, y: 0 },
      { x: -8, y: -9 },
      { x: -4, y: 0 },
      { x: -8, y: 9 }
    ].map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, angle, x, y));
    this.graphics.lineStyle(2, 0xfff1a8, 0.92);
    this.graphics.beginPath();
    this.graphics.moveTo(arrow[0].x, arrow[0].y);
    arrow.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  private drawSwipeImpulseIndicator(swipe: { start: Vec2; current: Vec2; power: number; inverted?: boolean }): void {
    const alpha = 0.28 + swipe.power * 0.38;
    const dx = swipe.inverted ? swipe.start.x - swipe.current.x : swipe.current.x - swipe.start.x;
    const dy = swipe.inverted ? swipe.start.y - swipe.current.y : swipe.current.y - swipe.start.y;
    const angle = Math.atan2(dy, dx);
    const arrowDistance = 34 + swipe.power * 42;
    const arrowOrigin = swipe.inverted ? swipe.start : swipe.current;
    const arrowCenter = {
      x: arrowOrigin.x + Math.cos(angle) * arrowDistance,
      y: arrowOrigin.y + Math.sin(angle) * arrowDistance
    };

    this.graphics.lineStyle(2, 0x83ffdc, alpha);
    this.graphics.strokeCircle(swipe.start.x, swipe.start.y, 16 + swipe.power * 10);
    this.graphics.lineStyle(2, 0xfff1a8, alpha);
    this.graphics.lineBetween(swipe.current.x, swipe.current.y, swipe.start.x, swipe.start.y);
    this.graphics.fillStyle(0x83ffdc, 0.12 + swipe.power * 0.16);
    this.graphics.fillCircle(swipe.current.x, swipe.current.y, 10 + swipe.power * 8);

    const arrow = [
      { x: 16, y: 0 },
      { x: -8, y: -8 },
      { x: -4, y: 0 },
      { x: -8, y: 8 }
    ].map((point) => this.rotatePoint(point.x, point.y, angle, arrowCenter.x, arrowCenter.y));
    this.graphics.lineStyle(2, 0x83ffdc, 0.72 + swipe.power * 0.2);
    this.graphics.beginPath();
    this.graphics.moveTo(arrow[0].x, arrow[0].y);
    arrow.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();
  }

  private toScreenX(state: GameState, worldX: number): number {
    return (worldX - state.camera.x) * this.getViewScale(state) + state.width / 2;
  }

  private toScreenY(state: GameState, worldY: number): number {
    return (worldY - state.camera.y) * this.getViewScale(state) + state.height / 2;
  }

  private getViewScale(state: GameState): number {
    return getWorldViewScale(state.width);
  }

  private isCircleOnScreen(state: GameState, worldX: number, worldY: number, radius: number): boolean {
    const viewScale = this.getViewScale(state);
    const x = (worldX - state.camera.x) * viewScale + state.width / 2;
    const y = (worldY - state.camera.y) * viewScale + state.height / 2;
    const scaledRadius = radius * viewScale;
    return x >= -scaledRadius && x <= state.width + scaledRadius && y >= -scaledRadius && y <= state.height + scaledRadius;
  }

  private rotatePoint(x: number, y: number, rotation: number, originX: number, originY: number): { x: number; y: number } {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: originX + x * cos - y * sin,
      y: originY + x * sin + y * cos
    };
  }
}
