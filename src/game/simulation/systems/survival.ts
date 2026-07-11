import { balance } from '../../balance';
import { createBossRewardState } from '../../progression/bossRewards';
import {
  queueThreatMilestoneRewardChoice,
  getNextThreatRewardMilestone,
  getThreatRewardInterval
} from '../../progression/bossRewards';
import {
  getNovaCrownDifficultyConfig,
  novaCrownClearThreatLevel,
  normalizeNovaCrownDifficulty,
  setNovaCrownBestSeconds
} from '../../progression/novaCrownDifficulty';
import { grantNovaCrownFirstClearCoreReward } from '../../progression/novaCrownRewards';
import { emitReward } from '../events';
import type { GameState, SurvivalState } from '../types';
import { maxTravelLevel } from '../zones';

export const createSurvivalState = (): SurvivalState => ({
  active: false,
  difficulty: 1,
  currentSeconds: 0,
  threatLevel: 0,
  lastAnnouncedThreatLevel: 0,
  nextRewardThreatLevel: getThreatRewardInterval(),
  hazardSpawnCooldown: 0,
  hunterSpawnCooldown: 0,
  timedEventCooldown: 0,
  gravityPulseCooldown: 0,
  damageFieldCooldown: 0
});

export const isSurvivalZone = (state: GameState): boolean =>
  state.progression.currentZoneIndex >= maxTravelLevel;

export const getSurvivalThreatLevel = (seconds: number, difficulty = 1): number => {
  const config = getNovaCrownDifficultyConfig(difficulty);
  return Math.max(
    config.startingThreatLevel,
    Math.floor(Math.max(0, seconds) / config.threatLevelSeconds) + config.startingThreatLevel
  );
};

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
    state.survivalEvents = [];
    state.bullets = [];
    state.particles = [];
    state.levelShockwaves = [];
    resetCurrentSurvivalRun(state);
    return;
  }

  if (!state.survival.active) {
    state.survival.active = true;
    state.survival.currentSeconds = 0;
    state.survival.difficulty = normalizeNovaCrownDifficulty(state.progression.novaCrownSelectedDifficulty);
    state.survival.threatLevel = getSurvivalThreatLevel(0, state.survival.difficulty);
    state.survival.lastAnnouncedThreatLevel = state.survival.threatLevel;
    state.survival.nextRewardThreatLevel = getNextThreatRewardMilestone(state.survival.threatLevel);
    state.survival.hazardSpawnCooldown = balance.survival.mines.spawnInterval;
    state.survival.hunterSpawnCooldown = balance.survival.hunters.spawnInterval;
    state.survival.timedEventCooldown = balance.survival.timedEvents.meteorLane.spawnInterval;
    state.survival.gravityPulseCooldown = balance.survival.timedEvents.gravityPulse.spawnInterval;
    state.survival.damageFieldCooldown = balance.survival.timedEvents.damageField.spawnInterval;
    emitReward(state, 'Nova Crown survival started', 'system');
  }

  state.survival.currentSeconds += dt;
  state.survival.threatLevel = getSurvivalThreatLevel(state.survival.currentSeconds, state.survival.difficulty);

  if (state.survival.currentSeconds > state.progression.survivalBestSeconds) {
    state.progression.survivalBestSeconds = state.survival.currentSeconds;
  }
  state.progression.novaCrownBestSecondsByDifficulty = setNovaCrownBestSeconds(
    state.progression.novaCrownBestSecondsByDifficulty,
    state.survival.difficulty,
    state.survival.currentSeconds
  );
  if (state.survival.threatLevel > state.progression.survivalBestThreatLevel) {
    state.progression.survivalBestThreatLevel = state.survival.threatLevel;
  }
  if (
    state.survival.threatLevel >= novaCrownClearThreatLevel &&
    state.progression.novaCrownHighestDifficulty <= state.survival.difficulty
  ) {
    state.progression.novaCrownHighestDifficulty = state.survival.difficulty + 1;
    emitReward(state, `Nova Crown difficulty ${state.progression.novaCrownHighestDifficulty} unlocked`, 'unlock');
  }
  grantNovaCrownFirstClearCoreReward(state);
  queueThreatMilestoneRewardChoice(state);

  if (state.survival.threatLevel > state.survival.lastAnnouncedThreatLevel) {
    state.survival.lastAnnouncedThreatLevel = state.survival.threatLevel;
    emitReward(state, `Threat level ${state.survival.threatLevel}`, 'system');
  }
};

const resetCurrentSurvivalRun = (state: GameState): void => {
  const selectedDifficulty = normalizeNovaCrownDifficulty(state.progression.novaCrownSelectedDifficulty);
  state.survival.active = false;
  state.survival.difficulty = selectedDifficulty;
  state.survival.currentSeconds = 0;
  state.survival.threatLevel = 0;
  state.survival.lastAnnouncedThreatLevel = 0;
  state.survival.nextRewardThreatLevel = getThreatRewardInterval();
  state.survival.hazardSpawnCooldown = 0;
  state.survival.hunterSpawnCooldown = 0;
  state.survival.timedEventCooldown = 0;
  state.survival.gravityPulseCooldown = 0;
  state.survival.damageFieldCooldown = 0;
  state.survivalEvents = [];
  state.bossRewards = createBossRewardState();
};

const formatSurvivalSeconds = (seconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
