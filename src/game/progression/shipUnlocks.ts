import type { GameState, ProgressionState, ShipFrameId, ShipUnlockProgress } from '../simulation/types';
import { emitReward } from '../simulation/events';
import { maxTravelLevel } from '../simulation/zones';
import { SHIP_FRAME_BY_ID } from './shipFrames';

export type ShipUnlockDefinition = {
  id: ShipFrameId;
  target: number;
  getCurrent: (progression: ProgressionState) => number;
  getDescription: (language: 'pt-BR' | 'en-US') => string;
};

export const createShipUnlockProgress = (): ShipUnlockProgress => ({
  asteroidCollisions: 0,
  asteroidBurstBest: 0,
  prismBossDefeatsSinceDrop: 0,
  novaCrownShipFrameIds: [],
  meteorImpactsSurvived: 0,
  wraithNoDamageSeconds: 0
});

export const SHIP_UNLOCK_DEFINITIONS: ShipUnlockDefinition[] = [
  {
    id: 'vector',
    target: 1,
    getCurrent: () => 1,
    getDescription: (language) => language === 'pt-BR' ? 'Inicial' : 'Starter ship'
  },
  {
    id: 'kestrel',
    target: 1000,
    getCurrent: (progression) => progression.achievementStats.asteroidsDestroyed,
    getDescription: (language) => language === 'pt-BR' ? 'Destrua 1.000 asteroides' : 'Destroy 1,000 asteroids'
  },
  {
    id: 'bulwark',
    target: 1000,
    getCurrent: (progression) => progression.shipUnlockProgress.asteroidCollisions,
    getDescription: (language) => language === 'pt-BR' ? 'Colida com 1.000 asteroides' : 'Collide with 1,000 asteroids'
  },
  {
    id: 'needle',
    target: 3,
    getCurrent: (progression) => progression.shipUnlockProgress.asteroidBurstBest,
    getDescription: (language) => language === 'pt-BR' ? 'Destrua 3 asteroides quase ao mesmo tempo' : 'Destroy 3 asteroids almost at once'
  },
  {
    id: 'prism',
    target: 50,
    getCurrent: (progression) => progression.shipUnlockProgress.prismBossDefeatsSinceDrop,
    getDescription: (language) => language === 'pt-BR' ? '2% ao derrotar Prism Boss, garantida na 50a vitoria' : '2% from Prism Boss, guaranteed on the 50th win'
  },
  {
    id: 'atlas',
    target: 3,
    getCurrent: (progression) => progression.shipUnlockProgress.novaCrownShipFrameIds.length,
    getDescription: (language) => language === 'pt-BR' ? 'Chegue a Nova Crown com 3 naves' : 'Reach Nova Crown with 3 ships'
  },
  {
    id: 'ember',
    target: 250,
    getCurrent: (progression) => progression.shipUnlockProgress.meteorImpactsSurvived,
    getDescription: (language) => language === 'pt-BR' ? 'Sobreviva a 250 impactos de meteoros em Nova Crown' : 'Survive 250 meteor impacts in Nova Crown'
  },
  {
    id: 'voidRunner',
    target: 600,
    getCurrent: (progression) => Math.floor(progression.survivalBestSeconds),
    getDescription: (language) => language === 'pt-BR' ? 'Sobreviva 10 minutos em Nova Crown' : 'Survive 10 minutes in Nova Crown'
  },
  {
    id: 'wraith',
    target: 180,
    getCurrent: (progression) => Math.floor(progression.shipUnlockProgress.wraithNoDamageSeconds),
    getDescription: (language) => language === 'pt-BR' ? 'Sobreviva 3 minutos em Nova Crown sem tomar dano' : 'Survive 3 minutes in Nova Crown without taking damage'
  },
  {
    id: 'aurora',
    target: 20,
    getCurrent: (progression) => progression.survivalBestThreatLevel,
    getDescription: (language) => language === 'pt-BR' ? 'Atinja threat level 20 em Nova Crown' : 'Reach threat level 20 in Nova Crown'
  },
  {
    id: 'nivitron',
    target: 30,
    getCurrent: (progression) => progression.survivalBestThreatLevel,
    getDescription: (language) => language === 'pt-BR' ? 'Atinja threat level 30 em Nova Crown' : 'Reach threat level 30 in Nova Crown'
  },
  {
    id: 'hisoka',
    target: 35,
    getCurrent: (progression) => progression.survivalBestThreatLevel,
    getDescription: (language) => language === 'pt-BR' ? 'Atinja threat level 35 em Nova Crown' : 'Reach threat level 35 in Nova Crown'
  }
];

