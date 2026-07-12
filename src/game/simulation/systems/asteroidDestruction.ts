import { getAchievementMultiplier, recordCrystalsCollected, recordMoneyEarned } from '../../progression/achievements';
import { grantNovaCrownBossCoreReward } from '../../progression/novaCrownRewards';
import { getAsteroidShipXpReward, grantShipXp } from '../../progression/shipLevel';
import { formatMoney } from '../../numberFormat';
import { recordPrismBossDefeatUnlockProgress } from '../../progression/shipUnlocks';
import { balance } from '../../balance';
import { emitAudio, emitReward } from '../events';
import type { GameState } from '../types';
import { getZoneByIndex, maxTravelLevel } from '../zones';
import { getAsteroidReward, splitAsteroid } from './asteroids';
import { burstParticles } from './particles';

export type DestroyAsteroidOptions = {
  split?: boolean;
  emitPayout?: boolean;
  emitDestroyAudio?: boolean;
  particleMultiplier?: number;
};

export const destroyAsteroid = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  nextAsteroids: GameState['asteroids'],
  options: DestroyAsteroidOptions = {}
): void => {
  const split = options.split ?? true;
  const emitPayoutEvent = options.emitPayout ?? true;
  const emitDestroyAudio = options.emitDestroyAudio ?? true;
  const particleMultiplier = options.particleMultiplier ?? 1;
  const reward = getAsteroidReward(state, asteroid);
  state.money += reward.money;
  state.crystals += reward.crystals;
  recordMoneyEarned(state.progression, reward.money);
  recordCrystalsCollected(state.progression, reward.crystals);
  state.progression.achievementStats.asteroidsDestroyed += 1;
  grantShipXp(state, getAsteroidShipXpReward(asteroid));
  if (!asteroid.bossType && state.progression.unlockedZoneIndex === 0) {
    state.progression.firstGateAsteroidsDestroyed += 1;
  }
  if (!asteroid.bossType && state.progression.unlockedZoneIndex > 0) {
    state.progression.bossDiscovery.rareBossProgress += 1;
  }
  if (asteroid.bossType && asteroid.bossZoneIndex !== undefined) {
    const unlockedZone = getZoneByIndex(asteroid.bossZoneIndex);
    state.progression.unlockedZoneIndex = Math.max(state.progression.unlockedZoneIndex, asteroid.bossZoneIndex);
    state.progression.travelLevel = state.progression.unlockedZoneIndex;
    state.progression.mapUnlocked = true;
    state.progression.bossDefeats += 1;
    if (asteroid.bossType === 'prism') {
      recordPrismBossDefeatUnlockProgress(state);
    }
    state.progression.bossDiscovery.rareBossProgress = 0;
    if (state.progression.currentZoneIndex >= maxTravelLevel) {
      grantNovaCrownBossCoreReward(state);
    }
    emitAudio(state, { type: 'bossDefeated' });
    emitAudio(state, { type: 'zoneUnlocked' });
    emitReward(state, `${unlockedZone.name} unlocked on map`, 'unlock');
    state.bullets = state.bullets.filter((bullet) => bullet.owner !== 'boss');
  }
  if (emitPayoutEvent) {
    emitReward(state, reward.crystals > 0 ? `+${formatMoney(reward.money)} credits  +${reward.crystals} crystals` : `+${formatMoney(reward.money)} credits`, 'payout');
  }
  if (emitDestroyAudio) {
    emitAudio(state, { type: 'asteroidDestroyed', size: asteroid.size });
  }
  burstParticles(
    state,
    asteroid.position,
    Math.max(3, Math.round((asteroid.size === 'large' ? 22 : 13) * particleMultiplier)),
    asteroid.radius * 4 * particleMultiplier
  );
  if (split) {
    nextAsteroids.push(...splitAsteroid(state, asteroid));
  }
};
