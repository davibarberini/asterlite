import type { ProgressionState, WarpUnlockId } from '../simulation/types';

export type WarpUnlockDefinition = {
  id: WarpUnlockId;
  title: string;
  summary: string;
  effectSummary: string;
  impactTarget: 'drones' | 'boss' | 'weapons' | 'defense';
  impactDetail: string;
  iconId: string;
  cost: number;
  route: { col: number; row: number };
  requires: WarpUnlockId[];
};

export type WarpUnlockNodeState = 'owned' | 'available' | 'locked' | 'unaffordable';

export const WARP_UNLOCK_GRID_COLUMNS = 3;
export const WARP_UNLOCK_GRID_ROWS = 6;

export const WARP_UNLOCK_DEFINITIONS: WarpUnlockDefinition[] = [
  {
    id: 'droneSystems',
    title: 'Drone Systems',
    summary: 'Authorizes drone bay systems and the first semi-auto support drone package.',
    effectSummary: 'Unlocks drone purchases after this node.',
    impactTarget: 'drones',
    impactDetail: 'Drones tab: enables Semi-Auto drone purchases.',
    iconId: 'warp-drone',
    cost: 1,
    route: { col: 2, row: 1 },
    requires: []
  },
  {
    id: 'bossBeacon',
    title: 'Boss Beacon',
    summary: 'Installs a gate-boss signal beacon for deliberate route challenges.',
    effectSummary: 'Unlocks manual boss summoning from Technologies.',
    impactTarget: 'boss',
    impactDetail: 'Technologies panel: adds manual boss summoning.',
    iconId: 'warp-boss',
    cost: 2,
    route: { col: 1, row: 2 },
    requires: ['droneSystems']
  },
  {
    id: 'deflectorFrame',
    title: 'Deflector Prow',
    summary: 'Installs a directional prow deflector for collision-based asteroid control.',
    effectSummary: 'Unlocks the directional deflector mechanic.',
    impactTarget: 'defense',
    impactDetail: 'Ship systems: enables the directional deflector.',
    iconId: 'warp-deflector',
    cost: 4,
    route: { col: 1, row: 3 },
    requires: ['bossBeacon']
  },
  {
    id: 'shieldBubble',
    title: 'Shield Bubble',
    summary: 'Installs a circular rechargeable shield envelope around the ship.',
    effectSummary: 'Absorbs one hit, breaks, then recharges.',
    impactTarget: 'defense',
    impactDetail: 'Ship systems: adds a rechargeable hit shield.',
    iconId: 'warp-shield',
    cost: 7,
    route: { col: 1, row: 4 },
    requires: ['deflectorFrame']
  },
  {
    id: 'rangerHangar',
    title: 'Ranger Hangar',
    summary: 'Adds hangar capacity for shotgun-focused ranger drones.',
    effectSummary: 'Unlocks shotgun drone purchases after this node.',
    impactTarget: 'drones',
    impactDetail: 'Drones tab: enables Shotgun drone purchases.',
    iconId: 'warp-ranger',
    cost: 5,
    route: { col: 2, row: 3 },
    requires: ['droneSystems']
  },
  {
    id: 'missileFoundry',
    title: 'Missile Foundry',
    summary: 'Opens the foundry systems needed for missile breaker drones.',
    effectSummary: 'Unlocks missile drone purchases after this node.',
    impactTarget: 'drones',
    impactDetail: 'Drones tab: enables Missile drone purchases.',
    iconId: 'warp-missile',
    cost: 8,
    route: { col: 2, row: 4 },
    requires: ['rangerHangar']
  },
];

export const WARP_UNLOCK_BY_ID = Object.fromEntries(WARP_UNLOCK_DEFINITIONS.map((unlock) => [unlock.id, unlock])) as Record<
  WarpUnlockId,
  WarpUnlockDefinition
>;

export const hasWarpUnlock = (progression: ProgressionState, id: WarpUnlockId): boolean =>
  progression.ownedWarpUnlockIds.includes(id);

export const meetsWarpUnlockRequirements = (progression: ProgressionState, id: WarpUnlockId): boolean =>
  WARP_UNLOCK_BY_ID[id].requires.every((requiredId) => hasWarpUnlock(progression, requiredId));

export const getWarpUnlockNodeState = (progression: ProgressionState, availableCores: number, id: WarpUnlockId): WarpUnlockNodeState => {
  if (hasWarpUnlock(progression, id)) {
    return 'owned';
  }

  if (!meetsWarpUnlockRequirements(progression, id)) {
    return 'locked';
  }

  return availableCores >= WARP_UNLOCK_BY_ID[id].cost ? 'available' : 'unaffordable';
};

export const getOwnedWarpUnlockCount = (progression: ProgressionState): number =>
  WARP_UNLOCK_DEFINITIONS.reduce((count, unlock) => count + (hasWarpUnlock(progression, unlock.id) ? 1 : 0), 0);

export const getSpentWarpCores = (progression: ProgressionState): number =>
  WARP_UNLOCK_DEFINITIONS.reduce((total, unlock) => total + (hasWarpUnlock(progression, unlock.id) ? unlock.cost : 0), 0);

export const getAvailableWarpCores = (progression: ProgressionState): number =>
  Math.max(0, progression.prestigeCores - getSpentWarpCores(progression));

export const applyOwnedWarpUnlockEffects = (progression: ProgressionState): void => {
  if (hasWarpUnlock(progression, 'deflectorFrame')) {
    progression.deflectorLevel = Math.max(progression.deflectorLevel, 1);
  }

};

export const purchaseWarpUnlock = (progression: ProgressionState, id: WarpUnlockId): boolean => {
  const availableCores = getAvailableWarpCores(progression);
  if (getWarpUnlockNodeState(progression, availableCores, id) !== 'available') {
    return false;
  }

  progression.ownedWarpUnlockIds = [...progression.ownedWarpUnlockIds, id];
  applyOwnedWarpUnlockEffects(progression);
  return true;
};
