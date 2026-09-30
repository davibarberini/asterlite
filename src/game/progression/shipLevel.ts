import type { GameState, ProgressionState } from '../simulation/types';
import { emitAudio, emitReward } from '../simulation/events';
import { queueLevelUpCardChoices } from './runCards';

export const baseMaxShipLevel = 20;

/**
 * Asteroid destroys needed for each early level. XP is intentionally one point
 * per asteroid so the player can read this as a direct progression cadence.
 */
const shipXpRequirements = [2, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 1200];

const shipXpRequirementAfterDefinedLevels = (level: number): number =>
  shipXpRequirements[shipXpRequirements.length - 1] + (level - shipXpRequirements.length) * 200;

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
  return shipXpRequirements[safeLevel - 1] ?? shipXpRequirementAfterDefinedLevels(safeLevel);
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
    levelsGained += 1;
  }

  if (state.progression.shipLevel >= maxLevel) {
    state.progression.shipLevel = maxLevel;
    state.progression.shipXp = 0;
  }

  if (levelsGained > 0) {
    queueLevelUpCardChoices(state, levelsGained);
    emitAudio(state, { type: 'shipLevelUp' });
    emitReward(state, `Ship level ${state.progression.shipLevel}`, 'system');
  }
};

export const getAsteroidShipXpReward = (asteroid: { bossType?: unknown; size: 'large' | 'medium' | 'small' }): number => {
  if (asteroid.bossType) {
    return 0;
  }
  return 1;
};
