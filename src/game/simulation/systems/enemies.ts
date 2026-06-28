import { createZoneBossFromPending } from './asteroids';
import { fireBullet } from './weapons';
import { emitReward } from '../events';
import type { GameState } from '../types';
import { distance, normalize, randomRange } from '../vector';
import { balance } from '../../balance';

export const updatePendingBoss = (state: GameState, dt: number): void => {
  const pendingBoss = state.pendingBoss;
  if (!pendingBoss || !state.ship.alive) {
    return;
  }

  pendingBoss.spawnIn = Math.max(0, pendingBoss.spawnIn - dt);
  if (pendingBoss.spawnIn > 0) {
    return;
  }

  state.asteroids.push(createZoneBossFromPending(state, pendingBoss));
  state.pendingBoss = null;
  emitReward(state, 'Gate boss entering field', 'boss');
};

export const updateBosses = (state: GameState, dt: number): void => {
  if (!state.ship.alive) {
    return;
  }

  state.asteroids.forEach((boss) => {
    if (!boss.bossType) {
      return;
    }

    const toShip = {
      x: state.ship.position.x - boss.position.x,
      y: state.ship.position.y - boss.position.y
    };
    const shipAngle = Math.atan2(toShip.y, toShip.x);
    const desiredVelocity = normalize(toShip);
    const bossStats = balance.bosses.stats[boss.bossType];
    const bossSpeed = bossStats.chaseSpeedBase + (boss.bossZoneIndex ?? 0) * bossStats.chaseSpeedPerZone;
    const steer = Math.min(1, dt * 0.65);
    boss.velocity.x += (desiredVelocity.x * bossSpeed - boss.velocity.x) * steer;
    boss.velocity.y += (desiredVelocity.y * bossSpeed - boss.velocity.y) * steer;
    boss.rotation += (shipAngle - boss.rotation) * Math.min(1, dt * 2.4);
    boss.bossFireCooldown = Math.max(0, (boss.bossFireCooldown ?? 0) - dt);
    if (boss.bossFireCooldown > 0) {
      return;
    }

    bossStats.bulletAngleOffsets.forEach((offset) => {
      fireBullet(state, 'boss', boss.position, shipAngle + offset, bossStats.bulletSpeed, bossStats.bulletDamage);
    });
    boss.bossFireCooldown = Math.max(bossStats.fireCooldownMin, bossStats.fireCooldownBase - (boss.bossZoneIndex ?? 0) * bossStats.fireCooldownPerZone);
  });
};

export const updateSaucer = (state: GameState, dt: number): void => {
  state.saucerTimer -= dt;

  if (!state.saucer && state.saucerTimer <= 0) {
    const fromLeft = Math.random() > 0.5;
    state.saucer = {
      id: state.nextId++,
      position: {
        x: state.camera.x + (fromLeft ? -state.width * balance.saucer.spawnOffsetX : state.width * balance.saucer.spawnOffsetX),
        y: state.camera.y + randomRange(state.height * balance.saucer.spawnMinY, state.height * balance.saucer.spawnMaxY)
      },
      velocity: {
        x: fromLeft ? randomRange(balance.saucer.speedX[0], balance.saucer.speedX[1]) : randomRange(-balance.saucer.speedX[1], -balance.saucer.speedX[0]),
        y: randomRange(balance.saucer.speedY[0], balance.saucer.speedY[1])
      },
      radius: balance.saucer.radius,
      fireCooldown: balance.saucer.initialFireCooldown,
      alive: true
    };
  }

  const saucer = state.saucer;
  if (!saucer) {
    return;
  }

  saucer.position.x += saucer.velocity.x * dt;
  saucer.position.y += saucer.velocity.y * dt;
  saucer.fireCooldown -= dt;

  if (saucer.fireCooldown <= 0 && state.ship.alive) {
    const direction = normalize({
      x: state.ship.position.x - saucer.position.x + randomRange(-balance.saucer.aimJitter, balance.saucer.aimJitter),
      y: state.ship.position.y - saucer.position.y + randomRange(-balance.saucer.aimJitter, balance.saucer.aimJitter)
    });
    fireBullet(state, 'saucer', saucer.position, Math.atan2(direction.y, direction.x), balance.saucer.bulletSpeed);
    saucer.fireCooldown = randomRange(balance.saucer.fireCooldown[0], balance.saucer.fireCooldown[1]);
  }

  if (distance(saucer.position, state.camera) > Math.max(state.width, state.height) * balance.saucer.despawnDistanceMultiplier || !saucer.alive) {
    state.saucer = null;
    state.saucerTimer = randomRange(balance.saucer.respawnTimer[0], balance.saucer.respawnTimer[1]);
  }
};
