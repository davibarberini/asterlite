import type { GameState, ProgressionState } from '../simulation/types';
import { createGameState, createProgression } from '../simulation/state';
import { balance } from '../balance';
import { applyOwnedWarpUnlockEffects } from './warpUnlocks';
import { normalizeShipFrameIds } from './shipFrames';
import { createDefaultShipRun, withCapturedActiveShipRun } from './shipRuns';
import { isSurvivalZone } from '../simulation/systems/survival';

export const crystalsPerPrestigeCore = balance.economy.prestige.crystalsPerCore;
export const prestigeBonusPerCore = balance.economy.prestige.bonusPerCore;
export const minimumPrestigeTravelLevel = balance.economy.prestige.minimumTravelLevel;
export const minimumCoreResetThreatLevel = 10;

export const getPrestigeMoneyMultiplier = (progression: ProgressionState): number =>
  1 + progression.prestigeCores * prestigeBonusPerCore;

export const getPrestigeCoreGain = (state: GameState): number => {
  if (!state.survival.active || !isSurvivalZone(state) || state.survival.threatLevel < minimumCoreResetThreatLevel) {
    return 0;
  }

  return Math.max(1, Math.floor(state.survival.threatLevel / minimumCoreResetThreatLevel));
};

export const createCoreResetState = (previousState: GameState, width: number, height: number, coreGain: number): GameState => {
  const permanentProgression = createProgression();
  const unlockedShipFrameIds = normalizeShipFrameIds(previousState.progression.unlockedShipFrameIds);
  const activeShipFrameId = unlockedShipFrameIds.includes(previousState.progression.activeShipFrameId)
    ? previousState.progression.activeShipFrameId
    : 'vector';
  permanentProgression.prestigeCores = previousState.progression.prestigeCores + Math.max(0, Math.floor(coreGain));
  permanentProgression.ownedWarpUnlockIds = [...previousState.progression.ownedWarpUnlockIds];
  permanentProgression.announcedAffordableWarpUnlockIds = [...previousState.progression.announcedAffordableWarpUnlockIds];
  permanentProgression.guidedMissions = {
    activeMissionId: previousState.progression.guidedMissions.activeMissionId,
    completedMissionIds: [...previousState.progression.guidedMissions.completedMissionIds],
    repeatCompletions: previousState.progression.guidedMissions.repeatCompletions,
    startedAt: { ...previousState.progression.guidedMissions.startedAt }
  };
  permanentProgression.shipExchanges = previousState.progression.shipExchanges;
  permanentProgression.unlockedShipFrameIds = unlockedShipFrameIds;
  permanentProgression.activeShipFrameId = activeShipFrameId;
  permanentProgression.shipUnlockProgress = { ...previousState.progression.shipUnlockProgress };
  permanentProgression.survivalBestSeconds = previousState.progression.survivalBestSeconds;
  permanentProgression.survivalBestThreatLevel = previousState.progression.survivalBestThreatLevel;
  permanentProgression.novaCrownHighestDifficulty = previousState.progression.novaCrownHighestDifficulty;
  permanentProgression.novaCrownSelectedDifficulty = previousState.progression.novaCrownSelectedDifficulty;
  permanentProgression.novaCrownBestSecondsByDifficulty = {
    ...previousState.progression.novaCrownBestSecondsByDifficulty
  };
  permanentProgression.novaCrownCoreRewardedDifficultyKeys = [
    ...previousState.progression.novaCrownCoreRewardedDifficultyKeys
  ];
  permanentProgression.shipRuns = {
    ...withCapturedActiveShipRun(previousState),
    [activeShipFrameId]: createDefaultShipRun()
  };
  permanentProgression.spreadUnlocked = previousState.progression.spreadUnlocked;
  permanentProgression.piercingUnlocked = previousState.progression.piercingUnlocked;
  applyOwnedWarpUnlockEffects(permanentProgression);

  const nextState = createGameState(width, height, permanentProgression);
  nextState.progression.achievementStats = { ...previousState.progression.achievementStats };
  nextState.progression.unlockedAchievements = { ...previousState.progression.unlockedAchievements };
  nextState.progression.achievementStats.prestigeWarps += 1;
  return nextState;
};

export const createWarpResetState = createCoreResetState;
