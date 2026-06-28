import { getAchievementMultiplier, recordCrystalsCollected, recordMoneyEarned } from '../../progression/achievements';
import { getMissileSplashDamage, getMissileSplashRadius, getShotgunPelletDamage, hasMissileExplosion } from '../../progression/talentTree';
import type { GameState, Vec2 } from '../types';
import { distance, normalize } from '../vector';
import { getExplorationZone, getZoneByIndex } from '../zones';
import { getAsteroidReward, splitAsteroid } from './asteroids';
import { burstParticles } from './particles';
import { emitAudio, emitReward } from '../events';
import { balance } from '../../balance';

export const resolveCollisions = (state: GameState): void => {
  const nextAsteroids = [...state.asteroids];
  const destroyedAsteroidIds = new Set<number>();
  const destroyedBulletIds = new Set<number>();
  const deflectedAsteroidIds = new Set<number>();

  for (const bullet of state.bullets) {
    if (bullet.owner === 'player' || bullet.owner === 'drone') {
      for (const asteroid of nextAsteroids) {
        if (!destroyedAsteroidIds.has(asteroid.id) && distance(bullet.position, asteroid.position) < bullet.radius + asteroid.radius * balance.asteroids.bulletHitRadiusMultiplier) {
          let hitDamage = bullet.damage;
          if (bullet.kind === 'pellet' && asteroid.variant === 'dense') {
            hitDamage = getShotgunPelletDamage(state.progression, 'dense');
          }
          if (bullet.pierceLeft > 0) {
            bullet.pierceLeft -= 1;
          } else {
            destroyedBulletIds.add(bullet.id);
          }
          asteroid.hp -= hitDamage;
          if (asteroid.hp <= 0) {
            destroyedAsteroidIds.add(asteroid.id);
            destroyAsteroid(state, asteroid, nextAsteroids);
          } else {
            emitAudio(state, { type: 'asteroidHit' });
            burstParticles(state, asteroid.position, 5, asteroid.radius * 1.6);
          }
          if (bullet.kind === 'flak') {
            explodeFlak(state, bullet.position, asteroid, nextAsteroids, destroyedAsteroidIds);
          }
          if (bullet.kind === 'missile' && hasMissileExplosion(state.progression)) {
            explodeMissile(state, bullet.position, hitDamage, nextAsteroids, destroyedAsteroidIds, asteroid.id);
          }
          break;
        }
      }

      if (state.saucer && distance(bullet.position, state.saucer.position) < bullet.radius + state.saucer.radius) {
        destroyedBulletIds.add(bullet.id);
        state.saucer.alive = false;
        const saucerReward = Math.round(balance.saucer.rewardMoney * getAchievementMultiplier(state.progression, 'money'));
        state.money += saucerReward;
        recordMoneyEarned(state.progression, saucerReward);
        state.progression.achievementStats.saucersDestroyed += 1;
        emitAudio(state, { type: 'saucerDestroyed' });
        burstParticles(state, state.saucer.position, 18, 190);
      }
    } else if (state.ship.alive && state.ship.invulnerableFor <= 0 && distance(bullet.position, state.ship.position) < bullet.radius + state.ship.radius) {
      destroyedBulletIds.add(bullet.id);
      damageShip(state, bullet.owner === 'boss' ? balance.bosses.shipCollisionDamage : balance.saucer.bulletDamage);
    }
  }

  if (state.ship.alive) {
    const asteroidsAtCollisionStart = [...nextAsteroids];
    for (const asteroid of asteroidsAtCollisionStart) {
      if (!destroyedAsteroidIds.has(asteroid.id) && isNearShip(state, asteroid, asteroid.radius + 42) && asteroidHitsDeflector(state, asteroid)) {
        collideDeflectorWithAsteroid(state, asteroid, destroyedAsteroidIds, nextAsteroids);
        deflectedAsteroidIds.add(asteroid.id);
      }
    }
  }

  if (state.ship.alive && state.ship.invulnerableFor <= 0) {
    for (const asteroid of nextAsteroids) {
      if (
        !destroyedAsteroidIds.has(asteroid.id) &&
        !deflectedAsteroidIds.has(asteroid.id) &&
        distance(state.ship.position, asteroid.position) < state.ship.radius + asteroid.radius * balance.asteroids.collisionRadiusMultiplier
      ) {
        collideShipWithAsteroid(state, asteroid, destroyedAsteroidIds, nextAsteroids);
        break;
      }
    }

    if (state.saucer && distance(state.ship.position, state.saucer.position) < state.ship.radius + state.saucer.radius) {
      state.saucer.alive = false;
      damageShip(state, balance.saucer.collisionDamage);
    }
  }

  state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'respawning' || !asteroid.bossType));
  state.bullets = state.bullets.filter((bullet) => !destroyedBulletIds.has(bullet.id));
};

const explodeMissile = (
  state: GameState,
  position: Vec2,
  directDamage: number,
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>,
  directHitId: number
): void => {
  const splashRadius = getMissileSplashRadius(state.progression);
  const splashDamage = getMissileSplashDamage(state.progression, directDamage);
  burstParticles(state, position, 16, splashRadius * 2);

  for (const asteroid of [...nextAsteroids]) {
    if (asteroid.id === directHitId || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }
    if (distance(position, asteroid.position) > splashRadius + asteroid.radius * 0.45) {
      continue;
    }

    asteroid.hp -= splashDamage;
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, asteroid.position, 4, asteroid.radius);
    }
  }
};

