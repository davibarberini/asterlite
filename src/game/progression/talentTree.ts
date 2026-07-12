import type { AsteroidVariant, DroneType, ProgressionState, TalentId, TalentRanks } from '../simulation/types';
import { getAvailableShipSkillPoints } from './shipLevel';
export { getLevelShockwaveSkillMultiplier } from './talentEffects';

export type TalentBranch = 'core' | 'impact' | 'speed' | 'semiAuto' | 'shotgun' | 'missile';
export type TalentNodeType = 'minor' | 'notable' | 'keystone' | 'lockedRegion';

export type TalentDefinition = {
  id: TalentId;
  name: string;
  summary: string;
  branch: TalentBranch;
  nodeType: TalentNodeType;
  maxRank: number;
  pointCost: number;
  requiresDrone?: DroneType;
  requires: { id: TalentId; rank: number }[];
  grid: { col: number; row: number };
};

export const TALENT_GRID_COLUMNS = 11;
export const TALENT_GRID_ROWS = 7;

export const TALENT_DEFINITIONS: TalentDefinition[] = [
  {
    id: 'refineryYield',
    name: 'Core Calibration',
    summary: '+10% offline credit income per rank. Opens impact and speed builds.',
    branch: 'core',
    nodeType: 'minor',
    maxRank: 2,
    pointCost: 1,
    requires: [],
    grid: { col: 4, row: 1 }
  },
  {
    id: 'combatBounty',
    name: 'Impact Plating',
    summary: '-10% incoming damage.',
    branch: 'impact',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requires: [{ id: 'refineryYield', rank: 1 }],
    grid: { col: 3, row: 2 }
  },
  {
    id: 'crystalSeam',
    name: 'Shockwave Capacitor',
    summary: '+25% level-up shockwave radius.',
    branch: 'impact',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requires: [{ id: 'combatBounty', rank: 1 }],
    grid: { col: 2, row: 3 }
  },
  {
    id: 'bulwarkProtocol',
    name: 'Bulwark Protocol',
    summary: '-28% incoming damage and +35% shockwave radius, but -12% ship speed.',
    branch: 'impact',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requires: [{ id: 'crystalSeam', rank: 1 }],
    grid: { col: 2, row: 4 }
  },
  {
    id: 'salvageLoop',
    name: 'Salvage Loop',
    summary: '+25% offline credit income.',
    branch: 'core',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requires: [
      { id: 'combatBounty', rank: 1 },
      { id: 'vectorNozzles', rank: 1 }
    ],
    grid: { col: 4, row: 4 }
  },
  {
    id: 'propulsionTuning',
    name: 'Impulse Jets',
    summary: '+8% ship thrust and max speed per rank.',
    branch: 'speed',
    nodeType: 'minor',
    maxRank: 2,
    pointCost: 1,
    requires: [{ id: 'refineryYield', rank: 1 }],
    grid: { col: 5, row: 2 }
  },
  {
    id: 'vectorNozzles',
    name: 'Rapid Vectoring',
    summary: '+12% ship speed and -10% ship fire interval.',
    branch: 'speed',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requires: [{ id: 'propulsionTuning', rank: 2 }],
    grid: { col: 6, row: 3 }
  },
  {
    id: 'afterburnerDoctrine',
    name: 'Afterburner Doctrine',
    summary: '+28% ship speed and -16% ship fire interval, but +18% incoming damage.',
    branch: 'speed',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requires: [{ id: 'vectorNozzles', rank: 1 }],
    grid: { col: 6, row: 4 }
  },
  {
    id: 'semiAutoOptics',
    name: 'Target Optics',
    summary: 'Unlocks the semi-auto branch and adds +50 targeting range.',
    branch: 'semiAuto',
    nodeType: 'lockedRegion',
    maxRank: 1,
    pointCost: 1,
    requiresDrone: 'sentry',
    requires: [],
    grid: { col: 8, row: 1 }
  },
  {
    id: 'semiAutoRange',
    name: 'Long Lens',
    summary: '+40 semi-auto targeting range per rank.',
    branch: 'semiAuto',
    nodeType: 'minor',
    maxRank: 2,
    pointCost: 1,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoOptics', rank: 1 }],
    grid: { col: 8, row: 2 }
  },
  {
    id: 'semiAutoPierce',
    name: 'Linear Pierce',
    summary: '+1 asteroid pierce per rank. Semi-auto starts at 1 pierce.',
    branch: 'semiAuto',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoOptics', rank: 1 }],
    grid: { col: 9, row: 2 }
  },
  {
    id: 'semiAutoCadence',
    name: 'Burst Timing',
    summary: '-10% semi-auto fire interval per rank.',
    branch: 'semiAuto',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoPierce', rank: 1 }],
    grid: { col: 9, row: 3 }
  },
  {
    id: 'semiAutoOverdrive',
    name: 'Overdrive Rounds',
    summary: '+2 semi-auto shot damage.',
    branch: 'semiAuto',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requiresDrone: 'sentry',
    requires: [
      { id: 'semiAutoCadence', rank: 1 },
      { id: 'semiAutoPierce', rank: 1 }
    ],
    grid: { col: 9, row: 4 }
  },
  {
    id: 'shotgunLoad',
    name: 'Heavy Load',
    summary: 'Unlocks the shotgun branch and adds +1 pellet damage.',
    branch: 'shotgun',
    nodeType: 'lockedRegion',
    maxRank: 1,
    pointCost: 1,
    requiresDrone: 'ranger',
    requires: [],
    grid: { col: 8, row: 5 }
  },
  {
    id: 'shotgunChoke',
    name: 'Tight Choke',
    summary: '+1 shotgun pellet damage per rank.',
    branch: 'shotgun',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunLoad', rank: 1 }],
    grid: { col: 8, row: 6 }
  },
  {
    id: 'shotgunSpread',
    name: 'Wide Spread',
    summary: '+1 shotgun pellet per rank.',
    branch: 'shotgun',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunLoad', rank: 1 }],
    grid: { col: 9, row: 6 }
  },
  {
    id: 'shotgunBarrage',
    name: 'Barrage Cycle',
    summary: '-12% shotgun fire interval.',
    branch: 'shotgun',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunChoke', rank: 1 }],
    grid: { col: 8, row: 7 }
  },
  {
    id: 'shotgunSlag',
    name: 'Slag Rounds',
    summary: '+2 shotgun pellet damage against dense asteroids.',
    branch: 'shotgun',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requiresDrone: 'ranger',
    requires: [
      { id: 'shotgunSpread', rank: 1 },
      { id: 'shotgunBarrage', rank: 1 }
    ],
    grid: { col: 9, row: 7 }
  },
  {
    id: 'missileGuidance',
    name: 'Guidance Uplink',
    summary: 'Unlocks the missile branch and adds +20% homing turn rate per rank.',
    branch: 'missile',
    nodeType: 'lockedRegion',
    maxRank: 1,
    pointCost: 1,
    requiresDrone: 'breaker',
    requires: [],
    grid: { col: 11, row: 1 }
  },
  {
    id: 'missileYield',
    name: 'High Yield',
    summary: '+1 missile damage per rank.',
    branch: 'missile',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileGuidance', rank: 1 }],
    grid: { col: 10, row: 2 }
  },
  {
    id: 'missileReload',
    name: 'Fast Reload',
    summary: '-10% missile fire interval per rank.',
    branch: 'missile',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileGuidance', rank: 1 }],
    grid: { col: 11, row: 2 }
  },
  {
    id: 'missileWarhead',
    name: 'Blast Warhead',
    summary: 'Missiles explode on impact for area damage.',
    branch: 'missile',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileYield', rank: 1 }],
    grid: { col: 10, row: 3 }
  },
  {
    id: 'missileShrapnel',
    name: 'Shrapnel Burst',
    summary: '+18% missile splash radius and +1 splash damage per rank.',
    branch: 'missile',
    nodeType: 'minor',
    maxRank: 2,
    pointCost: 1,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileWarhead', rank: 1 }],
    grid: { col: 10, row: 4 }
  },
  {
    id: 'missileChain',
    name: 'Chain Detonation',
    summary: 'Missile explosions deal +60% splash damage.',
    branch: 'missile',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileShrapnel', rank: 2 }],
    grid: { col: 10, row: 5 }
  },
  {
    id: 'droneCommandLink',
    name: 'Command Link',
    summary: '+12% all drone damage and -6% ship fire interval.',
    branch: 'semiAuto',
    nodeType: 'notable',
    maxRank: 1,
    pointCost: 2,
    requiresDrone: 'sentry',
    requires: [
      { id: 'semiAutoOptics', rank: 1 },
      { id: 'vectorNozzles', rank: 1 }
    ],
    grid: { col: 11, row: 6 }
  },
  {
    id: 'carrierDoctrine',
    name: 'Carrier Doctrine',
    summary: '+20% all drone damage and -8% drone fire interval, but +10% ship fire interval.',
    branch: 'missile',
    nodeType: 'keystone',
    maxRank: 1,
    pointCost: 3,
    requiresDrone: 'breaker',
    requires: [
      { id: 'droneCommandLink', rank: 1 },
      { id: 'missileGuidance', rank: 1 }
    ],
    grid: { col: 11, row: 7 }
  }
];

