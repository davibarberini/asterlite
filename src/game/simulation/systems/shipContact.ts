import { getAchievementMultiplier } from '../../progression/achievements';
import { recordAsteroidCollisionUnlockProgress } from '../../progression/shipUnlocks';
import { getShipFrameBonusMultiplier, getShipFrameWeaponIdentity } from '../../progression/shipFrames';
import { balance } from '../../balance';
import { emitAudio } from '../events';
import type { GameState, SurvivalMeteorLaneEventState, Vec2 } from '../types';
import { distance, normalize } from '../vector';
import { getZoneAsteroidDamageMultiplier } from '../zones';
import { burstParticles } from './particles';
import { destroyAsteroid } from './asteroidDestruction';
import { damageShip } from './playerDamage';
import { getMeteorLaneMeteorPosition } from './survivalEvents';

export const collideShipWithAsteroid = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  destroyedAsteroidIds: Set<number>,
  nextAsteroids: GameState['asteroids']
): void => {
  if (asteroidHitsDeflector(state, asteroid)) {
    collideDeflectorWithAsteroid(state, asteroid, destroyedAsteroidIds, nextAsteroids);
    return;
  }

  recordAsteroidCollisionUnlockProgress(state);
  if (applyRamCollisionDamage(state, asteroid, destroyedAsteroidIds, nextAsteroids)) {
    return;
  }
  if (absorbShieldBubbleHit(state, asteroid.position, asteroid.radius * 2.4)) {
    repelAsteroidFromShip(state, asteroid);
    return;
  }

  const knockback = asteroid.bossType ? balance.collisions.enemyContactKnockback : balance.collisions.shipContactKnockback;
  repelShipFromContact(
    state,
    asteroid.position,
    getShipThreatRadius(state) + asteroid.radius * balance.asteroids.collisionRadiusMultiplier,
    knockback * (getShipFrameWeaponIdentity(state.progression) === 'ram' ? balance.weapons.ramKnockbackMultiplier : 1)
  );
  damageShip(state, getAsteroidContactDamage(state, asteroid));
};

export const getShipThreatRadius = (state: GameState): number =>
  state.shieldBubble.active && !state.shieldBubble.broken
    ? state.ship.radius + balance.ship.shieldBubbleRadius
    : state.ship.radius;

export const asteroidHitsShipOrShield = (state: GameState, asteroid: GameState['asteroids'][number]): boolean =>
  distance(state.ship.position, asteroid.position) <
  getShipThreatRadius(state) + asteroid.radius * balance.asteroids.collisionRadiusMultiplier;

export const getMeteorHit = (state: GameState, event: SurvivalMeteorLaneEventState): { position: Vec2; radius: number } | null => {
  for (const meteor of event.meteors) {
    const meteorPosition = getMeteorLaneMeteorPosition(event, meteor);
    if (!meteorPosition) {
      continue;
    }
    if (distance(state.ship.position, meteorPosition) < getShipThreatRadius(state) + meteor.radius) {
      return { position: meteorPosition, radius: meteor.radius };
    }
  }

  return null;
};

export const absorbShieldBubbleHit = (state: GameState, hitPosition: Vec2, particleSpread: number): boolean => {
  if (!state.shieldBubble.active || state.shieldBubble.broken) {
    return false;
  }

  state.shieldBubble.active = false;
  state.shieldBubble.broken = true;
  state.shieldBubble.rechargeFor = balance.ship.shieldBubbleRechargeSeconds;
  state.shieldBubble.hitFlashFor = balance.ship.shieldBubbleHitFlashSeconds;
  state.ship.invulnerableFor = Math.max(state.ship.invulnerableFor, balance.ship.shieldBubbleGraceSeconds);
  emitAudio(state, { type: 'shipHit' });
  burstParticles(state, hitPosition, 16, particleSpread);
  return true;
};

export const repelShipFromContact = (state: GameState, contactPosition: Vec2, minimumDistance: number, knockback: number): void => {
  let away = normalize({
    x: state.ship.position.x - contactPosition.x,
    y: state.ship.position.y - contactPosition.y
  });
  if (away.x === 0 && away.y === 0) {
    away = normalize({
      x: state.ship.velocity.x,
      y: state.ship.velocity.y
    });
  }
  if (away.x === 0 && away.y === 0) {
    away = {
      x: -Math.cos(state.ship.rotation),
      y: -Math.sin(state.ship.rotation)
    };
  }
  const safeDistance = minimumDistance + balance.collisions.shipContactSeparationPadding;
  state.ship.position.x = contactPosition.x + away.x * safeDistance;
  state.ship.position.y = contactPosition.y + away.y * safeDistance;
  state.ship.velocity.x += away.x * knockback;
  state.ship.velocity.y += away.y * knockback;
};

