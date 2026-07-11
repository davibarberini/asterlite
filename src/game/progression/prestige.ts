import type { ProgressionState } from '../simulation/types';
import { balance } from '../balance';

export const crystalsPerPrestigeCore = balance.economy.prestige.crystalsPerCore;
export const prestigeBonusPerCore = balance.economy.prestige.bonusPerCore;
export const minimumPrestigeTravelLevel = balance.economy.prestige.minimumTravelLevel;

export const getPrestigeMoneyMultiplier = (progression: ProgressionState): number =>
  1 + progression.prestigeCores * prestigeBonusPerCore;
