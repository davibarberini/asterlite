import type { AsteroidVariant, DroneType, ProgressionState, TalentId, TalentRanks } from '../simulation/types';

export type TalentBranch = 'economy' | 'semiAuto' | 'shotgun' | 'missile';

export type TalentDefinition = {
  id: TalentId;
  name: string;
  summary: string;
  branch: TalentBranch;
  maxRank: number;
  baseCost: number;
  costScale: number;
  requiresDrone?: DroneType;
  requires: { id: TalentId; rank: number }[];
  grid: { col: number; row: number };
};

export const TALENT_GRID_COLUMNS = 5;
export const TALENT_GRID_ROWS = 7;

export const TALENT_DEFINITIONS: TalentDefinition[] = [
  {
    id: 'refineryYield',
    name: 'Refinery Yield',
    summary: '+10% passive refinery income per rank.',
    branch: 'economy',
    maxRank: 3,
    baseCost: 2,
    costScale: 1.65,
    requires: [],
    grid: { col: 3, row: 1 }
  },
  {
    id: 'combatBounty',
    name: 'Combat Bounty',
    summary: '+12% asteroid credit rewards per rank.',
    branch: 'economy',
    maxRank: 3,
    baseCost: 3,
    costScale: 1.7,
    requires: [{ id: 'refineryYield', rank: 1 }],
    grid: { col: 2, row: 2 }
  },
  {
    id: 'crystalSeam',
    name: 'Crystal Seam',
    summary: '+20% crystal drops from crystal asteroids per rank.',
    branch: 'economy',
    maxRank: 2,
    baseCost: 4,
    costScale: 1.85,
    requires: [{ id: 'refineryYield', rank: 1 }],
    grid: { col: 4, row: 2 }
  },
  {
    id: 'salvageLoop',
    name: 'Salvage Loop',
    summary: 'Death refinery penalty lasts 25% less.',
    branch: 'economy',
    maxRank: 1,
    baseCost: 8,
    costScale: 1,
    requires: [
      { id: 'combatBounty', rank: 2 },
      { id: 'crystalSeam', rank: 1 }
    ],
    grid: { col: 3, row: 3 }
  },
  {
    id: 'propulsionTuning',
    name: 'Propulsion Tuning',
    summary: '+6% ship thrust and max speed per rank.',
    branch: 'economy',
    maxRank: 5,
    baseCost: 5,
    costScale: 1.82,
    requires: [{ id: 'combatBounty', rank: 1 }],
    grid: { col: 2, row: 3 }
  },
  {
    id: 'vectorNozzles',
    name: 'Vector Nozzles',
    summary: '+8% ship thrust and max speed per rank.',
    branch: 'economy',
    maxRank: 3,
    baseCost: 9,
    costScale: 1.95,
    requires: [
      { id: 'propulsionTuning', rank: 3 },
      { id: 'crystalSeam', rank: 1 }
    ],
    grid: { col: 4, row: 3 }
  },
  {
    id: 'semiAutoOptics',
    name: 'Target Optics',
    summary: 'Unlocks the semi-auto branch and adds +50 targeting range.',
    branch: 'semiAuto',
    maxRank: 1,
    baseCost: 3,
    costScale: 1,
    requiresDrone: 'sentry',
    requires: [],
    grid: { col: 1, row: 1 }
  },
  {
    id: 'semiAutoRange',
    name: 'Long Lens',
    summary: '+40 semi-auto targeting range per rank.',
    branch: 'semiAuto',
    maxRank: 3,
    baseCost: 3,
    costScale: 1.6,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoOptics', rank: 1 }],
    grid: { col: 1, row: 2 }
  },
  {
    id: 'semiAutoPierce',
    name: 'Linear Pierce',
    summary: '+1 asteroid pierce per rank. Semi-auto starts at 1 pierce.',
    branch: 'semiAuto',
    maxRank: 4,
    baseCost: 4,
    costScale: 1.75,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoOptics', rank: 1 }],
    grid: { col: 1, row: 3 }
  },
  {
    id: 'semiAutoCadence',
    name: 'Burst Timing',
    summary: '-10% semi-auto fire interval per rank.',
    branch: 'semiAuto',
    maxRank: 3,
    baseCost: 4,
    costScale: 1.68,
    requiresDrone: 'sentry',
    requires: [{ id: 'semiAutoPierce', rank: 1 }],
    grid: { col: 1, row: 4 }
  },
  {
    id: 'semiAutoOverdrive',
    name: 'Overdrive Rounds',
    summary: '+2 semi-auto shot damage.',
    branch: 'semiAuto',
    maxRank: 1,
    baseCost: 9,
    costScale: 1,
    requiresDrone: 'sentry',
    requires: [
      { id: 'semiAutoCadence', rank: 2 },
      { id: 'semiAutoPierce', rank: 2 }
    ],
    grid: { col: 1, row: 5 }
  },
  {
    id: 'shotgunLoad',
    name: 'Heavy Load',
    summary: 'Unlocks the shotgun branch and adds +1 pellet damage.',
    branch: 'shotgun',
    maxRank: 1,
    baseCost: 3,
    costScale: 1,
    requiresDrone: 'ranger',
    requires: [],
    grid: { col: 3, row: 4 }
  },
  {
    id: 'shotgunChoke',
    name: 'Tight Choke',
    summary: '+1 shotgun pellet damage per rank.',
    branch: 'shotgun',
    maxRank: 3,
    baseCost: 4,
    costScale: 1.72,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunLoad', rank: 1 }],
    grid: { col: 2, row: 5 }
  },
  {
    id: 'shotgunSpread',
    name: 'Wide Spread',
    summary: '+1 shotgun pellet per rank.',
    branch: 'shotgun',
    maxRank: 2,
    baseCost: 5,
    costScale: 1.8,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunLoad', rank: 1 }],
    grid: { col: 4, row: 5 }
  },
  {
    id: 'shotgunBarrage',
    name: 'Barrage Cycle',
    summary: '-12% shotgun fire interval.',
    branch: 'shotgun',
    maxRank: 1,
    baseCost: 7,
    costScale: 1,
    requiresDrone: 'ranger',
    requires: [{ id: 'shotgunChoke', rank: 2 }],
    grid: { col: 2, row: 6 }
  },
  {
    id: 'shotgunSlag',
    name: 'Slag Rounds',
    summary: '+2 shotgun pellet damage against dense asteroids.',
    branch: 'shotgun',
    maxRank: 1,
    baseCost: 8,
    costScale: 1,
    requiresDrone: 'ranger',
    requires: [
      { id: 'shotgunSpread', rank: 1 },
      { id: 'shotgunBarrage', rank: 1 }
    ],
    grid: { col: 4, row: 6 }
  },
  {
    id: 'missileGuidance',
    name: 'Guidance Uplink',
    summary: 'Unlocks the missile branch and adds +20% homing turn rate per rank.',
    branch: 'missile',
    maxRank: 3,
    baseCost: 3,
    costScale: 1.62,
    requiresDrone: 'breaker',
    requires: [],
    grid: { col: 5, row: 1 }
  },
  {
    id: 'missileYield',
    name: 'High Yield',
    summary: '+1 missile damage per rank.',
    branch: 'missile',
    maxRank: 3,
    baseCost: 4,
    costScale: 1.7,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileGuidance', rank: 1 }],
    grid: { col: 5, row: 2 }
  },
  {
    id: 'missileReload',
    name: 'Fast Reload',
    summary: '-10% missile fire interval per rank.',
    branch: 'missile',
    maxRank: 3,
    baseCost: 4,
    costScale: 1.66,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileGuidance', rank: 1 }],
    grid: { col: 5, row: 3 }
  },
  {
    id: 'missileWarhead',
    name: 'Blast Warhead',
    summary: 'Missiles explode on impact for area damage.',
    branch: 'missile',
    maxRank: 1,
    baseCost: 7,
    costScale: 1,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileYield', rank: 2 }],
    grid: { col: 5, row: 4 }
  },
  {
    id: 'missileShrapnel',
    name: 'Shrapnel Burst',
    summary: '+18% missile splash radius and +1 splash damage per rank.',
    branch: 'missile',
    maxRank: 3,
    baseCost: 5,
    costScale: 1.78,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileWarhead', rank: 1 }],
    grid: { col: 5, row: 5 }
  },
  {
    id: 'missileChain',
    name: 'Chain Detonation',
    summary: 'Missile explosions deal +60% splash damage.',
    branch: 'missile',
    maxRank: 1,
    baseCost: 10,
    costScale: 1,
    requiresDrone: 'breaker',
    requires: [{ id: 'missileShrapnel', rank: 2 }],
    grid: { col: 5, row: 6 }
  }
];

