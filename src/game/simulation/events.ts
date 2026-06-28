import type { GameAudioEvent, GameRewardEvent, GameRewardKind, GameState } from './types';

export const emitAudio = (state: GameState, event: GameAudioEvent): void => {
  state.audioEvents.push(event);
};

export const emitReward = (state: GameState, text: string, kind?: GameRewardKind): void => {
  const event: GameRewardEvent = kind ? { text, kind } : { text };
  state.rewardEvents.push(event);
};
