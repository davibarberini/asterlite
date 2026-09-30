import type { RareSpawnState, SurvivalState } from '../simulation/types';
import { createRareSpawnState } from '../simulation/systems/rareSpawns';
import { createSurvivalState, getSurvivalThreatLevel } from '../simulation/systems/survival';
import { normalizeNovaCrownDifficulty } from './novaCrownDifficulty';
import { isRecord, readNonNegativeNumber, readNumber } from './saveSerialization';

/**
 * Nova Crown survival domain save readers.
 *
 * Keeps survival run state and rare-spawn cooldown parsing in one focused module
 * so the growing Nova Crown feature set has a clear save boundary separate from
 * the main progression reader.
 */

export const readSurvival = (value: unknown): SurvivalState => {
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
