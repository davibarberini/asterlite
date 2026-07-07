import type { GameState, Vec2 } from '../types';
import type { InputActions } from '../../input/actions';
import { createAsteroid, createPendingZoneBoss, getAsteroidSpawnPosition, getAsteroidTargetCount, hasActiveZoneBoss } from './asteroids';
import { resolveCollisions } from './collisions';
import { updateDrones } from './drones';
import { updateBosses, updatePendingBoss, updateSaucer } from './enemies';
import { updateParticles } from './particles';
import { updateRareSpawns } from './rareSpawns';
import { updateCamera, updateShipMovement } from './shipMovement';
import { updateSurvival } from './survival';
import { updateSurvivalTimedEvents } from './survivalEvents';
import { updateSurvivalHazards } from './survivalHazards';
import { updateBullets } from './weapons';
import { emitAudio, emitReward } from '../events';
import { getPrestigeMoneyMultiplier } from '../../progression/prestige';
import { getRefineryMilestoneMultiplier } from '../../progression/idleBonuses';
import { WARP_UNLOCK_DEFINITIONS, getAvailableWarpCores, getWarpUnlockNodeState } from '../../progression/warpUnlocks';
import {
  getAchievementMultiplier,
  getEffectiveMaxHp,
  recordMoneyEarned,
  syncAchievements,
  ACHIEVEMENT_BONUS_LABELS
} from '../../progression/achievements';
import {
  getDeathPenaltyMultiplier,
  getRefineryIncomeMultiplier
} from '../../progression/talentTree';
import { syncGuidedMissions } from '../../progression/guidedMissions';
import { getShipFrameBonusMultiplier } from '../../progression/shipFrames';
import { balance } from '../../balance';
import { hasShieldBubbleUnlocked } from '../state';
export const updateGame = (state: GameState, input: InputActions, dt: number): void => {
  state.width = Math.max(320, state.width);
  state.height = Math.max(320, state.height);
  state.deathPenaltyFor = Math.max(0, state.deathPenaltyFor - dt);
  state.droneRebootFor = Math.max(0, state.droneRebootFor - dt);
  updateShieldBubble(state, dt);

  updateShipMovement(state, input, dt);
  updateCamera(state, dt);
  updateIdleIncome(state, dt);
  updateDrones(state, dt);
  updateBullets(state, dt);
  updatePendingBoss(state, dt);
  updateAsteroids(state, dt);
  updateBosses(state, dt);
  updateSaucer(state, dt);
  updateParticles(state, dt);
  resolveCollisions(state);
  updateSurvival(state, dt);
  updateRareSpawns(state, dt);
  updateSurvivalTimedEvents(state, dt);
  updateSurvivalHazards(state, dt);
  updateBossDiscovery(state);
  maintainAsteroidField(state);
  syncAchievements(state.progression, (def) => {
    emitReward(state, `Conquista: ${def.name} (+${def.bonusPercent}% ${ACHIEVEMENT_BONUS_LABELS[def.bonusCategory]})`, 'achievement');
    if (def.bonusCategory === 'maxHp') {
      const effectiveMaxHp = getEffectiveMaxHp(state.progression);
      const hpGain = effectiveMaxHp - state.ship.maxHp;
      if (hpGain > 0) {
        state.ship.maxHp = effectiveMaxHp;
        state.ship.hp += hpGain;
      }
    }
  });
  syncAffordableWarpUnlockAnnouncements(state);
  syncGuidedMissions(state);
};

const syncAffordableWarpUnlockAnnouncements = (state: GameState): void => {
  const availableCores = getAvailableWarpCores(state.progression);
  const unlock = WARP_UNLOCK_DEFINITIONS.find(
    (definition) =>
      !state.progression.announcedAffordableWarpUnlockIds.includes(definition.id) &&
      getWarpUnlockNodeState(state.progression, availableCores, definition.id) === 'available'
  );

  if (!unlock) {
    return;
  }

  state.progression.announcedAffordableWarpUnlockIds = [
    ...state.progression.announcedAffordableWarpUnlockIds,
    unlock.id
  ];
  emitReward(state, `Technology available: ${unlock.title}`, 'unlock');
};

