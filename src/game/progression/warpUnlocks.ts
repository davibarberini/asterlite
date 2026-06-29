import type { ProgressionState, WarpUnlockId } from '../simulation/types';

export type WarpUnlockDefinition = {
  id: WarpUnlockId;
  title: string;
  summary: string;
  effectSummary: string;
  iconId: string;
  cost: number;
  route: { col: number; row: number };
  requires: WarpUnlockId[];
};

export type WarpUnlockNodeState = 'owned' | 'available' | 'locked' | 'unaffordable';

export const WARP_UNLOCK_GRID_COLUMNS = 3;
export const WARP_UNLOCK_GRID_ROWS = 8;

export const WARP_UNLOCK_DEFINITIONS: WarpUnlockDefinition[] = [
  {
    id: 'coreStabilizer',
    title: 'Core Stabilizer',
    summary: 'Stabilizes warp cores and anchors the permanent upgrade route.',
    effectSummary: 'Opens the permanent core route.',
    iconId: 'warp-core',
    cost: 1,
    route: { col: 2, row: 1 },
    requires: []
  },
  {
    id: 'hullReinforcement',
    title: 'Hull Reinforcement',
    summary: 'Installs a permanent hull frame upgrade directly from the warp route.',
    effectSummary: '+50 max HP permanently.',
    iconId: 'warp-hull',
    cost: 1,
    route: { col: 1, row: 2 },
    requires: ['coreStabilizer']
  },
  {
    id: 'cannonAmplifier',
    title: 'Cannon Amplifier',
    summary: 'Improves the main cannon without a separate credit purchase.',
    effectSummary: '+1 cannon damage level permanently.',
    iconId: 'warp-cannon',
    cost: 1,
    route: { col: 3, row: 2 },
    requires: ['coreStabilizer']
  },
  {
    id: 'armorPlating',
    title: 'Armor Plating',
    summary: 'Adds permanent impact plating for deeper asteroid lanes.',
    effectSummary: '+5 armor permanently.',
    iconId: 'warp-armor',
    cost: 2,
    route: { col: 1, row: 3 },
    requires: ['hullReinforcement']
  },
  {
    id: 'flightThrusters',
    title: 'Flight Thrusters',
    summary: 'Raises ship velocity and handling from the core route.',
    effectSummary: '+12% ship speed permanently.',
    iconId: 'warp-thruster',
    cost: 2,
    route: { col: 3, row: 3 },
    requires: ['cannonAmplifier']
  },
  {
    id: 'droneSystems',
    title: 'Drone Systems',
    summary: 'Authorizes drone bay systems and the first semi-auto support drone package.',
    effectSummary: 'Unlocks drone purchases after this node.',
    iconId: 'warp-drone',
    cost: 3,
    route: { col: 2, row: 4 },
    requires: ['armorPlating', 'flightThrusters']
  },
  {
    id: 'deflectorFrame',
    title: 'Deflector Frame',
    summary: 'Reinforces the ship prow and installs the directional deflector immediately.',
    effectSummary: '+1 deflector level permanently.',
    iconId: 'warp-deflector',
    cost: 3,
    route: { col: 1, row: 5 },
    requires: ['armorPlating']
  },
  {
    id: 'shieldBubble',
    title: 'Shield Bubble',
    summary: 'Installs a circular rechargeable shield envelope around the ship.',
    effectSummary: 'Absorbs one hit, breaks, then recharges.',
    iconId: 'warp-shield',
    cost: 5,
    route: { col: 1, row: 6 },
    requires: ['deflectorFrame']
  },
  {
    id: 'spreadBattery',
    title: 'Spread Battery',
    summary: 'Installs spread shot directly from the permanent core route.',
    effectSummary: 'Unlocks Spread Shot immediately.',
    iconId: 'warp-spread',
    cost: 3,
    route: { col: 3, row: 5 },
    requires: ['flightThrusters']
  },
  {
    id: 'rangerHangar',
    title: 'Ranger Hangar',
    summary: 'Adds hangar capacity for shotgun-focused ranger drones.',
    effectSummary: 'Unlocks shotgun drone purchases after this node.',
    iconId: 'warp-ranger',
    cost: 5,
    route: { col: 2, row: 6 },
    requires: ['droneSystems']
  },
  {
    id: 'missileFoundry',
    title: 'Missile Foundry',
    summary: 'Opens the foundry systems needed for missile breaker drones.',
    effectSummary: 'Unlocks missile drone purchases after this node.',
    iconId: 'warp-missile',
    cost: 6,
    route: { col: 2, row: 7 },
    requires: ['rangerHangar']
  },
  {
    id: 'piercingRail',
    title: 'Piercing Rail',
    summary: 'Stabilizes rail capacitors and installs piercing rounds immediately.',
    effectSummary: 'Unlocks Piercing Rounds immediately.',
    iconId: 'warp-piercing',
    cost: 6,
    route: { col: 3, row: 6 },
    requires: ['spreadBattery']
  }
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
  if (hasWarpUnlock(progression, 'hullReinforcement')) {
    progression.maxHp = Math.max(progression.maxHp, 150);
  }

  if (hasWarpUnlock(progression, 'cannonAmplifier')) {
    progression.shipDamageLevel = Math.max(progression.shipDamageLevel, 2);
  }

  if (hasWarpUnlock(progression, 'armorPlating')) {
    progression.armor = Math.max(progression.armor, 5);
  }

  if (hasWarpUnlock(progression, 'flightThrusters')) {
    progression.shipSpeedLevel = Math.max(progression.shipSpeedLevel, 1);
  }

  if (hasWarpUnlock(progression, 'deflectorFrame')) {
    progression.deflectorLevel = Math.max(progression.deflectorLevel, 1);
  }

  if (hasWarpUnlock(progression, 'spreadBattery')) {
    progression.spreadUnlocked = true;
  }

  if (hasWarpUnlock(progression, 'piercingRail')) {
    progression.piercingUnlocked = true;
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
