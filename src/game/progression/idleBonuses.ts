import type { ProgressionState } from '../simulation/types';
import { balance } from '../balance';
import { getShipFrameBonusMultiplier } from './shipFrames';

export const getCoreUpgradeCap = (_progression: ProgressionState): number =>
  balance.shop.upgradeBaseCap;

export const getFireRateMultiplier = (progression: ProgressionState): number =>
  (1 + progression.shipFireRateLevel * (balance.shop.ship.fireRate.bonusPercentPerLevel / 100)) *
  getShipFrameBonusMultiplier(progression, 'fireRateMultiplier');

export const getPlayerFireInterval = (progression: ProgressionState, baseInterval: number = balance.weapons.playerFireInterval): number =>
  Math.max(balance.shop.ship.fireRate.minimumInterval, baseInterval / getFireRateMultiplier(progression));