export const asteroidHitsDeflector = (state: GameState, asteroid: GameState['asteroids'][number]): boolean => {
  const level = state.progression.deflectorLevel;
  if (level <= 0 || !isInShipFrontArc(state, asteroid.position)) {
    return false;
  }

  const ship = state.ship;
  const dx = asteroid.position.x - ship.position.x;
  const dy = asteroid.position.y - ship.position.y;
  const forward = {
    x: Math.cos(ship.rotation),
    y: Math.sin(ship.rotation)
  };
  const right = {
    x: -forward.y,
    y: forward.x
  };
  const forwardDistance = dx * forward.x + dy * forward.y;
  const lateralDistance = Math.abs(dx * right.x + dy * right.y);
  const baseDistance = 8;
  const noseDistance = 30 + level * 3;
  const asteroidPadding = asteroid.radius * 0.72;

  if (forwardDistance < baseDistance - asteroidPadding || forwardDistance > noseDistance + asteroidPadding) {
    return false;
  }

  const triangleProgress = Math.max(0, Math.min(1, (forwardDistance - baseDistance) / (noseDistance - baseDistance)));
  const halfWidth = (12 + level * 1.4) * (1 - triangleProgress) + 3 * triangleProgress + asteroidPadding;
  return lateralDistance <= halfWidth;
};

export const isNearShip = (state: GameState, asteroid: GameState['asteroids'][number], padding: number): boolean => {
  const range = state.ship.radius + padding;
  return distanceSq(state.ship.position, asteroid.position) <= range * range;
};

const applyRamCollisionDamage = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  destroyedAsteroidIds: Set<number>,
  nextAsteroids: GameState['asteroids']
): boolean => {
  if (getShipFrameWeaponIdentity(state.progression) !== 'ram') {
    return false;
  }

  asteroid.hp -= getRamCollisionDamage(state);
  emitAudio(state, { type: 'asteroidHit' });
  burstParticles(state, asteroid.position, 10, asteroid.radius * 2.8);
  if (asteroid.hp > 0) {
    return false;
  }

  destroyedAsteroidIds.add(asteroid.id);
  destroyAsteroid(state, asteroid, nextAsteroids);
  return true;
};

const getRamCollisionDamage = (state: GameState): number =>
  Math.max(
    1,
    state.progression.shipDamageLevel *
      balance.weapons.playerDamageMultiplier *
      getAchievementMultiplier(state.progression, 'damage') *
      getShipFrameBonusMultiplier(state.progression, 'damageMultiplier') *
      balance.weapons.ramDamageMultiplier
  );

const getAsteroidContactDamage = (state: GameState, asteroid: GameState['asteroids'][number]): number =>
  Math.round(
    balance.collisions.asteroidDamage[asteroid.size] *
      getZoneAsteroidDamageMultiplier(state) *
      (getShipFrameWeaponIdentity(state.progression) === 'ram' ? balance.weapons.ramContactDamageMultiplier : 1)
  );

const repelAsteroidFromShip = (state: GameState, asteroid: GameState['asteroids'][number]): void => {
  const away = normalize({
    x: asteroid.position.x - state.ship.position.x,
    y: asteroid.position.y - state.ship.position.y
  });
  const impulse = 120 + asteroid.radius * 1.2;
  asteroid.velocity.x += away.x * impulse;
  asteroid.velocity.y += away.y * impulse;
  asteroid.position.x = state.ship.position.x + away.x * (state.ship.radius + asteroid.radius * 0.92 + balance.ship.shieldBubbleRadius);
  asteroid.position.y = state.ship.position.y + away.y * (state.ship.radius + asteroid.radius * 0.92 + balance.ship.shieldBubbleRadius);
};

const isInShipFrontArc = (state: GameState, target: Vec2): boolean => {
  const toTarget = normalize({
    x: target.x - state.ship.position.x,
    y: target.y - state.ship.position.y
  });
  const forward = {
    x: Math.cos(state.ship.rotation),
    y: Math.sin(state.ship.rotation)
  };
  return toTarget.x * forward.x + toTarget.y * forward.y > balance.collisions.deflectorArcDot;
};

export const collideDeflectorWithAsteroid = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  destroyedAsteroidIds: Set<number>,
  nextAsteroids: GameState['asteroids']
): void => {
  const level = state.progression.deflectorLevel;
  asteroid.hp -= level;
  const forward = {
    x: Math.cos(state.ship.rotation),
    y: Math.sin(state.ship.rotation)
  };
  const impulse = 42 + level * 12;
  asteroid.velocity.x += forward.x * impulse;
  asteroid.velocity.y += forward.y * impulse;
  asteroid.position.x += forward.x * (4 + level);
  asteroid.position.y += forward.y * (4 + level);
  emitAudio(state, { type: 'asteroidHit' });
  burstParticles(state, asteroid.position, 8 + level * 2, asteroid.radius * 2.4);

  if (asteroid.hp > 0) {
    return;
  }

  destroyedAsteroidIds.add(asteroid.id);
  destroyAsteroid(state, asteroid, nextAsteroids);
};

const distanceSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};
