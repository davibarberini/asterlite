import { createGameState, createShieldBubble, syncShieldBubbleState } from '../simulation/state';
import { createAsteroidField } from '../simulation/systems/asteroids';
import {
  ACHIEVEMENT_DEFINITIONS,
  createAchievementStats,
  createUnlockedAchievements,
  getEffectiveMaxHp,
  recordMoneyEarned,
  syncAchievements
} from './achievements';
import { createBossRewardState, normalizeBossRewardState } from './bossRewards';
import { createTalentRanks, migrateLegacyDroneSkills, TALENT_DEFINITIONS } from './talentTree';
import { maxShipLevel } from './shipLevel';
import { createGuidedMissionState } from './guidedMissions';
import { SHIP_FRAME_BY_ID, getShipFrameBonusMultiplier, normalizeShipFrameIds } from './shipFrames';
import type { AchievementId, AchievementStats, BossDiscoveryState, BossRewardId, BossRewardState, DroneType, GameState, GuidedMissionId, GuidedMissionState, ProgressionState, RareSpawnState, ShieldBubbleState, ShipFrameId, ShipRunState, ShipUnlockProgress, SurvivalState, TalentRanks, Vec2, WarpUnlockId, WeaponMode } from '../simulation/types';
import { maxTravelLevel } from '../simulation/zones';
import { balance } from '../balance';
import { WARP_UNLOCK_BY_ID, applyOwnedWarpUnlockEffects } from './warpUnlocks';
import { captureActiveShipRun } from './shipRuns';
import { createRareSpawnState } from '../simulation/systems/rareSpawns';
import { createSurvivalState, getSurvivalThreatLevel } from '../simulation/systems/survival';
import { createShipUnlockProgress, normalizeShipUnlockProgress } from './shipUnlocks';
import { getOfflineIncomeRate } from './offlineIncome';
import { normalizeNovaCrownDifficulty } from './novaCrownDifficulty';
import { normalizeNovaCrownCoreRewardedDifficultyKeys } from './novaCrownRewards';

const SAVE_KEY = 'asteridle.save.v1';
const STORAGE_PREFIX = 'asteridle.';
const SAVE_VERSION: SaveVersion = 2;

type SaveVersion = 2;

export const SAVE_VERSION_NOTES: Record<SaveVersion, string> = {
  2: 'Stores Nova Crown difficulty ladder state, credits, crystals, offline timestamp, progression, ship state, shield bubble state, and survival state.'
};

type SavedGameV2 = {
  version: 2;
  money: number;
  crystals: number;
  lastSeenAt: number;
  progression: ProgressionState;
  ship: {
    position: Vec2;
    hp: number;
    alive: boolean;
    respawnFor: number;
    phaseShieldCooldown?: number;
    phaseShieldFlashFor?: number;
  };
  shieldBubble: ShieldBubbleState;
  bossRewards?: BossRewardState;
  rareSpawns?: RareSpawnState;
  survival?: SurvivalState;
};

type SavedGame = SavedGameV2;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

const readNonNegativeNumber = (value: unknown, fallback: number): number =>
  Math.max(0, readNumber(value, fallback));

const readNonNegativeNumberRecord = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((record, [key, rawValue]) => {
    const normalizedKey = normalizeNovaCrownDifficulty(Number(key)).toString();
    record[normalizedKey] = Math.max(record[normalizedKey] ?? 0, readNonNegativeNumber(rawValue, 0));
    return record;
  }, {});
};

const readDroneCounts = (value: unknown, legacyDroneCount: number): Record<DroneType, number> => {
  if (!isRecord(value)) {
    return {
      sentry: legacyDroneCount,
      ranger: 0,
      breaker: 0
    };
  }

  return {
    sentry: Math.max(0, Math.floor(readNumber(value.sentry, legacyDroneCount))),
    ranger: Math.max(0, Math.floor(readNumber(value.ranger, 0))),
    breaker: Math.max(0, Math.floor(readNumber(value.breaker, 0)))
  };
};

const readActiveDroneCounts = (value: unknown, owned: Record<DroneType, number>): Record<DroneType, number> => {
  if (!isRecord(value)) {
    return { ...owned };
  }

  return {
    sentry: Math.max(0, Math.min(owned.sentry, Math.floor(readNumber(value.sentry, owned.sentry)))),
    ranger: Math.max(0, Math.min(owned.ranger, Math.floor(readNumber(value.ranger, owned.ranger)))),
    breaker: Math.max(0, Math.min(owned.breaker, Math.floor(readNumber(value.breaker, owned.breaker))))
  };
};

