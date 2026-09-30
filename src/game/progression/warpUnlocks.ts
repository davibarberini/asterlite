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
export const bossSuppressionAsteroidTargetMultiplier = 0.55;
export const bossSuppressionMinimumAsteroidTarget = 4;

export const WARP_UNLOCK_DEFINITIONS: WarpUnlockDefinition[] = [
  {
    id: 'launchLoadout',
    title: 'Launch Loadout',
    summary: 'Choose a temporary build card at the start of every new run.',
    effectSummary: 'Starts each new run with one card choice.',
    impactTarget: 'weapons',
    impactDetail: 'New runs only: one normal card choice before combat.',
    iconId: 'warp-loadout',
    cost: 1,
    route: { col: 3, row: 3 },
    requires: []
  },
  {
    id: 'expandedDraft',
    title: 'Expanded Draft',
    summary: 'Expand the selection without changing card rarity or ship restrictions.',
    effectSummary: 'Choose one of four cards instead of three.',
    impactTarget: 'weapons',
    impactDetail: 'Applies to new offers from levels, bosses, and launch loadouts.',
    iconId: 'warp-draft',
    cost: 3,
    route: { col: 3, row: 4 },
    requires: ['launchLoadout']
  },
  {
    id: 'droneSystems',
    title: 'Drone Systems',
    summary: 'Adds temporary sentry drones to the run card pool.',
    effectSummary: 'Unlocks the Sentry Wing card.',
    impactTarget: 'drones',
    impactDetail: 'Card choices: Sentry Wing recruits one temporary sentry.',
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
    id: 'bossSuppression',
    title: 'Boss Suppression',
    summary: 'Diverts asteroid traffic while a gate boss is active.',
    effectSummary: 'Reduces asteroid density during active boss fights.',
    impactTarget: 'boss',
    impactDetail: 'Boss encounters: fewer asteroids remain in the arena while a boss is active.',
    iconId: 'warp-boss',
    cost: 3,
    route: { col: 3, row: 2 },
    requires: ['bossBeacon']
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
    summary: 'Adds shotgun-focused ranger drones to the run card pool.',
    effectSummary: 'Unlocks the Ranger Wing card.',
    impactTarget: 'drones',
    impactDetail: 'Card choices: Ranger Wing recruits one temporary shotgun drone.',
    iconId: 'warp-ranger',
    cost: 5,
    route: { col: 2, row: 3 },
    requires: ['droneSystems']
  },
  {
    id: 'missileFoundry',
    title: 'Missile Foundry',
    summary: 'Adds missile breaker drones to the run card pool.',
    effectSummary: 'Unlocks the Breaker Wing card.',
    impactTarget: 'drones',
    impactDetail: 'Card choices: Breaker Wing recruits one temporary missile drone.',
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
