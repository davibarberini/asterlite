import { balance } from '../balance';
import { emitReward } from '../simulation/events';
import type { GameState, GuidedMissionId, GuidedMissionSnapshot, GuidedMissionState, ProgressionState } from '../simulation/types';
import { getEffectiveMaxHp } from './achievements';
import { crystalsPerPrestigeCore } from './prestige';
import { WARP_UNLOCK_BY_ID, getAvailableWarpCores, hasWarpUnlock } from './warpUnlocks';

export type GuidedMissionProgress = {
  id: GuidedMissionId;
  progress: number;
  current: number;
  target: number;
  ready: boolean;
  rewardKind: 'damage' | 'hull' | 'income' | 'fireRate' | 'drone';
};

type GuidedMissionDefinition = {
  id: GuidedMissionId;
  target: number;
  rewardKind: GuidedMissionProgress['rewardKind'];
  getCurrent: (state: GameState) => number;
  isAvailable?: (state: GameState) => boolean;
  applyReward: (state: GameState) => void;
};

const clampProgress = (value: number): number => Math.max(0, Math.min(1, value));

export const createGuidedMissionSnapshot = (progression: ProgressionState, crystals = 0): GuidedMissionSnapshot => ({
  firstGateAsteroidsDestroyed: progression.firstGateAsteroidsDestroyed,
  bossDefeats: progression.bossDefeats,
  crystals,
  prestigeCores: progression.prestigeCores
});

export const createGuidedMissionState = (): GuidedMissionState => ({
  activeMissionId: 'drawGateBoss',
  completedMissionIds: [],
  startedAt: {
    firstGateAsteroidsDestroyed: 0,
    bossDefeats: 0,
    crystals: 0,
    prestigeCores: 0
  }
});

const completeRewardText = (rewardKind: GuidedMissionProgress['rewardKind']): string => {
  switch (rewardKind) {
    case 'damage':
      return '+1 Shot damage level';
    case 'hull':
      return '+10 Hull';
    case 'income':
      return '+1 Credits/sec level';
    case 'fireRate':
      return '+1 Attack speed level';
    case 'drone':
      return '+1 Drone damage level';
  }
};

export const GUIDED_MISSION_DEFINITIONS: GuidedMissionDefinition[] = [
  {
    id: 'drawGateBoss',
    target: balance.bosses.firstGateAsteroids,
    rewardKind: 'damage',
    getCurrent: (state) => state.progression.firstGateAsteroidsDestroyed,
    applyReward: (state) => {
      state.progression.shipDamageLevel += 1;
      state.money += 75;
    }
  },
  {
    id: 'defeatGateBoss',
    target: 1,
    rewardKind: 'hull',
    getCurrent: (state) => state.progression.bossDefeats,
    applyReward: (state) => {
      state.progression.maxHp += 10;
      const nextMaxHp = getEffectiveMaxHp(state.progression);
      const hpGain = nextMaxHp - state.ship.maxHp;
      state.ship.maxHp = nextMaxHp;
      state.ship.hp += Math.max(0, hpGain);
      state.money += 150;
    }
  },
  {
    id: 'collectWarpCrystals',
    target: crystalsPerPrestigeCore,
    rewardKind: 'income',
    getCurrent: (state) => state.crystals,
    applyReward: (state) => {
      state.progression.passiveIncomeLevel += 1;
      state.money += 200;
    }
  },
  {
    id: 'warpForFirstCore',
    target: 1,
    rewardKind: 'fireRate',
    getCurrent: (state) => state.progression.prestigeCores,
    isAvailable: (state) => getAvailableWarpCores(state.progression) < WARP_UNLOCK_BY_ID.droneSystems.cost,
    applyReward: (state) => {
      state.progression.shipFireRateLevel += 1;
    }
  },
  {
    id: 'installDroneSystems',
    target: 1,
    rewardKind: 'drone',
    getCurrent: (state) => (hasWarpUnlock(state.progression, 'droneSystems') ? 1 : 0),
    applyReward: (state) => {
      state.progression.droneDamageLevel += 1;
    }
  }
];

const getMissionDefinition = (id: GuidedMissionId): GuidedMissionDefinition | undefined =>
  GUIDED_MISSION_DEFINITIONS.find((mission) => mission.id === id);

const selectNextMission = (state: GameState): GuidedMissionId | null => {
  const mission = GUIDED_MISSION_DEFINITIONS.find(
    (definition) =>
      !state.progression.guidedMissions.completedMissionIds.includes(definition.id) &&
      (definition.isAvailable?.(state) ?? true)
  );
  return mission?.id ?? null;
};

export const syncGuidedMissions = (state: GameState): void => {
  const missions = state.progression.guidedMissions;
  if (!missions.activeMissionId) {
    missions.activeMissionId = selectNextMission(state);
    missions.startedAt = createGuidedMissionSnapshot(state.progression, state.crystals);
  }

  const progress = getActiveGuidedMissionProgress(state);
  if (!progress?.ready) {
    return;
  }

  const mission = getMissionDefinition(progress.id);
  if (!mission) {
    return;
  }

  mission.applyReward(state);
  missions.completedMissionIds = Array.from(new Set([...missions.completedMissionIds, progress.id]));
  missions.activeMissionId = selectNextMission(state);
  missions.startedAt = createGuidedMissionSnapshot(state.progression, state.crystals);
  emitReward(state, `Mission complete: ${completeRewardText(mission.rewardKind)}`, 'unlock');
};

export const getActiveGuidedMissionProgress = (state: GameState): GuidedMissionProgress | null => {
  const activeMissionId = state.progression.guidedMissions.activeMissionId;
  if (!activeMissionId) {
    return null;
  }

  const mission = getMissionDefinition(activeMissionId);
  if (!mission) {
    return null;
  }

  const current = Math.max(0, mission.getCurrent(state));
  const target = Math.max(1, mission.target);
  return {
    id: mission.id,
    progress: clampProgress(current / target),
    current: Math.min(current, target),
    target,
    ready: current >= target,
    rewardKind: mission.rewardKind
  };
};