const readLegacyDroneSkillLevels = (value: unknown): { sentryRange: number; rangerFocus: number; breakerCapacitor: number } => {
  if (!isRecord(value)) {
    return {
      sentryRange: 0,
      rangerFocus: 0,
      breakerCapacitor: 0
    };
  }

  return {
    sentryRange: Math.max(0, Math.floor(readNumber(value.sentryRange, 0))),
    rangerFocus: Math.max(0, Math.floor(readNumber(value.rangerFocus, 0))),
    breakerCapacitor: Math.max(0, Math.floor(readNumber(value.breakerCapacitor, 0)))
  };
};

const readTalentRanks = (value: unknown, legacySkills: { sentryRange: number; rangerFocus: number; breakerCapacitor: number }): TalentRanks => {
  if (isRecord(value)) {
    const ranks = createTalentRanks();
    TALENT_DEFINITIONS.forEach((talent) => {
      ranks[talent.id] = Math.max(0, Math.min(talent.maxRank, Math.floor(readNumber(value[talent.id], 0))));
    });
    return ranks;
  }

  return migrateLegacyDroneSkills(legacySkills);
};

const countTalentRanks = (ranks: TalentRanks): number =>
  TALENT_DEFINITIONS.reduce((total, talent) => total + Math.max(0, Math.floor(ranks[talent.id] ?? 0)), 0);

const readShipLevelProgress = (
  value: Record<string, unknown>,
  talentRanks: TalentRanks
): { shipXp: number; shipLevel: number; shipSkillPoints: number; spentShipSkillPoints: number } => {
  const spentShipSkillPoints = Math.max(countTalentRanks(talentRanks), Math.floor(readNumber(value.spentShipSkillPoints, 0)));
  const shipSkillPoints = Math.max(spentShipSkillPoints, Math.floor(readNumber(value.shipSkillPoints, spentShipSkillPoints)));
  const shipLevel = Math.max(
    1,
    Math.min(maxShipLevel, Math.floor(readNumber(value.shipLevel, Math.min(maxShipLevel, shipSkillPoints + 1))))
  );
  return {
    shipXp: readNonNegativeNumber(value.shipXp, 0),
    shipLevel,
    shipSkillPoints: Math.min(shipSkillPoints, maxShipLevel - 1),
    spentShipSkillPoints: Math.min(spentShipSkillPoints, maxShipLevel - 1)
  };
};

const readWeaponMode = (value: unknown, spreadUnlocked: boolean, piercingUnlocked: boolean): WeaponMode => {
  if (value === 'spread' && spreadUnlocked) {
    return 'spread';
  }
  if (value === 'piercing' && piercingUnlocked) {
    return 'piercing';
  }
  return 'cannon';
};

const readAchievementStats = (value: unknown): AchievementStats => {
  if (!isRecord(value)) {
    return createAchievementStats();
  }

  return {
    asteroidsDestroyed: Math.max(0, Math.floor(readNumber(value.asteroidsDestroyed, 0))),
    moneyEarned: Math.max(0, readNumber(value.moneyEarned, 0)),
    crystalsCollected: Math.max(0, Math.floor(readNumber(value.crystalsCollected, 0))),
    saucersDestroyed: Math.max(0, Math.floor(readNumber(value.saucersDestroyed, 0))),
    deaths: Math.max(0, Math.floor(readNumber(value.deaths, 0))),
    prestigeWarps: Math.max(0, Math.floor(readNumber(value.prestigeWarps, 0)))
  };
};

const readUnlockedAchievements = (value: unknown): Record<AchievementId, boolean> => {
  const unlocked = createUnlockedAchievements();
  if (!isRecord(value)) {
    return unlocked;
  }

  ACHIEVEMENT_DEFINITIONS.forEach((def) => {
    unlocked[def.id] = value[def.id] === true;
  });
  return unlocked;
};

const readBossDiscovery = (value: unknown): BossDiscoveryState => {
  if (!isRecord(value)) {
    return {
      rareBossProgress: 0,
      rareBossesFound: 0
    };
  }

  return {
    rareBossProgress: Math.max(0, Math.floor(readNumber(value.rareBossProgress, 0))),
    rareBossesFound: Math.max(0, Math.floor(readNumber(value.rareBossesFound, 0)))
  };
};

