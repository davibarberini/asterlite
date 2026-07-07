import { balance } from '../../balance';
import type { GameState, SurvivalGravityPulseEventState, SurvivalMeteorLaneEventState, SurvivalMeteorVisualState, SurvivalTimedEventState, Vec2 } from '../types';
import { distance, normalize, randomRange } from '../vector';
import { isSurvivalZone } from './survival';

export const updateSurvivalTimedEvents = (state: GameState, dt: number): void => {
  state.survivalEvents = state.survivalEvents
    .map((event) => updateTimedEvent(state, event, dt))
    .filter((event) => event.warningFor > 0 || event.activeFor > 0);

  updateSurvivalMeteorLanes(state, dt);
  updateSurvivalGravityPulses(state, dt);
};

const updateSurvivalMeteorLanes = (state: GameState, dt: number): void => {
  if (!shouldSpawnMeteorLanes(state)) {
    state.survival.timedEventCooldown = 0;
    return;
  }

  const currentMeteorLaneCount = getMeteorLaneCount(state);
  const targetMeteorLaneCount = getMeteorLaneTargetCount(state);
  state.survival.timedEventCooldown = Math.max(0, state.survival.timedEventCooldown - dt);
  if (state.survival.timedEventCooldown > 0 || currentMeteorLaneCount >= targetMeteorLaneCount) {
    return;
  }

  for (let index = currentMeteorLaneCount; index < targetMeteorLaneCount; index += 1) {
    state.survivalEvents.push(createMeteorLaneEvent(state, index));
  }
  state.survival.timedEventCooldown = getMeteorLaneSpawnInterval(state);
};

const updateSurvivalGravityPulses = (state: GameState, dt: number): void => {
  if (!shouldSpawnGravityPulses(state)) {
    state.survival.gravityPulseCooldown = 0;
    return;
  }

  state.survival.gravityPulseCooldown = Math.max(0, state.survival.gravityPulseCooldown - dt);
  if (
    state.survival.gravityPulseCooldown > 0 ||
    state.survivalEvents.some((event) => event.kind === 'gravityPulse')
  ) {
    return;
  }

  state.survivalEvents.push(createGravityPulseEvent(state));
  state.survival.gravityPulseCooldown = getGravityPulseSpawnInterval(state);
};

