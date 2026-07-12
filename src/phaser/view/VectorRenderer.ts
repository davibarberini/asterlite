import Phaser from 'phaser';
import { getActiveShipFrame, getShipFrameWeaponIdentity } from '../../game/progression/shipFrames';
import { getDroneOrbitRadius } from '../../game/simulation/state';
import { getExplorationZone } from '../../game/simulation/zones';
import type { AsteroidState, AsteroidVariant, BossType, BulletState, DroneState, GameState, LevelShockwaveState, ParticleState, SaucerState, ShipState, Vec2 } from '../../game/simulation/types';
import { balance } from '../../game/balance';
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
    state.levelShockwaves.forEach((shockwave) => this.drawLevelShockwave(state, shockwave));
    this.drawDrones(state);

    if (state.saucer) {
      this.drawSaucer(state, state.saucer);
    }

    if (state.pendingBoss) {
      this.drawPendingBossWarning(state);
    }

    if (swipeIndicator) {
      this.drawSwipeImpulseIndicator(swipeIndicator);
    }

    if (state.ship.alive) {
      this.drawShipAuraWeapon(state);
      this.drawWraithPhaseShield(state);
      this.drawShip(state, state.ship, thrusting);
    }
  }

  private drawGridGlow(state: GameState): void {
    const zone = getExplorationZone(state);
    this.graphics.lineStyle(1, zone.identity.accentColor, 0.026 + zone.identity.fieldTintAlpha * 0.28);
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
      const points = getActiveShipFrame(state.progression).shape
        .map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, ship.rotation, this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y)));

      this.graphics.lineStyle(2, 0xf2fbff, 0.96);
      this.graphics.beginPath();
      this.graphics.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
      this.graphics.closePath();
      this.graphics.strokePath();
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
    const radius = balance.weapons.auraRadius * viewScale;
    const pulse = 0.5 + Math.sin(this.scene.time.now * 0.0048) * 0.5;
    this.graphics.fillStyle(0xff8a4c, 0.035 + pulse * 0.025);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.lineStyle(1, 0xffc36f, 0.28 + pulse * 0.18);
    this.graphics.strokeCircle(x, y, radius * (0.92 + pulse * 0.06));
    this.graphics.lineStyle(1, 0xfff1a8, 0.1 + pulse * 0.12);
    this.graphics.strokeCircle(x, y, radius * 0.58);
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
    const strokeColor = asteroid.bossType ? 0xfff1a8 : color;
    this.graphics.lineStyle(asteroid.bossType ? 3 : 2, strokeColor, asteroid.bossType ? 0.96 : 0.88);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    this.graphics.lineStyle(asteroid.bossType ? 2 : 1, strokeColor, asteroid.bossType ? 0.64 : asteroid.variant === 'common' ? 0.28 : 0.4);
    for (let i = 0; i < count; i += 3) {
      const point = points[i];
      this.graphics.lineBetween(
        asteroidX + (point.x - asteroidX) * 0.45,
        asteroidY + (point.y - asteroidY) * 0.45,
        point.x,
        point.y
      );
    }

    if (asteroid.hp < asteroid.maxHp) {
      const damageRatio = 1 - asteroid.hp / asteroid.maxHp;
      const alpha = 0.22 + damageRatio * 0.34;
      this.graphics.lineStyle(1, 0xfff1a8, alpha);
      this.graphics.strokeCircle(asteroidX, asteroidY, asteroid.radius * (0.5 + damageRatio * 0.22) * viewScale);
      this.drawAsteroidCracks(asteroid, asteroidX, asteroidY, viewScale, damageRatio);
    }

    this.drawAsteroidVariantMark(state, asteroid, asteroidX, asteroidY, viewScale);
  }

  private updateAsteroidReadabilityState(state: GameState, now: number): void {
    const currentIds = new Set<number>();
    const missingSnapshots: [number, AsteroidSnapshot][] = [];

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
    });

    this.asteroidSnapshots.forEach((snapshot, id) => {
      if (!currentIds.has(id)) {
        missingSnapshots.push([id, snapshot]);
      }
    });

    if (missingSnapshots.length <= 8) {
      missingSnapshots.forEach(([id, snapshot]) => {
        this.asteroidFlashes.set(id, {
          ...snapshot,
          startedAt: now,
          duration: ASTEROID_DESTROY_SECONDS,
          kind: 'destroyed',
          damageRatio: 1
        });
      });
    }

    this.asteroidSnapshots.clear();
    state.asteroids.forEach((asteroid) => {
      this.asteroidSnapshots.set(asteroid.id, this.createAsteroidSnapshot(asteroid));
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
        this.graphics.lineStyle(2, color, 0.6 * fade);
        this.graphics.strokeCircle(x, y, flash.radius * (0.82 + progress * 0.64) * viewScale);
        this.graphics.lineStyle(1, 0xfff1a8, 0.42 * fade);
        this.graphics.strokeCircle(x, y, flash.radius * (0.42 + progress * 0.38) * viewScale);
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

    if (boss.hp < boss.maxHp) {
      const alpha = 0.26 + (1 - boss.hp / boss.maxHp) * 0.34;
      this.graphics.lineStyle(2, 0xfff1a8, alpha);
      this.graphics.strokeCircle(x, y, boss.radius * 0.72 * viewScale);
    }
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
    return 0xff8b6b;
  }

  private getBossSecondaryColor(type: AsteroidState['bossType']): number {
    if (type === 'sentinel') {
      return 0xd8fff5;
    }
    if (type === 'prism') {
      return 0xd9c7ff;
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
    const alpha = 1 - particle.age / particle.ttl;
    this.graphics.fillStyle(0xc8f1ff, alpha * 0.8);
    this.graphics.fillCircle(this.toScreenX(state, particle.position.x), this.toScreenY(state, particle.position.y), particle.size * this.getViewScale(state));
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
    const primary = isElite ? 0xff4fd8 : 0xf5fbff;
    const secondary = isElite ? 0xffd8f7 : 0x92dfff;
    const width = isElite ? 30 : 24;
    const cap = isElite ? 13 : 12;
    const pulse = 0.5 + Math.sin(saucer.id * 0.19 + saucer.fireCooldown * 8) * 0.5;

    if (isElite) {
      this.graphics.fillStyle(0xff4fd8, 0.08 + pulse * 0.05);
      this.graphics.fillCircle(x, y, 30 * viewScale);
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
    return state.width <= 720 ? 0.78 : 1;
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
