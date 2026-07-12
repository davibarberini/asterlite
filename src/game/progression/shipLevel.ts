import type { GameState, ProgressionState } from '../simulation/types';
import { emitAudio, emitReward } from '../simulation/events';
import { getLevelShockwaveSkillMultiplier } from './talentEffects';

export const baseMaxShipLevel = 20;

/**
 * XP required to go from level 1 to level 2.
 *
 * Kept high on purpose: a single asteroid/boss (or a level-up shockwave clearing
 * several rocks) should never grant a whole level, so leveling never chains into
 * multiple level-ups at once.
 */
const shipXpBaseRequirement = 2400;

/**
 * Per-level XP growth. Each level costs ~1.32x the previous one, so early levels
 * stay reachable while late levels (toward the level-20 cap) take a long grind.
 */
const shipXpGrowthPerLevel = 1.32;

/**
 * Extra ship levels granted by future global technologies.
 *
 * No technology raises the pilot's level ceiling yet. This is the seam the level
 * cap reads from so a later backlog item can grant bonus levels (and therefore
 * more skill points) without touching every caller.
 */
export const getShipLevelCapBonus = (_progression: ProgressionState): number => 0;

export const getMaxShipLevel = (progression: ProgressionState): number =>
  baseMaxShipLevel + Math.max(0, Math.floor(getShipLevelCapBonus(progression)));

export const getShipXpForNextLevel = (level: number): number => {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(shipXpBaseRequirement * shipXpGrowthPerLevel ** (safeLevel - 1));
};

export const getAvailableShipSkillPoints = (progression: ProgressionState): number =>
  Math.max(0, Math.floor(progression.shipSkillPoints) - Math.floor(progression.spentShipSkillPoints));

export const getTotalShipSkillPointCap = (progression: ProgressionState): number => getMaxShipLevel(progression) - 1;

const createLevelShockwave = (state: GameState, levelsGained: number): void => {
  const maxRadius = (540 + Math.min(3, Math.max(0, levelsGained - 1)) * 90) *
    getLevelShockwaveSkillMultiplier(state.progression);
  state.levelShockwaves.push({
    id: state.nextId++,
    center: { ...state.ship.position },
    radius: 34,
    maxRadius,
    speed: 1080,
    age: 0,
    ttl: maxRadius / 1080 + 0.18
  });
};

export const grantShipXp = (state: GameState, amount: number): void => {
  const maxLevel = getMaxShipLevel(state.progression);
  if (state.progression.shipLevel >= maxLevel) {
    state.progression.shipLevel = maxLevel;
    state.progression.shipXp = 0;
    return;
  }

  state.progression.shipXp += Math.max(0, Math.floor(amount));
  let levelsGained = 0;
  while (state.progression.shipLevel < maxLevel) {
    const needed = getShipXpForNextLevel(state.progression.shipLevel);
    if (state.progression.shipXp < needed) {
      break;
    }
    state.progression.shipXp -= needed;
    state.progression.shipLevel += 1;
    state.progression.shipSkillPoints += 1;
    levelsGained += 1;
  }

  if (state.progression.shipLevel >= maxLevel) {
    state.progression.shipLevel = maxLevel;
    state.progression.shipXp = 0;
  }

  if (levelsGained > 0) {
    createLevelShockwave(state, levelsGained);
    emitAudio(state, { type: 'shipLevelUp' });
    emitReward(state, `Ship level ${state.progression.shipLevel}: +${levelsGained} skill point${levelsGained === 1 ? '' : 's'}`, 'system');
  }
};

export const getAsteroidShipXpReward = (asteroid: { bossType?: unknown; size: 'large' | 'medium' | 'small' }): number => {
  if (asteroid.bossType) {
    return 120;
  }
  if (asteroid.size === 'large') {
    return 18;
  }
  if (asteroid.size === 'medium') {
    return 12;
  }
  return 8;
};
