import { balance } from '../balance';
import { hasActiveZoneBoss } from '../simulation/systems/asteroids';
import type { GameState } from '../simulation/types';
import { zones } from '../simulation/zones';
import { crystalsPerPrestigeCore, getPrestigeCoreGain, minimumPrestigeTravelLevel } from './prestige';
import { WARP_UNLOCK_BY_ID, getAvailableWarpCores, hasWarpUnlock } from './warpUnlocks';

export type FirstWarpGoal = {
  title: string;
  detail: string;
  progress: number;
  progressLabel: string;
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
      title: 'Install Drone Systems',
      detail: 'Open Technologies and spend your first core.',
      progress: 1,
      progressLabel: `${availableCores}/${firstTechnologyCost} core`
    };
  }

  const coreGain = getPrestigeCoreGain(state);
  if (coreGain > 0) {
    return {
      title: 'Warp for your first core',
      detail: 'Open Technologies and reset this run.',
      progress: 1,
      progressLabel: `+${coreGain} core${coreGain === 1 ? '' : 's'} ready`
    };
  }

  if (state.progression.travelLevel < minimumPrestigeTravelLevel) {
    if (hasActiveZoneBoss(state)) {
      const nextZoneName = zones[minimumPrestigeTravelLevel]?.name ?? 'the next zone';
      return {
        title: 'Defeat the gate boss',
        detail: `Unlock ${nextZoneName} to make warp cores possible.`,
        progress: 0.75,
        progressLabel: 'Boss active'
      };
    }

    const destroyed = state.progression.achievementStats.asteroidsDestroyed;
    const target = balance.bosses.firstGateAsteroids;
    const remaining = Math.max(0, target - destroyed);
    return {
      title: 'Draw out the gate boss',
      detail: remaining > 0
        ? `${remaining} asteroid${remaining === 1 ? '' : 's'} until the first signal.`
        : 'The first boss signal is ready.',
      progress: clampProgress(destroyed / Math.max(1, target)),
      progressLabel: `${Math.min(destroyed, target)}/${target} asteroids`
    };
  }

  const crystals = Math.max(0, Math.floor(state.crystals));
  return {
    title: 'Collect warp crystals',
    detail: 'Crystal asteroids and bosses fund the first reset.',
    progress: clampProgress(crystals / crystalsPerPrestigeCore),
    progressLabel: `${crystals}/${crystalsPerPrestigeCore} crystals`
  };
};
