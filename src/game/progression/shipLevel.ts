import type { GameState, ProgressionState } from '../simulation/types';
import { emitAudio, emitReward } from '../simulation/events';

export const maxShipLevel = 25;

export const getShipXpForNextLevel = (level: number): number => {
  const safeLevel = Math.max(1, Math.min(maxShipLevel, Math.floor(level)));
  return Math.round(70 * 1.18 ** (safeLevel - 1));
};

export const getAvailableShipSkillPoints = (progression: ProgressionState): number =>
  Math.max(0, Math.floor(progression.shipSkillPoints) - Math.floor(progression.spentShipSkillPoints));

export const getTalentPointCost = (): number => 1;

export const getTotalShipSkillPointCap = (): number => maxShipLevel - 1;

const createLevelShockwave = (state: GameState, levelsGained: number): void => {
  const maxRadius = 540 + Math.min(3, Math.max(0, levelsGained - 1)) * 90;
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
  if (state.progression.shipLevel >= maxShipLevel) {
    state.progression.shipLevel = maxShipLevel;
    state.progression.shipXp = 0;
    return;
  }

  state.progression.shipXp += Math.max(0, Math.floor(amount));
  let levelsGained = 0;
  while (state.progression.shipLevel < maxShipLevel) {
    const needed = getShipXpForNextLevel(state.progression.shipLevel);
    if (state.progression.shipXp < needed) {
      break;
    }
    state.progression.shipXp -= needed;
    state.progression.shipLevel += 1;
    state.progression.shipSkillPoints += 1;
    levelsGained += 1;
  }

  if (state.progression.shipLevel >= maxShipLevel) {
    state.progression.shipLevel = maxShipLevel;
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
