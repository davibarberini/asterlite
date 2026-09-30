import { getAchievementMultiplier } from '../../progression/achievements';
import { getShipFrameBonusMultiplier } from '../../progression/shipFrames';
import { getRunCardAreaMultiplier, getRunCardDamageMultiplier } from '../../progression/runCards';
import { balance } from '../../balance';
import type { GameState } from '../types';
import { distance } from '../vector';
import { burstParticles } from './particles';
import { destroyAsteroid } from './asteroidDestruction';
import { getHazardExplosionSpread } from './hazardEffects';
import { emitAudio } from '../events';

export const createEmberFlameWave = (state: GameState, baseDamage: number): void => {
  const maxRadius = balance.weapons.auraRadius * getRunCardAreaMultiplier(state);
  state.flameWaves.push({
    id: state.nextId++,
    center: { ...state.ship.position },
    radius: balance.weapons.flameWaveStartRadius,
    maxRadius,
    speed: balance.weapons.flameWaveSpeed,
    age: 0,
    ttl: (maxRadius - balance.weapons.flameWaveStartRadius) / balance.weapons.flameWaveSpeed +
      balance.weapons.flameWaveTtlPadding,
    damage: Math.max(0.05, baseDamage * balance.weapons.flameWaveDamageMultiplier),
    hitAsteroidIds: [],
    hitHazardIds: [],
    hitBossMinionIds: []
  });
  emitAudio(state, { type: 'emberFlameWave' });
};

export const updateEmberFlameWaves = (
  state: GameState,
  dt: number,
  destroyedAsteroidIds: Set<number>,
  destroyedHazardIds: Set<number>,
  destroyedBossMinionIds: Set<number>,
  nextAsteroids: GameState['asteroids'],
  nextHazards: GameState['hazards'],
  nextBossMinions: GameState['bossMinions']
): void => {
  if (dt <= 0 || state.flameWaves.length <= 0) {
    return;
  }

  state.flameWaves = state.flameWaves
    .map((wave) => {
      const nextWave = {
        ...wave,
        age: wave.age + dt,
        radius: Math.min(wave.maxRadius, wave.radius + wave.speed * dt),
        hitAsteroidIds: [...wave.hitAsteroidIds],
        hitHazardIds: [...wave.hitHazardIds],
        hitBossMinionIds: [...wave.hitBossMinionIds]
      };
      applyFlameWaveDamage(state, nextWave, destroyedAsteroidIds, destroyedHazardIds, destroyedBossMinionIds, nextAsteroids, nextHazards, nextBossMinions);
      return nextWave;
    })
    .filter((wave) => wave.age < wave.ttl && wave.radius < wave.maxRadius);
};

const applyFlameWaveDamage = (
  state: GameState,
  wave: GameState['flameWaves'][number],
  destroyedAsteroidIds: Set<number>,
  destroyedHazardIds: Set<number>,
  destroyedBossMinionIds: Set<number>,
  nextAsteroids: GameState['asteroids'],
  nextHazards: GameState['hazards'],
  nextBossMinions: GameState['bossMinions']
): void => {
  for (const asteroid of [...nextAsteroids]) {
    if (
      destroyedAsteroidIds.has(asteroid.id) ||
      wave.hitAsteroidIds.includes(asteroid.id) ||
      distance(wave.center, asteroid.position) > wave.radius + asteroid.radius * 0.72
    ) {
      continue;
    }

    wave.hitAsteroidIds.push(asteroid.id);
    asteroid.hp -= wave.damage;
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, asteroid.position, 5, asteroid.radius * 1.4);
    }
  }

  for (const hazard of nextHazards) {
    if (
      destroyedHazardIds.has(hazard.id) ||
      wave.hitHazardIds.includes(hazard.id) ||
      distance(wave.center, hazard.position) > wave.radius + hazard.radius
    ) {
      continue;
    }

    wave.hitHazardIds.push(hazard.id);
    hazard.hp -= wave.damage;
    if (hazard.hp <= 0) {
      destroyedHazardIds.add(hazard.id);
      burstParticles(state, hazard.position, hazard.kind === 'survivalHunter' ? 16 : 18, getHazardExplosionSpread(hazard));
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, hazard.position, hazard.kind === 'survivalHunter' ? 6 : 8, hazard.radius * 3.5);
    }
  }

  for (const minion of nextBossMinions) {
    if (
      destroyedBossMinionIds.has(minion.id) ||
      wave.hitBossMinionIds.includes(minion.id) ||
      distance(wave.center, minion.position) > wave.radius + minion.radius
    ) {
      continue;
    }

    wave.hitBossMinionIds.push(minion.id);
    minion.hp -= wave.damage;
    if (minion.hp <= 0) {
      destroyedBossMinionIds.add(minion.id);
      minion.alive = false;
      emitAudio(state, { type: 'saucerDestroyed' });
      burstParticles(state, minion.position, 14, minion.radius * 5.5);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, minion.position, 5, minion.radius * 3);
    }
  }
};

export const getEmberFlameWaveBaseDamage = (state: GameState): number => {
  const baseDamage = Math.max(
    0.05,
    balance.weapons.playerDamageMultiplier *
      getAchievementMultiplier(state.progression, 'damage') *
      getShipFrameBonusMultiplier(state.progression, 'damageMultiplier') *
      getRunCardDamageMultiplier(state)
  );
  return baseDamage;
};
