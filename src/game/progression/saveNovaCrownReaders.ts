import type { RareSpawnState, SurvivalState } from '../simulation/types';
import { createRareSpawnState } from '../simulation/systems/rareSpawns';
import { createSurvivalState, getSurvivalThreatLevel } from '../simulation/systems/survival';
import { normalizeNovaCrownDifficulty } from './novaCrownDifficulty';
import { normalizeNovaCrownCoreRewardedDifficultyKeys } from './novaCrownRewards';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const readNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

const readNonNegativeNumber = (value: unknown, fallback: number): number =>
  Math.max(0, readNumber(value, fallback));

export const readNovaCrownBestSecondsByDifficulty = (value: unknown): Record<string, number> => {
  if (!isRecord(value)) {
    return {};
  }

  return Object.entries(value).reduce<Record<string, number>>((record, [key, rawValue]) => {
    const normalizedKey = normalizeNovaCrownDifficulty(Number(key)).toString();
    record[normalizedKey] = Math.max(record[normalizedKey] ?? 0, readNonNegativeNumber(rawValue, 0));
    return record;
  }, {});
};

export const readNovaCrownDifficulty = (value: unknown, fallback = 1): number =>
  normalizeNovaCrownDifficulty(readNumber(value, fallback));

export const readNovaCrownCoreRewardKeys = (value: unknown): string[] =>
  normalizeNovaCrownCoreRewardedDifficultyKeys(value);

export const readSurvival = (value: unknown): SurvivalState => {
  if (!isRecord(value)) {
    return createSurvivalState();
  }

  const currentSeconds = readNonNegativeNumber(value.currentSeconds, 0);
  const difficulty = readNovaCrownDifficulty(value.difficulty);
  const threatLevel = Math.max(
    0,
    Math.floor(readNumber(value.threatLevel, currentSeconds > 0 ? getSurvivalThreatLevel(currentSeconds, difficulty) : 0))
  );

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

export const readRareSpawns = (value: unknown): RareSpawnState => {
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
