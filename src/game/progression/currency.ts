import type { GameState } from '../simulation/types';

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
