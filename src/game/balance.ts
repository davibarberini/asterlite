import type { AsteroidSize, AsteroidVariant, BossType, DroneType } from './simulation/types';

export const balance = {
  economy: {
    offlineIncome: {
      baseCost: 45,
      scale: 1.035,
      buildEfficiency: 0.001,
      levelBonus: 0.08
    },
    mapUnlockCost: 260,
    maxOfflineSeconds: 8 * 60 * 60,
    prestige: {
      crystalsPerCore: 12,
      bonusPerCore: 0.08,
      minimumTravelLevel: 1
    }
  },
  shop: {
    upgradeBaseCap: 500,
    drones: {
      sentry: { label: 'Semi-Auto', baseCost: 600, scale: 2 },
      ranger: { label: 'Shotgun', baseCost: 700, scale: 2 },
      breaker: { label: 'Missile', baseCost: 800, scale: 2 }
    } satisfies Record<DroneType, { label: string; baseCost: number; scale: number }>,
    ship: {
      hp: { baseCost: 70, scale: 1.0335, gain: 25 },
      armor: { baseCost: 240, scale: 1.72, gain: 5 },
      damage: { baseCost: 40, scale: 1.036 },
      fireRate: { baseCost: 55, scale: 1.034, bonusPercentPerLevel: 7, minimumInterval: 0.02 },
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
    thrust: 134,
    drag: 0.993,
    maxSpeed: 197,
    speedBonusPerLevel: 0.12,
    pointerArrivalRadius: 34,
    pointerBrakeRadius: 72,
    swipeImpulseDeadzone: 42,
    swipeImpulseMaxDrag: 190,
    swipeImpulseMinSpeed: 79,
    swipeImpulseMaxSpeed: 205,
    shieldBubbleRechargeSeconds: 9,
    shieldBubbleHitFlashSeconds: 0.32,
    shieldBubbleGraceSeconds: 0.22,
    shieldBubbleRadius: 34,
    phaseShieldCooldownSeconds: 8,
    phaseShieldInvulnerableSeconds: 1.35,
    phaseShieldFlashSeconds: 0.48,
    phaseShieldRadius: 42,
    phaseShieldParticleSpread: 150
  },
  survival: {
    threatLevelSeconds: 30,
    asteroidDensityPerThreat: 1,
    maxAsteroidDensityBonus: 12,
    asteroidSpeedPerThreat: 0.055,
    maxAsteroidSpeedMultiplier: 1.75,
    mines: {
      startsAtThreatLevel: 3,
      maxCount: 5,
      spawnInterval: 5.5,
      spawnIntervalThreatReduction: 0.32,
      minimumSpawnInterval: 2.8,
      speed: [14, 34],
      radius: 60,
      visualRadius: 4,
      armSeconds: 1.1,
      fuseSeconds: 6,
      damage: 34,
      explosionParticleSpread: 780,
      spawnMargin: 110
    },
    hunters: {
      startsAtThreatLevel: 5,
      maxCount: 2,
      spawnInterval: 11,
      spawnIntervalThreatReduction: 0.55,
      minimumSpawnInterval: 6,
      speed: 104,
      weaveSpeed: 4.8,
      weaveStrength: 0.52,
      radius: 12,
      trailLength: 56,
      hp: 3,
      damage: 24,
      spawnMargin: 130
    },
    timedEvents: {
      meteorLane: {
        startsAtThreatLevel: 4,
        spawnInterval: 10.5,
        spawnIntervalThreatReduction: 0.48,
        minimumSpawnInterval: 5.4,
        warningSeconds: 2,
        activeSeconds: 6.2,
        width: 190,
        lengthMultiplier: 3.05,
        damage: 28,
        hitCooldown: 1.1,
        threatLevelsPerExtraLane: 3,
        maxConcurrentLanes: 4,
        meteorCount: [18, 26],
        minimumMeteorSpeed: 840,
        meteorSpawnGap: 0.22,
        smallMeteorRadius: [12, 19],
        mediumMeteorRadius: [22, 36],
        smallMeteorChance: 0.48
      },
      gravityPulse: {
        startsAtThreatLevel: 6,
        maxCount: 3,
        threatLevelsPerExtraWell: 5,
        spawnInterval: 5,
        spawnIntervalThreatReduction: 0.18,
        minimumSpawnInterval: 2.6,
        radius: 380,
        force: 430,
        spawnDistance: [650, 1320],
        despawnDistance: 2150
      },
      damageField: {
        startsAtThreatLevel: 7,
        maxCount: 4,
        threatLevelsPerExtraField: 4,
        spawnInterval: 3.6,
        spawnIntervalThreatReduction: 0.12,
        minimumSpawnInterval: 2,
        radius: 945,
        damage: 18,
        hitCooldown: 0.85,
        spawnDistance: [1100, 2200],
        despawnDistance: 3400
      }
    }
  },
  rareSpawns: {
    proximityMine: {
      startsAtZoneIndex: 2,
      maxCount: 1,
      initialCooldown: 16,
      interval: [24, 38]
    }
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
    playerDamageMultiplier: 1,
    playerFireInterval: 0.8,
    spreadCooldownMultiplier: 1.15,
    spreadDamageMultiplier: 0.4,
    spreadAngleOffsets: [-0.18, 0, 0.18],
    spreadSpeedMultiplier: 0.96,
    piercingSpeedMultiplier: 1.05,
    piercingCooldownMultiplier: 1.18,
    piercingCount: 1,
    auraRadius: 96,
    auraDamagePerSecondMultiplier: 0.55,
    velocityDamageBonusAtMaxSpeed: 0.75,
    velocityFireRateBonusAtMaxSpeed: 0.42,
    ramDamageMultiplier: 1.35,
    ramContactDamageMultiplier: 0.58,
    ramKnockbackMultiplier: 1.25,
    nivitronTurretCooldownMultiplier: 1.32,
    nivitronTurretDamageMultiplier: 0.9,
    nivitronTurretStepAngle: Math.PI / 18,
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
      large: 3,
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
    rareDiscoveryAsteroids: 54,
    pendingSpawnIn: 3,
    spawnDistanceScreenMultiplier: 0.72,
    movementAngleJitter: 0.2,
    shipCollisionDamage: 24,
    ricochetBounces: 3,
    reward: { baseMoney: 260, moneyPerZone: 180, baseCrystals: 3, crystalsPerZone: 1 },
    stats: {
      sentinel: {
        spawnSpeedBase: 106,
        spawnSpeedPerZone: 12,
        chaseSpeedBase: 104,
        chaseSpeedPerZone: 11,
        hpBase: 24,
        hpPerZone: 24,
        radius: 74,
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
        spawnSpeedBase: 86,
        spawnSpeedPerZone: 12,
        chaseSpeedBase: 92,
        chaseSpeedPerZone: 12,
        hpBase: 26,
        hpPerZone: 18,
        radius: 92,
        rotationSpeed: -0.8,
        shapePoints: 18,
        initialFireCooldown: 1.1,
        fireCooldownBase: 1.85,
        fireCooldownMin: 0.8,
        fireCooldownPerZone: 0.11,
        bulletSpeed: 250,
        bulletDamage: 24,
        bulletAngleOffsets: [-0.52, -0.22, 0.22, 0.52]
      },
      prism: {
        spawnSpeedBase: 92,
        spawnSpeedPerZone: 10,
        chaseSpeedBase: 88,
        chaseSpeedPerZone: 9,
        hpBase: 30,
        hpPerZone: 22,
        radius: 80,
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
    initialTimer: 18,
    elite: {
      startsAtSurvivalThreatLevel: 6,
      radius: 22,
      bulletDamage: 18,
      bulletSpeed: 350,
      fireCooldown: [0.95, 1.35],
      bulletAngleOffsets: [-0.32, 0, 0.32],
      rewardMoneyMultiplier: 2.4
    }
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
    deflectorArcDot: 0.38,
    shipContactSeparationPadding: 4,
    shipContactKnockback: 190,
    enemyContactKnockback: 240,
    meteorContactKnockback: 360
  }
} as const;
