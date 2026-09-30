import type { AsteroidSize, AsteroidState, AsteroidVariant, BossType, GameState, PendingBossState, Vec2 } from '../types';
import { randomRange } from '../vector';
import { getExplorationZone, getNextZone, getZoneAsteroidHpMultiplier, getZoneRewardMultiplier } from '../zones';
import { getPrestigeMoneyMultiplier } from '../../progression/prestige';
import { getAchievementMultiplier } from '../../progression/achievements';
import { bossSuppressionAsteroidTargetMultiplier, bossSuppressionMinimumAsteroidTarget, hasWarpUnlock } from '../../progression/warpUnlocks';
import { balance } from '../../balance';
import { getSurvivalAsteroidDensityBonus, getSurvivalAsteroidSpeedMultiplier } from './survival';

const nextSize: Partial<Record<AsteroidSize, AsteroidSize>> = {
  large: 'medium',
  medium: 'small'
};

const makeShape = (points: number): number[] =>
  Array.from({ length: points }, (_, index) => {
    const dent = index % 3 === 1 ? 0.78 : 1;
    return randomRange(0.72, 1.18) * dent;
  });

const chooseAsteroidVariant = (state: GameState): AsteroidVariant => {
  const weights = balance.asteroids.variantWeights[getExplorationZone(state).id];
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = randomRange(0, totalWeight);
  for (const entry of weights) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry.variant;
    }
  }
  return 'common';
};

const getAsteroidHp = (state: GameState, size: AsteroidSize, variant: AsteroidVariant): number =>
  Math.max(
    1,
    Math.ceil(
      (balance.asteroids.hp[size] +
        (variant === 'dense' ? Math.max(1, balance.asteroids.hp[size] * balance.asteroids.denseHpBonusMultiplier) : 0)) *
        getZoneAsteroidHpMultiplier(state)
    )
  );

export const getAsteroidReward = (state: GameState, asteroid: AsteroidState): { money: number; crystals: number } => {
  const baseMoney = balance.asteroids.baseMoney[asteroid.size];
  const zoneMultiplier =
    getZoneRewardMultiplier(state) *
    getPrestigeMoneyMultiplier(state.progression) *
    getAchievementMultiplier(state.progression, 'money');
  const scaleMoney = (money: number): number => Math.max(1, Math.round(money * zoneMultiplier));
  const scaleCrystals = (crystals: number): number =>
    Math.max(0, Math.round(crystals * getAchievementMultiplier(state.progression, 'crystals')));
  if (asteroid.bossType) {
    return {
      money: scaleMoney(balance.bosses.reward.baseMoney + (asteroid.bossZoneIndex ?? 0) * balance.bosses.reward.moneyPerZone),
      crystals: scaleCrystals(balance.bosses.reward.baseCrystals + (asteroid.bossZoneIndex ?? 0) * balance.bosses.reward.crystalsPerZone)
    };
  }
  if (asteroid.variant === 'metallic') {
    return { money: scaleMoney(baseMoney * balance.asteroids.variantRewardMultiplier.metallic), crystals: 0 };
  }
  if (asteroid.variant === 'crystal') {
    const crystals = scaleCrystals(Math.max(0, Math.round(balance.asteroids.crystalReward[asteroid.size])));
    return { money: scaleMoney(baseMoney * balance.asteroids.variantRewardMultiplier.crystal), crystals: zoneMultiplier >= 1 ? crystals : 0 };
  }
  if (asteroid.variant === 'dense') {
    return { money: scaleMoney(baseMoney * balance.asteroids.variantRewardMultiplier.dense), crystals: 0 };
  }
  return { money: scaleMoney(baseMoney * balance.asteroids.variantRewardMultiplier.common), crystals: 0 };
};

