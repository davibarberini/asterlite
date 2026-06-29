import type { AsteroidSize, AsteroidVariant, BossType, DroneType } from './simulation/types';

export const balance = {
  economy: {
    passiveIncomePerLevel: 1.25,
    passiveCost: { base: 45, scale: 1.12 },
    mapUnlockCost: 260,
    bossCrystalCost: { base: 2, perZone: 2 },
    deathIncomeMultiplier: 0.35,
    maxOfflineSeconds: 8 * 60 * 60,
    prestige: {
      crystalsPerCore: 10,
      bonusPerCore: 0.08,
      minimumTravelLevel: 1
    }
  },
  shop: {
    upgradeBaseCap: 500,
    drones: {
      sentry: { label: 'Semi-Auto', baseCost: 260, scale: 1.48 },
      ranger: { label: 'Shotgun', baseCost: 380, scale: 1.52 },
      breaker: { label: 'Missile', baseCost: 520, scale: 1.58 }
    } satisfies Record<DroneType, { label: string; baseCost: number; scale: number }>,
    ship: {
      hp: { baseCost: 80, scale: 1.12, gain: 25 },
      armor: { baseCost: 240, scale: 1.72, gain: 5 },
      damage: { baseCost: 55, scale: 1.14 },
      fireRate: { baseCost: 70, scale: 1.13, bonusPercentPerLevel: 4, minimumInterval: 0.045 },
      speed: { baseCost: 160, scale: 1.68, bonusPercentPerLevel: 12 },
      deflector: { baseCost: 320, scale: 1.78 },
      spreadShotCost: 620,
      piercingRoundsCost: 840
    }
  },
  ship: {
    radius: 14,
    startingInvulnerableFor: 2,
    respawnDelay: 4.2,
    turnSpeed: 4.25,
    thrust: 280,
    drag: 0.993,
    maxSpeed: 410,
    speedBonusPerLevel: 0.12,
    pointerArrivalRadius: 34,
    pointerBrakeRadius: 72,
    slingshotDeadzone: 0.08,
    hyperspaceInterval: 4,
    shieldBubbleRechargeSeconds: 9,
    shieldBubbleHitFlashSeconds: 0.32,
    shieldBubbleGraceSeconds: 0.22,
    shieldBubbleRadius: 34
  },
  drones: {
    orbitSpeed: 1.85,
    baseTargetRange: 560,
    maxShotsPerFrame: 4,
    maxBullets: 180,
    maxTargetChecksPerFrame: 18,
    orbitRadius: {
      sentry: 42,
      ranger: 68,
      breaker: 54
    } satisfies Record<DroneType, number>,
    orbitRadiusStep: 12,
    initialFireCooldown: { base: 0.25, step: 0.12, cycle: 5 },
    fireCooldownJitter: { step: 0.018, cycle: 7 },
    fireInterval: {
      sentry: 0.68,
      ranger: 1.05,
      breaker: 1.42
    } satisfies Record<DroneType, number>,
    targetRangeOffset: {
      sentry: 0,
      ranger: -120,
      breaker: 80
    } satisfies Record<DroneType, number>
  },
  weapons: {
    bulletSpeed: 540,
    droneBulletSpeed: 430,
    playerFireInterval: 0.16,
    spreadFireInterval: 0.24,
    spreadAngleOffsets: [-0.18, 0, 0.18],
    spreadSpeedMultiplier: 0.96,
    piercingSpeedMultiplier: 1.05,
    piercingCooldownMultiplier: 1.18,
    piercingCount: 1,
    bulletCullMargin: 24,
    missileTurnRate: 5.5,
    spawnOffset: 18,
    radius: {
      player: 2.8,
      drone: 2.4,
      saucer: 3.4,
      boss: 4.2,
      missile: 3.2,
      ricochet: 4.6
    },
    droneSpeedMultiplier: {
      sentry: 1,
      ranger: 0.9,
      breaker: 0.82
    } satisfies Record<DroneType, number>
  },
  asteroids: {
    radius: {
      large: 52,
      medium: 31,
      small: 18
    } satisfies Record<AsteroidSize, number>,
    speed: {
      large: [32, 78],
      medium: [58, 124],
      small: [92, 178]
    } satisfies Record<AsteroidSize, [number, number]>,
    baseMoney: {
      large: 20,
      medium: 50,
      small: 100
    } satisfies Record<AsteroidSize, number>,
    hp: {
      large: 3,
      medium: 2,
      small: 1
    } satisfies Record<AsteroidSize, number>,
    variantRewardMultiplier: {
      common: 1,
      metallic: 2.25,
      crystal: 0.65,
      dense: 1.75
    } satisfies Record<AsteroidVariant, number>,
    crystalReward: {
      large: 2,
      medium: 1,
      small: 1
    } satisfies Record<AsteroidSize, number>,
    denseHpBonusMultiplier: 1,
    spawnMargin: 90,
    targetCount: { min: 9, max: 24, pixelsPerAsteroid: 85000 },
    wrapExtraMargin: 80,
    splitSpeedBoost: {
      large: 0,
      medium: 92,
      small: 132
    } satisfies Record<AsteroidSize, number>,
    splitVelocityInheritance: 0.35,
    collisionRadiusMultiplier: 0.78,
    bulletHitRadiusMultiplier: 0.82,
    variantWeights: {
      lyraGate: [
        { variant: 'common', weight: 74 },
        { variant: 'metallic', weight: 18 },
        { variant: 'crystal', weight: 0 },
        { variant: 'dense', weight: 8 }
      ],
      orionForge: [
        { variant: 'common', weight: 42 },
        { variant: 'metallic', weight: 34 },
        { variant: 'crystal', weight: 8 },
        { variant: 'dense', weight: 16 }
      ],
      vegaDrift: [
        { variant: 'common', weight: 38 },
        { variant: 'metallic', weight: 14 },
        { variant: 'crystal', weight: 34 },
        { variant: 'dense', weight: 14 }
      ],
      cygnusReef: [
        { variant: 'common', weight: 28 },
        { variant: 'metallic', weight: 24 },
        { variant: 'crystal', weight: 16 },
        { variant: 'dense', weight: 32 }
      ],
      novaCrown: [
        { variant: 'common', weight: 22 },
        { variant: 'metallic', weight: 26 },
        { variant: 'crystal', weight: 18 },
        { variant: 'dense', weight: 34 }
      ]
    } satisfies Record<string, { variant: AsteroidVariant; weight: number }[]>
  },
  bosses: {
    firstGateAsteroids: 24,
    pendingSpawnIn: 3,
    spawnDistanceScreenMultiplier: 0.72,
    movementAngleJitter: 0.2,
    shipCollisionDamage: 24,
    ricochetBounces: 3,
    reward: { baseMoney: 260, moneyPerZone: 180, baseCrystals: 2, crystalsPerZone: 1 },
    stats: {
      sentinel: {
        spawnSpeedBase: 106,
        spawnSpeedPerZone: 12,
        chaseSpeedBase: 104,
        chaseSpeedPerZone: 11,
        hpBase: 16,
        hpPerZone: 20,
        radius: 64,
        rotationSpeed: 1.5,
        shapePoints: 16,
        initialFireCooldown: 0.7,
        fireCooldownBase: 1.28,
        fireCooldownMin: 0.52,
        fireCooldownPerZone: 0.09,
        bulletSpeed: 285,
        bulletDamage: 18,
        bulletAngleOffsets: [-0.16, 0, 0.16]
      },
      crusher: {
        spawnSpeedBase: 76,
        spawnSpeedPerZone: 11,
        chaseSpeedBase: 74,
        chaseSpeedPerZone: 10,
        hpBase: 20,
        hpPerZone: 16,
        radius: 76,
        rotationSpeed: -0.8,
        shapePoints: 18,
        initialFireCooldown: 1.1,
        fireCooldownBase: 1.7,
        fireCooldownMin: 0.72,
        fireCooldownPerZone: 0.11,
        bulletSpeed: 230,
        bulletDamage: 22,
        bulletAngleOffsets: [-0.34, 0.34]
      },
      prism: {
        spawnSpeedBase: 92,
        spawnSpeedPerZone: 10,
        chaseSpeedBase: 88,
        chaseSpeedPerZone: 9,
        hpBase: 24,
        hpPerZone: 18,
        radius: 70,
        rotationSpeed: 1.1,
        shapePoints: 12,
        initialFireCooldown: 0.85,
        fireCooldownBase: 1.38,
        fireCooldownMin: 0.62,
        fireCooldownPerZone: 0.08,
        bulletSpeed: 270,
        bulletDamage: 16,
        bulletAngleOffsets: [-0.28, 0, 0.28]
      }
    } satisfies Record<BossType, {
      spawnSpeedBase: number;
      spawnSpeedPerZone: number;
      chaseSpeedBase: number;
      chaseSpeedPerZone: number;
      hpBase: number;
      hpPerZone: number;
      radius: number;
      rotationSpeed: number;
      shapePoints: number;
      initialFireCooldown: number;
      fireCooldownBase: number;
      fireCooldownMin: number;
      fireCooldownPerZone: number;
      bulletSpeed: number;
      bulletDamage: number;
      bulletAngleOffsets: number[];
    }>
  },
  saucer: {
    bulletDamage: 22,
    collisionDamage: 35,
    rewardMoney: 200,
    spawnOffsetX: 0.56,
    spawnMinY: -0.32,
    spawnMaxY: 0.22,
    speedX: [70, 120],
    speedY: [-25, 25],
    radius: 18,
    initialFireCooldown: 1.2,
    aimJitter: 65,
    bulletSpeed: 320,
    fireCooldown: [1.1, 1.8],
    despawnDistanceMultiplier: 0.9,
    respawnTimer: [12, 22],
    initialTimer: 18
  },
  collisions: {
    flakSplashRadius: 82,
    flakSplashDamageMultiplier: 0.45,
    asteroidDamage: {
      large: 45,
      medium: 30,
      small: 18
    } satisfies Record<AsteroidSize, number>,
    repairCostPerMaxHp: 0.4,
    repairZoneMultiplierPerIndex: 0.45,
    deathPenaltyBaseSeconds: 18,
    deathPenaltySecondsPerZone: 8,
    deflectorArcDot: 0.38
  }
} as const;
