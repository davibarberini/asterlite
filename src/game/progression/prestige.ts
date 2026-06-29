import type { GameState, ProgressionState } from '../simulation/types';
import { createGameState, createProgression } from '../simulation/state';
import { balance } from '../balance';
import { applyOwnedWarpUnlockEffects } from './warpUnlocks';

export const crystalsPerPrestigeCore = balance.economy.prestige.crystalsPerCore;
export const prestigeBonusPerCore = balance.economy.prestige.bonusPerCore;
export const minimumPrestigeTravelLevel = balance.economy.prestige.minimumTravelLevel;

export const getPrestigeMoneyMultiplier = (progression: ProgressionState): number =>
  1 + progression.prestigeCores * prestigeBonusPerCore;

export const getPrestigeCoreGain = (state: GameState): number => {
  if (state.progression.travelLevel < minimumPrestigeTravelLevel) {
    return 0;
  }

  return Math.floor(state.crystals / crystalsPerPrestigeCore);
};

export const createWarpResetState = (previousState: GameState, width: number, height: number, coreGain: number): GameState => {
  const permanentProgression = createProgression();
  permanentProgression.prestigeCores = previousState.progression.prestigeCores + Math.max(0, Math.floor(coreGain));
  permanentProgression.ownedWarpUnlockIds = [...previousState.progression.ownedWarpUnlockIds];
  permanentProgression.announcedAffordableWarpUnlockIds = [...previousState.progression.announcedAffordableWarpUnlockIds];
  permanentProgression.maxHp = previousState.progression.maxHp;
  permanentProgression.armor = previousState.progression.armor;
  permanentProgression.shipDamageLevel = previousState.progression.shipDamageLevel;
  permanentProgression.shipFireRateLevel = previousState.progression.shipFireRateLevel;
  permanentProgression.shipSpeedLevel = previousState.progression.shipSpeedLevel;
  permanentProgression.deflectorLevel = previousState.progression.deflectorLevel;
  permanentProgression.spreadUnlocked = previousState.progression.spreadUnlocked;
  permanentProgression.piercingUnlocked = previousState.progression.piercingUnlocked;
  applyOwnedWarpUnlockEffects(permanentProgression);

  const nextState = createGameState(width, height, permanentProgression);
  nextState.progression.achievementStats = { ...previousState.progression.achievementStats };
  nextState.progression.unlockedAchievements = { ...previousState.progression.unlockedAchievements };
  nextState.progression.achievementStats.prestigeWarps += 1;
  return nextState;
};
