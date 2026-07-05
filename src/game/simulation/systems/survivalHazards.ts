import { balance } from '../../balance';
import type { GameState, SurvivalHazardState, Vec2 } from '../types';
import { normalize, randomRange } from '../vector';
import { burstParticles } from './particles';
import { isSurvivalZone } from './survival';

export const updateSurvivalHazards = (state: GameState, dt: number): void => {
  const nextHazards: SurvivalHazardState[] = [];
  state.hazards.forEach((hazard) => {
    const updated = updateHazard(state, hazard, dt);
    if (updated.kind === 'proximityMine' && updated.fuseFor <= 0) {
      burstParticles(state, updated.position, 18, balance.survival.mines.explosionParticleSpread);
      return;
    }
    if (isHazardNearCamera(state, updated)) {
      nextHazards.push(updated);
    }
  });
  state.hazards = nextHazards;

  updateSurvivalMines(state, dt);
  updateSurvivalHunters(state, dt);
};

const updateSurvivalMines = (state: GameState, dt: number): void => {
  if (!shouldSpawnMines(state)) {
    state.survival.hazardSpawnCooldown = 0;
    return;
  }
  state.survival.hazardSpawnCooldown = Math.max(0, state.survival.hazardSpawnCooldown - dt);
  if (state.survival.hazardSpawnCooldown > 0 || getHazardCount(state, 'proximityMine') >= getMineTargetCount(state)) {
    return;
  }

  state.hazards.push(createProximityMine(state));
  state.survival.hazardSpawnCooldown = getMineSpawnInterval(state);
};

const updateSurvivalHunters = (state: GameState, dt: number): void => {
  if (!shouldSpawnHunters(state)) {
    state.survival.hunterSpawnCooldown = 0;
    return;
  }
  state.survival.hunterSpawnCooldown = Math.max(0, state.survival.hunterSpawnCooldown - dt);
  if (state.survival.hunterSpawnCooldown > 0 || getHazardCount(state, 'survivalHunter') >= getHunterTargetCount(state)) {
    return;
  }

  state.hazards.push(createSurvivalHunter(state));
  state.survival.hunterSpawnCooldown = getHunterSpawnInterval(state);
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

export const getHunterTargetCount = (state: GameState): number => {
  if (!shouldSpawnHunters(state)) {
    return 0;
  }

  return Math.min(
    balance.survival.hunters.maxCount,
    1 + Math.floor((state.survival.threatLevel - balance.survival.hunters.startsAtThreatLevel) / 4)
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
    trail: [],
    age: 0,
    armFor: balance.survival.mines.armSeconds,
    fuseFor: balance.survival.mines.fuseSeconds,
    hp: 1,
    maxHp: 1,
    damage: balance.survival.mines.damage
  };
};

export const createSurvivalHunter = (state: GameState): SurvivalHazardState => {
  const position = getHazardSpawnPosition(state, balance.survival.hunters.spawnMargin);
  const direction = normalize({
    x: state.ship.position.x - position.x,
    y: state.ship.position.y - position.y
  });

  return {
    id: state.nextId++,
    kind: 'survivalHunter',
    position,
    velocity: {
      x: direction.x * balance.survival.hunters.speed,
      y: direction.y * balance.survival.hunters.speed
    },
    radius: balance.survival.hunters.radius,
    trail: [position],
    age: 0,
    armFor: 0,
    fuseFor: 0,
    hp: balance.survival.hunters.hp,
    maxHp: balance.survival.hunters.hp,
    damage: balance.survival.hunters.damage
  };
};

const updateHazard = (state: GameState, hazard: SurvivalHazardState, dt: number): SurvivalHazardState => {
  const velocity = hazard.kind === 'survivalHunter'
    ? getHunterVelocity(state, hazard)
    : hazard.velocity;
  const position = {
    x: hazard.position.x + velocity.x * dt,
    y: hazard.position.y + velocity.y * dt
  };

  return {
    ...hazard,
    age: hazard.age + dt,
    armFor: Math.max(0, hazard.armFor - dt),
    fuseFor: hazard.fuseFor > 0 ? Math.max(0, hazard.fuseFor - dt) : 0,
    trail: hazard.kind === 'survivalHunter'
      ? [...hazard.trail, position].slice(-balance.survival.hunters.trailLength)
      : hazard.trail,
    velocity,
    position
  };
};

const getHunterVelocity = (state: GameState, hazard: SurvivalHazardState): Vec2 => {
  const direction = normalize({
    x: state.ship.position.x - hazard.position.x,
    y: state.ship.position.y - hazard.position.y
  });
  const weave = Math.sin(hazard.age * balance.survival.hunters.weaveSpeed + hazard.id * 0.37) * balance.survival.hunters.weaveStrength;
  const curved = normalize({
    x: direction.x + -direction.y * weave,
    y: direction.y + direction.x * weave
  });
  return {
    x: curved.x * balance.survival.hunters.speed,
    y: curved.y * balance.survival.hunters.speed
  };
};

const shouldSpawnMines = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.ship.alive &&
  state.survival.active &&
  state.survival.threatLevel >= balance.survival.mines.startsAtThreatLevel;

const shouldSpawnHunters = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.ship.alive &&
  state.survival.active &&
  state.survival.threatLevel >= balance.survival.hunters.startsAtThreatLevel;

const getMineSpawnInterval = (state: GameState): number =>
  Math.max(
    balance.survival.mines.minimumSpawnInterval,
    balance.survival.mines.spawnInterval -
      Math.max(0, state.survival.threatLevel - balance.survival.mines.startsAtThreatLevel) *
        balance.survival.mines.spawnIntervalThreatReduction
  );

const getHunterSpawnInterval = (state: GameState): number =>
  Math.max(
    balance.survival.hunters.minimumSpawnInterval,
    balance.survival.hunters.spawnInterval -
      Math.max(0, state.survival.threatLevel - balance.survival.hunters.startsAtThreatLevel) *
        balance.survival.hunters.spawnIntervalThreatReduction
  );

const getHazardCount = (state: GameState, kind: SurvivalHazardState['kind']): number =>
  state.hazards.filter((hazard) => hazard.kind === kind).length;

const getHazardSpawnPosition = (state: GameState, margin: number = balance.survival.mines.spawnMargin): Vec2 => {
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
  const margin = Math.max(balance.survival.mines.spawnMargin, balance.survival.hunters.spawnMargin) + hazard.radius;
  return (
    hazard.position.x >= state.camera.x - state.width / 2 - margin &&
    hazard.position.x <= state.camera.x + state.width / 2 + margin &&
    hazard.position.y >= state.camera.y - state.height / 2 - margin &&
    hazard.position.y <= state.camera.y + state.height / 2 + margin
  );
};
