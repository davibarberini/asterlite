import { balance } from '../balance';
import { hasActiveZoneBoss } from '../simulation/systems/asteroids';
import type { GameState } from '../simulation/types';
import { zones } from '../simulation/zones';
import { crystalsPerPrestigeCore, getPrestigeCoreGain, minimumPrestigeTravelLevel } from './prestige';
import { WARP_UNLOCK_BY_ID, getAvailableWarpCores, hasWarpUnlock } from './warpUnlocks';

export type FirstWarpGoal = {
  type: 'installDroneSystems' | 'warpForFirstCore' | 'defeatGateBoss' | 'drawGateBoss' | 'collectWarpCrystals';
  progress: number;
  availableCores?: number;
  firstTechnologyCost?: number;
  coreGain?: number;
  destroyed?: number;
  asteroidTarget?: number;
  crystals?: number;
  crystalTarget?: number;
  nextZoneName?: string;
};

const clampProgress = (value: number): number => Math.max(0, Math.min(1, value));

export const getFirstWarpGoal = (state: GameState): FirstWarpGoal | null => {
  if (hasWarpUnlock(state.progression, 'droneSystems')) {
    return null;
  }

  const firstTechnologyCost = WARP_UNLOCK_BY_ID.droneSystems.cost;
  const availableCores = getAvailableWarpCores(state.progression);
  if (availableCores >= firstTechnologyCost) {
    return {
      type: 'installDroneSystems',
      progress: 1,
      availableCores,
      firstTechnologyCost
    };
  }

  const coreGain = getPrestigeCoreGain(state);
  if (coreGain > 0) {
    return {
      type: 'warpForFirstCore',
      progress: 1,
      coreGain
    };
  }

  if (state.progression.travelLevel < minimumPrestigeTravelLevel) {
    if (hasActiveZoneBoss(state)) {
      const nextZoneName = zones[minimumPrestigeTravelLevel]?.name ?? 'the next zone';
      return {
        type: 'defeatGateBoss',
        progress: 0.75,
        nextZoneName
      };
    }

    const destroyed = state.progression.achievementStats.asteroidsDestroyed;
    const target = balance.bosses.firstGateAsteroids;
    return {
      type: 'drawGateBoss',
      progress: clampProgress(destroyed / Math.max(1, target)),
      destroyed: Math.min(destroyed, target),
      asteroidTarget: target
    };
  }

  const crystals = Math.max(0, Math.floor(state.crystals));
  return {
    type: 'collectWarpCrystals',
    progress: clampProgress(crystals / crystalsPerPrestigeCore),
    crystals,
    crystalTarget: crystalsPerPrestigeCore
  };
};
