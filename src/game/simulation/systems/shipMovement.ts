import type { InputActions } from '../../input/actions';
import { getAchievementMultiplier } from '../../progression/achievements';
import { emitAudio } from '../events';
import { resetShip } from '../state';
import type { GameState } from '../types';
import { clampMagnitude, randomRange } from '../vector';
import { burstParticles } from './particles';
import { firePlayerWeapon } from './weapons';
import { balance } from '../../balance';
import { getPropulsionSkillMultiplier } from '../../progression/talentTree';

export const updateShipMovement = (state: GameState, input: InputActions, dt: number): void => {
  const ship = state.ship;

  if (!ship.alive) {
    ship.respawnFor -= dt;
    if (ship.respawnFor <= 0) {
      resetShip(state);
    }
    return;
  }

  if (input.slingshotVector) {
    const slingPower = Math.min(1, Math.hypot(input.slingshotVector.x, input.slingshotVector.y));
    if (slingPower > balance.ship.slingshotDeadzone) {
      ship.rotation = Math.atan2(input.slingshotVector.y, input.slingshotVector.x);
      const thrust = balance.ship.thrust * getSpeedMultiplier(state) * (0.35 + slingPower * 0.9);
      ship.velocity.x += Math.cos(ship.rotation) * thrust * dt;
      ship.velocity.y += Math.sin(ship.rotation) * thrust * dt;
    } else {
      ship.velocity.x *= 0.965;
      ship.velocity.y *= 0.965;
    }
  } else if (input.aimDirection) {
    ship.rotation = Math.atan2(input.aimDirection.y, input.aimDirection.x);
    ship.velocity.x *= 0.9;
    ship.velocity.y *= 0.9;
  } else if (input.pointerTarget) {
    const targetOffset = {
      x: input.pointerTarget.x - ship.position.x,
      y: input.pointerTarget.y - ship.position.y
    };
    const targetDistance = Math.hypot(targetOffset.x, targetOffset.y);
    ship.rotation = Math.atan2(targetOffset.y, targetOffset.x);

    if (targetDistance > balance.ship.pointerArrivalRadius) {
      const thrustScale = Math.min(1, Math.max(0.28, (targetDistance - balance.ship.pointerArrivalRadius) / balance.ship.pointerBrakeRadius));
      const thrust = balance.ship.thrust * getSpeedMultiplier(state) * thrustScale;
      ship.velocity.x += Math.cos(ship.rotation) * thrust * dt;
      ship.velocity.y += Math.sin(ship.rotation) * thrust * dt;
    } else {
      ship.velocity.x *= 0.94;
      ship.velocity.y *= 0.94;
    }
  } else {
    const turn = (input.rotateRight ? 1 : 0) - (input.rotateLeft ? 1 : 0);
    ship.rotation += turn * balance.ship.turnSpeed * dt;

    if (input.thrust) {
      const thrust = balance.ship.thrust * getSpeedMultiplier(state);
      ship.velocity.x += Math.cos(ship.rotation) * thrust * dt;
      ship.velocity.y += Math.sin(ship.rotation) * thrust * dt;
    }
  }

  if (
    input.brake ||
    (input.pointerTarget && Math.hypot(input.pointerTarget.x - ship.position.x, input.pointerTarget.y - ship.position.y) < balance.ship.pointerBrakeRadius)
  ) {
    ship.velocity.x *= 0.975;
    ship.velocity.y *= 0.975;
  }

  ship.velocity.x *= balance.ship.drag;
  ship.velocity.y *= balance.ship.drag;
  ship.velocity = clampMagnitude(ship.velocity, balance.ship.maxSpeed * getSpeedMultiplier(state));
  ship.position = {
    x: ship.position.x + ship.velocity.x * dt,
    y: ship.position.y + ship.velocity.y * dt
  };

  ship.fireCooldown = Math.max(0, ship.fireCooldown - dt);
  ship.hyperspaceCooldown = Math.max(0, ship.hyperspaceCooldown - dt);
  ship.invulnerableFor = Math.max(0, ship.invulnerableFor - dt);

  if (input.fire && ship.fireCooldown === 0) {
    firePlayerWeapon(state);
  }

  if (input.hyperspace && ship.hyperspaceCooldown === 0) {
    state.progression.achievementStats.hyperspaceUses += 1;
    emitAudio(state, { type: 'hyperspace' });
    burstParticles(state, ship.position, 16, 170);
    ship.position = {
      x: state.camera.x + randomRange(-state.width * 0.38, state.width * 0.38),
      y: state.camera.y + randomRange(-state.height * 0.38, state.height * 0.38)
    };
    ship.velocity = { x: randomRange(-80, 80), y: randomRange(-80, 80) };
    ship.invulnerableFor = 1.1;
    ship.hyperspaceCooldown = balance.ship.hyperspaceInterval;
  }
};

export const updateCamera = (state: GameState, dt: number): void => {
  const cameraEase = Math.min(1, dt * 5.5);
  state.camera.x += (state.ship.position.x - state.camera.x) * cameraEase;
  state.camera.y += (state.ship.position.y - state.camera.y) * cameraEase;
};

const getSpeedMultiplier = (state: GameState): number =>
  (1 + state.progression.shipSpeedLevel * balance.ship.speedBonusPerLevel) *
  getPropulsionSkillMultiplier(state.progression) *
  getAchievementMultiplier(state.progression, 'speed');
