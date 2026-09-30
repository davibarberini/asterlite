import type { ProgressionState } from '../simulation/types';
import { balance } from '../balance';
import { getShipFrameBonusMultiplier } from './shipFrames';

export const getFireRateMultiplier = (progression: ProgressionState): number =>
  getShipFrameBonusMultiplier(progression, 'fireRateMultiplier');

export const getPlayerFireInterval = (progression: ProgressionState, baseInterval: number = balance.weapons.playerFireInterval): number =>
  Math.max(balance.weapons.minimumPlayerFireInterval, baseInterval / getFireRateMultiplier(progression));