const readBossRewardIds = (value: unknown): BossRewardId[] => {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is BossRewardId => id === 'rapidFire' || id === 'droneOverdrive' || id === 'salvageSurge');
};

const readBossRewards = (value: unknown): BossRewardState => {
  if (!isRecord(value)) {
    return createBossRewardState();
  }

  return normalizeBossRewardState({
    pendingChoiceIds: readBossRewardIds(value.pendingChoiceIds),
    activeIds: readBossRewardIds(value.activeIds)
  });
};

const readSurvival = (value: unknown): SurvivalState => {
  if (!isRecord(value)) {
    return createSurvivalState();
  }

  const currentSeconds = readNonNegativeNumber(value.currentSeconds, 0);
  const difficulty = normalizeNovaCrownDifficulty(readNumber(value.difficulty, 1));
  const threatLevel = Math.max(0, Math.floor(readNumber(value.threatLevel, currentSeconds > 0 ? getSurvivalThreatLevel(currentSeconds, difficulty) : 0)));
  return {
    active: value.active === true && currentSeconds > 0,
    difficulty,
    currentSeconds,
    threatLevel,
    lastAnnouncedThreatLevel: Math.max(0, Math.floor(readNumber(value.lastAnnouncedThreatLevel, threatLevel))),
    nextRewardThreatLevel: Math.max(1, Math.floor(readNumber(value.nextRewardThreatLevel, 10))),
    hazardSpawnCooldown: readNonNegativeNumber(value.hazardSpawnCooldown, 0),
    hunterSpawnCooldown: readNonNegativeNumber(value.hunterSpawnCooldown, 0),
    timedEventCooldown: readNonNegativeNumber(value.timedEventCooldown, 0),
    gravityPulseCooldown: readNonNegativeNumber(value.gravityPulseCooldown, 0),
    damageFieldCooldown: readNonNegativeNumber(value.damageFieldCooldown, 0)
  };
};

const readRareSpawns = (value: unknown): RareSpawnState => {
  const fallback = createRareSpawnState();
  if (!isRecord(value) || !isRecord(value.cooldowns)) {
    return fallback;
  }

  return {
    cooldowns: {
      proximityMine: readNonNegativeNumber(value.cooldowns.proximityMine, fallback.cooldowns.proximityMine)
    }
  };
};

const createShipRunFromProgression = (progression: ProgressionState, money: number, crystals: number): ShipRunState => ({
  money: Math.max(0, money),
  crystals: Math.max(0, Math.floor(crystals)),
  passiveIncomeLevel: progression.passiveIncomeLevel,
  shipDamageLevel: progression.shipDamageLevel,
  shipFireRateLevel: progression.shipFireRateLevel,
  shipSpeedLevel: progression.shipSpeedLevel,
  deflectorLevel: progression.deflectorLevel,
  droneDamageLevel: progression.droneDamageLevel,
  droneFireRateLevel: progression.droneFireRateLevel,
  droneCounts: { ...progression.droneCounts },
  activeDroneCounts: { ...progression.activeDroneCounts },
  talentRanks: { ...progression.talentRanks },
  shipXp: progression.shipXp,
  shipLevel: progression.shipLevel,
  shipSkillPoints: progression.shipSkillPoints,
  spentShipSkillPoints: progression.spentShipSkillPoints,
  weaponMode: progression.weaponMode,
  mapUnlocked: progression.mapUnlocked,
  travelLevel: progression.travelLevel,
  currentZoneIndex: progression.currentZoneIndex,
  unlockedZoneIndex: progression.unlockedZoneIndex,
  firstGateAsteroidsDestroyed: progression.firstGateAsteroidsDestroyed,
  bossDefeats: progression.bossDefeats,
  bossDiscovery: { ...progression.bossDiscovery },
  maxHp: progression.maxHp,
  armor: progression.armor,
  dronesPurchased: progression.dronesPurchased
});

