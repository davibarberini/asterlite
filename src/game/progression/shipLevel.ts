import type { GameState, ProgressionState } from '../simulation/types';
import { emitReward } from '../simulation/events';

export const maxShipLevel = 25;

export const getShipXpForNextLevel = (level: number): number => {
  const safeLevel = Math.max(1, Math.min(maxShipLevel, Math.floor(level)));
  return Math.round(70 * 1.18 ** (safeLevel - 1));
};

export const getAvailableShipSkillPoints = (progression: ProgressionState): number =>
  Math.max(0, Math.floor(progression.shipSkillPoints) - Math.floor(progression.spentShipSkillPoints));

export const getTalentPointCost = (): number => 1;

export const getTotalShipSkillPointCap = (): number => maxShipLevel - 1;

export const grantShipXp = (state: GameState, amount: number): void => {
  if (state.progression.shipLevel >= maxShipLevel) {
    state.progression.shipLevel = maxShipLevel;
    state.progression.shipXp = 0;
    return;
  }

  state.progression.shipXp += Math.max(0, Math.floor(amount));
  let leveled = false;
  while (state.progression.shipLevel < maxShipLevel) {
    const needed = getShipXpForNextLevel(state.progression.shipLevel);
    if (state.progression.shipXp < needed) {
      break;
    }
    state.progression.shipXp -= needed;
    state.progression.shipLevel += 1;
    state.progression.shipSkillPoints += 1;
    leveled = true;
  }

  if (state.progression.shipLevel >= maxShipLevel) {
    state.progression.shipLevel = maxShipLevel;
    state.progression.shipXp = 0;
  }

  if (leveled) {
    emitReward(state, `Ship level ${state.progression.shipLevel}: +1 skill point`, 'system');
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