export const createMeteorLaneEvent = (state: GameState, laneIndex = 0): SurvivalMeteorLaneEventState => {
  const config = balance.survival.timedEvents.meteorLane;
  const baseAngle = Math.random() < 0.5 ? 0 : Math.PI / 2;
  const angle = baseAngle + randomRange(-0.24, 0.24) + laneIndex * 0.08;
  const direction = {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
  const normal = getNormal(direction);
  const offsetRange = Math.min(state.width, state.height) * 0.34;
  const offset = randomRange(-offsetRange, offsetRange);
  const width = config.width;
  const length = Math.hypot(state.width, state.height) * config.lengthMultiplier;
  const center = {
    x: state.camera.x + normal.x * offset,
    y: state.camera.y + normal.y * offset
  };

  return {
    id: state.nextId++,
    kind: 'meteorLane',
    center,
    anchorCenter: center,
    anchorCamera: { ...state.camera },
    direction,
    width,
    length,
    age: 0,
    warningFor: config.warningSeconds,
    activeFor: config.activeSeconds,
    hitCooldown: 0,
    damage: config.damage,
    meteors: createMeteorVisuals(length, width)
  };
};

export const createGravityPulseEvent = (state: GameState): SurvivalGravityPulseEventState => {
  const config = balance.survival.timedEvents.gravityPulse;
  const angle = randomRange(0, Math.PI * 2);
  const distanceFromShip = randomRange(config.spawnDistance[0], config.spawnDistance[1]);
  return {
    id: state.nextId++,
    kind: 'gravityPulse',
    center: {
      x: state.ship.position.x + Math.cos(angle) * distanceFromShip,
      y: state.ship.position.y + Math.sin(angle) * distanceFromShip
    },
    radius: config.radius,
    force: config.force,
    age: 0,
    warningFor: config.warningSeconds,
    activeFor: config.activeSeconds
  };
};

export const isSurvivalTimedEventActive = (event: SurvivalTimedEventState): boolean =>
  event.warningFor <= 0 && event.activeFor > 0;

export const getNormal = (direction: Vec2): Vec2 => ({
  x: -direction.y,
  y: direction.x
});

export const getMeteorLaneCameraAnchoredCenter = (event: SurvivalMeteorLaneEventState, camera: Vec2): Vec2 => {
  const cameraDelta = {
    x: camera.x - event.anchorCamera.x,
    y: camera.y - event.anchorCamera.y
  };
  const alongCameraDelta = cameraDelta.x * event.direction.x + cameraDelta.y * event.direction.y;
  return {
    x: event.anchorCenter.x + event.direction.x * alongCameraDelta,
    y: event.anchorCenter.y + event.direction.y * alongCameraDelta
  };
};

export const getMeteorLaneMeteorPosition = (
  event: SurvivalMeteorLaneEventState,
  meteor: SurvivalMeteorVisualState
): Vec2 | null => {
  if (!isSurvivalTimedEventActive(event)) {
    return null;
  }

  const activeElapsed = event.age - balance.survival.timedEvents.meteorLane.warningSeconds;
  const meteorElapsed = activeElapsed - meteor.spawnDelay;
  if (meteorElapsed < 0) {
    return null;
  }

  const laneOffset = -event.length / 2 - event.width * 1.5 + meteorElapsed * meteor.speed;
  if (laneOffset > event.length / 2 + event.width * 1.5) {
    return null;
  }

  const normal = getNormal(event.direction);
  return {
    x: event.center.x + event.direction.x * laneOffset + normal.x * meteor.crossOffset,
    y: event.center.y + event.direction.y * laneOffset + normal.y * meteor.crossOffset
  };
};

const updateTimedEvent = (state: GameState, event: SurvivalTimedEventState, dt: number): SurvivalTimedEventState => {
  const warningFor = Math.max(0, event.warningFor - dt);
  const activeFor = event.warningFor > 0
    ? event.activeFor
    : Math.max(0, event.activeFor - dt);
  const updated = {
    ...event,
    age: event.age + dt,
    warningFor,
    activeFor
  };

  if (updated.kind === 'meteorLane') {
    return {
      ...updated,
      center: getMeteorLaneCameraAnchoredCenter(updated, state.camera),
      hitCooldown: Math.max(0, updated.hitCooldown - dt)
    };
  }

  applyGravityPulse(state, updated, dt);
  return updated;
};

const shouldSpawnMeteorLanes = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.ship.alive &&
  state.survival.active &&
  state.survival.threatLevel >= balance.survival.timedEvents.meteorLane.startsAtThreatLevel;

const shouldSpawnGravityPulses = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.ship.alive &&
  state.survival.active &&
  state.survival.threatLevel >= balance.survival.timedEvents.gravityPulse.startsAtThreatLevel;

const getMeteorLaneCount = (state: GameState): number =>
  state.survivalEvents.filter((event) => event.kind === 'meteorLane').length;

const getMeteorLaneTargetCount = (state: GameState): number => {
  const config = balance.survival.timedEvents.meteorLane;
  if (!shouldSpawnMeteorLanes(state)) {
    return 0;
  }

  return Math.min(
    config.maxConcurrentLanes,
    1 + Math.floor((state.survival.threatLevel - config.startsAtThreatLevel) / config.threatLevelsPerExtraLane)
  );
};

const getMeteorLaneSpawnInterval = (state: GameState): number => {
  const config = balance.survival.timedEvents.meteorLane;
  return Math.max(
    config.minimumSpawnInterval,
    config.spawnInterval -
      Math.max(0, state.survival.threatLevel - config.startsAtThreatLevel) *
        config.spawnIntervalThreatReduction
  );
};

const getGravityPulseSpawnInterval = (state: GameState): number => {
  const config = balance.survival.timedEvents.gravityPulse;
  return Math.max(
    config.minimumSpawnInterval,
    config.spawnInterval -
      Math.max(0, state.survival.threatLevel - config.startsAtThreatLevel) *
        config.spawnIntervalThreatReduction
  );
};

const applyGravityPulse = (state: GameState, event: SurvivalGravityPulseEventState, dt: number): void => {
  if (!isSurvivalTimedEventActive(event) || !state.ship.alive) {
    return;
  }

  const distanceFromCenter = distance(state.ship.position, event.center);
  if (distanceFromCenter <= 0 || distanceFromCenter > event.radius) {
    return;
  }

  const pullDirection = normalize({
    x: event.center.x - state.ship.position.x,
    y: event.center.y - state.ship.position.y
  });
  const falloff = 1 - distanceFromCenter / event.radius;
  const force = event.force * (0.45 + falloff * 0.75) * dt;
  state.ship.velocity.x += pullDirection.x * force;
  state.ship.velocity.y += pullDirection.y * force;
};

const createMeteorVisuals = (length: number, width: number): SurvivalMeteorVisualState[] => {
  const config = balance.survival.timedEvents.meteorLane;
  const count = Math.floor(randomRange(config.meteorCount[0], config.meteorCount[1] + 1));
  const travel = length + width * 3;
  const speed = Math.max(config.minimumMeteorSpeed, (travel / config.activeSeconds) * 1.04);
  const maxRadius = width / 6;
  const trackCount = Math.max(4, Math.min(6, Math.floor(width / (maxRadius * 1.05))));
  const trackSpan = width * 0.82;
  const trackStep = trackCount > 1 ? trackSpan / (trackCount - 1) : 0;

  return Array.from({ length: count }, (_value, index) => {
    const size = index === 0
      ? 'medium'
      : index === 1
        ? 'small'
        : Math.random() < config.smallMeteorChance ? 'small' : 'medium';
    const radiusRange = size === 'small' ? config.smallMeteorRadius : config.mediumMeteorRadius;
    const trackIndex = (index * 2 + Math.floor(index / trackCount)) % trackCount;
    const trackOffset = -trackSpan / 2 + trackIndex * trackStep;
    const crossJitter = randomRange(-width * 0.035, width * 0.035);
    return {
      crossOffset: trackOffset + crossJitter,
      radius: randomRange(Math.min(radiusRange[0], maxRadius), Math.min(radiusRange[1], maxRadius)),
      speed,
      spawnDelay: index * config.meteorSpawnGap + randomRange(0, config.meteorSpawnGap * 0.18),
      size,
      rotation: randomRange(0, Math.PI * 2),
      rotationSpeed: randomRange(-2.4, 2.4),
      idSeed: Math.floor(randomRange(0, 10000))
    };
  });
};