const readShipRun = (value: unknown): ShipRunState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const legacyDroneCount = Math.max(0, Math.floor(readNumber(value.dronesPurchased, 0)));
  const droneCounts = readDroneCounts(value.droneCounts, legacyDroneCount);
  const activeDroneCounts = readActiveDroneCounts(value.activeDroneCounts, droneCounts);
  const spreadUnlocked = value.spreadUnlocked === true;
  const piercingUnlocked = value.piercingUnlocked === true;
  const legacySkills = readLegacyDroneSkillLevels(value.droneSkillLevels);
  const talentRanks = readTalentRanks(value.talentRanks, legacySkills);
  const shipLevelProgress = readShipLevelProgress(value, talentRanks);
  const legacyTravelLevel = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.travelLevel, 0))));
  const unlockedZoneIndex = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.unlockedZoneIndex, legacyTravelLevel))));

  return {
    money: readNonNegativeNumber(value.money, 0),
    crystals: Math.floor(readNonNegativeNumber(value.crystals, 0)),
    passiveIncomeLevel: Math.max(0, Math.floor(readNumber(value.passiveIncomeLevel, 0))),
    shipDamageLevel: Math.max(1, Math.floor(readNumber(value.shipDamageLevel, 1))),
    shipFireRateLevel: Math.max(0, Math.floor(readNumber(value.shipFireRateLevel, 0))),
    shipSpeedLevel: Math.max(0, Math.floor(readNumber(value.shipSpeedLevel, 0))),
    deflectorLevel: Math.max(0, Math.floor(readNumber(value.deflectorLevel, 0))),
    droneDamageLevel: Math.max(1, Math.floor(readNumber(value.droneDamageLevel, 1))),
    droneFireRateLevel: Math.max(0, Math.floor(readNumber(value.droneFireRateLevel, 0))),
    droneCounts,
    activeDroneCounts,
    talentRanks,
    ...shipLevelProgress,
    weaponMode: readWeaponMode(value.weaponMode, spreadUnlocked, piercingUnlocked),
    mapUnlocked: value.mapUnlocked === true || unlockedZoneIndex > 0,
    travelLevel: unlockedZoneIndex,
    currentZoneIndex: Math.max(0, Math.min(unlockedZoneIndex, Math.floor(readNumber(value.currentZoneIndex, unlockedZoneIndex)))),
    unlockedZoneIndex,
    firstGateAsteroidsDestroyed: Math.max(0, Math.floor(readNumber(value.firstGateAsteroidsDestroyed, 0))),
    bossDefeats: Math.max(0, Math.floor(readNumber(value.bossDefeats, unlockedZoneIndex))),
    bossDiscovery: readBossDiscovery(value.bossDiscovery),
    maxHp: Math.max(100, Math.floor(readNumber(value.maxHp, 100))),
    armor: Math.max(0, Math.floor(readNumber(value.armor, 0))),
    dronesPurchased: droneCounts.sentry + droneCounts.ranger + droneCounts.breaker
  };
};

const readShipRuns = (value: unknown, unlockedShipFrameIds: ShipFrameId[]): Partial<Record<ShipFrameId, ShipRunState>> => {
  if (!isRecord(value)) {
    return {};
  }

  return unlockedShipFrameIds.reduce<Partial<Record<ShipFrameId, ShipRunState>>>((runs, id) => {
    const run = readShipRun(value[id]);
    if (run) {
      runs[id] = run;
    }
    return runs;
  }, {});
};

const guidedMissionIds: GuidedMissionId[] = [
  'drawGateBoss',
  'defeatGateBoss',
  'travelToOrion',
  'collectWarpCrystals',
  'openVegaRoute',
  'travelToVega',
  'earnFirstCore',
  'installDroneSystems',
  'openCygnusRoute',
  'travelToCygnus',
  'openNovaRoute',
  'travelToNovaCrown',
  'clearAsteroids',
  'surviveAsteroids',
  'collectCredits',
  'collectCrystals',
  'defeatZoneBoss'
];

const normalizeGuidedMissionId = (value: unknown): GuidedMissionId | null => {
  if (value === 'warpForFirstCore') {
    return 'earnFirstCore';
  }
  return typeof value === 'string' && guidedMissionIds.includes(value as GuidedMissionId)
    ? value as GuidedMissionId
    : null;
};

const isGuidedMissionId = (value: unknown): value is GuidedMissionId =>
  normalizeGuidedMissionId(value) !== null;

const isShipFrameId = (value: unknown): value is ShipFrameId =>
  typeof value === 'string' && value in SHIP_FRAME_BY_ID;

