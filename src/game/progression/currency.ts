import type { GameState, TalentId } from '../simulation/types';
import { canBuyTalentRank, createTalentRanks } from './talentTree';
import { getTalentPointCost } from './shipLevel';

export const crystalRespecCostPerSkillPoint = 8;

export const getCrystalBalance = (state: GameState): number => {
  const balance = Math.max(0, Math.floor(state.crystals));
  if (state.crystals !== balance) {
    state.crystals = balance;
  }
  return balance;
};

export const spendCrystals = (state: GameState, cost: number): boolean => {
  const normalizedCost = Math.max(0, Math.floor(cost));
  const balance = getCrystalBalance(state);
  if (balance < normalizedCost) {
    return false;
  }

  state.crystals = balance - normalizedCost;
  return true;
};

export const purchaseTalentRank = (state: GameState, id: TalentId): boolean => {
  const cost = getTalentPointCost();
  if (!canBuyTalentRank(state.progression, id)) {
    return false;
  }

  state.progression.talentRanks[id] += 1;
  state.progression.spentShipSkillPoints += cost;
  return true;
};

export const getTalentRespecCost = (state: GameState): number =>
  Math.max(0, Math.floor(state.progression.spentShipSkillPoints)) * crystalRespecCostPerSkillPoint;

export const respecTalentRanks = (state: GameState): boolean => {
  const cost = getTalentRespecCost(state);
  if (cost <= 0 || !spendCrystals(state, cost)) {
    return false;
  }

  state.progression.talentRanks = createTalentRanks();
  state.progression.spentShipSkillPoints = 0;
  return true;
};
