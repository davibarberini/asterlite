import { balance } from '../balance';
import { emitReward } from '../simulation/events';
import type { GameState, GuidedMissionId, GuidedMissionSnapshot, GuidedMissionState, ProgressionState } from '../simulation/types';
import { crystalsPerPrestigeCore } from './prestige';
import { WARP_UNLOCK_BY_ID, getAvailableWarpCores, hasWarpUnlock } from './warpUnlocks';

export type GuidedMissionProgress = {
  id: GuidedMissionId;
  progress: number;
  current: number;
  target: number;
  ready: boolean;
  rewardKind: 'drone' | 'credits' | 'speed' | 'crystals';
};

type GuidedMissionDefinition = {
  id: GuidedMissionId;
  repeatable?: boolean;
  target: number | ((state: GameState) => number);
  rewardKind: GuidedMissionProgress['rewardKind'];
  getCurrent: (state: GameState) => number;
  isAvailable?: (state: GameState) => boolean;
  applyReward: (state: GameState) => void;
};

const clampProgress = (value: number): number => Math.max(0, Math.min(1, value));

export const createGuidedMissionSnapshot = (progression: ProgressionState, crystals = 0): GuidedMissionSnapshot => ({
  firstGateAsteroidsDestroyed: progression.firstGateAsteroidsDestroyed,
  asteroidsDestroyed: progression.achievementStats.asteroidsDestroyed,
  moneyEarned: progression.achievementStats.moneyEarned,
  crystalsCollected: progression.achievementStats.crystalsCollected,
  deaths: progression.achievementStats.deaths,
  bossDefeats: progression.bossDefeats,
  crystals,
  prestigeCores: progression.prestigeCores
});

export const createGuidedMissionState = (): GuidedMissionState => ({
  activeMissionId: 'drawGateBoss',
  completedMissionIds: [],
  repeatCompletions: 0,
  startedAt: {
    firstGateAsteroidsDestroyed: 0,
    asteroidsDestroyed: 0,
    moneyEarned: 0,
    crystalsCollected: 0,
    deaths: 0,
    bossDefeats: 0,
    crystals: 0,
    prestigeCores: 0
  }
});

const completeRewardText = (rewardKind: GuidedMissionProgress['rewardKind']): string => {
  switch (rewardKind) {
    case 'drone':
      return '+1 Drone damage level';
    case 'credits':
      return 'Credits cache';
    case 'speed':
      return '+1 Thruster speed level';
    case 'crystals':
      return 'Crystal cache';
  }
};

const getMissionMoneyReward = (state: GameState, base: number): number =>
  Math.round(base * (1 + state.progression.currentZoneIndex * 0.55 + state.progression.guidedMissions.repeatCompletions * 0.08));

const hasReachedZone = (state: GameState, zoneIndex: number): boolean =>
  state.progression.currentZoneIndex >= zoneIndex;

const hasUnlockedZone = (state: GameState, zoneIndex: number): boolean =>
  state.progression.unlockedZoneIndex >= zoneIndex;