export const TALENT_BY_ID = Object.fromEntries(TALENT_DEFINITIONS.map((talent) => [talent.id, talent])) as Record<
  TalentId,
  TalentDefinition
>;

export const createTalentRanks = (): TalentRanks =>
  Object.fromEntries(TALENT_DEFINITIONS.map((talent) => [talent.id, 0])) as TalentRanks;

export const normalizeTalentRanks = (ranks: Partial<Record<TalentId, number>>): TalentRanks => {
  const normalized = createTalentRanks();
  TALENT_DEFINITIONS.forEach((talent) => {
    normalized[talent.id] = Math.max(0, Math.min(talent.maxRank, Math.floor(ranks[talent.id] ?? 0)));
  });
  return normalized;
};

export const getTalentRank = (progression: ProgressionState, id: TalentId): number =>
  Math.max(0, Math.min(TALENT_BY_ID[id].maxRank, progression.talentRanks[id] ?? 0));

export const getTalentPointCost = (id: TalentId): number =>
  Math.max(1, Math.floor(TALENT_BY_ID[id].pointCost));

export const isDroneTalent = (id: TalentId): boolean => {
  const branch = TALENT_BY_ID[id].branch;
  return branch === 'semiAuto' || branch === 'shotgun' || branch === 'missile';
};

