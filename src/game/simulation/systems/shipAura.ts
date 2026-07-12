import { getAchievementMultiplier } from '../../progression/achievements';
import { getBossRewardPlayerDamageMultiplier, getBossRewardPlayerFireIntervalMultiplier } from '../../progression/bossRewards';
import { getFireRateMultiplier } from '../../progression/idleBonuses';
import { getShipFrameBonusMultiplier, getShipFrameWeaponIdentity } from '../../progression/shipFrames';
import { balance } from '../../balance';
import type { GameState } from '../types';
import { distance } from '../vector';
import { burstParticles } from './particles';
import { destroyAsteroid } from './asteroidDestruction';
import { getHazardExplosionSpread } from './hazardEffects';

export const applyShipAuraDamage = (
  state: GameState,
  dt: number,
  destroyedAsteroidIds: Set<number>,
  destroyedHazardIds: Set<number>,
  nextAsteroids: GameState['asteroids'],
  nextHazards: GameState['hazards']
): void => {
  if (
    dt <= 0 ||
    !state.ship.alive ||
    getShipFrameWeaponIdentity(state.progression) !== 'aura'
  ) {
    return;
  }

  const damage = getShipAuraDamagePerSecond(state) * dt;
  const radius = balance.weapons.auraRadius;
  for (const asteroid of [...nextAsteroids]) {
    if (destroyedAsteroidIds.has(asteroid.id) || distance(state.ship.position, asteroid.position) > radius + asteroid.radius) {
      continue;
    }
    asteroid.hp -= damage;
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    }
  }

  for (const hazard of nextHazards) {
    if (destroyedHazardIds.has(hazard.id) || distance(state.ship.position, hazard.position) > radius + hazard.radius) {
      continue;
    }
    hazard.hp -= damage;
    if (hazard.hp <= 0) {
      destroyedHazardIds.add(hazard.id);
      burstParticles(state, hazard.position, hazard.kind === 'survivalHunter' ? 16 : 18, getHazardExplosionSpread(hazard));
    }
  }
};

const getShipAuraDamagePerSecond = (state: GameState): number => {
  const baseDamage = Math.max(
    0.05,
    state.progression.shipDamageLevel *
      balance.weapons.playerDamageMultiplier *
      getAchievementMultiplier(state.progression, 'damage') *
      getShipFrameBonusMultiplier(state.progression, 'damageMultiplier') *
      getBossRewardPlayerDamageMultiplier(state)
  );
  return baseDamage *
    balance.weapons.auraDamagePerSecondMultiplier *
    getFireRateMultiplier(state.progression) /
    getBossRewardPlayerFireIntervalMultiplier(state);
};