export const GUIDED_MISSION_DEFINITIONS: GuidedMissionDefinition[] = [
  {
    id: 'drawGateBoss',
    target: balance.bosses.firstGateAsteroids,
    rewardKind: 'credits',
    getCurrent: (state) => state.progression.firstGateAsteroidsDestroyed,
    applyReward: (state) => {
      state.money += 75;
    }
  },
  {
    id: 'defeatGateBoss',
    target: 1,
    rewardKind: 'credits',
    getCurrent: (state) => state.progression.bossDefeats,
    applyReward: (state) => {
      state.money += 150;
    }
  },
  {
    id: 'travelToOrion',
    target: 1,
    rewardKind: 'speed',
    isAvailable: (state) => hasUnlockedZone(state, 1),
    getCurrent: (state) => (hasReachedZone(state, 1) ? 1 : 0),
    applyReward: (state) => {
      state.progression.shipSpeedLevel += 1;
      state.money += 180;
    }
  },
  {
    id: 'collectWarpCrystals',
    target: crystalsPerPrestigeCore,
    rewardKind: 'credits',
    isAvailable: (state) => hasReachedZone(state, 1),
    getCurrent: (state) => state.crystals,
    applyReward: (state) => {
      state.money += 200;
    }
  },
  {
    id: 'openVegaRoute',
    target: 2,
    rewardKind: 'credits',
    isAvailable: (state) => hasReachedZone(state, 1),
    getCurrent: (state) => state.progression.bossDefeats,
    applyReward: (state) => {
      state.money += 350;
    }
  },
  {
    id: 'travelToVega',
    target: 1,
    rewardKind: 'speed',
    isAvailable: (state) => hasUnlockedZone(state, 2),
    getCurrent: (state) => (hasReachedZone(state, 2) ? 1 : 0),
    applyReward: (state) => {
      state.progression.shipSpeedLevel += 1;
      state.money += 420;
    }
  },
  {
    id: 'openCygnusRoute',
    target: 3,
    rewardKind: 'credits',
    isAvailable: (state) => hasReachedZone(state, 2),
    getCurrent: (state) => state.progression.bossDefeats,
    applyReward: (state) => {
      state.money += 650;
    }
  },
  {
    id: 'travelToCygnus',
    target: 1,
    rewardKind: 'speed',
    isAvailable: (state) => hasUnlockedZone(state, 3),
    getCurrent: (state) => (hasReachedZone(state, 3) ? 1 : 0),
    applyReward: (state) => {
      state.progression.shipSpeedLevel += 1;
      state.money += 760;
    }
  },
  {
    id: 'openNovaRoute',
    target: 4,
    rewardKind: 'credits',
    isAvailable: (state) => hasReachedZone(state, 3),
    getCurrent: (state) => state.progression.bossDefeats,
    applyReward: (state) => {
      state.money += 1000;
    }
  },
  {
    id: 'travelToNovaCrown',
    target: 1,
    rewardKind: 'crystals',
    isAvailable: (state) => hasUnlockedZone(state, 4),
    getCurrent: (state) => (hasReachedZone(state, 4) ? 1 : 0),
    applyReward: (state) => {
      state.crystals += 2;
      state.money += 1200;
    }
  },
  {
    id: 'earnFirstCore',
    target: 1,
    rewardKind: 'crystals',
    getCurrent: (state) => state.progression.prestigeCores,
    isAvailable: (state) => getAvailableWarpCores(state.progression) < WARP_UNLOCK_BY_ID.droneSystems.cost,
    applyReward: (state) => {
      state.crystals += 1;
    }
  },
  {
    id: 'installDroneSystems',
    target: 1,
    rewardKind: 'crystals',
    getCurrent: (state) => (hasWarpUnlock(state.progression, 'droneSystems') ? 1 : 0),
    applyReward: (state) => {
      state.crystals += 2;
    }
  },
  {
    id: 'clearAsteroids',
    repeatable: true,
    target: (state) => 30 + state.progression.currentZoneIndex * 10,
    rewardKind: 'credits',
    getCurrent: (state) => state.progression.achievementStats.asteroidsDestroyed - state.progression.guidedMissions.startedAt.asteroidsDestroyed,
    applyReward: (state) => {
      state.money += getMissionMoneyReward(state, 420);
    }
  },
  {
    id: 'collectCredits',
    repeatable: true,
    target: (state) => Math.round(1600 * (1 + state.progression.currentZoneIndex * 0.75)),
    rewardKind: 'credits',
    getCurrent: (state) => state.progression.achievementStats.moneyEarned - state.progression.guidedMissions.startedAt.moneyEarned,
    applyReward: (state) => {
      state.money += getMissionMoneyReward(state, 360);
    }
  },
  {
    id: 'surviveAsteroids',
    repeatable: true,
    target: (state) => 24 + state.progression.currentZoneIndex * 8,
    rewardKind: 'credits',
    getCurrent: (state) => {
      if (state.progression.achievementStats.deaths > state.progression.guidedMissions.startedAt.deaths) {
        return 0;
      }
      return state.progression.achievementStats.asteroidsDestroyed - state.progression.guidedMissions.startedAt.asteroidsDestroyed;
    },
    applyReward: (state) => {
      state.money += getMissionMoneyReward(state, 600);
    }
  },
  {
    id: 'collectCrystals',
    repeatable: true,
    target: (state) => 4 + Math.max(0, state.progression.currentZoneIndex),
    rewardKind: 'credits',
    isAvailable: (state) => state.progression.unlockedZoneIndex >= 1,
    getCurrent: (state) => state.progression.achievementStats.crystalsCollected - state.progression.guidedMissions.startedAt.crystalsCollected,
    applyReward: (state) => {
      state.money += getMissionMoneyReward(state, 250);
    }
  },
  {
    id: 'defeatZoneBoss',
    repeatable: true,
    target: 1,
    rewardKind: 'credits',
    isAvailable: (state) => state.progression.unlockedZoneIndex >= 1,
    getCurrent: (state) => state.progression.bossDefeats - state.progression.guidedMissions.startedAt.bossDefeats,
    applyReward: (state) => {
      state.money += getMissionMoneyReward(state, 800);
    }
  }
];

