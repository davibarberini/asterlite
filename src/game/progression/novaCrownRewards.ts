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

export const grantNovaCrownMilestoneRewards = (state: GameState): number => {
  if (!state.survival.active || state.survival.threatLevel < novaCrownClearThreatLevel) {
    return 0;
  }

  const difficulty = normalizeNovaCrownDifficulty(state.survival.difficulty);
  const key = getNovaCrownDifficultyKey(difficulty);
  const reachedMilestones = Math.floor((state.survival.threatLevel - 1) / 10);
  const newMilestones = Math.max(0, reachedMilestones - state.run.survivalMilestones);
  const coreGain = newMilestones * getNovaCrownCoreReward(difficulty);
  state.run.survivalMilestones = Math.max(state.run.survivalMilestones, reachedMilestones);
  state.run.coresEarned += coreGain;
  state.progression.prestigeCores += coreGain;
  if (coreGain > 0) emitReward(state, `Nova Crown: +${coreGain} ${formatCoreUnit(coreGain)}`, 'payout');
  if (state.progression.novaCrownCoreRewardedDifficultyKeys.includes(key)) {
    return coreGain;
  }

  state.progression.novaCrownCoreRewardedDifficultyKeys = [
    ...state.progression.novaCrownCoreRewardedDifficultyKeys,
    key
  ];
  emitReward(state, `Nova Crown difficulty ${difficulty} cleared: +${coreGain} ${formatCoreUnit(coreGain)}`, 'unlock');
  return coreGain;
};

const formatCoreUnit = (count: number): string =>
  count === 1 ? 'core' : 'cores';
