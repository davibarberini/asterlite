import { balance } from '../../balance';
import type { GameState, RareSpawnKind, RareSpawnState } from '../types';
import { randomRange } from '../vector';
import { maxTravelLevel } from '../zones';
import { createProximityMine } from './survivalHazards';

export const createRareSpawnState = (): RareSpawnState => ({
  cooldowns: {
    proximityMine: balance.rareSpawns.proximityMine.initialCooldown
  }
});

export const updateRareSpawns = (state: GameState, dt: number): void => {
  updateRareSpawn(state, dt, 'proximityMine');
};

const updateRareSpawn = (state: GameState, dt: number, kind: RareSpawnKind): void => {
  if (!canSpawnRareKind(state, kind)) {
    state.rareSpawns.cooldowns[kind] = balance.rareSpawns[kind].initialCooldown;
    return;
  }

  state.rareSpawns.cooldowns[kind] = Math.max(0, state.rareSpawns.cooldowns[kind] - dt);
  if (state.rareSpawns.cooldowns[kind] > 0 || getActiveRareSpawnCount(state, kind) >= balance.rareSpawns[kind].maxCount) {
    return;
  }

  if (kind === 'proximityMine') {
    state.hazards.push(createProximityMine(state));
  }
  state.rareSpawns.cooldowns[kind] = randomRange(balance.rareSpawns[kind].interval[0], balance.rareSpawns[kind].interval[1]);
};

const canSpawnRareKind = (state: GameState, kind: RareSpawnKind): boolean =>
  state.ship.alive &&
  state.progression.currentZoneIndex >= balance.rareSpawns[kind].startsAtZoneIndex &&
  state.progression.currentZoneIndex < maxTravelLevel;

const getActiveRareSpawnCount = (state: GameState, kind: RareSpawnKind): number => {
  if (kind === 'proximityMine') {
    return state.hazards.filter((hazard) => hazard.kind === 'proximityMine').length;
  }
  return 0;
};