const readShipUnlockProgress = (value: unknown): ShipUnlockProgress => {
  const fallback = createShipUnlockProgress();
  if (!isRecord(value)) {
    return fallback;
  }

  return normalizeShipUnlockProgress({
    asteroidCollisions: readNonNegativeNumber(value.asteroidCollisions, fallback.asteroidCollisions),
    asteroidBurstBest: readNonNegativeNumber(value.asteroidBurstBest, fallback.asteroidBurstBest),
    prismBossDefeatsSinceDrop: readNonNegativeNumber(value.prismBossDefeatsSinceDrop, fallback.prismBossDefeatsSinceDrop),
    novaCrownShipFrameIds: Array.isArray(value.novaCrownShipFrameIds)
      ? value.novaCrownShipFrameIds.filter(isShipFrameId)
      : fallback.novaCrownShipFrameIds,
    meteorImpactsSurvived: readNonNegativeNumber(value.meteorImpactsSurvived, fallback.meteorImpactsSurvived),
    wraithNoDamageSeconds: readNonNegativeNumber(value.wraithNoDamageSeconds, fallback.wraithNoDamageSeconds)
  });
};

const readGuidedMissions = (value: unknown): GuidedMissionState => {
  const fallback = createGuidedMissionState();
  if (!isRecord(value)) {
    return fallback;
  }

  const startedAt = isRecord(value.startedAt) ? value.startedAt : {};
  return {
    activeMissionId: normalizeGuidedMissionId(value.activeMissionId) ?? fallback.activeMissionId,
    completedMissionIds: Array.isArray(value.completedMissionIds)
      ? Array.from(new Set(value.completedMissionIds.map((id) => normalizeGuidedMissionId(id)).filter((id): id is GuidedMissionId => id !== null)))
      : [],
    repeatCompletions: Math.max(0, Math.floor(readNumber(value.repeatCompletions, 0))),
    startedAt: {
      firstGateAsteroidsDestroyed: Math.max(0, Math.floor(readNumber(startedAt.firstGateAsteroidsDestroyed, 0))),
      asteroidsDestroyed: Math.max(0, Math.floor(readNumber(startedAt.asteroidsDestroyed, 0))),
      moneyEarned: Math.max(0, readNumber(startedAt.moneyEarned, 0)),
      crystalsCollected: Math.max(0, Math.floor(readNumber(startedAt.crystalsCollected, 0))),
      deaths: Math.max(0, Math.floor(readNumber(startedAt.deaths, 0))),
      bossDefeats: Math.max(0, Math.floor(readNumber(startedAt.bossDefeats, 0))),
      crystals: Math.max(0, Math.floor(readNumber(startedAt.crystals, 0))),
      prestigeCores: Math.max(0, Math.floor(readNumber(startedAt.prestigeCores, 0)))
    }
  };
};

const readWarpUnlockIds = (value: unknown): WarpUnlockId[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const ids = value.filter((id): id is WarpUnlockId => typeof id === 'string' && id in WARP_UNLOCK_BY_ID);
  return Array.from(new Set(ids));
};

const hasLegacyWarpUnlockId = (value: unknown, id: string): boolean =>
  Array.isArray(value) && value.includes(id);

const addWarpUnlockId = (ids: WarpUnlockId[], id: WarpUnlockId): void => {
  if (!ids.includes(id)) {
    ids.push(id);
  }
};

const migrateShieldBubbleUnlock = (progression: ProgressionState, value: unknown): void => {
  if (!isRecord(value)) {
    return;
  }

  const hasPersistedShieldState =
    value.active === true ||
    value.broken === true ||
    readNonNegativeNumber(value.rechargeFor, 0) > 0;
  if (!hasPersistedShieldState) {
    return;
  }

  addWarpUnlockId(progression.ownedWarpUnlockIds, 'deflectorFrame');
  addWarpUnlockId(progression.ownedWarpUnlockIds, 'shieldBubble');
  applyOwnedWarpUnlockEffects(progression);
};

