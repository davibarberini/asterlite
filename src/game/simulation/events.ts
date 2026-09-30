import type { GameAudioEvent, GameRewardEvent, GameRewardKind, GameState } from './types';

export const MAX_ASTEROID_VISUAL_EVENTS = 48;

export const emitAsteroidDestruction = (state: GameState, asteroid: GameState['asteroids'][number]): void => {
  if (state.asteroidDestructionEvents.length >= MAX_ASTEROID_VISUAL_EVENTS) state.asteroidDestructionEvents.shift();
  const { id, position, radius, variant, bossType, hp, maxHp } = asteroid;
  state.asteroidDestructionEvents.push({ id, position: { ...position }, radius, variant, bossType, hp, maxHp });
};

export const emitAudio = (state: GameState, event: GameAudioEvent): void => {
  state.audioEvents.push(event);
};

export const emitReward = (state: GameState, text: string, kind?: GameRewardKind): void => {
  const event: GameRewardEvent = kind ? { text, kind } : { text };
  state.rewardEvents.push(event);
};
