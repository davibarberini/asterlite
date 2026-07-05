import { balance } from '../../balance';
import { emitReward } from '../events';
import type { GameState, SurvivalState } from '../types';
import { maxTravelLevel } from '../zones';

export const createSurvivalState = (): SurvivalState => ({
  active: false,
  currentSeconds: 0,
  threatLevel: 0,
  lastAnnouncedThreatLevel: 0,
  hazardSpawnCooldown: 0
});

export const isSurvivalZone = (state: GameState): boolean =>
  state.progression.currentZoneIndex >= maxTravelLevel;

export const getSurvivalThreatLevel = (seconds: number): number =>
  Math.max(1, Math.floor(Math.max(0, seconds) / balance.survival.threatLevelSeconds) + 1);

export const getSurvivalAsteroidDensityBonus = (state: GameState): number => {
  if (!isSurvivalZone(state) || state.survival.threatLevel <= 1) {
    return 0;
  }

  return Math.min(
    balance.survival.maxAsteroidDensityBonus,
    (state.survival.threatLevel - 1) * balance.survival.asteroidDensityPerThreat
  );
};

export const getSurvivalAsteroidSpeedMultiplier = (state: GameState): number => {
  if (!isSurvivalZone(state) || state.survival.threatLevel <= 1) {
    return 1;
  }

  return Math.min(
    balance.survival.maxAsteroidSpeedMultiplier,
    1 + (state.survival.threatLevel - 1) * balance.survival.asteroidSpeedPerThreat
  );
};

export const updateSurvival = (state: GameState, dt: number): void => {
  if (!isSurvivalZone(state)) {
    resetCurrentSurvivalRun(state);
    return;
  }

  if (!state.ship.alive) {
    if (state.survival.active || state.survival.currentSeconds > 0) {
      emitReward(state, `Survival ended: ${formatSurvivalSeconds(state.survival.currentSeconds)}`, 'system');
    }
    state.progression.currentZoneIndex = Math.max(0, maxTravelLevel - 1);
    state.progression.travelLevel = state.progression.unlockedZoneIndex;
    state.pendingBoss = null;
    state.saucer = null;
    state.asteroids = [];
    state.hazards = [];
    state.bullets = [];
    state.particles = [];
    resetCurrentSurvivalRun(state);
    return;
  }

  if (!state.survival.active) {
    state.survival.active = true;
    state.survival.currentSeconds = 0;
    state.survival.threatLevel = 1;
    state.survival.lastAnnouncedThreatLevel = 1;
    state.survival.hazardSpawnCooldown = balance.survival.mines.spawnInterval;
    emitReward(state, 'Nova Crown survival started', 'system');
  }

  state.survival.currentSeconds += dt;
  state.survival.threatLevel = getSurvivalThreatLevel(state.survival.currentSeconds);

  if (state.survival.currentSeconds > state.progression.survivalBestSeconds) {
    state.progression.survivalBestSeconds = state.survival.currentSeconds;
  }
  if (state.survival.threatLevel > state.progression.survivalBestThreatLevel) {
    state.progression.survivalBestThreatLevel = state.survival.threatLevel;
  }

  if (state.survival.threatLevel > state.survival.lastAnnouncedThreatLevel) {
    state.survival.lastAnnouncedThreatLevel = state.survival.threatLevel;
    emitReward(state, `Threat level ${state.survival.threatLevel}`, 'system');
  }
};

const resetCurrentSurvivalRun = (state: GameState): void => {
  state.survival.active = false;
  state.survival.currentSeconds = 0;
  state.survival.threatLevel = 0;
  state.survival.lastAnnouncedThreatLevel = 0;
  state.survival.hazardSpawnCooldown = 0;
};

const formatSurvivalSeconds = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