const readProgression = (value: unknown): ProgressionState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const maxHp = Math.max(100, Math.floor(readNumber(value.maxHp, 100)));
  const legacyDroneCount = Math.max(0, Math.floor(readNumber(value.dronesPurchased, 0)));
  const droneCounts = readDroneCounts(value.droneCounts, legacyDroneCount);
  const activeDroneCounts = readActiveDroneCounts(value.activeDroneCounts, droneCounts);
  const spreadUnlocked = value.spreadUnlocked === true;
  const piercingUnlocked = value.piercingUnlocked === true;
  const shipDamageLevel = Math.max(1, Math.floor(readNumber(value.shipDamageLevel, 1)));
  const shipFireRateLevel = Math.max(0, Math.floor(readNumber(value.shipFireRateLevel, 0)));
  const shipSpeedLevel = Math.max(0, Math.floor(readNumber(value.shipSpeedLevel, 0)));
  const deflectorLevel = Math.max(0, Math.floor(readNumber(value.deflectorLevel, 0)));
  const armor = Math.max(0, Math.floor(readNumber(value.armor, 0)));
  const legacySkills = readLegacyDroneSkillLevels(value.droneSkillLevels);
  const talentRanks = readTalentRanks(value.talentRanks, legacySkills);
  const shipLevelProgress = readShipLevelProgress(value, talentRanks);
  const legacyTravelLevel = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.travelLevel, 0))));
  const unlockedZoneIndex = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.unlockedZoneIndex, legacyTravelLevel))));
  const currentZoneIndex = Math.max(0, Math.min(unlockedZoneIndex, Math.floor(readNumber(value.currentZoneIndex, unlockedZoneIndex))));
  const ownedWarpUnlockIds = readWarpUnlockIds(value.ownedWarpUnlockIds);
  const unlockedShipFrameIds = normalizeShipFrameIds(value.unlockedShipFrameIds);
  const activeShipFrameId = isShipFrameId(value.activeShipFrameId) && unlockedShipFrameIds.includes(value.activeShipFrameId)
    ? value.activeShipFrameId
    : 'vector';
  const legacyUnlockIds = value.ownedWarpUnlockIds;
  if (droneCounts.sentry > 0 || droneCounts.ranger > 0 || droneCounts.breaker > 0) {
    addWarpUnlockId(ownedWarpUnlockIds, 'droneSystems');
  }
  if (deflectorLevel > 0) {
    addWarpUnlockId(ownedWarpUnlockIds, 'deflectorFrame');
  }
  if (hasLegacyWarpUnlockId(legacyUnlockIds, 'coreStabilizer')) {
    addWarpUnlockId(ownedWarpUnlockIds, 'droneSystems');
  }
  if (hasLegacyWarpUnlockId(legacyUnlockIds, 'hullReinforcement')) {
    addWarpUnlockId(ownedWarpUnlockIds, 'deflectorFrame');
  }
  if (hasLegacyWarpUnlockId(legacyUnlockIds, 'armorPlating')) {
    addWarpUnlockId(ownedWarpUnlockIds, 'shieldBubble');
  }
  if (hasLegacyWarpUnlockId(legacyUnlockIds, 'flightThrusters')) {
    addWarpUnlockId(ownedWarpUnlockIds, 'bossBeacon');
  }
  if (droneCounts.ranger > 0) {
    addWarpUnlockId(ownedWarpUnlockIds, 'rangerHangar');
  }
  if (droneCounts.breaker > 0) {
    addWarpUnlockId(ownedWarpUnlockIds, 'missileFoundry');
  }

  const progression: ProgressionState = {
    passiveIncomeLevel: Math.max(0, Math.floor(readNumber(value.passiveIncomeLevel, 0))),
    shipDamageLevel,
    shipFireRateLevel,
    shipSpeedLevel,
    deflectorLevel,
    droneDamageLevel: Math.max(1, Math.floor(readNumber(value.droneDamageLevel, 1))),
    droneFireRateLevel: Math.max(0, Math.floor(readNumber(value.droneFireRateLevel, 0))),
    droneCounts,
    activeDroneCounts,
    talentRanks,
    ...shipLevelProgress,
    weaponMode: readWeaponMode(value.weaponMode, spreadUnlocked, piercingUnlocked),
    spreadUnlocked,
    piercingUnlocked,
    mapUnlocked: value.mapUnlocked === true || unlockedZoneIndex > 0,
    travelLevel: unlockedZoneIndex,
    currentZoneIndex,
    unlockedZoneIndex,
    firstGateAsteroidsDestroyed: Math.max(0, Math.floor(readNumber(value.firstGateAsteroidsDestroyed, 0))),
    bossDefeats: Math.max(0, Math.floor(readNumber(value.bossDefeats, unlockedZoneIndex))),
    bossDiscovery: readBossDiscovery(value.bossDiscovery),
    guidedMissions: readGuidedMissions(value.guidedMissions),
    survivalBestSeconds: readNonNegativeNumber(value.survivalBestSeconds, 0),
    survivalBestThreatLevel: Math.max(0, Math.floor(readNumber(value.survivalBestThreatLevel, 0))),
    novaCrownHighestDifficulty: normalizeNovaCrownDifficulty(readNumber(value.novaCrownHighestDifficulty, 1)),
    novaCrownSelectedDifficulty: normalizeNovaCrownDifficulty(readNumber(value.novaCrownSelectedDifficulty, 1)),
    novaCrownBestSecondsByDifficulty: readNonNegativeNumberRecord(value.novaCrownBestSecondsByDifficulty),
    novaCrownCoreRewardedDifficultyKeys: normalizeNovaCrownCoreRewardedDifficultyKeys(value.novaCrownCoreRewardedDifficultyKeys),
    activeShipFrameId,
    unlockedShipFrameIds,
    shipUnlockProgress: readShipUnlockProgress(value.shipUnlockProgress),
    shipRuns: readShipRuns(value.shipRuns, unlockedShipFrameIds),
    prestigeCores: Math.max(0, Math.floor(readNumber(value.prestigeCores, 0))),
    ownedWarpUnlockIds,
    announcedAffordableWarpUnlockIds: readWarpUnlockIds(value.announcedAffordableWarpUnlockIds),
    maxHp,
    armor,
    dronesPurchased: droneCounts.sentry + droneCounts.ranger + droneCounts.breaker,
    achievementStats: readAchievementStats(value.achievementStats),
    unlockedAchievements: readUnlockedAchievements(value.unlockedAchievements)
  };
  applyOwnedWarpUnlockEffects(progression);
  return progression;
};