export const isDroneTalentRegionUnlocked = (progression: ProgressionState): boolean =>
  progression.ownedWarpUnlockIds.includes('droneSystems') ||
  progression.droneCounts.sentry > 0 ||
  progression.droneCounts.ranger > 0 ||
  progression.droneCounts.breaker > 0;

export const hasDroneTalentAccess = (progression: ProgressionState, type: DroneType): boolean => {
  if (type === 'sentry') {
    return isDroneTalentRegionUnlocked(progression);
  }
  if (type === 'ranger') {
    return progression.ownedWarpUnlockIds.includes('rangerHangar') || progression.droneCounts.ranger > 0;
  }
  return progression.ownedWarpUnlockIds.includes('missileFoundry') || progression.droneCounts.breaker > 0;
};

export const getSpentTalentPointCost = (ranks: TalentRanks): number =>
  TALENT_DEFINITIONS.reduce((total, talent) => {
    const rank = Math.max(0, Math.min(talent.maxRank, Math.floor(ranks[talent.id] ?? 0)));
    return total + rank * getTalentPointCost(talent.id);
  }, 0);

export const countUnlockedTalentRanks = (progression: ProgressionState): number =>
  TALENT_DEFINITIONS.reduce((total, talent) => total + getTalentRank(progression, talent.id), 0);

