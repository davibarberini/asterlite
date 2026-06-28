import { getAchievementMultiplier } from '../../progression/achievements';
import {
  getMissileDamage,
  getMissileFireIntervalMultiplier,
  getSemiAutoDamage,
  getSemiAutoFireIntervalMultiplier,
  getSemiAutoPierceLeft,
  getSemiAutoRangeBonus,
  getShotgunFireIntervalMultiplier,
  getShotgunPelletDamage,
  getShotgunSpreadAngles
} from '../../progression/talentTree';
import { balance } from '../../balance';
import { getDroneOrbitRadius } from '../state';
import type { GameState, Vec2 } from '../types';
import { normalize } from '../vector';
import { fireBullet } from './weapons';

export const updateDrones = (state: GameState, dt: number): void => {
  if (state.droneRebootFor > 0) {
    return;
  }

  let droneShotsThisFrame = 0;
  let targetChecksThisFrame = 0;
  let activeDroneBullets = getDroneBulletCount(state);
  const droneCount = Math.max(1, state.drones.length);
  const orbitStep = (Math.PI * 2) / droneCount;

  state.drones.forEach((drone, index) => {
    const orbitOffset = index * orbitStep;
    drone.angle += balance.drones.orbitSpeed * dt;
    drone.orbitRadius = getDroneOrbitRadius(state.progression, index, drone.type);
    drone.position = {
      x: state.ship.position.x + Math.cos(drone.angle + orbitOffset) * drone.orbitRadius,
      y: state.ship.position.y + Math.sin(drone.angle + orbitOffset) * drone.orbitRadius
    };
    drone.fireCooldown = Math.max(0, drone.fireCooldown - dt);

    if (
      !state.ship.alive ||
      drone.fireCooldown > 0 ||
      droneShotsThisFrame >= balance.drones.maxShotsPerFrame ||
      targetChecksThisFrame >= balance.drones.maxTargetChecksPerFrame ||
      activeDroneBullets >= balance.drones.maxBullets
    ) {
      return;
    }

    targetChecksThisFrame += 1;
    const target = findNearestAsteroid(state, drone.position, getDroneTargetRange(state, drone));
    if (!target) {
      return;
    }

    const direction = normalize({
      x: target.position.x - drone.position.x,
      y: target.position.y - drone.position.y
    });
    const bulletsFired = fireDroneWeapon(state, drone, Math.atan2(direction.y, direction.x), target);
    drone.fireCooldown = getDroneFireInterval(state, drone) + (drone.id % balance.drones.fireCooldownJitter.cycle) * balance.drones.fireCooldownJitter.step;
    droneShotsThisFrame += 1;
    activeDroneBullets += bulletsFired;
  });
};

const getDroneDamageMultiplier = (state: GameState): number =>
  getAchievementMultiplier(state.progression, 'droneDamage');

const fireDroneWeapon = (
  state: GameState,
  drone: GameState['drones'][number],
  rotation: number,
  target: GameState['asteroids'][number]
): number => {
  const inheritedVelocity = state.ship.velocity;

  if (drone.type === 'sentry') {
    fireBullet(
      state,
      'drone',
      drone.position,
      rotation,
      balance.weapons.droneBulletSpeed * balance.weapons.droneSpeedMultiplier.sentry,
      Math.max(1, Math.round(getSemiAutoDamage(state.progression) * getDroneDamageMultiplier(state))),
      inheritedVelocity,
      getSemiAutoPierceLeft(state.progression)
    );
    return 1;
  }

  if (drone.type === 'ranger') {
    getShotgunSpreadAngles(state.progression).forEach((offset) => {
      fireBullet(
        state,
        'drone',
        drone.position,
        rotation + offset,
        balance.weapons.droneBulletSpeed * balance.weapons.droneSpeedMultiplier.ranger,
        Math.max(1, Math.round(getShotgunPelletDamage(state.progression) * getDroneDamageMultiplier(state))),
        inheritedVelocity,
        0,
        'pellet'
      );
    });
    return getShotgunSpreadAngles(state.progression).length;
  }

  fireBullet(
    state,
    'drone',
    drone.position,
    rotation,
    balance.weapons.droneBulletSpeed * balance.weapons.droneSpeedMultiplier.breaker,
    Math.max(1, Math.round(getMissileDamage(state.progression) * getDroneDamageMultiplier(state))),
    inheritedVelocity,
    0,
    'missile',
    target.id
  );
  return 1;
};

const getDroneFireInterval = (state: GameState, drone: GameState['drones'][number]): number => {
  if (drone.type === 'ranger') {
    return balance.drones.fireInterval.ranger * getShotgunFireIntervalMultiplier(state.progression);
  }
  if (drone.type === 'breaker') {
    return balance.drones.fireInterval.breaker * getMissileFireIntervalMultiplier(state.progression);
  }
  return balance.drones.fireInterval.sentry * getSemiAutoFireIntervalMultiplier(state.progression);
};

const getDroneTargetRange = (state: GameState, drone: GameState['drones'][number]): number => {
  if (drone.type === 'ranger') {
    return balance.drones.baseTargetRange + balance.drones.targetRangeOffset.ranger;
  }
  if (drone.type === 'breaker') {
    return balance.drones.baseTargetRange + balance.drones.targetRangeOffset.breaker;
  }
  return balance.drones.baseTargetRange + balance.drones.targetRangeOffset.sentry + getSemiAutoRangeBonus(state.progression);
};

const getDroneBulletCount = (state: GameState): number => {
  let count = 0;
  for (const bullet of state.bullets) {
    if (bullet.owner === 'drone') {
      count += 1;
    }
  }
  return count;
};

const findNearestAsteroid = (state: GameState, position: Vec2, range: number): GameState['asteroids'][number] | null => {
  let nearest = null as GameState['asteroids'][number] | null;
  let nearestDistanceSq = range * range;

  state.asteroids.forEach((asteroid) => {
    const asteroidDistanceSq = distanceSq(position, asteroid.position);
    if (asteroidDistanceSq < nearestDistanceSq) {
      nearest = asteroid;
      nearestDistanceSq = asteroidDistanceSq;
    }
  });

  return nearest;
};

const distanceSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
