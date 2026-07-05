import { balance } from '../../balance';
import type { GameState, SurvivalHazardState, Vec2 } from '../types';
import { randomRange } from '../vector';
import { isSurvivalZone } from './survival';

export const updateSurvivalHazards = (state: GameState, dt: number): void => {
  state.hazards = state.hazards
    .map((hazard) => ({
      ...hazard,
      age: hazard.age + dt,
      armFor: Math.max(0, hazard.armFor - dt),
      position: {
        x: hazard.position.x + hazard.velocity.x * dt,
        y: hazard.position.y + hazard.velocity.y * dt
      }
    }))
    .filter((hazard) => isHazardNearCamera(state, hazard));

  if (!shouldSpawnMines(state)) {
    state.survival.hazardSpawnCooldown = 0;
    return;
  }

  state.survival.hazardSpawnCooldown = Math.max(0, state.survival.hazardSpawnCooldown - dt);
  if (state.survival.hazardSpawnCooldown > 0 || state.hazards.length >= getMineTargetCount(state)) {
    return;
  }

  state.hazards.push(createProximityMine(state));
  state.survival.hazardSpawnCooldown = getMineSpawnInterval(state);
};

export const getMineTargetCount = (state: GameState): number => {
  if (!shouldSpawnMines(state)) {
    return 0;
  }

  return Math.min(
    balance.survival.mines.maxCount,
    1 + Math.floor((state.survival.threatLevel - balance.survival.mines.startsAtThreatLevel) / 2)
  );
};

export const createProximityMine = (state: GameState): SurvivalHazardState => {
  const position = getHazardSpawnPosition(state);
  const directionToShip = Math.atan2(state.ship.position.y - position.y, state.ship.position.x - position.x);
  const angle = directionToShip + randomRange(-0.48, 0.48);
  const speed = randomRange(balance.survival.mines.speed[0], balance.survival.mines.speed[1]);

  return {
    id: state.nextId++,
    kind: 'proximityMine',
    position,
    velocity: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    },
    radius: balance.survival.mines.radius,
    age: 0,
    armFor: balance.survival.mines.armSeconds,
    damage: balance.survival.mines.damage
  };
};

const shouldSpawnMines = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.ship.alive &&
  state.survival.active &&
  state.survival.threatLevel >= balance.survival.mines.startsAtThreatLevel;

const getMineSpawnInterval = (state: GameState): number =>
  Math.max(
    balance.survival.mines.minimumSpawnInterval,
    balance.survival.mines.spawnInterval -
      Math.max(0, state.survival.threatLevel - balance.survival.mines.startsAtThreatLevel) *
        balance.survival.mines.spawnIntervalThreatReduction
  );

const getHazardSpawnPosition = (state: GameState): Vec2 => {
  const margin = balance.survival.mines.spawnMargin;
  const edge = Math.floor(randomRange(0, 4));
  return edge === 0
    ? { x: state.camera.x + randomRange(-state.width / 2, state.width / 2), y: state.camera.y - state.height / 2 - margin }
    : edge === 1
      ? { x: state.camera.x + state.width / 2 + margin, y: state.camera.y + randomRange(-state.height / 2, state.height / 2) }
      : edge === 2
        ? { x: state.camera.x + randomRange(-state.width / 2, state.width / 2), y: state.camera.y + state.height / 2 + margin }
        : { x: state.camera.x - state.width / 2 - margin, y: state.camera.y + randomRange(-state.height / 2, state.height / 2) };
};

const isHazardNearCamera = (state: GameState, hazard: SurvivalHazardState): boolean => {
  const margin = balance.survival.mines.spawnMargin + hazard.radius;
  return (
    hazard.position.x >= state.camera.x - state.width / 2 - margin &&
    hazard.position.x <= state.camera.x + state.width / 2 + margin &&
    hazard.position.y >= state.camera.y - state.height / 2 - margin &&
    hazard.position.y <= state.camera.y + state.height / 2 + margin
  );
};
