import type { DroneState, DroneType, GameState, ProgressionState, ShipState } from './types';
import { createAchievementStats, createUnlockedAchievements, getEffectiveMaxHp } from '../progression/achievements';
import { createTalentRanks } from '../progression/talentTree';
import { emitAudio } from './events';
import { createAsteroidField } from './systems/asteroids';
import { maxTravelLevel } from './zones';
import { balance } from '../balance';

const createShip = (width: number, height: number, progression: ProgressionState, position = { x: width / 2, y: height / 2 }): ShipState => {
  const maxHp = getEffectiveMaxHp(progression);
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
  hyperspaceCooldown: 0
};
};

export const createProgression = (): ProgressionState => ({
  passiveIncomeLevel: 0,
  shipDamageLevel: 1,
  shipSpeedLevel: 0,
  deflectorLevel: 0,
  droneDamageLevel: 1,
  droneFireRateLevel: 0,
  droneCounts: {
    sentry: 0,
    ranger: 0,
    breaker: 0
  },
  talentRanks: createTalentRanks(),
  weaponMode: 'cannon',
  spreadUnlocked: false,
  piercingUnlocked: false,
  mapUnlocked: false,
  travelLevel: 0,
  currentZoneIndex: 0,
  unlockedZoneIndex: 0,
  bossDefeats: 0,
  prestigeCores: 0,
  maxHp: 100,
  armor: 0,
  dronesPurchased: 0,
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
  angle: (index / Math.max(1, state.progression.dronesPurchased)) * Math.PI * 2,
  orbitRadius: getDroneOrbitRadius(state.progression, index, type),
  fireCooldown: balance.drones.initialFireCooldown.base + (index % balance.drones.initialFireCooldown.cycle) * balance.drones.initialFireCooldown.step
});

export const createGameState = (width: number, height: number, progression = createProgression(), money = 0): GameState => {
  const normalizedProgression = {
    ...progression,
    currentZoneIndex: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.currentZoneIndex))),
    unlockedZoneIndex: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.unlockedZoneIndex))),
    travelLevel: Math.max(0, Math.min(maxTravelLevel, Math.floor(progression.unlockedZoneIndex)))
  };
  normalizedProgression.currentZoneIndex = Math.min(normalizedProgression.currentZoneIndex, normalizedProgression.unlockedZoneIndex);

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
    phase: 'playing',
    ship: createShip(width, height, progression),
    drones: [],
    progression: normalizedProgression,
    asteroids: [],
    bullets: [],
    particles: [],
    audioEvents: [],
    rewardEvents: [],
    pendingBoss: null,
    saucer: null,
    saucerTimer: balance.saucer.initialTimer,
    nextId: 1
  };

  (Object.entries(state.progression.droneCounts) as [DroneType, number][]).forEach(([type, count]) => {
    for (let i = 0; i < count; i += 1) {
      state.drones.push(createDrone(state, type));
    }
  });

  state.asteroids = createAsteroidField(state);
  return state;
};

export const resetShip = (state: GameState): void => {
  state.ship = createShip(state.width, state.height, state.progression, { ...state.ship.position });
  state.phase = 'playing';
  emitAudio(state, { type: 'shipRespawned' });
};