const updateBossDiscovery = (state: GameState): void => {
  if (
    state.progression.unlockedZoneIndex === 0 &&
    state.progression.firstGateAsteroidsDestroyed >= balance.bosses.firstGateAsteroids &&
    !hasActiveZoneBoss(state)
  ) {
    const pendingBoss = createPendingZoneBoss(state);
    if (!pendingBoss) {
      return;
    }

    state.pendingBoss = pendingBoss;
    emitReward(state, 'First gate boss detected', 'boss');
    emitAudio(state, { type: 'bossSummoned' });
    return;
  }

  if (
    state.progression.unlockedZoneIndex <= 0 ||
    state.progression.currentZoneIndex < state.progression.unlockedZoneIndex ||
    state.progression.bossDiscovery.rareBossProgress < balance.bosses.rareDiscoveryAsteroids ||
    hasActiveZoneBoss(state)
  ) {
    return;
  }

  const pendingBoss = createPendingZoneBoss(state);
  if (!pendingBoss) {
    return;
  }

  state.pendingBoss = pendingBoss;
  state.progression.bossDiscovery.rareBossProgress = 0;
  state.progression.bossDiscovery.rareBossesFound += 1;
  emitReward(state, `${pendingBoss.bossType === 'prism' ? 'Prism' : 'Gate'} boss signal detected`, 'boss');
  emitAudio(state, { type: 'bossSummoned' });
};

const updateShieldBubble = (state: GameState, dt: number): void => {
  state.shieldBubble.hitFlashFor = Math.max(0, state.shieldBubble.hitFlashFor - dt);

  if (!hasShieldBubbleUnlocked(state.progression)) {
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.shieldBubble.rechargeFor = 0;
    state.shieldBubble.hitFlashFor = 0;
    return;
  }

  if (!state.shieldBubble.broken) {
    state.shieldBubble.active = true;
    state.shieldBubble.rechargeFor = 0;
    return;
  }

  state.shieldBubble.rechargeFor = Math.max(0, state.shieldBubble.rechargeFor - dt);
  if (state.shieldBubble.rechargeFor <= 0) {
    state.shieldBubble.active = true;
    state.shieldBubble.broken = false;
  }
};

const updateIdleIncome = (state: GameState, dt: number): void => {
  if (!state.ship.alive) {
    return;
  }

  const deathPenaltyMultiplier = state.deathPenaltyFor > 0 ? balance.economy.deathIncomeMultiplier * getDeathPenaltyMultiplier(state.progression) : 1;
  const income =
    state.progression.passiveIncomeLevel *
    balance.economy.passiveIncomePerLevel *
    getRefineryMilestoneMultiplier(state.progression.passiveIncomeLevel) *
    getRefineryIncomeMultiplier(state.progression) *
    getPrestigeMoneyMultiplier(state.progression) *
    getShipFrameBonusMultiplier(state.progression, 'incomeMultiplier') *
    getAchievementMultiplier(state.progression, 'passive') *
    getAchievementMultiplier(state.progression, 'money') *
    deathPenaltyMultiplier *
    dt;
  state.money += income;
  recordMoneyEarned(state.progression, income);
};

const updateAsteroids = (state: GameState, dt: number): void => {
  state.asteroids.forEach((asteroid) => {
    const nextPosition = {
      x: asteroid.position.x + asteroid.velocity.x * dt,
      y: asteroid.position.y + asteroid.velocity.y * dt
    };
    asteroid.position = asteroid.bossType ? nextPosition : wrapAroundCamera(state, nextPosition, asteroid.radius);
    asteroid.rotation += asteroid.rotationSpeed * dt;
  });
};

const maintainAsteroidField = (state: GameState): void => {
  const targetCount = getAsteroidTargetCount(state);
  while (state.asteroids.length < targetCount) {
    state.asteroids.push(createAsteroid(state, 'large', getAsteroidSpawnPosition(state)));
  }
};

const wrapAroundCamera = (state: GameState, position: Vec2, margin: number): Vec2 => {
  const halfWidth = state.width / 2 + margin + balance.asteroids.wrapExtraMargin;
  const halfHeight = state.height / 2 + margin + balance.asteroids.wrapExtraMargin;
  let { x, y } = position;

  if (x < state.camera.x - halfWidth) {
    x = state.camera.x + halfWidth;
  } else if (x > state.camera.x + halfWidth) {
    x = state.camera.x - halfWidth;
  }

  if (y < state.camera.y - halfHeight) {
    y = state.camera.y + halfHeight;
  } else if (y > state.camera.y + halfHeight) {
    y = state.camera.y - halfHeight;
  }

  return { x, y };
};
