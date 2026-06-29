import type { ProgressionState } from '../simulation/types';
import { balance } from '../balance';

export const refineryMilestoneStep = 5;
export const refineryMilestoneBonus = 0.22;
export const droneWingMilestoneStep = 3;

export const getRefineryMilestoneMultiplier = (level: number): number =>
  1 + Math.floor(level / refineryMilestoneStep) * refineryMilestoneBonus;

export const getRefineryNextMilestoneLevel = (level: number): number =>
  Math.floor(level / refineryMilestoneStep) * refineryMilestoneStep + refineryMilestoneStep;

export const getDroneWingTier = (count: number): number =>
  Math.floor(count / droneWingMilestoneStep);

export const getCoreUpgradeCap = (_progression: ProgressionState): number =>
  balance.shop.upgradeBaseCap;

export const getFireRateMultiplier = (progression: ProgressionState): number =>
  1 + progression.shipFireRateLevel * (balance.shop.ship.fireRate.bonusPercentPerLevel / 100);

export const getPlayerFireInterval = (progression: ProgressionState, baseInterval: number = balance.weapons.playerFireInterval): number =>
  Math.max(balance.shop.ship.fireRate.minimumInterval, baseInterval / getFireRateMultiplier(progression));
