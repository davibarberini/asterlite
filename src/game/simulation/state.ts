import type { DroneState, DroneType, GameState, ProgressionState, ShieldBubbleState, ShipState } from './types';
import { createAchievementStats, createUnlockedAchievements, getEffectiveMaxHp } from '../progression/achievements';
import { createRunCardState } from '../progression/runCards';
import { createGuidedMissionState } from '../progression/guidedMissions';
import { getShipFrameBonusMultiplier } from '../progression/shipFrames';
import { createShipUnlockProgress } from '../progression/shipUnlocks';
import { createStartingAsteroidField } from './systems/asteroids';
import { createRareSpawnState } from './systems/rareSpawns';
import { createSurvivalState } from './systems/survival';
import { maxTravelLevel } from './zones';
import { balance } from '../balance';

export const droneTypes: DroneType[] = ['sentry', 'ranger', 'breaker'];

const createShip = (width: number, height: number, progression: ProgressionState, position = { x: width / 2, y: height / 2 }): ShipState => {
  const maxHp = Math.round(getEffectiveMaxHp(progression) * getShipFrameBonusMultiplier(progression, 'maxHpMultiplier'));
  return {
    position,
    velocity: { x: 0, y: 0 },
    rotation: -Math.PI / 2,
    radius: balance.ship.radius,
    hp: maxHp,
    maxHp,
    armor: progression.armor,
    alive: true,
    invulnerableFor: balance.ship.startingInvulnerableFor,
    fireCooldown: 0,
    turretAngle: -Math.PI / 2,
    phaseShieldCooldown: 0,
    phaseShieldFlashFor: 0
  };
};

export const hasShieldBubbleUnlocked = (progression: ProgressionState): boolean =>
  progression.ownedWarpUnlockIds.includes('shieldBubble');

export const createShieldBubble = (progression: ProgressionState): ShieldBubbleState => ({
  active: hasShieldBubbleUnlocked(progression),
  broken: false,
  rechargeFor: 0,
  hitFlashFor: 0
});

export const syncShieldBubbleState = (state: GameState): void => {
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
  }
};

export const createProgression = (): ProgressionState => ({
  shipSpeedLevel: 0,
  deflectorLevel: 0,
  shipXp: 0,
  shipLevel: 1,
  mapUnlocked: false,
  travelLevel: 0,
  currentZoneIndex: 0,
  unlockedZoneIndex: 0,
  firstGateAsteroidsDestroyed: 0,
  bossDefeats: 0,
  bossDiscovery: {
    rareBossProgress: 0,
    rareBossesFound: 0
  },
  guidedMissions: createGuidedMissionState(),
  survivalBestSeconds: 0,
  survivalBestThreatLevel: 0,
  novaCrownHighestDifficulty: 1,
  novaCrownSelectedDifficulty: 1,
  novaCrownBestSecondsByDifficulty: {},
  novaCrownCoreRewardedDifficultyKeys: [],
  activeShipFrameId: 'vector',
  unlockedShipFrameIds: ['vector'],
  shipUnlockProgress: createShipUnlockProgress(),
  prestigeCores: 0,
  ownedWarpUnlockIds: [],
  announcedAffordableWarpUnlockIds: [],
  armor: 0,
  achievementStats: createAchievementStats(),
  unlockedAchievements: createUnlockedAchievements()
});

export const getDroneOrbitRadius = (_progression: ProgressionState, index: number, type: DroneType): number => {
  return balance.drones.orbitRadius[type] + (index % 3) * balance.drones.orbitRadiusStep;
};

export const createDrone = (state: GameState, type: DroneType = 'sentry', index = state.drones.length): DroneState => ({
  id: state.nextId++,
  type,
  position: { ...state.ship.position },
  angle: (index / Math.max(1, state.runCards.selectedStacks.sentryWing + state.runCards.selectedStacks.rangerWing + state.runCards.selectedStacks.breakerWing)) * Math.PI * 2,
  orbitRadius: getDroneOrbitRadius(state.progression, index, type),
  fireCooldown: balance.drones.initialFireCooldown.base + (index % balance.drones.initialFireCooldown.cycle) * balance.drones.initialFireCooldown.step
});

export const syncActiveDrones = (state: GameState): void => {
  const existingDrones = [...state.drones];
  state.drones = [];
  droneTypes.forEach((type) => {
    const count = state.runCards.selectedStacks[type === 'sentry' ? 'sentryWing' : type === 'ranger' ? 'rangerWing' : 'breakerWing'];
    const existing = existingDrones.filter((drone) => drone.type === type);
    for (let i = 0; i < count; i += 1) {
      state.drones.push(existing[i] ?? createDrone(state, type));
    }
  });
};

export const createGameState = (width: number, height: number, progression = createProgression(), money = 0): GameState => {
  const normalizedProgression = {
    ...progression,
    currentZoneIndex: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.currentZoneIndex))),
    unlockedZoneIndex: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.unlockedZoneIndex))),
    travelLevel: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.unlockedZoneIndex))),
    novaCrownHighestDifficulty: Math.max(1, Math.floor(progression.novaCrownHighestDifficulty)),
    novaCrownSelectedDifficulty: Math.max(1, Math.floor(progression.novaCrownSelectedDifficulty)),
    novaCrownBestSecondsByDifficulty: { ...progression.novaCrownBestSecondsByDifficulty }
  };
  normalizedProgression.currentZoneIndex = Math.min(normalizedProgression.currentZoneIndex, normalizedProgression.unlockedZoneIndex);
  normalizedProgression.novaCrownSelectedDifficulty = Math.min(
    normalizedProgression.novaCrownSelectedDifficulty,
    normalizedProgression.novaCrownHighestDifficulty
  );

  const state: GameState = {
    run: { elapsedSeconds: 0, asteroidsDestroyed: 0, coresEarned: 0, survivalMilestones: 0 },
    width,
    height,
    camera: { x: width / 2, y: height / 2 },
    money,
    crystals: 0,
    droneRebootFor: 0,
    runCards: createRunCardState(),
    rareSpawns: createRareSpawnState(),
    phase: 'playing',
    ship: createShip(width, height, progression),
    shieldBubble: createShieldBubble(normalizedProgression),
    survival: createSurvivalState(),
    drones: [],
    progression: normalizedProgression,
    asteroids: [],
    asteroidDestructionEvents: [],
    hazards: [],
    survivalEvents: [],
    bullets: [],
    particles: [],
    levelShockwaves: [],
    flameWaves: [],
    audioEvents: [],
    rewardEvents: [],
    pendingBoss: null,
    bossMinions: [],
    saucer: null,
    saucerTimer: balance.saucer.initialTimer,
    nextId: 1
  };

  syncActiveDrones(state);

  state.asteroids = createStartingAsteroidField(state);
  return state;
};
