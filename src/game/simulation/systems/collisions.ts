import { getAchievementMultiplier, recordMoneyEarned } from '../../progression/achievements';
import {
  emitShipUnlock,
  recordAsteroidBurstUnlockProgress,
  recordMeteorImpactUnlockProgress,
  syncShipUnlocks
} from '../../progression/shipUnlocks';
import type { GameState } from '../types';
import { distance } from '../vector';
import { burstParticles } from './particles';
import { emitAudio } from '../events';
import { balance } from '../../balance';
import { isSurvivalTimedEventActive } from './survivalEvents';
import { damageShip } from './playerDamage';
import { destroyAsteroid } from './asteroidDestruction';
import { updateLevelShockwaves } from './levelShockwaves';
import { applyProjectileBurn, spawnKillFragments, updateProjectileBurns } from './projectileCardEffects';
import { updateEmberFlameWaves } from './shipAura';
import { getHazardExplosionSpread, getHazardParticleSpread } from './hazardEffects';
import {
  absorbShieldBubbleHit,
  asteroidHitsDeflector,
  asteroidHitsShipOrShield,
  collideDeflectorWithAsteroid,
  collideShipWithAsteroid,
  getMeteorHit,
  getShipThreatRadius,
  isNearShip,
  repelShipFromContact
} from './shipContact';
import { bounceBulletOffAsteroid, explodeFlak, explodeMissile, tryRicochetBulletOffAsteroid } from './projectileImpacts';