export const TALENT_BY_ID = Object.fromEntries(TALENT_DEFINITIONS.map((talent) => [talent.id, talent])) as Record<
  TalentId,
  TalentDefinition
>;

export const createTalentRanks = (): TalentRanks =>
  Object.fromEntries(TALENT_DEFINITIONS.map((talent) => [talent.id, 0])) as TalentRanks;

export const getTalentRank = (progression: ProgressionState, id: TalentId): number =>
  Math.max(0, Math.min(TALENT_BY_ID[id].maxRank, progression.talentRanks[id] ?? 0));

export const getTalentCost = (id: TalentId, currentRank: number): number => {
  const talent = TALENT_BY_ID[id];
  return Math.round(talent.baseCost * talent.costScale ** currentRank);
};

export const countUnlockedTalentRanks = (progression: ProgressionState): number =>
  TALENT_DEFINITIONS.reduce((total, talent) => total + getTalentRank(progression, talent.id), 0);

export const meetsTalentRequirements = (progression: ProgressionState, id: TalentId): boolean => {
  const talent = TALENT_BY_ID[id];
  if (talent.requiresDrone && progression.droneCounts[talent.requiresDrone] <= 0) {
    return false;
  }

  return talent.requires.every((requirement) => getTalentRank(progression, requirement.id) >= requirement.rank);
};

export const canBuyTalentRank = (progression: ProgressionState, crystals: number, id: TalentId): boolean => {
  const talent = TALENT_BY_ID[id];
  const currentRank = getTalentRank(progression, id);
  if (currentRank >= talent.maxRank || !meetsTalentRequirements(progression, id)) {
    return false;
  }

  return crystals >= getTalentCost(id, currentRank);
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

export const getRefineryIncomeMultiplier = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'refineryYield') * 0.1;

export const getCombatBountyMultiplier = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'combatBounty') * 0.12;

export const getCrystalDropMultiplier = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'crystalSeam') * 0.2;

export const getDeathPenaltyMultiplier = (progression: ProgressionState): number =>
  getTalentRank(progression, 'salvageLoop') > 0 ? 0.75 : 1;

export const getPropulsionSkillMultiplier = (progression: ProgressionState): number =>
  1 + getTalentRank(progression, 'propulsionTuning') * 0.06 + getTalentRank(progression, 'vectorNozzles') * 0.08;

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