export const meetsTalentRequirements = (progression: ProgressionState, id: TalentId): boolean => {
  const talent = TALENT_BY_ID[id];
  if (isDroneTalent(id) && !isDroneTalentRegionUnlocked(progression)) {
    return false;
  }
  if (talent.requiresDrone && !hasDroneTalentAccess(progression, talent.requiresDrone)) {
    return false;
  }

  return talent.requires.every((requirement) => getTalentRank(progression, requirement.id) >= requirement.rank);
};

export const canBuyTalentRank = (progression: ProgressionState, id: TalentId): boolean => {
  const talent = TALENT_BY_ID[id];
  const currentRank = getTalentRank(progression, id);
  if (currentRank >= talent.maxRank || !meetsTalentRequirements(progression, id)) {
    return false;
  }

  return getAvailableShipSkillPoints(progression) >= getTalentPointCost(id);
};

export type TalentNodeState = 'locked' | 'available' | 'partial' | 'maxed';

export const getTalentNodeState = (progression: ProgressionState, id: TalentId): TalentNodeState => {
  const talent = TALENT_BY_ID[id];
  const rank = getTalentRank(progression, id);
  if (rank >= talent.maxRank) {
    return 'maxed';
  }
  if (!meetsTalentRequirements(progression, id)) {
    return 'locked';
  }
  return rank > 0 ? 'partial' : 'available';
};

export const getTalentRankLabel = (progression: ProgressionState, id: TalentId): string => {
  const talent = TALENT_BY_ID[id];
  const rank = getTalentRank(progression, id);
  return `${rank}/${talent.maxRank}`;
};

export const getOfflineIncomeTalentMultiplier = (progression: ProgressionState): number =>
  (1 + getTalentRank(progression, 'refineryYield') * 0.1) *
  (getTalentRank(progression, 'salvageLoop') > 0 ? 1.25 : 1);

export const getCombatBountyMultiplier = (_progression: ProgressionState): number => 1;

export const getCrystalDropMultiplier = (_progression: ProgressionState): number => 1;

export const getSkillIncomingDamageMultiplier = (progression: ProgressionState): number =>
  (getTalentRank(progression, 'combatBounty') > 0 ? 0.9 : 1) *
  (getTalentRank(progression, 'bulwarkProtocol') > 0 ? 0.72 : 1) *
  (getTalentRank(progression, 'afterburnerDoctrine') > 0 ? 1.18 : 1);

export const getPropulsionSkillMultiplier = (progression: ProgressionState): number =>
  (1 +
    getTalentRank(progression, 'propulsionTuning') * 0.08 +
    getTalentRank(progression, 'vectorNozzles') * 0.12 +
    getTalentRank(progression, 'afterburnerDoctrine') * 0.28) *
  (getTalentRank(progression, 'bulwarkProtocol') > 0 ? 0.88 : 1);

export const getShipSkillFireIntervalMultiplier = (progression: ProgressionState): number =>
  (getTalentRank(progression, 'vectorNozzles') > 0 ? 0.9 : 1) *
  (getTalentRank(progression, 'afterburnerDoctrine') > 0 ? 0.84 : 1) *
  (getTalentRank(progression, 'droneCommandLink') > 0 ? 0.94 : 1) *
  (getTalentRank(progression, 'carrierDoctrine') > 0 ? 1.1 : 1);

export const getDroneSkillDamageMultiplier = (progression: ProgressionState): number =>
  (getTalentRank(progression, 'droneCommandLink') > 0 ? 1.12 : 1) *
  (getTalentRank(progression, 'carrierDoctrine') > 0 ? 1.2 : 1);

export const getDroneSkillFireIntervalMultiplier = (progression: ProgressionState): number =>
  getTalentRank(progression, 'carrierDoctrine') > 0 ? 0.92 : 1;

export const getSemiAutoPierceLeft = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'semiAutoPierce');

