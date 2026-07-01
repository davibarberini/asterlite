import type { GameState } from '../simulation/types';
import { crystalsPerPrestigeCore, getPrestigeCoreGain, minimumPrestigeTravelLevel } from './prestige';

export type ShipExchangeRequirement = {
  ready: boolean;
  coreGain: number;
  crystals: number;
  missingCrystalsForCore: number;
  missionCompletions: number;
  requiredMissionCompletions: number;
  missingMissionCompletions: number;
  needsRoute: boolean;
  needsCore: boolean;
  needsMissions: boolean;
};

export const getRequiredMissionCompletionsForExchange = (completedExchanges: number): number => {
  if (completedExchanges <= 0) {
    return 0;
  }

  return 4 + (completedExchanges - 1) * 2;
};

export const getShipExchangeMissionCompletions = (state: GameState): number =>
  state.progression.guidedMissions.completedMissionIds.length + state.progression.guidedMissions.repeatCompletions;

export const getShipExchangeRequirement = (state: GameState): ShipExchangeRequirement => {
  const coreGain = getPrestigeCoreGain(state);
  const crystals = state.crystals;
  const requiredMissionCompletions = getRequiredMissionCompletionsForExchange(state.progression.shipExchanges);
  const missionCompletions = getShipExchangeMissionCompletions(state);
  const missingMissionCompletions = Math.max(0, requiredMissionCompletions - missionCompletions);
  const remainder = crystals % crystalsPerPrestigeCore;
  const missingCrystalsForCore = remainder === 0 ? crystalsPerPrestigeCore : crystalsPerPrestigeCore - remainder;
  const needsRoute = state.progression.travelLevel < minimumPrestigeTravelLevel;
  const needsCore = coreGain <= 0;
  const needsMissions = missingMissionCompletions > 0;

  return {
    ready: !needsRoute && !needsCore && !needsMissions,
    coreGain,
    crystals,
    missingCrystalsForCore,
    missionCompletions,
    requiredMissionCompletions,
    missingMissionCompletions,
    needsRoute,
    needsCore,
    needsMissions
  };
};