const readVec2 = (value: unknown, fallback: Vec2): Vec2 => {
  if (!isRecord(value)) {
    return fallback;
  }

  return {
    x: readNumber(value.x, fallback.x),
    y: readNumber(value.y, fallback.y)
  };
};

const readShieldBubble = (value: unknown, progression: ProgressionState): ShieldBubbleState => {
  const fallback = createShieldBubble(progression);
  if (!isRecord(value)) {
    return fallback;
  }

  const unlocked = progression.ownedWarpUnlockIds.includes('shieldBubble');
  const broken = unlocked && value.broken === true;
  return {
    active: unlocked && !broken && value.active !== false,
    broken,
    rechargeFor: broken ? readNonNegativeNumber(value.rechargeFor, balance.ship.shieldBubbleRechargeSeconds) : 0,
    hitFlashFor: unlocked ? readNonNegativeNumber(value.hitFlashFor, 0) : 0
  };
};

const readSavedGameV2 = (value: Record<string, unknown>): SavedGameV2 | null => {
  const progression = readProgression(value.progression);
  const ship = isRecord(value.ship) ? value.ship : null;
  if (!progression || !ship) {
    return null;
  }
  migrateShieldBubbleUnlock(progression, value.shieldBubble);
  const money = readNonNegativeNumber(value.money, 0);
  const crystals = Math.floor(readNonNegativeNumber(value.crystals, 0));
  if (!progression.shipRuns[progression.activeShipFrameId]) {
    progression.shipRuns = {
      ...progression.shipRuns,
      [progression.activeShipFrameId]: createShipRunFromProgression(progression, money, crystals)
    };
  }

  return {
    version: 2,
    money,
    crystals,
    lastSeenAt: readNonNegativeNumber(value.lastSeenAt, Date.now()),
    progression,
    ship: {
      position: readVec2(ship.position, { x: 0, y: 0 }),
      hp: Math.min(progression.maxHp, readNonNegativeNumber(ship.hp, progression.maxHp)),
      alive: ship.alive === true,
      respawnFor: readNonNegativeNumber(ship.respawnFor, 0),
      phaseShieldCooldown: readNonNegativeNumber(ship.phaseShieldCooldown, 0),
      phaseShieldFlashFor: readNonNegativeNumber(ship.phaseShieldFlashFor, 0)
    },
    shieldBubble: readShieldBubble(value.shieldBubble, progression),
    bossRewards: readBossRewards(value.bossRewards),
    rareSpawns: readRareSpawns(value.rareSpawns),
    survival: readSurvival(value.survival)
  };
};

const migrateSavedGameToCurrent = (value: unknown): SavedGame | null => {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.version) {
    case 2:
      return readSavedGameV2(value);
    default:
      return null;
  }
};

