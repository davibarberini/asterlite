import type { GameState } from '../simulation/types';
import { emitReward } from '../simulation/events';
import {
  getNovaCrownDifficultyKey,
  novaCrownClearThreatLevel,
  normalizeNovaCrownDifficulty
} from './novaCrownDifficulty';

export const getNovaCrownCoreReward = (difficulty: number): number =>
  Math.max(1, Math.ceil(normalizeNovaCrownDifficulty(difficulty) / 3));

export const normalizeNovaCrownCoreRewardedDifficultyKeys = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map((entry) => Number(entry))
        .filter((entry) => Number.isFinite(entry) && entry >= 1)
        .map((entry) => getNovaCrownDifficultyKey(entry))
    )
  );
};

export const grantNovaCrownBossCoreReward = (state: GameState): number => {
  const difficulty = normalizeNovaCrownDifficulty(state.survival.active
    ? state.survival.difficulty
    : state.progression.novaCrownSelectedDifficulty);
  const coreGain = getNovaCrownCoreReward(difficulty);
  state.progression.prestigeCores += coreGain;
  emitReward(state, `Nova Crown boss defeated: +${coreGain} ${formatCoreUnit(coreGain)}`, 'boss');
  return coreGain;
};

export const grantNovaCrownFirstClearCoreReward = (state: GameState): number => {
  if (!state.survival.active || state.survival.threatLevel < novaCrownClearThreatLevel) {
    return 0;
  }

  const difficulty = normalizeNovaCrownDifficulty(state.survival.difficulty);
  const key = getNovaCrownDifficultyKey(difficulty);
  if (state.progression.novaCrownCoreRewardedDifficultyKeys.includes(key)) {
    return 0;
  }

  const coreGain = getNovaCrownCoreReward(difficulty);
  state.progression.novaCrownCoreRewardedDifficultyKeys = [
    ...state.progression.novaCrownCoreRewardedDifficultyKeys,
    key
  ];
  state.progression.prestigeCores += coreGain;
  emitReward(state, `Nova Crown difficulty ${difficulty} cleared: +${coreGain} ${formatCoreUnit(coreGain)}`, 'unlock');
  return coreGain;
};

const formatCoreUnit = (count: number): string =>
  count === 1 ? 'core' : 'cores';
