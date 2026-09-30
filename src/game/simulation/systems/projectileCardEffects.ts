import type { AsteroidState, BulletState, GameState } from '../types';
import { destroyAsteroid } from './asteroidDestruction';
import { burstParticles } from './particles';

export const applyProjectileBurn = (bullet: BulletState, asteroid: AsteroidState): void => {
  if ((bullet.burnDamagePerSecond ?? 0) <= 0) return;
  asteroid.burn = {
    seconds: 3,
    damagePerSecond: Math.max(asteroid.burn?.damagePerSecond ?? 0, bullet.burnDamagePerSecond!)
  };
};

export const spawnKillFragments = (state: GameState, bullet: BulletState, asteroid: AsteroidState): void => {
  const count = bullet.fragmentCount ?? 0;
  const speed = Math.max(100, Math.hypot(bullet.velocity.x, bullet.velocity.y));
  const heading = Math.atan2(bullet.velocity.y, bullet.velocity.x);
  for (let index = 0; index < count; index += 1) {
    const angle = heading + (index / count) * Math.PI * 2;
    state.bullets.push({
      ...bullet,
      id: state.nextId++,
      position: { ...asteroid.position },
      velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
      age: 0,
      damage: bullet.damage * 0.35,
      radius: Math.max(2, bullet.radius * 0.65),
      kind: 'standard',
      fragmentCount: 0,
      burnDamagePerSecond: (bullet.burnDamagePerSecond ?? 0) * 0.35,
      hitTargetIds: [asteroid.id]
    });
  }
  if (count > 0) burstParticles(state, asteroid.position, 6, 90);
};

export const updateProjectileBurns = (
  state: GameState, dt: number, asteroids: AsteroidState[], destroyed: Set<number>
): void => {
  if (dt <= 0) return;
  for (const asteroid of [...asteroids]) {
    if (!asteroid.burn || destroyed.has(asteroid.id)) continue;
    const elapsed = Math.min(dt, asteroid.burn.seconds);
    asteroid.hp -= elapsed * asteroid.burn.damagePerSecond;
    asteroid.burn.seconds = Math.max(0, asteroid.burn.seconds - elapsed);
    if (asteroid.burn.seconds === 0) delete asteroid.burn;
    if (asteroid.hp <= 0) {
      destroyed.add(asteroid.id);
      destroyAsteroid(state, asteroid, asteroids);
    }
  }
};