const readSavedGame = (raw: string | null): SavedGame | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return migrateSavedGameToCurrent(parsed);
  } catch {
    return null;
  }
};

const readStoredSave = (): SavedGame | null => {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    const save = readSavedGame(raw);
    if (raw && !save) {
      window.localStorage.removeItem(SAVE_KEY);
    }
    return save;
  } catch {
    return null;
  }
};

export const loadGameState = (width: number, height: number): GameState => {
  const saved = readStoredSave();
  if (!saved) {
    return createGameState(width, height);
  }

  const state = createGameState(width, height, saved.progression, saved.money);
  state.crystals = saved.crystals;
  const offlineSeconds = Math.min(balance.economy.maxOfflineSeconds, Math.max(0, (Date.now() - saved.lastSeenAt) / 1000));
  const offlineEarnings = Math.floor(offlineSeconds * getOfflineIncomeRate(saved.progression));
  state.money += offlineEarnings;
  recordMoneyEarned(state.progression, offlineEarnings);
  state.lastOfflineEarnings = offlineEarnings;
  state.deathPenaltyFor = 0;
  state.droneRebootFor = 0;
  state.ship.position = { ...saved.ship.position };
  state.ship.maxHp = Math.round(getEffectiveMaxHp(state.progression) * getShipFrameBonusMultiplier(state.progression, 'maxHpMultiplier'));
  state.ship.hp = Math.min(saved.ship.hp, state.ship.maxHp);
  state.ship.alive = saved.ship.alive && saved.ship.hp > 0;
  state.ship.respawnFor = saved.ship.respawnFor;
  state.ship.phaseShieldCooldown = saved.ship.phaseShieldCooldown ?? 0;
  state.ship.phaseShieldFlashFor = saved.ship.phaseShieldFlashFor ?? 0;
  state.phase = state.ship.alive ? 'playing' : 'respawning';
  state.shieldBubble = { ...saved.shieldBubble };
  state.bossRewards = normalizeBossRewardState(saved.bossRewards ?? createBossRewardState());
  state.rareSpawns = readRareSpawns(saved.rareSpawns);
  state.survival = { ...readSurvival(saved.survival) };
  if (state.progression.currentZoneIndex < maxTravelLevel || !state.ship.alive) {
    state.survival = createSurvivalState();
  }
  syncShieldBubbleState(state);
  state.camera = { ...state.ship.position };
  state.drones.forEach((drone) => {
    drone.position = { ...state.ship.position };
  });
  state.asteroids = createAsteroidField(state);
  syncAchievements(state.progression);
  return state;
};

export const saveGameState = (state: GameState): void => {
  const shipRuns = {
    ...state.progression.shipRuns,
    [state.progression.activeShipFrameId]: captureActiveShipRun(state)
  };
  const save: SavedGame = {
    version: SAVE_VERSION,
    money: Math.max(0, state.money),
    crystals: Math.max(0, Math.floor(state.crystals)),
    lastSeenAt: Date.now(),
    progression: {
      ...state.progression,
      shipRuns,
      ownedWarpUnlockIds: [...state.progression.ownedWarpUnlockIds],
      announcedAffordableWarpUnlockIds: [...state.progression.announcedAffordableWarpUnlockIds]
    },
    ship: {
      position: { ...state.ship.position },
      hp: Math.max(0, Math.min(state.ship.hp, state.ship.maxHp)),
      alive: state.ship.alive,
      respawnFor: Math.max(0, state.ship.respawnFor),
      phaseShieldCooldown: Math.max(0, state.ship.phaseShieldCooldown),
      phaseShieldFlashFor: Math.max(0, state.ship.phaseShieldFlashFor)
    },
    shieldBubble: { ...state.shieldBubble },
    bossRewards: {
      pendingChoiceIds: [...state.bossRewards.pendingChoiceIds],
      activeIds: [...state.bossRewards.activeIds]
    },
    rareSpawns: {
      cooldowns: { ...state.rareSpawns.cooldowns }
    },
    survival: { ...state.survival }
  };

  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Persistence is best-effort; gameplay should continue if storage is blocked.
  }
};

export const clearAllAsteridleData = (): void => {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_value, index) => window.localStorage.key(index))
      .filter((key): key is string => typeof key === 'string' && key.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Clearing data is best-effort; the caller still resets in-memory state.
  }
};
