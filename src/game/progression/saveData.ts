import { createGameState, createShieldBubble, syncShieldBubbleState } from '../simulation/state';
import { createAsteroidField } from '../simulation/systems/asteroids';
import {
  ACHIEVEMENT_DEFINITIONS,
  createAchievementStats,
  createUnlockedAchievements,
  getEffectiveMaxHp,
  syncAchievements
} from './achievements';
import { baseMaxShipLevel } from './shipLevel';
import { normalizeRunCardState, reconcilePendingRunCards, syncRunCardDerivedState } from './runCards';
import { createGuidedMissionState } from './guidedMissions';
import { SHIP_FRAME_BY_ID, normalizeShipFrameIds } from './shipFrames';
import type { AchievementId, AchievementStats, BossDiscoveryState, GameState, GuidedMissionId, GuidedMissionState, ProgressionState, RareSpawnState, ShieldBubbleState, ShipFrameId, ShipUnlockProgress, SurvivalState, Vec2, WarpUnlockId } from '../simulation/types';
import { maxTravelLevel } from '../simulation/zones';
import { balance } from '../balance';
import { WARP_UNLOCK_BY_ID, applyOwnedWarpUnlockEffects } from './warpUnlocks';
import { createSurvivalState } from '../simulation/systems/survival';
import { createShipUnlockProgress, normalizeShipUnlockProgress } from './shipUnlocks';
import { normalizeNovaCrownDifficulty } from './novaCrownDifficulty';
import { normalizeNovaCrownCoreRewardedDifficultyKeys } from './novaCrownRewards';
import { isRecord, readNonNegativeNumber, readNumber } from './saveSerialization';
import { readRareSpawns, readSurvival } from './survivalSave';

const SAVE_KEY = 'asterlite.save.v1';
const STORAGE_PREFIX = 'asterlite.';
const SAVE_VERSION: SaveVersion = 2;

type SaveVersion = 2;

export const SAVE_VERSION_NOTES: Record<SaveVersion, string> = {
  2: 'Stores Nova Crown difficulty ladder state, credits, crystals, progression, ship state, temporary run cards, shield bubble state, and survival state.'
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
    phaseShieldCooldown?: number;
    phaseShieldFlashFor?: number;
  };
  shieldBubble: ShieldBubbleState;
  runCards?: GameState['runCards'];
  run?: GameState['run'];
  rareSpawns?: RareSpawnState;
  survival?: SurvivalState;
};

type SavedGame = SavedGameV2;

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

const readShipLevelProgress = (value: Record<string, unknown>): { shipXp: number; shipLevel: number } => {
  const shipLevel = Math.max(
    1,
    Math.min(baseMaxShipLevel, Math.floor(readNumber(value.shipLevel, 1)))
  );
  return {
    shipXp: readNonNegativeNumber(value.shipXp, 0),
    shipLevel
  };
};