export const createAsteroid = (
  state: GameState,
  size: AsteroidSize,
  position: Vec2,
  velocity?: Vec2,
  variant: AsteroidVariant = chooseAsteroidVariant(state)
): AsteroidState => {
  const [minSpeed, maxSpeed] = balance.asteroids.speed[size];
  const angle = randomRange(0, Math.PI * 2);
  const speed = randomRange(minSpeed, maxSpeed) * getSurvivalAsteroidSpeedMultiplier(state);
  const hp = getAsteroidHp(state, size, variant);

  return {
    id: state.nextId++,
    position,
    velocity: velocity ?? { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
    rotation: randomRange(0, Math.PI * 2),
    rotationSpeed: randomRange(-1.25, 1.25),
    radius: balance.asteroids.radius[size],
    size,
    variant,
    hp,
    maxHp: hp,
    shape: makeShape(size === 'large' ? 14 : size === 'medium' ? 11 : 9)
  };
};

export const hasActiveZoneBoss = (state: GameState): boolean =>
  state.pendingBoss !== null || state.asteroids.some((asteroid) => asteroid.bossType !== undefined);

export const createPendingBoss = (state: GameState, bossType: BossType, bossZoneIndex: number): PendingBossState | null => {
  if (hasActiveZoneBoss(state)) {
    return null;
  }

  const angle = randomRange(0, Math.PI * 2);
  const distance = Math.max(state.width, state.height) * balance.bosses.spawnDistanceScreenMultiplier;
  const position = {
    x: state.camera.x + Math.cos(angle) * distance,
    y: state.camera.y + Math.sin(angle) * distance
  };
  const movementAngle = angle + Math.PI + randomRange(-balance.bosses.movementAngleJitter, balance.bosses.movementAngleJitter);
  const bossStats = balance.bosses.stats[bossType];
  const speed = bossStats.spawnSpeedBase + bossZoneIndex * bossStats.spawnSpeedPerZone;

  return {
    bossType,
    bossZoneIndex,
    spawnIn: balance.bosses.pendingSpawnIn,
    position,
    velocity: {
      x: Math.cos(movementAngle) * speed,
      y: Math.sin(movementAngle) * speed
    }
  };
};

export const createPendingZoneBoss = (state: GameState): PendingBossState | null => {
  const nextZone = getNextZone(state);
  if (!nextZone) {
    return null;
  }
  return createPendingBoss(state, nextZone.bossType, nextZone.index);
};

export const createZoneBossFromPending = (state: GameState, pendingBoss: PendingBossState): AsteroidState => {
  const bossType = pendingBoss.bossType;
  const bossZoneIndex = pendingBoss.bossZoneIndex;
  const bossStats = balance.bosses.stats[bossType];
  const hp = bossStats.hpBase + bossZoneIndex * bossStats.hpPerZone;

  return {
    id: state.nextId++,
    position: { ...pendingBoss.position },
    velocity: { ...pendingBoss.velocity },
    rotation: Math.atan2(pendingBoss.velocity.y, pendingBoss.velocity.x),
    rotationSpeed: bossStats.rotationSpeed,
    radius: bossStats.radius,
    size: 'large',
    variant: 'dense',
    hp,
    maxHp: hp,
    shape: makeShape(bossStats.shapePoints),
    bossType,
    bossZoneIndex,
    bossFireCooldown: bossStats.initialFireCooldown
  };
};

export const isBossAsteroidSuppressionActive = (state: GameState): boolean =>
  hasWarpUnlock(state.progression, 'bossSuppression') && hasActiveZoneBoss(state);

export const getAsteroidTargetCount = (state: GameState): number => {
  const baseTarget = Math.max(
    balance.asteroids.targetCount.min,
    Math.min(
      balance.asteroids.targetCount.max,
      Math.floor((state.width * state.height) / balance.asteroids.targetCount.pixelsPerAsteroid) +
        getExplorationZone(state).asteroidDensityBonus +
        getSurvivalAsteroidDensityBonus(state)
    )
  );
  if (!isBossAsteroidSuppressionActive(state)) {
    return baseTarget;
  }
  return Math.max(bossSuppressionMinimumAsteroidTarget, Math.floor(baseTarget * bossSuppressionAsteroidTargetMultiplier));
};

export const getAsteroidSpawnPosition = (state: GameState, margin = balance.asteroids.spawnMargin): Vec2 => {
  const edge = Math.floor(randomRange(0, 4));
  return edge === 0
    ? { x: state.camera.x + randomRange(-state.width / 2, state.width / 2), y: state.camera.y - state.height / 2 - margin }
    : edge === 1
      ? { x: state.camera.x + state.width / 2 + margin, y: state.camera.y + randomRange(-state.height / 2, state.height / 2) }
      : edge === 2
        ? { x: state.camera.x + randomRange(-state.width / 2, state.width / 2), y: state.camera.y + state.height / 2 + margin }
        : { x: state.camera.x - state.width / 2 - margin, y: state.camera.y + randomRange(-state.height / 2, state.height / 2) };
};

export const createAsteroidField = (state: GameState, count = getAsteroidTargetCount(state)): AsteroidState[] =>
  Array.from({ length: count }, () => createAsteroid(state, 'large', getAsteroidSpawnPosition(state)));

export const createStartingAsteroidField = (state: GameState): AsteroidState[] => {
  if (state.progression.currentZoneIndex !== 0) return createAsteroidField(state);
  const count = Math.min(balance.opening.visibleAsteroidCount, getAsteroidTargetCount(state));
  const radius = Math.min(
    balance.opening.asteroidOrbitRadius,
    Math.min(state.width, state.height) / 2 - balance.opening.viewportPadding
  );
  // Slow tangential motion keeps the first targets visible without aiming them at the spawn.
  const targets = Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / count;
    return createAsteroid(state, index < 2 ? 'small' : 'medium', {
      x: state.ship.position.x + Math.cos(angle) * radius,
      y: state.ship.position.y + Math.sin(angle) * radius
    }, {
      x: -Math.sin(angle) * balance.opening.asteroidSpeed,
      y: Math.cos(angle) * balance.opening.asteroidSpeed
    }, 'common');
  });
  return [...targets, ...createAsteroidField(state, getAsteroidTargetCount(state) - count)];
};

export const splitAsteroid = (state: GameState, asteroid: AsteroidState): AsteroidState[] => {
  if (asteroid.bossType) {
    return [];
  }

  const childSize = nextSize[asteroid.size];
  if (!childSize) {
    return [];
  }

  const baseAngle = Math.atan2(asteroid.velocity.y, asteroid.velocity.x);
  return [-0.75, 0.75].map((offset) => {
    const speedBoost = balance.asteroids.splitSpeedBoost[childSize] ?? 0;
    const angle = baseAngle + offset + randomRange(-0.28, 0.28);
    return createAsteroid(state, childSize, { ...asteroid.position }, {
      x: Math.cos(angle) * speedBoost + asteroid.velocity.x * balance.asteroids.splitVelocityInheritance,
      y: Math.sin(angle) * speedBoost + asteroid.velocity.y * balance.asteroids.splitVelocityInheritance
    }, asteroid.variant);
  });
};
