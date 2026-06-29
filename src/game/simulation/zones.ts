import type { BossType, GameState } from './types';

export type ZoneId = 'lyraGate' | 'orionForge' | 'vegaDrift' | 'cygnusReef' | 'novaCrown';

export type ExplorationZone = {
  id: ZoneId;
  name: string;
  index: number;
  rewardMultiplier: number;
  asteroidHpMultiplier: number;
  asteroidDensityBonus: number;
  bossType: BossType;
  map: {
    x: number;
    y: number;
  };
};

export const zones: ExplorationZone[] = [
  {
    id: 'lyraGate',
    name: 'Lyra Gate',
    index: 0,
    rewardMultiplier: 1,
    asteroidHpMultiplier: 1,
    asteroidDensityBonus: 0,
    bossType: 'sentinel',
    map: { x: 8, y: 56 }
  },
  {
    id: 'orionForge',
    name: 'Orion Forge',
    index: 1,
    rewardMultiplier: 1.35,
    asteroidHpMultiplier: 1.45,
    asteroidDensityBonus: 1,
    bossType: 'crusher',
    map: { x: 30, y: 38 }
  },
  {
    id: 'vegaDrift',
    name: 'Vega Drift',
    index: 2,
    rewardMultiplier: 1.8,
    asteroidHpMultiplier: 2.05,
    asteroidDensityBonus: 3,
    bossType: 'prism',
    map: { x: 52, y: 62 }
  },
  {
    id: 'cygnusReef',
    name: 'Cygnus Reef',
    index: 3,
    rewardMultiplier: 2.35,
    asteroidHpMultiplier: 2.85,
    asteroidDensityBonus: 6,
    bossType: 'crusher',
    map: { x: 74, y: 42 }
  },
  {
    id: 'novaCrown',
    name: 'Nova Crown',
    index: 4,
    rewardMultiplier: 3.05,
    asteroidHpMultiplier: 3.8,
    asteroidDensityBonus: 9,
    bossType: 'sentinel',
    map: { x: 92, y: 54 }
  }
];

export const maxTravelLevel = zones.length - 1;

export const getZoneByIndex = (index: number): ExplorationZone =>
  zones[Math.max(0, Math.min(zones.length - 1, Math.floor(index)))];

export const getExplorationZone = (state: GameState): ExplorationZone =>
  getZoneByIndex(state.progression.currentZoneIndex);

export const isZoneUnlocked = (state: GameState, index: number): boolean =>
  index <= state.progression.unlockedZoneIndex;

export const isCurrentZoneProfitable = (state: GameState): boolean =>
  isZoneUnlocked(state, state.progression.currentZoneIndex);

export const getZoneRewardMultiplier = (state: GameState): number =>
  getExplorationZone(state).rewardMultiplier;

export const getZoneAsteroidHpMultiplier = (state: GameState): number =>
  getExplorationZone(state).asteroidHpMultiplier;

export const hasNextZone = (state: GameState): boolean =>
  state.progression.unlockedZoneIndex < zones.length - 1;

export const getNextZone = (state: GameState): ExplorationZone | null =>
  hasNextZone(state) ? getZoneByIndex(state.progression.unlockedZoneIndex + 1) : null;
