import type { AsteroidVariant, BossType, GameState } from './types';
import { getNovaCrownDifficultyConfig } from '../progression/novaCrownDifficulty';

export type ZoneId = 'lyraGate' | 'orionForge' | 'vegaDrift' | 'cygnusReef' | 'novaCrown';

export type ExplorationZone = {
  id: ZoneId;
  name: string;
  index: number;
  rewardMultiplier: number;
  asteroidHpMultiplier: number;
  asteroidDamageMultiplier: number;
  asteroidDensityBonus: number;
  bossType: BossType;
  identity: {
    callsign: string;
    flavor: string;
    variantFocus: AsteroidVariant;
    accent: string;
    accentColor: number;
    fieldTintColor: number;
    fieldTintAlpha: number;
  };
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
    asteroidDamageMultiplier: 1,
    asteroidDensityBonus: 0,
    bossType: 'sentinel',
    identity: {
      callsign: 'Clear Gate',
      flavor: 'Open approach lanes with mostly common rock and light metallic salvage.',
      variantFocus: 'common',
      accent: '#83ffdc',
      accentColor: 0x83ffdc,
      fieldTintColor: 0x123d35,
      fieldTintAlpha: 0.045
    },
    map: { x: 8, y: 56 }
  },
  {
    id: 'orionForge',
    name: 'Orion Forge',
    index: 1,
    rewardMultiplier: 1.55,
    asteroidHpMultiplier: 1.55,
    asteroidDamageMultiplier: 1.25,
    asteroidDensityBonus: 1,
    bossType: 'crusher',
    identity: {
      callsign: 'Iron Foundry',
      flavor: 'Metal-rich lanes with heavier salvage and the first crystal traces.',
      variantFocus: 'metallic',
      accent: '#f1f5ff',
      accentColor: 0xf1f5ff,
      fieldTintColor: 0x566170,
      fieldTintAlpha: 0.052
    },
    map: { x: 30, y: 38 }
  },
  {
    id: 'vegaDrift',
    name: 'Vega Drift',
    index: 2,
    rewardMultiplier: 2.35,
    asteroidHpMultiplier: 2.35,
    asteroidDamageMultiplier: 1.55,
    asteroidDensityBonus: 3,
    bossType: 'prism',
    identity: {
      callsign: 'Crystal Drift',
      flavor: 'Unstable crystal pockets make warp resources easier to read and chase.',
      variantFocus: 'crystal',
      accent: '#b48cff',
      accentColor: 0xb48cff,
      fieldTintColor: 0x3d2768,
      fieldTintAlpha: 0.06
    },
    map: { x: 52, y: 62 }
  },
  {
    id: 'cygnusReef',
    name: 'Cygnus Reef',
    index: 3,
    rewardMultiplier: 3.45,
    asteroidHpMultiplier: 3.35,
    asteroidDamageMultiplier: 1.95,
    asteroidDensityBonus: 6,
    bossType: 'crusher',
    identity: {
      callsign: 'Dense Reef',
      flavor: 'Compacted belts favor tougher dense asteroids and short reaction windows.',
      variantFocus: 'dense',
      accent: '#ffc36f',
      accentColor: 0xffc36f,
      fieldTintColor: 0x5a3518,
      fieldTintAlpha: 0.058
    },
    map: { x: 74, y: 42 }
  },
  {
    id: 'novaCrown',
    name: 'Nova Crown',
    index: 4,
    rewardMultiplier: 5,
    asteroidHpMultiplier: 4.6,
    asteroidDamageMultiplier: 2.45,
    asteroidDensityBonus: 9,
    bossType: 'sentinel',
    identity: {
      callsign: 'Crown Belt',
      flavor: 'A volatile mixed crown with high-value salvage and dangerous traffic.',
      variantFocus: 'metallic',
      accent: '#fff1a8',
      accentColor: 0xfff1a8,
      fieldTintColor: 0x4f4521,
      fieldTintAlpha: 0.065
    },
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

export const getZoneRewardMultiplier = (state: GameState): number => {
  const zone = getExplorationZone(state);
  if (zone.id !== 'novaCrown') {
    return zone.rewardMultiplier;
  }
  return zone.rewardMultiplier * getNovaCrownDifficultyConfig(state.survival.difficulty).rewardMultiplier;
};

export const getZoneAsteroidHpMultiplier = (state: GameState): number => {
  const zone = getExplorationZone(state);
  if (zone.id !== 'novaCrown') {
    return zone.asteroidHpMultiplier;
  }
  return zone.asteroidHpMultiplier * getNovaCrownDifficultyConfig(state.survival.difficulty).asteroidHpMultiplier;
};

export const getZoneAsteroidDamageMultiplier = (state: GameState): number => {
  const zone = getExplorationZone(state);
  if (zone.id !== 'novaCrown') {
    return zone.asteroidDamageMultiplier;
  }
  return zone.asteroidDamageMultiplier * getNovaCrownDifficultyConfig(state.survival.difficulty).asteroidDamageMultiplier;
};

export const hasNextZone = (state: GameState): boolean =>
  state.progression.unlockedZoneIndex < zones.length - 1;

export const getNextZone = (state: GameState): ExplorationZone | null =>
  hasNextZone(state) ? getZoneByIndex(state.progression.unlockedZoneIndex + 1) : null;