const INITIAL_MISSION_IDS: GuidedMissionId[] = [
  'drawGateBoss',
  'defeatGateBoss',
  'travelToOrion',
  'collectWarpCrystals',
  'openVegaRoute',
  'travelToVega',
  'openCygnusRoute',
  'travelToCygnus',
  'openNovaRoute',
  'travelToNovaCrown',
  'earnFirstCore',
  'installDroneSystems'
];

const REPEATABLE_MISSION_IDS: GuidedMissionId[] = [
  'clearAsteroids',
  'collectCredits',
  'surviveAsteroids',
  'collectCrystals',
  'defeatZoneBoss'
];

const getMissionDefinition = (id: GuidedMissionId): GuidedMissionDefinition | undefined =>
  GUIDED_MISSION_DEFINITIONS.find((mission) => mission.id === id);

const getMissionTarget = (state: GameState, mission: GuidedMissionDefinition): number =>
  typeof mission.target === 'function' ? mission.target(state) : mission.target;

const selectNextMission = (state: GameState): GuidedMissionId | null => {
  const initialMission = INITIAL_MISSION_IDS
    .map((id) => getMissionDefinition(id))
    .find(
      (definition): definition is GuidedMissionDefinition =>
        definition !== undefined &&
        !state.progression.guidedMissions.completedMissionIds.includes(definition.id) &&
        (definition.isAvailable?.(state) ?? true)
    );
  if (initialMission) {
    return initialMission.id;
  }

  const repeatableMissions = REPEATABLE_MISSION_IDS
    .map((id) => getMissionDefinition(id))
    .filter((definition): definition is GuidedMissionDefinition => definition !== undefined && (definition.isAvailable?.(state) ?? true));
  if (repeatableMissions.length <= 0) {
    return null;
  }

  const index = state.progression.guidedMissions.repeatCompletions % repeatableMissions.length;
  return repeatableMissions[index].id;
};

export const syncGuidedMissions = (state: GameState): void => {
  const missions = state.progression.guidedMissions;
  if (!missions.activeMissionId) {
    missions.activeMissionId = selectNextMission(state);
    missions.startedAt = createGuidedMissionSnapshot(state.progression, state.crystals);
  }

  if (
    missions.activeMissionId === 'surviveAsteroids' &&
    state.progression.achievementStats.deaths > missions.startedAt.deaths
  ) {
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
  if (mission.repeatable) {
    missions.repeatCompletions += 1;
  } else {
    missions.completedMissionIds = Array.from(new Set([...missions.completedMissionIds, progress.id]));
  }
  missions.activeMissionId = selectNextMission(state);
  missions.startedAt = createGuidedMissionSnapshot(state.progression, state.crystals);
  emitReward(state, `Mission complete: ${completeRewardText(mission.rewardKind)}`, mission.repeatable ? 'system' : 'unlock');
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
  const target = Math.max(1, getMissionTarget(state, mission));
  return {
    id: mission.id,
    progress: clampProgress(current / target),
    current: Math.min(current, target),
    target,
    ready: current >= target,
    rewardKind: mission.rewardKind
  };
};
