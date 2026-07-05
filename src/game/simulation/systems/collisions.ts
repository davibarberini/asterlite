import { getAchievementMultiplier, recordCrystalsCollected, recordMoneyEarned } from '../../progression/achievements';
import { queueBossRewardChoices } from '../../progression/bossRewards';
import { getMissileSplashDamage, getMissileSplashRadius, getShotgunPelletDamage, hasMissileExplosion } from '../../progression/talentTree';
import type { GameState, Vec2 } from '../types';
import { distance, normalize } from '../vector';
import { getExplorationZone, getZoneAsteroidDamageMultiplier, getZoneByIndex } from '../zones';
import { getAsteroidReward, splitAsteroid } from './asteroids';
import { burstParticles } from './particles';
import { emitAudio, emitReward } from '../events';
import { balance } from '../../balance';

export const resolveCollisions = (state: GameState): void => {
  const nextAsteroids = [...state.asteroids];
  const nextHazards = [...state.hazards];
  const destroyedAsteroidIds = new Set<number>();
  const destroyedHazardIds = new Set<number>();
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

      if (destroyedBulletIds.has(bullet.id)) {
        continue;
      }

      for (const hazard of nextHazards) {
        if (destroyedHazardIds.has(hazard.id) || distance(bullet.position, hazard.position) >= bullet.radius + hazard.radius) {
          continue;
        }

        if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
        } else {
          destroyedBulletIds.add(bullet.id);
        }
        hazard.hp -= bullet.damage;
        emitAudio(state, { type: 'asteroidHit' });
        burstParticles(state, hazard.position, hazard.kind === 'survivalHunter' ? 7 : 8, getHazardParticleSpread(hazard));
        if (hazard.hp <= 0) {
          destroyedHazardIds.add(hazard.id);
          burstParticles(state, hazard.position, hazard.kind === 'survivalHunter' ? 16 : 18, getHazardExplosionSpread(hazard));
        }
        break;
      }

      if (destroyedBulletIds.has(bullet.id)) {
        continue;
      }

      if (state.saucer && distance(bullet.position, state.saucer.position) < bullet.radius + state.saucer.radius) {
        destroyedBulletIds.add(bullet.id);
        state.saucer.alive = false;
        const saucerReward = Math.round(
          balance.saucer.rewardMoney *
          (state.saucer.kind === 'elite' ? balance.saucer.elite.rewardMoneyMultiplier : 1) *
          getAchievementMultiplier(state.progression, 'money')
        );
        state.money += saucerReward;
        recordMoneyEarned(state.progression, saucerReward);
        state.progression.achievementStats.saucersDestroyed += 1;
        emitAudio(state, { type: 'saucerDestroyed' });
        burstParticles(state, state.saucer.position, 18, 190);
      }
    } else {
      if (tryRicochetBulletOffAsteroid(state, bullet, nextAsteroids, destroyedAsteroidIds, destroyedBulletIds)) {
        continue;
      }

      if (!(state.ship.alive && state.ship.invulnerableFor <= 0 && distance(bullet.position, state.ship.position) < bullet.radius + getShipThreatRadius(state))) {
        continue;
      }

      destroyedBulletIds.add(bullet.id);
      if (absorbShieldBubbleHit(state, bullet.position, 90)) {
        continue;
      }
      damageShip(state, bullet.damage);
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
    const detonatedHazardIds = new Set<number>();
    for (const hazard of nextHazards) {
      if (destroyedHazardIds.has(hazard.id)) {
        continue;
      }
      if (hazard.armFor > 0 || distance(state.ship.position, hazard.position) >= getShipThreatRadius(state) + hazard.radius) {
        continue;
      }

      detonatedHazardIds.add(hazard.id);
      destroyedHazardIds.add(hazard.id);
      repelShipFromContact(state, hazard.position, getShipThreatRadius(state) + hazard.radius, balance.collisions.enemyContactKnockback);
      burstParticles(state, hazard.position, hazard.kind === 'proximityMine' ? 26 : 18, getHazardExplosionSpread(hazard));
      if (!absorbShieldBubbleHit(state, hazard.position, 90)) {
        damageShip(state, hazard.damage);
      }
      break;
    }
    if (detonatedHazardIds.size > 0) {
      state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
    }

    if (!state.ship.alive) {
      state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'respawning' || !asteroid.bossType));
      state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
      state.bullets = state.bullets.filter((bullet) => !destroyedBulletIds.has(bullet.id));
      return;
    }

    for (const asteroid of nextAsteroids) {
      if (
        !destroyedAsteroidIds.has(asteroid.id) &&
        !deflectedAsteroidIds.has(asteroid.id) &&
        asteroidHitsShipOrShield(state, asteroid)
      ) {
        collideShipWithAsteroid(state, asteroid, destroyedAsteroidIds, nextAsteroids);
        deflectedAsteroidIds.add(asteroid.id);
        break;
      }
    }

    if (state.saucer && distance(state.ship.position, state.saucer.position) < state.ship.radius + state.saucer.radius) {
      repelShipFromContact(state, state.saucer.position, state.ship.radius + state.saucer.radius, balance.collisions.enemyContactKnockback);
      state.saucer.alive = false;
      damageShip(state, balance.saucer.collisionDamage);
    }
  }

  state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'respawning' || !asteroid.bossType));
  state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
  state.bullets = state.bullets.filter((bullet) => !destroyedBulletIds.has(bullet.id));
};

