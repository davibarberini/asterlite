import type { BossRewardId, BossRewardState, GameState } from '../simulation/types';
import { emitReward } from '../simulation/events';

export type BossRewardDefinition = {
  id: BossRewardId;
  title: string;
  summary: string;
  effectLabel: string;
  icon: string;
  tradeoff?: boolean;
};

export const BOSS_REWARD_DEFINITIONS: BossRewardDefinition[] = [
  {
    id: 'rapidFire',
    title: 'Rapid Fire Core',
    summary: 'Main ship shots cycle faster for the rest of this run.',
    effectLabel: 'Ship cooldown x0.82',
    icon: 'RF'
  },
  {
    id: 'droneOverdrive',
    title: 'Drone Overdrive',
    summary: 'Deployed drones reload faster for the rest of this run.',
    effectLabel: 'Drone cooldown x0.82',
    icon: 'DR'
  },
  {
    id: 'salvageSurge',
    title: 'Salvage Surge',
    summary: 'Asteroids pay more credits for the rest of this run.',
    effectLabel: 'Credit rewards x1.2',
    icon: '$'
  },
  {
    id: 'glassReactor',
    title: 'Glass Reactor',
    summary: 'Ship weapons hit much harder, but every hit against you hurts more.',
    effectLabel: 'Ship dmg x1.55 · taken x1.35',
    icon: 'GR',
    tradeoff: true
  },
  {
    id: 'overchargedCannons',
    title: 'Overcharged Cannons',
    summary: 'Main ship weapons deal more damage for the rest of this run.',
    effectLabel: 'Ship damage x1.35',
    icon: 'OC'
  },
  {
    id: 'droneCommand',
    title: 'Drone Command',
    summary: 'Deployed drones hit harder for the rest of this run.',
    effectLabel: 'Drone damage x1.3',
    icon: 'DC'
  },
  {
    id: 'ablativePlating',
    title: 'Ablative Plating',
    summary: 'Incoming damage is reduced for the rest of this run.',
    effectLabel: 'Damage taken x0.82',
    icon: 'AP'
  }
];

export const BOSS_REWARD_BY_ID = Object.fromEntries(
  BOSS_REWARD_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<BossRewardId, BossRewardDefinition>;

export const createBossRewardState = (): BossRewardState => ({
  pendingChoiceIds: [],
  activeIds: []
});

export const baseThreatRewardInterval = 10;

export const normalizeBossRewardState = (state: BossRewardState): BossRewardState => {
  const knownIds = new Set(BOSS_REWARD_DEFINITIONS.map((definition) => definition.id));
  return {
    pendingChoiceIds: Array.from(new Set(state.pendingChoiceIds.filter((id) => knownIds.has(id)))),
    activeIds: Array.from(new Set(state.activeIds.filter((id) => knownIds.has(id))))
  };
};

export const isBossRewardId = (value: unknown): value is BossRewardId =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(BOSS_REWARD_BY_ID, value);

export const getThreatRewardInterval = (_state?: GameState): number =>
  baseThreatRewardInterval;

export const getNextThreatRewardMilestone = (
  currentThreatLevel: number,
  interval = baseThreatRewardInterval
): number => {
  const safeInterval = Math.max(1, Math.floor(interval));
  const nextThreatLevel = Math.max(0, Math.floor(currentThreatLevel)) + 1;
  return Math.max(safeInterval, Math.ceil(nextThreatLevel / safeInterval) * safeInterval);
};

export const queueRunRewardChoices = (state: GameState): boolean => {
  if (state.bossRewards.pendingChoiceIds.length > 0) {
    return false;
  }

  const activeIds = new Set(state.bossRewards.activeIds);
  const availableIds = BOSS_REWARD_DEFINITIONS
    .map((definition) => definition.id)
    .filter((id) => !activeIds.has(id));
  if (availableIds.length <= 0) {
    state.bossRewards.pendingChoiceIds = [];
    return false;
  }

  const milestoneIndex = state.survival.active
    ? Math.max(0, Math.floor(state.survival.threatLevel / getThreatRewardInterval(state)) - 1)
    : 0;
  state.bossRewards.pendingChoiceIds = Array.from({ length: availableIds.length }, (_, index) =>
    availableIds[(milestoneIndex + index) % availableIds.length]
  ).slice(0, 3);
  return state.bossRewards.pendingChoiceIds.length > 0;
};

export const queueThreatMilestoneRewardChoice = (state: GameState): boolean => {
  if (!state.survival.active) {
    return false;
  }

  const interval = getThreatRewardInterval(state);
  const nextRewardThreatLevel = state.survival.nextRewardThreatLevel > 0
    ? state.survival.nextRewardThreatLevel
    : getNextThreatRewardMilestone(state.survival.threatLevel, interval);

  if (state.survival.threatLevel < nextRewardThreatLevel || !queueRunRewardChoices(state)) {
    return false;
  }

  state.survival.nextRewardThreatLevel = nextRewardThreatLevel + interval;
  emitReward(state, `Nova Crown threat ${nextRewardThreatLevel}: choose a run bonus`, 'unlock');
  return true;
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
  (hasBossReward(state, 'rapidFire') ? 0.82 : 1) *
  (hasBossReward(state, 'glassReactor') ? 0.9 : 1);

export const getBossRewardDroneFireIntervalMultiplier = (state: GameState): number =>
  hasBossReward(state, 'droneOverdrive') ? 0.82 : 1;

export const getBossRewardMoneyMultiplier = (state: GameState): number =>
  hasBossReward(state, 'salvageSurge') ? 1.2 : 1;

export const getBossRewardPlayerDamageMultiplier = (state: GameState): number =>
  (hasBossReward(state, 'overchargedCannons') ? 1.35 : 1) *
  (hasBossReward(state, 'glassReactor') ? 1.55 : 1);

export const getBossRewardDroneDamageMultiplier = (state: GameState): number =>
  hasBossReward(state, 'droneCommand') ? 1.3 : 1;

export const getBossRewardIncomingDamageMultiplier = (state: GameState): number =>
  (hasBossReward(state, 'ablativePlating') ? 0.82 : 1) *
  (hasBossReward(state, 'glassReactor') ? 1.35 : 1);
