import { balance } from '../../balance';
import { emitAudio } from '../events';
import type { GameState, Vec2 } from '../types';
import { distance, normalize } from '../vector';
import { destroyAsteroid } from './asteroidDestruction';
import { burstParticles } from './particles';

export const bounceBulletOffAsteroid = (
  bullet: GameState['bullets'][number],
  asteroid: GameState['asteroids'][number],
  hitRadius: number
): void => {
  const normal = normalize({
    x: bullet.position.x - asteroid.position.x,
    y: bullet.position.y - asteroid.position.y
  });
  const fallbackNormal = Math.hypot(normal.x, normal.y) === 0
    ? normalize({ x: -bullet.velocity.x || 1, y: -bullet.velocity.y })
    : normal;
  const dot = bullet.velocity.x * fallbackNormal.x + bullet.velocity.y * fallbackNormal.y;
  bullet.velocity = {
    x: bullet.velocity.x - 2 * dot * fallbackNormal.x,
    y: bullet.velocity.y - 2 * dot * fallbackNormal.y
  };
  bullet.position = {
    x: asteroid.position.x + fallbackNormal.x * (hitRadius + 3),
    y: asteroid.position.y + fallbackNormal.y * (hitRadius + 3)
  };
};

export const tryRicochetBulletOffAsteroid = (
  state: GameState,
  bullet: GameState['bullets'][number],
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>,
  destroyedBulletIds: Set<number>
): boolean => {
  if (bullet.kind !== 'ricochet' || bullet.owner !== 'boss') {
    return false;
  }

  for (const asteroid of nextAsteroids) {
    if (asteroid.bossType || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }

    const hitRadius = bullet.radius + asteroid.radius * balance.asteroids.bulletHitRadiusMultiplier;
    if (distance(bullet.position, asteroid.position) > hitRadius) {
      continue;
    }

    if (bullet.ricochetLeft <= 0) {
      destroyedBulletIds.add(bullet.id);
      burstParticles(state, bullet.position, 7, asteroid.radius * 0.8);
      return true;
    }

    bounceBulletOffAsteroid(bullet, asteroid, hitRadius);
    bullet.ricochetLeft -= 1;
    emitAudio(state, { type: 'asteroidHit' });
    burstParticles(state, bullet.position, 8, asteroid.radius);
    return true;
  }

  return false;
};

export const explodeMissile = (
  state: GameState,
  position: Vec2,
  directDamage: number,
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>,
  directHitId: number
): void => {
  const splashRadius = 72;
  const splashDamage = Math.max(1, Math.round(directDamage * 0.55));
  burstParticles(state, position, 16, splashRadius * 2);

  for (const asteroid of [...nextAsteroids]) {
    if (asteroid.id === directHitId || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }
    if (distance(position, asteroid.position) > splashRadius + asteroid.radius * 0.45) {
      continue;
    }

    asteroid.hp -= splashDamage;
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, asteroid.position, 4, asteroid.radius);
    }
  }
};

export const explodeFlak = (
  state: GameState,
  position: Vec2,
  directHit: GameState['asteroids'][number],
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>
): void => {
  burstParticles(state, position, 14, 150);
  for (const asteroid of [...nextAsteroids]) {
    if (asteroid.id === directHit.id || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }
    if (distance(position, asteroid.position) > balance.collisions.flakSplashRadius + asteroid.radius * 0.45) {
      continue;
    }

    asteroid.hp -= Math.max(1, Math.floor(directHit.maxHp * balance.collisions.flakSplashDamageMultiplier));
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, asteroid.position, 4, asteroid.radius);
    }
  }
};