export const SHIP_UNLOCK_BY_ID = Object.fromEntries(
  SHIP_UNLOCK_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<ShipFrameId, ShipUnlockDefinition>;

export const getShipUnlockProgress = (progression: ProgressionState, id: ShipFrameId): { current: number; target: number } => {
  const definition = SHIP_UNLOCK_BY_ID[id];
  return {
    current: Math.min(definition.getCurrent(progression), definition.target),
    target: definition.target
  };
};

export const getShipUnlockProgressLabel = (progression: ProgressionState, id: ShipFrameId): string => {
  const { current, target } = getShipUnlockProgress(progression, id);
  return `${Math.floor(current).toLocaleString('en-US')} / ${target.toLocaleString('en-US')}`;
};

export const unlockShipFrame = (progression: ProgressionState, id: ShipFrameId): boolean => {
  if (progression.unlockedShipFrameIds.includes(id)) {
    return false;
  }
  progression.unlockedShipFrameIds = [...progression.unlockedShipFrameIds, id];
  return true;
};

export const normalizeShipUnlockProgress = (progress: ShipUnlockProgress): ShipUnlockProgress => ({
  asteroidCollisions: Math.max(0, Math.floor(progress.asteroidCollisions)),
  asteroidBurstBest: Math.max(0, Math.floor(progress.asteroidBurstBest)),
  prismBossDefeatsSinceDrop: Math.max(0, Math.floor(progress.prismBossDefeatsSinceDrop)),
  novaCrownShipFrameIds: Array.from(new Set(progress.novaCrownShipFrameIds.filter((id) => id in SHIP_FRAME_BY_ID))),
  meteorImpactsSurvived: Math.max(0, Math.floor(progress.meteorImpactsSurvived)),
  wraithNoDamageSeconds: Math.max(0, progress.wraithNoDamageSeconds)
});

export const syncShipUnlocks = (state: GameState, onUnlock?: (id: ShipFrameId) => void): void => {
  for (const definition of SHIP_UNLOCK_DEFINITIONS) {
    if (state.progression.unlockedShipFrameIds.includes(definition.id)) {
      continue;
    }
    if (definition.getCurrent(state.progression) >= definition.target) {
      unlockShipFrame(state.progression, definition.id);
      onUnlock?.(definition.id);
    }
  }
};

export const updateShipUnlockProgress = (state: GameState, dt: number, onUnlock?: (id: ShipFrameId) => void): void => {
  recordNovaCrownVisitUnlockProgress(state);
  if (state.survival.active && state.ship.alive) {
    state.progression.shipUnlockProgress.wraithNoDamageSeconds += dt;
  } else {
    state.progression.shipUnlockProgress.wraithNoDamageSeconds = 0;
  }
  syncShipUnlocks(state, onUnlock);
};

export const emitShipUnlock = (state: GameState, id: ShipFrameId): void => {
  emitReward(state, `Ship unlocked: ${SHIP_FRAME_BY_ID[id].name}`, 'unlock');
};

export const recordAsteroidBurstUnlockProgress = (state: GameState, destroyedCount: number): void => {
  if (destroyedCount <= 0) {
    return;
  }
  state.progression.shipUnlockProgress.asteroidBurstBest = Math.max(
    state.progression.shipUnlockProgress.asteroidBurstBest,
    destroyedCount
  );
};

export const recordAsteroidCollisionUnlockProgress = (state: GameState): void => {
  state.progression.shipUnlockProgress.asteroidCollisions += 1;
};

export const recordPrismBossDefeatUnlockProgress = (state: GameState, roll: number = Math.random()): void => {
  if (state.progression.unlockedShipFrameIds.includes('prism')) {
    return;
  }
  state.progression.shipUnlockProgress.prismBossDefeatsSinceDrop += 1;
  if (roll < 0.02 || state.progression.shipUnlockProgress.prismBossDefeatsSinceDrop >= 50) {
    state.progression.shipUnlockProgress.prismBossDefeatsSinceDrop = 50;
  }
};

export const recordNovaCrownVisitUnlockProgress = (state: GameState): void => {
  if (state.progression.currentZoneIndex < maxTravelLevel) {
    return;
  }
  const ids = state.progression.shipUnlockProgress.novaCrownShipFrameIds;
  if (!ids.includes(state.progression.activeShipFrameId)) {
    state.progression.shipUnlockProgress.novaCrownShipFrameIds = [...ids, state.progression.activeShipFrameId];
  }
};

export const recordMeteorImpactUnlockProgress = (state: GameState): void => {
  if (state.progression.currentZoneIndex >= maxTravelLevel && state.ship.alive) {
    state.progression.shipUnlockProgress.meteorImpactsSurvived += 1;
  }
};

export const resetNoDamageShipUnlockProgress = (state: GameState): void => {
  state.progression.shipUnlockProgress.wraithNoDamageSeconds = 0;
};