const explodeFlak = (
  state: GameState,
  position: Vec2,
  directHit: GameState['asteroids'][number],
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>
): void => {
  burstParticles(state, position, 14, 150);
  for (const asteroid of [...nextAsteroids]) {
    if (asteroid.id === directHit.id || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }
    if (distance(position, asteroid.position) > balance.collisions.flakSplashRadius + asteroid.radius * 0.45) {
      continue;
    }

    asteroid.hp -= Math.max(1, Math.floor(directHit.maxHp * balance.collisions.flakSplashDamageMultiplier));
    if (asteroid.hp <= 0) {
      destroyedAsteroidIds.add(asteroid.id);
      destroyAsteroid(state, asteroid, nextAsteroids);
    } else {
      emitAudio(state, { type: 'asteroidHit' });
      burstParticles(state, asteroid.position, 4, asteroid.radius);
    }
  }
};

const collideShipWithAsteroid = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  destroyedAsteroidIds: Set<number>,
  nextAsteroids: GameState['asteroids']
): void => {
  if (asteroidHitsDeflector(state, asteroid)) {
    collideDeflectorWithAsteroid(state, asteroid, destroyedAsteroidIds, nextAsteroids);
    return;
  }

  damageShip(state, balance.collisions.asteroidDamage[asteroid.size]);
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

const asteroidHitsDeflector = (state: GameState, asteroid: GameState['asteroids'][number]): boolean => {
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

const collideDeflectorWithAsteroid = (
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

const destroyAsteroid = (
  state: GameState,
  asteroid: GameState['asteroids'][number],
  nextAsteroids: GameState['asteroids']
): void => {
  const reward = getAsteroidReward(state, asteroid);
  state.money += reward.money;
  state.crystals += reward.crystals;
  recordMoneyEarned(state.progression, reward.money);
  recordCrystalsCollected(state.progression, reward.crystals);
  state.progression.achievementStats.asteroidsDestroyed += 1;
  if (asteroid.bossType && asteroid.bossZoneIndex !== undefined) {
    const unlockedZone = getZoneByIndex(asteroid.bossZoneIndex);
    state.progression.unlockedZoneIndex = Math.max(state.progression.unlockedZoneIndex, asteroid.bossZoneIndex);
    state.progression.travelLevel = state.progression.unlockedZoneIndex;
    state.progression.bossDefeats += 1;
    emitAudio(state, { type: 'bossDefeated' });
    emitAudio(state, { type: 'zoneUnlocked' });
    emitReward(state, `${unlockedZone.name} unlocked on map`, 'unlock');
    state.bullets = state.bullets.filter((bullet) => bullet.owner !== 'boss');
  }
  emitReward(state, reward.crystals > 0 ? `+${reward.money} credits  +${reward.crystals} crystals` : `+${reward.money} credits`, 'payout');
  emitAudio(state, { type: 'asteroidDestroyed', size: asteroid.size });
  burstParticles(state, asteroid.position, asteroid.size === 'large' ? 22 : 13, asteroid.radius * 4);
  nextAsteroids.push(...splitAsteroid(state, asteroid));
};

const damageShip = (state: GameState, amount: number): void => {
  const effectiveArmor = state.ship.armor * getAchievementMultiplier(state.progression, 'armor');
  const damage = Math.max(0, amount - effectiveArmor);
  if (damage <= 0) {
    state.ship.invulnerableFor = 0.35;
    emitAudio(state, { type: 'shipHit' });
    burstParticles(state, state.ship.position, 6, 120);
    return;
  }

  state.ship.hp = Math.max(0, state.ship.hp - damage);
  state.ship.invulnerableFor = 0.75;
  emitAudio(state, { type: 'shipHit' });
  burstParticles(state, state.ship.position, damage >= state.ship.maxHp * 0.25 ? 18 : 8, 160);

  if (state.ship.hp > 0) {
    return;
  }

  burstParticles(state, state.ship.position, 42, 280);
  emitAudio(state, { type: 'shipDestroyed' });
  state.progression.achievementStats.deaths += 1;
  const zone = getExplorationZone(state);
  const zoneRepairMultiplier = 1 + zone.index * balance.collisions.repairZoneMultiplierPerIndex;
  const repairCost = Math.min(state.money, Math.ceil(state.ship.maxHp * balance.collisions.repairCostPerMaxHp * zoneRepairMultiplier));
  state.money -= repairCost;
  state.lastRepairCost = repairCost;
  state.deathPenaltyFor = balance.collisions.deathPenaltyBaseSeconds + zone.index * balance.collisions.deathPenaltySecondsPerZone;
  state.droneRebootFor = 0;
  state.ship.alive = false;
  state.ship.respawnFor = balance.ship.respawnDelay;
  state.pendingBoss = null;
  state.asteroids = state.asteroids.filter((asteroid) => !asteroid.bossType);
  state.bullets = state.bullets.filter((bullet) => bullet.owner !== 'boss');
  state.phase = 'respawning';
};

const distanceSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

const isNearShip = (state: GameState, asteroid: GameState['asteroids'][number], padding: number): boolean => {
  const range = state.ship.radius + padding;
  return distanceSq(state.ship.position, asteroid.position) <= range * range;
};
