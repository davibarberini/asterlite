import Phaser from 'phaser';
import { getDroneOrbitRadius } from '../../game/simulation/state';
import type { AsteroidState, BulletState, DroneState, GameState, ParticleState, SaucerState, ShipState, Vec2 } from '../../game/simulation/types';

const MAX_DETAILED_DRONES = 36;
const MAX_SWARM_DOTS = 42;
const SIMPLE_BULLET_THRESHOLD = 90;

export class VectorRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1);
  }

  clear(): void {
    this.graphics.clear();
  }

  render(state: GameState, thrusting: boolean, slingshot: { start: Vec2; current: Vec2; power: number } | null = null): void {
    this.graphics.clear();
    this.drawGridGlow(state);

    state.asteroids.forEach((asteroid) => {
      if (this.isCircleOnScreen(state, asteroid.position.x, asteroid.position.y, asteroid.radius + 12)) {
        this.drawAsteroid(state, asteroid);
      }
    });
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
    this.drawDrones(state);

    if (state.saucer) {
      this.drawSaucer(state, state.saucer);
    }

    if (state.pendingBoss) {
      this.drawPendingBossWarning(state);
    }

    if (slingshot) {
      this.drawSlingshotIndicator(slingshot);
    }

    if (state.ship.alive) {
      this.drawShip(state, state.ship, thrusting);
    }
  }

  private drawGridGlow(state: GameState): void {
    this.graphics.lineStyle(1, 0x6fb7d8, 0.035);
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

  private drawShip(state: GameState, ship: ShipState, thrusting: boolean): void {
    const blink = ship.invulnerableFor > 0 && Math.floor(ship.invulnerableFor * 14) % 2 === 0;
    if (blink) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const points = [
      { x: 18, y: 0 },
      { x: -13, y: 12 },
      { x: -7, y: 0 },
      { x: -13, y: -12 }
    ].map((point) => this.rotatePoint(point.x * viewScale, point.y * viewScale, ship.rotation, this.toScreenX(state, ship.position.x), this.toScreenY(state, ship.position.y)));

    this.graphics.lineStyle(2, 0xf2fbff, 0.96);
    this.graphics.beginPath();
    this.graphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.graphics.lineTo(point.x, point.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    if (state.progression.deflectorLevel > 0) {
      this.drawDeflector(state, ship);
    }

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
      const alpha = 0.22 + (1 - asteroid.hp / asteroid.maxHp) * 0.32;
      this.graphics.lineStyle(1, 0xfff1a8, alpha);
      this.graphics.strokeCircle(asteroidX, asteroidY, asteroid.radius * 0.58 * viewScale);
    }

    this.drawAsteroidVariantMark(state, asteroid, asteroidX, asteroidY, viewScale);
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
    const primary = boss.bossType === 'sentinel' ? 0x83ffdc : 0xff8b6b;
    const secondary = boss.bossType === 'sentinel' ? 0xd8fff5 : 0xfff1a8;
    const hull = boss.bossType === 'sentinel'
      ? [
          { x: 34, y: 0 },
          { x: 8, y: -24 },
          { x: -26, y: -18 },
          { x: -42, y: 0 },
          { x: -26, y: 18 },
          { x: 8, y: 24 }
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
    const color = this.getBulletColor(bullet);
    const x = this.toScreenX(state, bullet.position.x);
    const y = this.toScreenY(state, bullet.position.y);
    this.graphics.fillStyle(color, 0.95);
    this.graphics.fillCircle(x, y, bullet.radius * this.getViewScale(state));
    if (simple && bullet.owner === 'drone') {
      return;
    }
    this.graphics.lineStyle(1, color, 0.45);
    this.graphics.strokeCircle(x, y, (bullet.radius + 4) * this.getViewScale(state));
  }

  private getBulletColor(bullet: BulletState): number {
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

  private drawSaucer(state: GameState, saucer: SaucerState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, saucer.position.x);
    const y = this.toScreenY(state, saucer.position.y);
    this.graphics.lineStyle(2, 0xf5fbff, 0.9);
    this.graphics.beginPath();
    this.graphics.moveTo(x - 24 * viewScale, y);
    this.graphics.lineTo(x - 12 * viewScale, y - 9 * viewScale);
    this.graphics.lineTo(x + 12 * viewScale, y - 9 * viewScale);
    this.graphics.lineTo(x + 24 * viewScale, y);
    this.graphics.lineTo(x + 10 * viewScale, y + 8 * viewScale);
    this.graphics.lineTo(x - 10 * viewScale, y + 8 * viewScale);
    this.graphics.closePath();
    this.graphics.strokePath();
    this.graphics.lineStyle(1, 0x92dfff, 0.45);
    this.graphics.lineBetween(x - 18 * viewScale, y, x + 18 * viewScale, y);
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
    const color = pendingBoss.bossType === 'sentinel' ? 0x83ffdc : 0xff8b6b;

    this.graphics.fillStyle(color, 0.12 + pulse * 0.08);
    this.graphics.lineStyle(2, color, 0.8);
    this.graphics.fillCircle(x, y, 18 * viewScale);
    this.graphics.strokeCircle(x, y, 18 * viewScale);

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

  private drawSlingshotIndicator(slingshot: { start: Vec2; current: Vec2; power: number }): void {
    const alpha = 0.28 + slingshot.power * 0.38;
    const dx = slingshot.start.x - slingshot.current.x;
    const dy = slingshot.start.y - slingshot.current.y;
    const angle = Math.atan2(dy, dx);
    const arrowDistance = 34 + slingshot.power * 42;
    const arrowCenter = {
      x: slingshot.start.x + Math.cos(angle) * arrowDistance,
      y: slingshot.start.y + Math.sin(angle) * arrowDistance
    };

    this.graphics.lineStyle(2, 0x83ffdc, alpha);
    this.graphics.strokeCircle(slingshot.start.x, slingshot.start.y, 16 + slingshot.power * 10);
    this.graphics.lineStyle(2, 0xfff1a8, alpha);
    this.graphics.lineBetween(slingshot.current.x, slingshot.current.y, slingshot.start.x, slingshot.start.y);
    this.graphics.fillStyle(0x83ffdc, 0.12 + slingshot.power * 0.16);
    this.graphics.fillCircle(slingshot.current.x, slingshot.current.y, 10 + slingshot.power * 8);

    const arrow = [
      { x: 16, y: 0 },
      { x: -8, y: -8 },
      { x: -4, y: 0 },
      { x: -8, y: 8 }
    ].map((point) => this.rotatePoint(point.x, point.y, angle, arrowCenter.x, arrowCenter.y));
    this.graphics.lineStyle(2, 0x83ffdc, 0.72 + slingshot.power * 0.2);
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