const readAchievementStats = (value: unknown): AchievementStats => {
  if (!isRecord(value)) {
    return createAchievementStats();
  }

  return {
    dronesRecruited: Math.max(0, Math.floor(readNumber(value.dronesRecruited, 0))),
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

  const shipSpeedLevel = Math.max(0, Math.floor(readNumber(value.shipSpeedLevel, 0)));
  const deflectorLevel = Math.max(0, Math.floor(readNumber(value.deflectorLevel, 0)));
  const armor = Math.max(0, Math.floor(readNumber(value.armor, 0)));
  const shipLevelProgress = readShipLevelProgress(value);
  const legacyTravelLevel = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.travelLevel, 0))));
  const unlockedZoneIndex = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.unlockedZoneIndex, legacyTravelLevel))));
  const currentZoneIndex = Math.max(0, Math.min(unlockedZoneIndex, Math.floor(readNumber(value.currentZoneIndex, unlockedZoneIndex))));
  const ownedWarpUnlockIds = readWarpUnlockIds(value.ownedWarpUnlockIds);
  const unlockedShipFrameIds = normalizeShipFrameIds(value.unlockedShipFrameIds);
  const activeShipFrameId = isShipFrameId(value.activeShipFrameId) && unlockedShipFrameIds.includes(value.activeShipFrameId)
    ? value.activeShipFrameId
    : 'vector';
  const legacyUnlockIds = value.ownedWarpUnlockIds;
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

  const progression: ProgressionState = {
    shipSpeedLevel,
    deflectorLevel,
    ...shipLevelProgress,
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
    prestigeCores: Math.max(0, Math.floor(readNumber(value.prestigeCores, 0))),
    ownedWarpUnlockIds,
    announcedAffordableWarpUnlockIds: readWarpUnlockIds(value.announcedAffordableWarpUnlockIds),
    armor,
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

  return {
    version: 2,
    money,
    crystals,
    lastSeenAt: readNonNegativeNumber(value.lastSeenAt, Date.now()),
    progression,
    ship: {
      position: readVec2(ship.position, { x: 0, y: 0 }),
      hp: readNonNegativeNumber(ship.hp, getEffectiveMaxHp(progression)),
      alive: ship.alive === true,
      phaseShieldCooldown: readNonNegativeNumber(ship.phaseShieldCooldown, 0),
      phaseShieldFlashFor: readNonNegativeNumber(ship.phaseShieldFlashFor, 0)
    },
    shieldBubble: readShieldBubble(value.shieldBubble, progression),
    runCards: normalizeRunCardState(isRecord(value.runCards) ? value.runCards as Partial<GameState['runCards']> : undefined),
    run: isRecord(value.run) ? {
      elapsedSeconds: readNonNegativeNumber(value.run.elapsedSeconds, 0),
      asteroidsDestroyed: Math.floor(readNonNegativeNumber(value.run.asteroidsDestroyed, 0)),
      coresEarned: Math.floor(readNonNegativeNumber(value.run.coresEarned, 0)),
      survivalMilestones: Math.floor(readNonNegativeNumber(value.run.survivalMilestones, 0))
    } : undefined,
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
  if (saved.run) state.run = { ...saved.run };
  state.droneRebootFor = 0;
  state.ship.position = { ...saved.ship.position };
  state.shieldBubble = { ...saved.shieldBubble };
  state.runCards = normalizeRunCardState(saved.runCards);
  reconcilePendingRunCards(state);
  syncRunCardDerivedState(state);
  state.ship.hp = Math.min(saved.ship.hp, state.ship.maxHp);
  state.ship.alive = saved.ship.alive && saved.ship.hp > 0;
  state.ship.phaseShieldCooldown = saved.ship.phaseShieldCooldown ?? 0;
  state.ship.phaseShieldFlashFor = saved.ship.phaseShieldFlashFor ?? 0;
  state.phase = state.ship.alive ? 'playing' : 'ended';
  state.rareSpawns = readRareSpawns(saved.rareSpawns);
  state.survival = { ...readSurvival(saved.survival) };
  if (state.progression.currentZoneIndex < maxTravelLevel) {
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
  const save: SavedGame = {
    version: SAVE_VERSION,
    money: Math.max(0, state.money),
    crystals: Math.max(0, Math.floor(state.crystals)),
    lastSeenAt: Date.now(),
    progression: {
      ...state.progression,
      ownedWarpUnlockIds: [...state.progression.ownedWarpUnlockIds],
      announcedAffordableWarpUnlockIds: [...state.progression.announcedAffordableWarpUnlockIds]
    },
    ship: {
      position: { ...state.ship.position },
      hp: Math.max(0, Math.min(state.ship.hp, state.ship.maxHp)),
      alive: state.ship.alive,
      phaseShieldCooldown: Math.max(0, state.ship.phaseShieldCooldown),
      phaseShieldFlashFor: Math.max(0, state.ship.phaseShieldFlashFor)
    },
    shieldBubble: { ...state.shieldBubble },
    runCards: normalizeRunCardState(state.runCards),
    run: { ...state.run },
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

export const clearAllAsterliteData = (): void => {
  try {
    const keys = Array.from({ length: window.localStorage.length }, (_value, index) => window.localStorage.key(index))
      .filter((key): key is string => typeof key === 'string' && key.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Clearing data is best-effort; the caller still resets in-memory state.
  }
};