export const resolveCollisions = (state: GameState, dt = 0): void => {
  const asteroidDestroyCountBefore = state.progression.achievementStats.asteroidsDestroyed;
  const nextAsteroids = [...state.asteroids];
  const nextHazards = [...state.hazards];
  const nextBossMinions = [...state.bossMinions];
  const destroyedAsteroidIds = new Set<number>();
  const destroyedHazardIds = new Set<number>();
  const destroyedBossMinionIds = new Set<number>();
  const destroyedBulletIds = new Set<number>();
  const deflectedAsteroidIds = new Set<number>();

  // New fragments begin colliding on the next simulation step.
  for (const bullet of [...state.bullets]) {
    if (bullet.owner === 'player' || bullet.owner === 'drone') {
      for (const asteroid of nextAsteroids) {
        const hitRadius = bullet.radius + asteroid.radius * balance.asteroids.bulletHitRadiusMultiplier;
        if (!destroyedAsteroidIds.has(asteroid.id) && !bullet.hitTargetIds?.includes(asteroid.id) && distance(bullet.position, asteroid.position) < hitRadius) {
          (bullet.hitTargetIds ??= []).push(asteroid.id);
          applyProjectileBurn(bullet, asteroid);
          if (bullet.kind === 'playerRicochet') {
            const asteroidHpBefore = Math.max(0, asteroid.hp);
            const hitDamage = bullet.damage;
            const remainingDamage = hitDamage - Math.min(hitDamage, asteroidHpBefore);
            asteroid.hp -= hitDamage;

            if (asteroid.hp <= 0) {
              destroyedAsteroidIds.add(asteroid.id);
              spawnKillFragments(state, bullet, asteroid);
              destroyAsteroid(state, asteroid, nextAsteroids);
            } else {
              emitAudio(state, { type: 'asteroidHit' });
              burstParticles(state, asteroid.position, 5, asteroid.radius * 1.6);
            }

            bullet.damage = remainingDamage;
            if (remainingDamage <= balance.weapons.hisokaRicochetMinimumDamage) {
              destroyedBulletIds.add(bullet.id);
              burstParticles(state, bullet.position, 7, asteroid.radius * 0.8);
            } else {
              bounceBulletOffAsteroid(bullet, asteroid, hitRadius);
              emitAudio(state, { type: 'asteroidHit' });
              burstParticles(state, bullet.position, 8, asteroid.radius);
            }
            break;
          }

          let hitDamage = bullet.damage;
          if (bullet.owner === 'player' && bullet.ricochetLeft > 0) {
            bounceBulletOffAsteroid(bullet, asteroid, hitRadius);
            bullet.ricochetLeft -= 1;
          } else if (bullet.pierceLeft > 0) {
            bullet.pierceLeft -= 1;
          } else {
            destroyedBulletIds.add(bullet.id);
          }
          asteroid.hp -= hitDamage;
          if (asteroid.hp <= 0) {
            destroyedAsteroidIds.add(asteroid.id);
            spawnKillFragments(state, bullet, asteroid);
            destroyAsteroid(state, asteroid, nextAsteroids);
          } else {
            emitAudio(state, { type: 'asteroidHit' });
            burstParticles(state, asteroid.position, 5, asteroid.radius * 1.6);
          }
          if (bullet.kind === 'flak') {
            explodeFlak(state, bullet.position, asteroid, nextAsteroids, destroyedAsteroidIds);
          }
          if (bullet.kind === 'missile') {
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

      for (const minion of nextBossMinions) {
        if (destroyedBossMinionIds.has(minion.id) || distance(bullet.position, minion.position) >= bullet.radius + minion.radius) {
          continue;
        }

        if (bullet.pierceLeft > 0) {
          bullet.pierceLeft -= 1;
        } else {
          destroyedBulletIds.add(bullet.id);
        }
        minion.hp -= bullet.damage;
        emitAudio(state, { type: 'asteroidHit' });
        burstParticles(state, minion.position, 6, minion.radius * 3.2);
        if (minion.hp <= 0) {
          destroyedBossMinionIds.add(minion.id);
          minion.alive = false;
          emitAudio(state, { type: 'saucerDestroyed' });
          burstParticles(state, minion.position, 14, minion.radius * 6);
        }
        break;
      }

      if (destroyedBulletIds.has(bullet.id)) {
        continue;
      }

      if (state.saucer?.alive && distance(bullet.position, state.saucer.position) < bullet.radius + state.saucer.radius) {
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

  updateProjectileBurns(state, dt, nextAsteroids, destroyedAsteroidIds);

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

    for (const event of state.survivalEvents) {
      if (event.kind === 'damageField') {
        if (
          !isSurvivalTimedEventActive(event) ||
          event.hitCooldown > 0 ||
          distance(state.ship.position, event.center) >= getShipThreatRadius(state) + event.radius
        ) {
          continue;
        }

        event.hitCooldown = balance.survival.timedEvents.damageField.hitCooldown;
        burstParticles(state, state.ship.position, 10, event.radius * 0.72);
        if (!absorbShieldBubbleHit(state, state.ship.position, 100)) {
          damageShip(state, event.damage);
        }
        break;
      }
      if (
        event.kind !== 'meteorLane' ||
        !isSurvivalTimedEventActive(event) ||
        event.hitCooldown > 0
      ) {
        continue;
      }

      const hitMeteor = getMeteorHit(state, event);
      if (!hitMeteor) {
        continue;
      }

      const contactPosition = {
        x: hitMeteor.position.x - event.direction.x * hitMeteor.radius,
        y: hitMeteor.position.y - event.direction.y * hitMeteor.radius
      };
      event.hitCooldown = balance.survival.timedEvents.meteorLane.hitCooldown;
      repelShipFromContact(
        state,
        contactPosition,
        getShipThreatRadius(state) + hitMeteor.radius,
        balance.collisions.meteorContactKnockback
      );
      burstParticles(state, hitMeteor.position, 18, event.width * 0.9);
      if (!absorbShieldBubbleHit(state, hitMeteor.position, 120)) {
        damageShip(state, event.damage);
      }
      recordMeteorImpactUnlockProgress(state);
      break;
    }

    if (!state.ship.alive) {
      syncCollisionShipUnlocks(state, asteroidDestroyCountBefore);
      state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'ended' || !asteroid.bossType));
      state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
      state.bossMinions = getNextBossMinions(state, nextAsteroids, nextBossMinions, destroyedAsteroidIds, destroyedBossMinionIds);
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

    if (state.saucer?.alive && distance(state.ship.position, state.saucer.position) < state.ship.radius + state.saucer.radius) {
      repelShipFromContact(state, state.saucer.position, state.ship.radius + state.saucer.radius, balance.collisions.enemyContactKnockback);
      state.saucer.alive = false;
      damageShip(state, balance.saucer.collisionDamage);
    }

    for (const minion of nextBossMinions) {
      if (destroyedBossMinionIds.has(minion.id) || distance(state.ship.position, minion.position) >= getShipThreatRadius(state) + minion.radius) {
        continue;
      }

      repelShipFromContact(state, minion.position, getShipThreatRadius(state) + minion.radius, balance.collisions.enemyContactKnockback);
      destroyedBossMinionIds.add(minion.id);
      minion.alive = false;
      burstParticles(state, minion.position, 14, minion.radius * 5);
      damageShip(state, minion.damage);
      break;
    }
  }

  state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'ended' || !asteroid.bossType));
  state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
  state.bossMinions = getNextBossMinions(state, nextAsteroids, nextBossMinions, destroyedAsteroidIds, destroyedBossMinionIds);
  if (state.ship.alive) {
    updateEmberFlameWaves(state, dt, destroyedAsteroidIds, destroyedHazardIds, destroyedBossMinionIds, nextAsteroids, nextHazards, nextBossMinions);
    updateLevelShockwaves(state, dt, destroyedAsteroidIds, nextAsteroids);
  }
  state.asteroids = nextAsteroids.filter((asteroid) => !destroyedAsteroidIds.has(asteroid.id) && (state.phase !== 'ended' || !asteroid.bossType));
  state.hazards = nextHazards.filter((hazard) => !destroyedHazardIds.has(hazard.id));
  state.bossMinions = getNextBossMinions(state, nextAsteroids, nextBossMinions, destroyedAsteroidIds, destroyedBossMinionIds);
  state.bullets = state.bullets.filter((bullet) => !destroyedBulletIds.has(bullet.id));
  syncCollisionShipUnlocks(state, asteroidDestroyCountBefore);
};

const getNextBossMinions = (
  state: GameState,
  nextAsteroids: GameState['asteroids'],
  nextBossMinions: GameState['bossMinions'],
  destroyedAsteroidIds: Set<number>,
  destroyedBossMinionIds: Set<number>
): GameState['bossMinions'] => {
  const mothershipDestroyed = nextAsteroids.some((asteroid) =>
    asteroid.bossType === 'mothership' && destroyedAsteroidIds.has(asteroid.id)
  );
  if (mothershipDestroyed || state.phase === 'ended') {
    return [];
  }
  return nextBossMinions.filter((minion) => !destroyedBossMinionIds.has(minion.id));
};

const syncCollisionShipUnlocks = (state: GameState, asteroidDestroyCountBefore: number): void => {
  recordAsteroidBurstUnlockProgress(
    state,
    state.progression.achievementStats.asteroidsDestroyed - asteroidDestroyCountBefore
  );
  syncShipUnlocks(state, (id) => emitShipUnlock(state, id));
};
