import type { GameState, TalentId } from '../simulation/types';
import { canBuyTalentRank, getTalentCost, getTalentRank } from './talentTree';

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
  const cost = getTalentCost(id, getTalentRank(state.progression, id));
  if (!canBuyTalentRank(state.progression, getCrystalBalance(state), id) || !spendCrystals(state, cost)) {
    return false;
  }

  state.progression.talentRanks[id] += 1;
  return true;
};
