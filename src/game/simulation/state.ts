import type { DroneState, DroneType, GameState, ProgressionState, ShieldBubbleState, ShipState } from './types';
import { createAchievementStats, createUnlockedAchievements, getEffectiveMaxHp } from '../progression/achievements';
import { createBossRewardState } from '../progression/bossRewards';
import { createGuidedMissionState } from '../progression/guidedMissions';
import { getShipFrameBonusMultiplier } from '../progression/shipFrames';
import { createShipUnlockProgress } from '../progression/shipUnlocks';
import { createTalentRanks } from '../progression/talentTree';
import { emitAudio } from './events';
import { createAsteroidField } from './systems/asteroids';
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
    respawnFor: 0,
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
  passiveIncomeLevel: 0,
  shipDamageLevel: 1,
  shipFireRateLevel: 0,
  shipSpeedLevel: 0,
  deflectorLevel: 0,
  droneDamageLevel: 1,
  droneFireRateLevel: 0,
  droneCounts: {
    sentry: 0,
    ranger: 0,
    breaker: 0
  },
  activeDroneCounts: {
    sentry: 0,
    ranger: 0,
    breaker: 0
  },
  talentRanks: createTalentRanks(),
  shipXp: 0,
  shipLevel: 1,
  shipSkillPoints: 0,
  spentShipSkillPoints: 0,
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
  shipRuns: {},
  prestigeCores: 0,
  ownedWarpUnlockIds: [],
  announcedAffordableWarpUnlockIds: [],
  maxHp: 100,
  armor: 0,
  dronesPurchased: 0,
  achievementStats: createAchievementStats(),
  unlockedAchievements: createUnlockedAchievements()
});

export const getDroneOrbitRadius = (_progression: ProgressionState, index: number, type: DroneType): number => {
  return balance.drones.orbitRadius[type] + (index % 3) * balance.drones.orbitRadiusStep;
};

export const getOwnedDroneCount = (progression: ProgressionState): number =>
  droneTypes.reduce((total, type) => total + progression.droneCounts[type], 0);

export const getActiveDroneCounts = (progression: ProgressionState): Record<DroneType, number> => ({
  sentry: Math.max(0, Math.min(progression.droneCounts.sentry, Math.floor(progression.activeDroneCounts.sentry))),
  ranger: Math.max(0, Math.min(progression.droneCounts.ranger, Math.floor(progression.activeDroneCounts.ranger))),
  breaker: Math.max(0, Math.min(progression.droneCounts.breaker, Math.floor(progression.activeDroneCounts.breaker)))
});

export const getActiveDroneCount = (progression: ProgressionState): number =>
  droneTypes.reduce((total, type) => total + getActiveDroneCounts(progression)[type], 0);

export const createDrone = (state: GameState, type: DroneType = 'sentry', index = state.drones.length): DroneState => ({
  id: state.nextId++,
  type,
  position: { ...state.ship.position },
  angle: (index / Math.max(1, getActiveDroneCount(state.progression))) * Math.PI * 2,
  orbitRadius: getDroneOrbitRadius(state.progression, index, type),
  fireCooldown: balance.drones.initialFireCooldown.base + (index % balance.drones.initialFireCooldown.cycle) * balance.drones.initialFireCooldown.step
});

export const syncActiveDrones = (state: GameState): void => {
  const activeDroneCounts = getActiveDroneCounts(state.progression);
  state.progression.activeDroneCounts = activeDroneCounts;
  state.drones = [];
  droneTypes.forEach((type) => {
    for (let i = 0; i < activeDroneCounts[type]; i += 1) {
      state.drones.push(createDrone(state, type));
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
    width,
    height,
    camera: { x: width / 2, y: height / 2 },
    money,
    crystals: 0,
    lastRepairCost: 0,
    lastOfflineEarnings: 0,
    deathPenaltyFor: 0,
    droneRebootFor: 0,
    bossRewards: createBossRewardState(),
    rareSpawns: createRareSpawnState(),
    phase: 'playing',
    ship: createShip(width, height, progression),
    shieldBubble: createShieldBubble(normalizedProgression),
    survival: createSurvivalState(),
    drones: [],
    progression: normalizedProgression,
    asteroids: [],
    hazards: [],
    survivalEvents: [],
    bullets: [],
    particles: [],
    levelShockwaves: [],
    audioEvents: [],
    rewardEvents: [],
    pendingBoss: null,
    bossMinions: [],
    saucer: null,
    saucerTimer: balance.saucer.initialTimer,
    nextId: 1
  };

  syncActiveDrones(state);

  state.asteroids = createAsteroidField(state);
  return state;
};

export const resetShip = (state: GameState): void => {
  state.ship = createShip(state.width, state.height, state.progression, { ...state.ship.position });
  state.phase = 'playing';
  emitAudio(state, { type: 'shipRespawned' });
};
