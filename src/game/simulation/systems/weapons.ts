import { getAchievementMultiplier } from '../../progression/achievements';
import { getMissileTurnRateMultiplier } from '../../progression/talentTree';
import { balance } from '../../balance';
import { emitAudio } from '../events';
import type { BulletKind, GameState, Vec2 } from '../types';

export const fireBullet = (
  state: GameState,
  owner: 'player' | 'drone' | 'saucer' | 'boss',
  position: Vec2,
  rotation: number,
  speed: number,
  damage = 1,
  inheritedVelocity: Vec2 = { x: 0, y: 0 },
  pierceLeft = 0,
  kind: BulletKind = 'standard',
  homingTargetId: number | null = null
): void => {
  if (owner === 'player') {
    emitAudio(state, { type: 'playerShoot' });
  } else if (owner === 'drone') {
    emitAudio(state, { type: 'droneShoot' });
  } else if (owner === 'saucer') {
    emitAudio(state, { type: 'saucerShoot' });
  } else {
    emitAudio(state, { type: 'bossShoot' });
  }

  state.bullets.push({
    id: state.nextId++,
    owner,
    position: {
      x: position.x + Math.cos(rotation) * balance.weapons.spawnOffset,
      y: position.y + Math.sin(rotation) * balance.weapons.spawnOffset
    },
    velocity: {
      x: Math.cos(rotation) * speed + inheritedVelocity.x,
      y: Math.sin(rotation) * speed + inheritedVelocity.y
    },
    age: 0,
    radius:
      owner === 'boss'
        ? balance.weapons.radius.boss
        : owner === 'saucer'
          ? balance.weapons.radius.saucer
          : kind === 'missile'
            ? balance.weapons.radius.missile
            : owner === 'drone'
              ? balance.weapons.radius.drone
              : balance.weapons.radius.player,
    damage,
    pierceLeft,
    kind,
    homingTargetId
  });
};

export const firePlayerWeapon = (state: GameState): void => {
  const ship = state.ship;
  const damageMultiplier = getAchievementMultiplier(state.progression, 'damage');

  if (state.progression.weaponMode === 'spread' && state.progression.spreadUnlocked) {
    balance.weapons.spreadAngleOffsets.forEach((offset) => {
      fireBullet(
        state,
        'player',
        ship.position,
        ship.rotation + offset,
        balance.weapons.bulletSpeed * balance.weapons.spreadSpeedMultiplier,
        Math.max(1, Math.round((state.progression.shipDamageLevel - 1) * damageMultiplier)),
        ship.velocity
      );
    });
    ship.fireCooldown = balance.weapons.spreadFireInterval;
    return;
  }

  if (state.progression.weaponMode === 'piercing' && state.progression.piercingUnlocked) {
    fireBullet(
      state,
      'player',
      ship.position,
      ship.rotation,
      balance.weapons.bulletSpeed * balance.weapons.piercingSpeedMultiplier,
      Math.max(1, Math.round(state.progression.shipDamageLevel * damageMultiplier)),
      ship.velocity,
      balance.weapons.piercingCount
    );
    ship.fireCooldown = balance.weapons.playerFireInterval * balance.weapons.piercingCooldownMultiplier;
    return;
  }

  fireBullet(
    state,
    'player',
    ship.position,
    ship.rotation,
    balance.weapons.bulletSpeed,
    Math.max(1, Math.round(state.progression.shipDamageLevel * damageMultiplier)),
    ship.velocity
  );
  ship.fireCooldown = balance.weapons.playerFireInterval;
};

export const updateBullets = (state: GameState, dt: number): void => {
  state.bullets = state.bullets
    .map((bullet) => {
      const velocity =
        bullet.kind === 'missile' && bullet.homingTargetId !== null
          ? steerHomingBullet(bullet, state.asteroids.find((asteroid) => asteroid.id === bullet.homingTargetId) ?? null, dt, state)
          : bullet.velocity;

      return {
        ...bullet,
        age: bullet.age + dt,
        velocity,
        position: {
          x: bullet.position.x + velocity.x * dt,
          y: bullet.position.y + velocity.y * dt
        }
      };
    })
    .filter((bullet) => isOnScreen(state, bullet.position, bullet.radius + balance.weapons.bulletCullMargin));
};

const steerHomingBullet = (
  bullet: GameState['bullets'][number],
  target: GameState['asteroids'][number] | null,
  dt: number,
  state: GameState
): Vec2 => {
  if (!target) {
    return bullet.velocity;
  }

  const dx = target.position.x - bullet.position.x;
  const dy = target.position.y - bullet.position.y;
  const desiredAngle = Math.atan2(dy, dx);
  const currentAngle = Math.atan2(bullet.velocity.y, bullet.velocity.x);
  let delta = desiredAngle - currentAngle;
  while (delta > Math.PI) {
    delta -= Math.PI * 2;
  }
  while (delta < -Math.PI) {
    delta += Math.PI * 2;
  }

  const turnRate = balance.weapons.missileTurnRate * getMissileTurnRateMultiplier(state.progression);
  const turn = Math.sign(delta) * Math.min(Math.abs(delta), turnRate * dt);
  const speed = Math.hypot(bullet.velocity.x, bullet.velocity.y);
  const nextAngle = currentAngle + turn;
  return {
    x: Math.cos(nextAngle) * speed,
    y: Math.sin(nextAngle) * speed
  };
};

const isOnScreen = (state: GameState, position: Vec2, margin = 0): boolean =>
  position.x >= state.camera.x - state.width / 2 - margin &&
  position.x <= state.camera.x + state.width / 2 + margin &&
  position.y >= state.camera.y - state.height / 2 - margin &&
  position.y <= state.camera.y + state.height / 2 + margin;