const tryRicochetBulletOffAsteroid = (
  state: GameState,
  bullet: GameState['bullets'][number],
  nextAsteroids: GameState['asteroids'],
  destroyedAsteroidIds: Set<number>,
  destroyedBulletIds: Set<number>
): boolean => {
  if (bullet.kind !== 'ricochet' || bullet.owner !== 'boss') {
    return false;
  }

  for (const asteroid of nextAsteroids) {
    if (asteroid.bossType || destroyedAsteroidIds.has(asteroid.id)) {
      continue;
    }

    const hitRadius = bullet.radius + asteroid.radius * balance.asteroids.bulletHitRadiusMultiplier;
    if (distance(bullet.position, asteroid.position) > hitRadius) {
      continue;
    }

    if (bullet.ricochetLeft <= 0) {
      destroyedBulletIds.add(bullet.id);
      burstParticles(state, bullet.position, 7, asteroid.radius * 0.8);
      return true;
    }

    const normal = normalize({
      x: bullet.position.x - asteroid.position.x,
      y: bullet.position.y - asteroid.position.y
    });
    const fallbackNormal = Math.hypot(normal.x, normal.y) === 0
      ? normalize({ x: -bullet.velocity.x || 1, y: -bullet.velocity.y })
      : normal;
    const dot = bullet.velocity.x * fallbackNormal.x + bullet.velocity.y * fallbackNormal.y;
    bullet.velocity = {
      x: bullet.velocity.x - 2 * dot * fallbackNormal.x,
      y: bullet.velocity.y - 2 * dot * fallbackNormal.y
    };
    bullet.position = {
      x: asteroid.position.x + fallbackNormal.x * (hitRadius + 3),
      y: asteroid.position.y + fallbackNormal.y * (hitRadius + 3)
    };
    bullet.ricochetLeft -= 1;
    emitAudio(state, { type: 'asteroidHit' });
    burstParticles(state, bullet.position, 8, asteroid.radius);
    return true;
  }

  return false;
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

  if (absorbShieldBubbleHit(state, asteroid.position, asteroid.radius * 2.4)) {
    repelAsteroidFromShip(state, asteroid);
    return;
  }

  repelShipFromContact(
    state,
    asteroid.position,
    getShipThreatRadius(state) + asteroid.radius * balance.asteroids.collisionRadiusMultiplier,
    asteroid.bossType ? balance.collisions.enemyContactKnockback : balance.collisions.shipContactKnockback
  );
  damageShip(state, getAsteroidContactDamage(state, asteroid));
};

const getAsteroidContactDamage = (state: GameState, asteroid: GameState['asteroids'][number]): number =>
  Math.round(balance.collisions.asteroidDamage[asteroid.size] * getZoneAsteroidDamageMultiplier(state));

const getShipThreatRadius = (state: GameState): number =>
  state.shieldBubble.active && !state.shieldBubble.broken
    ? state.ship.radius + balance.ship.shieldBubbleRadius
    : state.ship.radius;

const getHazardParticleSpread = (hazard: GameState['hazards'][number]): number =>
  hazard.kind === 'proximityMine' ? balance.survival.mines.explosionParticleSpread * 0.52 : hazard.radius * 6;

const getHazardExplosionSpread = (hazard: GameState['hazards'][number]): number =>
  hazard.kind === 'proximityMine' ? balance.survival.mines.explosionParticleSpread : hazard.radius * 9;

const asteroidHitsShipOrShield = (state: GameState, asteroid: GameState['asteroids'][number]): boolean =>
  distance(state.ship.position, asteroid.position) <
  getShipThreatRadius(state) + asteroid.radius * balance.asteroids.collisionRadiusMultiplier;

const absorbShieldBubbleHit = (state: GameState, hitPosition: Vec2, particleSpread: number): boolean => {
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

const repelShipFromContact = (state: GameState, contactPosition: Vec2, minimumDistance: number, knockback: number): void => {
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
  if (!asteroid.bossType && state.progression.unlockedZoneIndex === 0) {
    state.progression.firstGateAsteroidsDestroyed += 1;
  }
  if (!asteroid.bossType && state.progression.unlockedZoneIndex > 0) {
    state.progression.bossDiscovery.rareBossProgress += 1;
  }
  if (asteroid.bossType && asteroid.bossZoneIndex !== undefined) {
    const unlockedZone = getZoneByIndex(asteroid.bossZoneIndex);
    state.progression.unlockedZoneIndex = Math.max(state.progression.unlockedZoneIndex, asteroid.bossZoneIndex);
    state.progression.travelLevel = state.progression.unlockedZoneIndex;
    state.progression.mapUnlocked = true;
    state.progression.bossDefeats += 1;
    state.progression.bossDiscovery.rareBossProgress = 0;
    queueBossRewardChoices(state);
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