export const getSemiAutoRangeBonus = (progression: ProgressionState): number =>
  (getTalentRank(progression, 'semiAutoOptics') > 0 ? 50 : 0) + getTalentRank(progression, 'semiAutoRange') * 40;

export const getSemiAutoFireIntervalMultiplier = (progression: ProgressionState): number =>
  0.9 ** getTalentRank(progression, 'semiAutoCadence');

export const getSemiAutoDamage = (progression: ProgressionState): number =>
  1 + (getTalentRank(progression, 'semiAutoOverdrive') > 0 ? 2 : 0);

export const getShotgunPelletCount = (progression: ProgressionState): number => 5 + getTalentRank(progression, 'shotgunSpread');

export const getShotgunSpreadAngles = (progression: ProgressionState): number[] => {
  const pelletCount = getShotgunPelletCount(progression);
  if (pelletCount <= 1) {
    return [0];
  }

  const spread = 0.34 + getTalentRank(progression, 'shotgunSpread') * 0.04;
  const step = spread / (pelletCount - 1);
  return Array.from({ length: pelletCount }, (_, index) => -spread / 2 + step * index);
};

export const getShotgunPelletDamage = (progression: ProgressionState, variant: AsteroidVariant = 'common'): number => {
  const base = 1 + (getTalentRank(progression, 'shotgunLoad') > 0 ? 1 : 0) + getTalentRank(progression, 'shotgunChoke');
  if (variant === 'dense' && getTalentRank(progression, 'shotgunSlag') > 0) {
    return base + 2;
  }
  return base;
};

export const getShotgunFireIntervalMultiplier = (progression: ProgressionState): number =>
  getTalentRank(progression, 'shotgunBarrage') > 0 ? 0.88 : 1;

export const getMissileDamage = (progression: ProgressionState): number =>
  3 + getTalentRank(progression, 'missileYield');

export const getMissileFireIntervalMultiplier = (progression: ProgressionState): number =>
  0.9 ** getTalentRank(progression, 'missileReload');

export const getMissileTurnRateMultiplier = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'missileGuidance') * 0.2;

export const hasMissileExplosion = (progression: ProgressionState): boolean =>
  getTalentRank(progression, 'missileWarhead') > 0;

export const getMissileSplashRadius = (progression: ProgressionState): number =>
  72 * (1 + getTalentRank(progression, 'missileShrapnel') * 0.18);

export const getMissileSplashDamage = (progression: ProgressionState, directDamage: number): number => {
  let splash = Math.max(1, getTalentRank(progression, 'missileShrapnel') + 1);
  if (getTalentRank(progression, 'missileChain') > 0) {
    splash = Math.round(splash * 1.6);
  }
  return Math.max(splash, Math.round(directDamage * 0.55));
};

export const migrateLegacyDroneSkills = (
  legacy: { sentryRange: number; rangerFocus: number; breakerCapacitor: number }
): TalentRanks => {
  const ranks = createTalentRanks();

  if (legacy.sentryRange > 0) {
    ranks.semiAutoOptics = 1;
    ranks.semiAutoRange = Math.min(3, legacy.sentryRange);
    ranks.semiAutoPierce = Math.min(4, Math.max(0, legacy.sentryRange - 1));
    ranks.semiAutoCadence = Math.min(3, Math.max(0, legacy.sentryRange - 2));
  }

  if (legacy.rangerFocus > 0) {
    ranks.shotgunLoad = 1;
    ranks.shotgunChoke = Math.min(3, legacy.rangerFocus);
    ranks.shotgunSpread = Math.min(2, Math.max(0, legacy.rangerFocus - 1));
  }

  if (legacy.breakerCapacitor > 0) {
    ranks.missileGuidance = Math.min(3, legacy.breakerCapacitor);
    ranks.missileReload = Math.min(3, legacy.breakerCapacitor);
    ranks.missileYield = Math.min(3, Math.max(0, legacy.breakerCapacitor - 1));
  }

  return ranks;
};
