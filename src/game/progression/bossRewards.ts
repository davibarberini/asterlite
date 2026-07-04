import type { BossRewardId, BossRewardState, GameState } from '../simulation/types';

export type BossRewardDefinition = {
  id: BossRewardId;
  title: string;
  summary: string;
  effectLabel: string;
};

export const BOSS_REWARD_DEFINITIONS: BossRewardDefinition[] = [
  {
    id: 'rapidFire',
    title: 'Rapid Fire Core',
    summary: 'Main ship shots cycle faster for the rest of this run.',
    effectLabel: 'Ship cooldown x0.82'
  },
  {
    id: 'droneOverdrive',
    title: 'Drone Overdrive',
    summary: 'Deployed drones reload faster for the rest of this run.',
    effectLabel: 'Drone cooldown x0.82'
  },
  {
    id: 'salvageSurge',
    title: 'Salvage Surge',
    summary: 'Asteroids pay more credits for the rest of this run.',
    effectLabel: 'Credit rewards x1.2'
  }
];

export const BOSS_REWARD_BY_ID = Object.fromEntries(
  BOSS_REWARD_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<BossRewardId, BossRewardDefinition>;

export const createBossRewardState = (): BossRewardState => ({
  pendingChoiceIds: [],
  activeIds: []
});

export const normalizeBossRewardState = (state: BossRewardState): BossRewardState => {
  const knownIds = new Set(BOSS_REWARD_DEFINITIONS.map((definition) => definition.id));
  return {
    pendingChoiceIds: Array.from(new Set(state.pendingChoiceIds.filter((id) => knownIds.has(id)))),
    activeIds: Array.from(new Set(state.activeIds.filter((id) => knownIds.has(id))))
  };
};

export const queueBossRewardChoices = (state: GameState): void => {
  if (state.bossRewards.pendingChoiceIds.length > 0) {
    return;
  }

  const activeIds = new Set(state.bossRewards.activeIds);
  state.bossRewards.pendingChoiceIds = BOSS_REWARD_DEFINITIONS
    .map((definition) => definition.id)
    .filter((id) => !activeIds.has(id))
    .slice(0, 3);
};

export const applyBossRewardChoice = (state: GameState, id: BossRewardId): boolean => {
  if (!state.bossRewards.pendingChoiceIds.includes(id)) {
    return false;
  }

  state.bossRewards.activeIds = Array.from(new Set([...state.bossRewards.activeIds, id]));
  state.bossRewards.pendingChoiceIds = [];
  return true;
};

export const hasBossReward = (state: GameState, id: BossRewardId): boolean =>
  state.bossRewards.activeIds.includes(id);

export const getBossRewardPlayerFireIntervalMultiplier = (state: GameState): number =>
  hasBossReward(state, 'rapidFire') ? 0.82 : 1;

export const getBossRewardDroneFireIntervalMultiplier = (state: GameState): number =>
  hasBossReward(state, 'droneOverdrive') ? 0.82 : 1;

export const getBossRewardMoneyMultiplier = (state: GameState): number =>
  hasBossReward(state, 'salvageSurge') ? 1.2 : 1;
