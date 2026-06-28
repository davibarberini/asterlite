import { createGameState } from '../simulation/state';
import { createAsteroidField } from '../simulation/systems/asteroids';
import {
  ACHIEVEMENT_DEFINITIONS,
  createAchievementStats,
  createUnlockedAchievements,
  getEffectiveMaxHp,
  recordMoneyEarned,
  syncAchievements
} from './achievements';
import { createTalentRanks, migrateLegacyDroneSkills, TALENT_DEFINITIONS, getRefineryIncomeMultiplier } from './talentTree';
import type { AchievementId, AchievementStats, DroneType, GameState, ProgressionState, TalentRanks, Vec2, WeaponMode } from '../simulation/types';
import { getPrestigeMoneyMultiplier } from './prestige';
import { maxTravelLevel } from '../simulation/zones';
import { balance } from '../balance';

const SAVE_KEY = 'asteridle.save.v1';
const SAVE_VERSION: SaveVersion = 1;

type SaveVersion = 1;

export const SAVE_VERSION_NOTES: Record<SaveVersion, string> = {
  1: 'Stores credits, crystals, offline timestamp, normalized progression, and ship position/health/respawn state.'
};

type SavedGameV1 = {
  version: 1;
  money: number;
  crystals: number;
  lastSeenAt: number;
  progression: ProgressionState;
  ship: {
    position: Vec2;
    hp: number;
    alive: boolean;
    respawnFor: number;
  };
};

type SavedGame = SavedGameV1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

const readNonNegativeNumber = (value: unknown, fallback: number): number =>
  Math.max(0, readNumber(value, fallback));

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
    prestigeWarps: Math.max(0, Math.floor(readNumber(value.prestigeWarps, 0))),
    hyperspaceUses: Math.max(0, Math.floor(readNumber(value.hyperspaceUses, 0)))
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

const readProgression = (value: unknown): ProgressionState | null => {
  if (!isRecord(value)) {
    return null;
  }

  const maxHp = Math.max(100, Math.floor(readNumber(value.maxHp, 100)));
  const legacyDroneCount = Math.max(0, Math.floor(readNumber(value.dronesPurchased, 0)));
  const droneCounts = readDroneCounts(value.droneCounts, legacyDroneCount);
  const spreadUnlocked = value.spreadUnlocked === true;
  const piercingUnlocked = value.piercingUnlocked === true;
  const legacySkills = readLegacyDroneSkillLevels(value.droneSkillLevels);
  const legacyTravelLevel = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.travelLevel, 0))));
  const unlockedZoneIndex = Math.max(0, Math.min(maxTravelLevel, Math.floor(readNumber(value.unlockedZoneIndex, legacyTravelLevel))));
  const currentZoneIndex = Math.max(0, Math.min(unlockedZoneIndex, Math.floor(readNumber(value.currentZoneIndex, unlockedZoneIndex))));
  return {
    passiveIncomeLevel: Math.max(0, Math.floor(readNumber(value.passiveIncomeLevel, 0))),
    shipDamageLevel: Math.max(1, Math.floor(readNumber(value.shipDamageLevel, 1))),
    shipSpeedLevel: Math.max(0, Math.floor(readNumber(value.shipSpeedLevel, 0))),
    deflectorLevel: Math.max(0, Math.floor(readNumber(value.deflectorLevel, 0))),
    droneDamageLevel: Math.max(1, Math.floor(readNumber(value.droneDamageLevel, 1))),
    droneFireRateLevel: Math.max(0, Math.floor(readNumber(value.droneFireRateLevel, 0))),
    droneCounts,
    talentRanks: readTalentRanks(value.talentRanks, legacySkills),
    weaponMode: readWeaponMode(value.weaponMode, spreadUnlocked, piercingUnlocked),
    spreadUnlocked,
    piercingUnlocked,
    mapUnlocked: value.mapUnlocked === true || unlockedZoneIndex > 0,
    travelLevel: unlockedZoneIndex,
    currentZoneIndex,
    unlockedZoneIndex,
    bossDefeats: Math.max(0, Math.floor(readNumber(value.bossDefeats, unlockedZoneIndex))),
    prestigeCores: Math.max(0, Math.floor(readNumber(value.prestigeCores, 0))),
    maxHp,
    armor: Math.max(0, Math.floor(readNumber(value.armor, 0))),
    dronesPurchased: droneCounts.sentry + droneCounts.ranger + droneCounts.breaker,
    achievementStats: readAchievementStats(value.achievementStats),
    unlockedAchievements: readUnlockedAchievements(value.unlockedAchievements)
  };
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

const readSavedGameV1 = (value: Record<string, unknown>): SavedGameV1 | null => {
  const progression = readProgression(value.progression);
  const ship = isRecord(value.ship) ? value.ship : null;
  if (!progression || !ship) {
    return null;
  }

  return {
    version: 1,
    money: readNonNegativeNumber(value.money, 0),
    crystals: Math.floor(readNonNegativeNumber(value.crystals, 0)),
    lastSeenAt: readNonNegativeNumber(value.lastSeenAt, Date.now()),
    progression,
    ship: {
      position: readVec2(ship.position, { x: 0, y: 0 }),
      hp: Math.min(progression.maxHp, readNonNegativeNumber(ship.hp, progression.maxHp)),
      alive: ship.alive === true,
      respawnFor: readNonNegativeNumber(ship.respawnFor, 0)
    }
  };
};

const migrateSavedGameToCurrent = (value: unknown): SavedGame | null => {
  if (!isRecord(value)) {
    return null;
  }

  switch (value.version) {
    case 1:
      return readSavedGameV1(value);
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
    return readSavedGame(window.localStorage.getItem(SAVE_KEY));
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
  const offlineEarnings = Math.floor(
    offlineSeconds *
      saved.progression.passiveIncomeLevel *
      balance.economy.passiveIncomePerLevel *
      getPrestigeMoneyMultiplier(saved.progression) *
      getRefineryIncomeMultiplier(saved.progression)
  );
  state.money += offlineEarnings;
  recordMoneyEarned(state.progression, offlineEarnings);
  state.lastOfflineEarnings = offlineEarnings;
  state.deathPenaltyFor = 0;
  state.droneRebootFor = 0;
  state.ship.position = { ...saved.ship.position };
  state.ship.maxHp = getEffectiveMaxHp(state.progression);
  state.ship.hp = Math.min(saved.ship.hp, state.ship.maxHp);
  state.ship.alive = saved.ship.alive && saved.ship.hp > 0;
  state.ship.respawnFor = saved.ship.respawnFor;
  state.phase = state.ship.alive ? 'playing' : 'respawning';
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
    progression: { ...state.progression },
    ship: {
      position: { ...state.ship.position },
      hp: Math.max(0, Math.min(state.ship.hp, state.ship.maxHp)),
      alive: state.ship.alive,
      respawnFor: Math.max(0, state.ship.respawnFor)
    }
  };

  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Persistence is best-effort; gameplay should continue if storage is blocked.
  }
};
