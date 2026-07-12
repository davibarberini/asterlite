import type { GameState } from '../types';
import { distance } from '../vector';
import { destroyAsteroid } from './asteroidDestruction';

const LEVEL_SHOCKWAVE_DESTROY_LIMIT_PER_FRAME = 24;

export const updateLevelShockwaves = (
  state: GameState,
  dt: number,
  destroyedAsteroidIds: Set<number>,
  nextAsteroids: GameState['asteroids']
): void => {
  if (state.levelShockwaves.length <= 0) {
    return;
  }

  const existingShockwaves = state.levelShockwaves;
  const existingIds = new Set(existingShockwaves.map((shockwave) => shockwave.id));
  const updatedShockwaves = existingShockwaves.map((shockwave) => ({
    ...shockwave,
    age: shockwave.age + Math.max(0, dt),
    radius: Math.min(shockwave.maxRadius, shockwave.radius + shockwave.speed * Math.max(0, dt))
  }));

  let destroyedThisFrame = 0;
  for (const shockwave of updatedShockwaves) {
    for (const asteroid of [...nextAsteroids]) {
      if (
        destroyedThisFrame >= LEVEL_SHOCKWAVE_DESTROY_LIMIT_PER_FRAME ||
        asteroid.bossType ||
        destroyedAsteroidIds.has(asteroid.id) ||
        distance(shockwave.center, asteroid.position) > shockwave.radius + asteroid.radius * 0.7
      ) {
        continue;
      }

      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids, {
        split: false,
        emitPayout: false,
        emitDestroyAudio: false,
        particleMultiplier: 0.48
      });
      destroyedThisFrame += 1;
    }

    if (destroyedThisFrame >= LEVEL_SHOCKWAVE_DESTROY_LIMIT_PER_FRAME) {
      break;
    }
  }

  const spawnedDuringUpdate = state.levelShockwaves.filter((shockwave) => !existingIds.has(shockwave.id));
  const nextShockwaves = updatedShockwaves.filter((shockwave) => shockwave.age < shockwave.ttl && shockwave.radius < shockwave.maxRadius);
  state.levelShockwaves = [...nextShockwaves, ...spawnedDuringUpdate];
};
