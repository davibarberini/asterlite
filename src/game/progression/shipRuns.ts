import type { GameState, ProgressionState, ShipFrameId, ShipRunState } from '../simulation/types';
import { createGameState, createProgression } from '../simulation/state';
import { applyOwnedWarpUnlockEffects } from './warpUnlocks';
import { normalizeShipFrameIds } from './shipFrames';

const cloneDroneCounts = (run: ShipRunState): ShipRunState['droneCounts'] => ({
  sentry: run.droneCounts.sentry,
  ranger: run.droneCounts.ranger,
  breaker: run.droneCounts.breaker
});

const cloneActiveDroneCounts = (run: ShipRunState): ShipRunState['activeDroneCounts'] => ({
  sentry: run.activeDroneCounts.sentry,
  ranger: run.activeDroneCounts.ranger,
  breaker: run.activeDroneCounts.breaker
});

const cloneRun = (run: ShipRunState): ShipRunState => ({
  ...run,
  droneCounts: cloneDroneCounts(run),
  activeDroneCounts: cloneActiveDroneCounts(run),
  talentRanks: { ...run.talentRanks },
  bossDiscovery: { ...run.bossDiscovery }
});

export const createDefaultShipRun = (): ShipRunState => {
  const progression = createProgression();
  return {
    money: 0,
    crystals: 0,
    passiveIncomeLevel: progression.passiveIncomeLevel,
    shipDamageLevel: progression.shipDamageLevel,
    shipFireRateLevel: progression.shipFireRateLevel,
    shipSpeedLevel: progression.shipSpeedLevel,
    deflectorLevel: progression.deflectorLevel,
    droneDamageLevel: progression.droneDamageLevel,
    droneFireRateLevel: progression.droneFireRateLevel,
    droneCounts: { ...progression.droneCounts },
    activeDroneCounts: { ...progression.activeDroneCounts },
    talentRanks: { ...progression.talentRanks },
    shipXp: progression.shipXp,
    shipLevel: progression.shipLevel,
    shipSkillPoints: progression.shipSkillPoints,
    spentShipSkillPoints: progression.spentShipSkillPoints,
    mapUnlocked: progression.mapUnlocked,
    travelLevel: progression.travelLevel,
    currentZoneIndex: progression.currentZoneIndex,
    unlockedZoneIndex: progression.unlockedZoneIndex,
    firstGateAsteroidsDestroyed: progression.firstGateAsteroidsDestroyed,
    bossDefeats: progression.bossDefeats,
    bossDiscovery: { ...progression.bossDiscovery },
    maxHp: progression.maxHp,
    armor: progression.armor,
    dronesPurchased: progression.dronesPurchased
  };
};

export const captureActiveShipRun = (state: GameState): ShipRunState => ({
  money: Math.max(0, state.money),
  crystals: Math.max(0, Math.floor(state.crystals)),
  passiveIncomeLevel: state.progression.passiveIncomeLevel,
  shipDamageLevel: state.progression.shipDamageLevel,
  shipFireRateLevel: state.progression.shipFireRateLevel,
  shipSpeedLevel: state.progression.shipSpeedLevel,
  deflectorLevel: state.progression.deflectorLevel,
  droneDamageLevel: state.progression.droneDamageLevel,
  droneFireRateLevel: state.progression.droneFireRateLevel,
  droneCounts: { ...state.progression.droneCounts },
  activeDroneCounts: { ...state.progression.activeDroneCounts },
  talentRanks: { ...state.progression.talentRanks },
  shipXp: state.progression.shipXp,
  shipLevel: state.progression.shipLevel,
  shipSkillPoints: state.progression.shipSkillPoints,
  spentShipSkillPoints: state.progression.spentShipSkillPoints,
  mapUnlocked: state.progression.mapUnlocked,
  travelLevel: state.progression.travelLevel,
  currentZoneIndex: state.progression.currentZoneIndex,
  unlockedZoneIndex: state.progression.unlockedZoneIndex,
  firstGateAsteroidsDestroyed: state.progression.firstGateAsteroidsDestroyed,
  bossDefeats: state.progression.bossDefeats,
  bossDiscovery: { ...state.progression.bossDiscovery },
  maxHp: state.progression.maxHp,
  armor: state.progression.armor,
  dronesPurchased: state.progression.dronesPurchased
});

export const withCapturedActiveShipRun = (state: GameState): Partial<Record<ShipFrameId, ShipRunState>> => ({
  ...state.progression.shipRuns,
  [state.progression.activeShipFrameId]: captureActiveShipRun(state)
});

export const applyShipRunToProgression = (
  progression: ProgressionState,
  activeShipFrameId: ShipFrameId,
  run: ShipRunState
): ProgressionState => {
  const nextProgression: ProgressionState = {
    ...progression,
    passiveIncomeLevel: run.passiveIncomeLevel,
    shipDamageLevel: run.shipDamageLevel,
    shipFireRateLevel: run.shipFireRateLevel,
    shipSpeedLevel: run.shipSpeedLevel,
    deflectorLevel: run.deflectorLevel,
    droneDamageLevel: run.droneDamageLevel,
    droneFireRateLevel: run.droneFireRateLevel,
    droneCounts: cloneDroneCounts(run),
    activeDroneCounts: cloneActiveDroneCounts(run),
    talentRanks: { ...run.talentRanks },
    shipXp: run.shipXp,
    shipLevel: run.shipLevel,
    shipSkillPoints: run.shipSkillPoints,
    spentShipSkillPoints: run.spentShipSkillPoints,
    mapUnlocked: run.mapUnlocked,
    travelLevel: run.travelLevel,
    currentZoneIndex: run.currentZoneIndex,
    unlockedZoneIndex: run.unlockedZoneIndex,
    firstGateAsteroidsDestroyed: run.firstGateAsteroidsDestroyed,
    bossDefeats: run.bossDefeats,
    bossDiscovery: { ...run.bossDiscovery },
    activeShipFrameId,
    maxHp: run.maxHp,
    armor: run.armor,
    dronesPurchased: run.dronesPurchased
  };
  applyOwnedWarpUnlockEffects(nextProgression);
  return nextProgression;
};

export const createShipFrameSwitchState = (
  previousState: GameState,
  width: number,
  height: number,
  targetShipFrameId: ShipFrameId
): GameState => {
  const unlockedShipFrameIds = normalizeShipFrameIds(previousState.progression.unlockedShipFrameIds);
  if (!unlockedShipFrameIds.includes(targetShipFrameId)) {
    return previousState;
  }

  const shipRuns = withCapturedActiveShipRun(previousState);
  const targetRun = cloneRun(shipRuns[targetShipFrameId] ?? createDefaultShipRun());
  const progression = applyShipRunToProgression(
    {
      ...previousState.progression,
      unlockedShipFrameIds,
      shipRuns,
      activeShipFrameId: targetShipFrameId
    },
    targetShipFrameId,
    targetRun
  );
  progression.shipRuns = shipRuns;

  const nextState = createGameState(width, height, progression, targetRun.money);
  nextState.crystals = targetRun.crystals;
  return nextState;
};
