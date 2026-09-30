import type { InputActions } from '../../input/actions';
import { getAchievementMultiplier } from '../../progression/achievements';
import type { GameState } from '../types';
import { clampMagnitude } from '../vector';
import { firePlayerWeapon } from './weapons';
import { balance } from '../../balance';
import { getShipFrameBonusMultiplier, getShipFrameWeaponIdentity } from '../../progression/shipFrames';
import { getRunCardDashImpulseMultiplier } from '../../progression/runCards';

export const updateShipMovement = (state: GameState, input: InputActions, dt: number): void => {
  const ship = state.ship;

  if (!ship.alive) {
    return;
  }

  if (input.impulseVector) {
    const impulsePower = Math.min(1, Math.hypot(input.impulseVector.x, input.impulseVector.y));
    if (impulsePower > 0) {
      ship.rotation = Math.atan2(input.impulseVector.y, input.impulseVector.x);
      const easedPower = Math.pow(impulsePower, 0.82);
      const impulse =
        (balance.ship.swipeImpulseMinSpeed +
          (balance.ship.swipeImpulseMaxSpeed - balance.ship.swipeImpulseMinSpeed) * easedPower) *
        getSpeedMultiplier(state) * getRunCardDashImpulseMultiplier(state);
      ship.velocity.x += Math.cos(ship.rotation) * impulse;
      ship.velocity.y += Math.sin(ship.rotation) * impulse;
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
  ship.invulnerableFor = Math.max(0, ship.invulnerableFor - dt);
  ship.phaseShieldCooldown = Math.max(0, ship.phaseShieldCooldown - dt);
  ship.phaseShieldFlashFor = Math.max(0, ship.phaseShieldFlashFor - dt);

  const weaponIdentity = getShipFrameWeaponIdentity(state.progression);
  const shouldAutoFire = weaponIdentity === 'turret' || weaponIdentity === 'aura';
  if ((input.fire || shouldAutoFire) && ship.fireCooldown === 0) {
    firePlayerWeapon(state);
  }
};

export const updateCamera = (state: GameState, dt: number): void => {
  const cameraEase = Math.min(1, dt * 5.5);
  state.camera.x += (state.ship.position.x - state.camera.x) * cameraEase;
  state.camera.y += (state.ship.position.y - state.camera.y) * cameraEase;
};

const getSpeedMultiplier = (state: GameState): number =>
  (1 + state.progression.shipSpeedLevel * balance.ship.speedBonusPerLevel) *
  getAchievementMultiplier(state.progression, 'speed') *
  getShipFrameBonusMultiplier(state.progression, 'speedMultiplier');
