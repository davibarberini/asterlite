import { beforeEach, describe, expect, it, vi } from 'vitest';
import { neutralInput } from '../input/actions';
import { getCrystalBalance, purchaseTalentRank, spendCrystals } from '../progression/currency';
import { createProgression } from '../simulation/state';
import {
  getFireRateMultiplier,
  getPlayerFireInterval
} from '../progression/idleBonuses';
import { getOfflineIncomeRate } from '../progression/offlineIncome';
import { createCoreResetState, crystalsPerPrestigeCore, getPrestigeCoreGain, minimumCoreResetThreatLevel } from '../progression/prestige';
import { clearAllAsteridleData, loadGameState, saveGameState, SAVE_VERSION_NOTES } from '../progression/saveData';
import { getFirstWarpGoal } from '../progression/firstWarpGoal';
import { getActiveGuidedMissionProgress } from '../progression/guidedMissions';
import { createShipFrameSwitchState } from '../progression/shipRuns';
import { getUnlockedShipFrameIdsForExchangeCount } from '../progression/shipFrames';
import {
  recordPrismBossDefeatUnlockProgress,
  syncShipUnlocks
} from '../progression/shipUnlocks';
import { WARP_UNLOCK_BY_ID, WARP_UNLOCK_DEFINITIONS, getWarpUnlockNodeState, hasWarpUnlock, meetsWarpUnlockRequirements, purchaseWarpUnlock } from '../progression/warpUnlocks';
import { createGameState } from '../simulation/state';
import { createAsteroid, createZoneBossFromPending, getAsteroidReward } from '../simulation/systems/asteroids';
import { applyBossRewardChoice } from '../progression/bossRewards';
import { getNovaCrownCoreReward } from '../progression/novaCrownRewards';
import { resolveCollisions } from '../simulation/systems/collisions';
import { updateBosses } from '../simulation/systems/enemies';
import { updateGame } from '../simulation/systems/gameLoop';
import { firePlayerWeapon } from '../simulation/systems/weapons';
import { zones } from '../simulation/zones';
import type { AsteroidState, PendingBossState } from '../simulation/types';
import { balance } from '../balance';

const saveKey = 'asteridle.save.v1';
const scaledCost = (baseCost: number, level: number, scale: number): number => Math.round(baseCost * scale ** level);

const createLocalStorage = (): Storage => {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => store.get(key) ?? null,
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    }
  };
};

const makeBossAsteroid = (bossZoneIndex: number): AsteroidState => ({
  id: 500,
  position: { x: 100, y: 100 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  rotationSpeed: 0,
  radius: 50,
  size: 'large',
  variant: 'dense',
  hp: 1,
  maxHp: 1,
  shape: [1, 0.9, 1.1],
  bossType: 'sentinel',
  bossZoneIndex,
  bossFireCooldown: 1
});

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: createLocalStorage()
  });
});

describe('save loading', () => {
  it('documents the current save version contents', () => {
    expect(SAVE_VERSION_NOTES[2]).toContain('progression');
    expect(SAVE_VERSION_NOTES[2]).toContain('Nova Crown');
  });

  it('writes current version saves and loads them through the migration path', () => {
    const savedState = createGameState(800, 600);
    savedState.money = 250;
    savedState.crystals = 6;
    savedState.progression.shipDamageLevel = 3;
    savedState.progression.shipFireRateLevel = 4;
    savedState.progression.bossDiscovery = {
      rareBossProgress: 12,
      rareBossesFound: 1
    };
    savedState.progression.shipUnlockProgress = {
      ...savedState.progression.shipUnlockProgress,
      asteroidCollisions: 23,
      novaCrownShipFrameIds: ['vector']
    };
    savedState.progression.ownedWarpUnlockIds = ['droneSystems'];
    savedState.progression.announcedAffordableWarpUnlockIds = ['droneSystems'];
    savedState.progression.novaCrownCoreRewardedDifficultyKeys = ['1', '3'];
    savedState.bossRewards = {
      pendingChoiceIds: ['rapidFire', 'salvageSurge'],
      activeIds: ['droneOverdrive']
    };
    savedState.progression.guidedMissions = {
      activeMissionId: 'defeatGateBoss',
      completedMissionIds: ['drawGateBoss'],
      repeatCompletions: 0,
      startedAt: {
        firstGateAsteroidsDestroyed: balance.bosses.firstGateAsteroids,
        asteroidsDestroyed: 0,
        moneyEarned: 0,
        crystalsCollected: 0,
        deaths: 0,
        bossDefeats: 0,
        crystals: 0,
        prestigeCores: 0
      }
    };
    savedState.ship.position = { x: 180, y: 220 };
    savedState.ship.hp = 72;

    saveGameState(savedState);
    const stored = JSON.parse(window.localStorage.getItem(saveKey) ?? '{}') as { version?: unknown };

    expect(stored.version).toBe(2);

    const loadedState = loadGameState(800, 600);

    expect(loadedState.money).toBe(250);
    expect(loadedState.crystals).toBe(6);
    expect(loadedState.progression.shipDamageLevel).toBe(3);
    expect(loadedState.progression.shipFireRateLevel).toBe(4);
    expect(loadedState.progression.bossDiscovery).toEqual({
      rareBossProgress: 12,
      rareBossesFound: 1
    });
    expect(loadedState.progression.shipUnlockProgress.asteroidCollisions).toBe(23);
    expect(loadedState.progression.shipUnlockProgress.novaCrownShipFrameIds).toEqual(['vector']);
    expect(loadedState.progression.ownedWarpUnlockIds).toEqual(['droneSystems']);
    expect(loadedState.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems']);
    expect(loadedState.progression.novaCrownCoreRewardedDifficultyKeys).toEqual(['1', '3']);
    expect(loadedState.bossRewards).toEqual({
      pendingChoiceIds: ['rapidFire', 'salvageSurge'],
      activeIds: ['droneOverdrive']
    });
    expect(loadedState.progression.guidedMissions.activeMissionId).toBe('defeatGateBoss');
    expect(loadedState.progression.guidedMissions.completedMissionIds).toEqual(['drawGateBoss']);
    expect(loadedState.ship.position).toEqual({ x: 180, y: 220 });
    expect(loadedState.ship.hp).toBe(72);
  });

  it('clears all local Asteridle data without touching unrelated storage', () => {
    window.localStorage.setItem(saveKey, 'save');
    window.localStorage.setItem('asteridle.settings.volume', '0.5');
    window.localStorage.setItem('other-game.save', 'keep');

    clearAllAsteridleData();

    expect(window.localStorage.getItem(saveKey)).toBeNull();
    expect(window.localStorage.getItem('asteridle.settings.volume')).toBeNull();
    expect(window.localStorage.getItem('other-game.save')).toBe('keep');
  });

  it('normalizes invalid persisted numbers and clamps zone indexes', () => {
    const progression = createProgression();
    progression.unlockedZoneIndex = 2;
    progression.currentZoneIndex = 99;
    progression.travelLevel = 2;

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 2,
        money: -100,
        crystals: 4.8,
        lastSeenAt: Date.now(),
        progression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 999,
          alive: true,
          respawnFor: -5
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.money).toBe(0);
    expect(state.crystals).toBe(4);
    expect(state.progression.unlockedZoneIndex).toBe(2);
    expect(state.progression.currentZoneIndex).toBe(2);
    expect(state.progression.travelLevel).toBe(2);
    expect(state.progression.ownedWarpUnlockIds).toEqual([]);
    expect(state.ship.hp).toBe(state.ship.maxHp);
    expect(state.ship.position).toEqual({ x: 25, y: 40 });
  });

  it('falls back to a new game when a save version has no migration', () => {
    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 999,
        money: 5000,
        crystals: 12,
        lastSeenAt: Date.now(),
        progression: createProgression(),
        ship: {
          position: { x: 25, y: 40 },
          hp: 50,
          alive: true,
          respawnFor: 0
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.money).toBe(0);
    expect(state.crystals).toBe(0);
    expect(state.ship.position).toEqual({ x: 400, y: 300 });
    expect(window.localStorage.getItem(saveKey)).toBeNull();
  });

  it('normalizes persisted warp unlock ids', () => {
    const progression = createProgression();
    const savedProgression = {
      ...progression,
      ownedWarpUnlockIds: ['droneSystems', '', 'droneSystems', 'spreadBattery', 'futureUnknownUnlock', 42]
    };

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 2,
        money: 0,
        crystals: 0,
        lastSeenAt: Date.now(),
        progression: savedProgression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 100,
          alive: true,
          respawnFor: 0
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.progression.ownedWarpUnlockIds).toEqual(['droneSystems']);
  });

  it('defaults shield bubble state for saves without shield data', () => {
    const progression = createProgression();
    progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 2,
        money: 0,
        crystals: 0,
        lastSeenAt: Date.now(),
        progression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 100,
          alive: true,
          respawnFor: 0
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.shieldBubble).toEqual({
      active: true,
      broken: false,
      rechargeFor: 0,
      hitFlashFor: 0
    });
  });

  it('persists shield bubble recharge state when unlocked', () => {
    const savedState = createGameState(800, 600);
    savedState.progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];
    savedState.shieldBubble = {
      active: false,
      broken: true,
      rechargeFor: 4.5,
      hitFlashFor: 0.2
    };

    saveGameState(savedState);
    const loadedState = loadGameState(800, 600);

    expect(loadedState.shieldBubble.active).toBe(false);
    expect(loadedState.shieldBubble.broken).toBe(true);
    expect(loadedState.shieldBubble.rechargeFor).toBe(4.5);
    expect(loadedState.shieldBubble.hitFlashFor).toBe(0.2);
  });

  it('clears old save formats instead of migrating stale fields', () => {
    const progression = createProgression();

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 1,
        money: 0,
        crystals: 0,
        lastSeenAt: Date.now(),
        progression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 100,
          alive: true,
          respawnFor: 0
        },
        shieldBubble: {
          active: false,
          broken: true,
          rechargeFor: 5,
          hitFlashFor: 0.1
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.money).toBe(0);
    expect(state.progression.ownedWarpUnlockIds).toEqual([]);
    expect(state.shieldBubble.active).toBe(false);
    expect(window.localStorage.getItem(saveKey)).toBeNull();
  });

  it('defaults missing active drone counts to all owned drones when loading saves', () => {
    const progression = createProgression();
    progression.droneCounts = {
      sentry: 2,
      ranger: 1,
      breaker: 0
    };
    progression.dronesPurchased = 3;
    const legacyProgression = { ...progression } as Partial<typeof progression>;
    delete legacyProgression.activeDroneCounts;

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 2,
        money: 0,
        crystals: 0,
        lastSeenAt: Date.now(),
        progression: legacyProgression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 100,
          alive: true,
          respawnFor: 0
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.progression.activeDroneCounts).toEqual({
      sentry: 2,
      ranger: 1,
      breaker: 0
    });
    expect(state.drones).toHaveLength(3);
  });

  it('clamps persisted active drone counts to owned drones', () => {
    const progression = createProgression();
    progression.droneCounts = {
      sentry: 2,
      ranger: 1,
      breaker: 0
    };
    progression.activeDroneCounts = {
      sentry: 99,
      ranger: 0,
      breaker: 5
    };
    progression.dronesPurchased = 3;

    window.localStorage.setItem(
      saveKey,
      JSON.stringify({
        version: 2,
        money: 0,
        crystals: 0,
        lastSeenAt: Date.now(),
        progression,
        ship: {
          position: { x: 25, y: 40 },
          hp: 100,
          alive: true,
          respawnFor: 0
        }
      })
    );

    const state = loadGameState(800, 600);

    expect(state.progression.activeDroneCounts).toEqual({
      sentry: 2,
      ranger: 0,
      breaker: 0
    });
    expect(state.drones.map((drone) => drone.type)).toEqual(['sentry', 'sentry']);
  });
});

describe('warp unlock definitions', () => {
  it('defines the first permanent warp unlock route', () => {
    expect(WARP_UNLOCK_DEFINITIONS.map((unlock) => unlock.id)).toEqual([
      'droneSystems',
      'bossBeacon',
      'deflectorFrame',
      'shieldBubble',
      'rangerHangar',
      'missileFoundry'
    ]);

    WARP_UNLOCK_DEFINITIONS.forEach((unlock) => {
      expect(unlock.cost).toBeGreaterThan(0);
      expect(unlock.iconId).toMatch(/^warp-/);
      expect(unlock.title.length).toBeGreaterThan(0);
      expect(unlock.summary.length).toBeGreaterThan(0);
      expect(unlock.effectSummary.length).toBeGreaterThan(0);
      expect(unlock.route.col).toBeGreaterThan(0);
      expect(unlock.route.row).toBeGreaterThan(0);
      unlock.requires.forEach((requiredId) => {
        expect(WARP_UNLOCK_BY_ID[requiredId]).toBeDefined();
      });
    });
  });

  it('calculates owned available locked and unaffordable warp node states', () => {
    const progression = createProgression();

    expect(hasWarpUnlock(progression, 'droneSystems')).toBe(false);
    expect(meetsWarpUnlockRequirements(progression, 'droneSystems')).toBe(true);
    expect(getWarpUnlockNodeState(progression, 0, 'droneSystems')).toBe('unaffordable');
    expect(getWarpUnlockNodeState(progression, 1, 'droneSystems')).toBe('available');
    expect(getWarpUnlockNodeState(progression, 10, 'bossBeacon')).toBe('locked');

    progression.ownedWarpUnlockIds = ['droneSystems'];

    expect(hasWarpUnlock(progression, 'droneSystems')).toBe(true);
    expect(getWarpUnlockNodeState(progression, 0, 'droneSystems')).toBe('owned');
    expect(meetsWarpUnlockRequirements(progression, 'bossBeacon')).toBe(true);
    expect(getWarpUnlockNodeState(progression, 2, 'bossBeacon')).toBe('available');
  });

  it('paces technology costs around gameplay unlocks', () => {
    const cost = (id: keyof typeof WARP_UNLOCK_BY_ID): number => WARP_UNLOCK_BY_ID[id].cost;
    const totalCost = WARP_UNLOCK_DEFINITIONS.reduce((total, unlock) => total + unlock.cost, 0);

    expect(cost('droneSystems')).toBe(1);
    expect(cost('bossBeacon')).toBe(2);
    expect(cost('deflectorFrame')).toBeGreaterThan(cost('bossBeacon'));
    expect(cost('shieldBubble')).toBeGreaterThan(cost('deflectorFrame'));
    expect(cost('missileFoundry')).toBeGreaterThanOrEqual(8);
    expect(totalCost).toBeGreaterThanOrEqual(25);
    expect(totalCost).toBeLessThanOrEqual(30);
  });

  it('paces crystal reset rewards around the first core and later technology stretch', () => {
    const state = createGameState(800, 600);
    const firstGateBossReward = getAsteroidReward(state, makeBossAsteroid(1));
    const crystalLargeReward = getAsteroidReward(
      state,
      createAsteroid(state, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'crystal')
    );

    expect(crystalsPerPrestigeCore).toBe(12);
    expect(firstGateBossReward.crystals).toBe(4);
    expect(crystalLargeReward.crystals).toBe(3);
    expect(firstGateBossReward.crystals + crystalLargeReward.crystals * 3).toBeGreaterThanOrEqual(crystalsPerPrestigeCore);
  });

  it('announces newly affordable warp unlocks once through the reward feed', () => {
    const state = createGameState(800, 600);
    state.progression.prestigeCores = 1;

    updateGame(state, neutralInput(), 0);

    expect(state.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems']);
    expect(state.rewardEvents.filter((event) => event.text === 'Technology available: Drone Systems')).toHaveLength(1);

    state.rewardEvents = [];
    updateGame(state, neutralInput(), 0);

    expect(state.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems']);
    expect(state.rewardEvents.some((event) => event.text === 'Technology available: Drone Systems')).toBe(false);
  });

  it('announces only the next newly affordable warp unlock per update', () => {
    const state = createGameState(800, 600);
    state.progression.prestigeCores = 5;
    state.progression.ownedWarpUnlockIds = ['droneSystems'];
    state.progression.announcedAffordableWarpUnlockIds = ['droneSystems'];

    updateGame(state, neutralInput(), 0);

    expect(state.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems', 'bossBeacon']);
    expect(state.rewardEvents.some((event) => event.text === 'Technology available: Boss Beacon')).toBe(true);
    expect(state.rewardEvents.some((event) => event.text === 'Technology available: Spread Battery')).toBe(false);
  });

  it('installs available warp unlock effects directly into progression', () => {
    const progression = createProgression();
    progression.prestigeCores = 12;

    expect(purchaseWarpUnlock(progression, 'droneSystems')).toBe(true);
    expect(purchaseWarpUnlock(progression, 'bossBeacon')).toBe(true);
    expect(purchaseWarpUnlock(progression, 'deflectorFrame')).toBe(true);

    expect(progression.shipDamageLevel).toBe(1);
    expect(progression.maxHp).toBe(100);
    expect(progression.armor).toBe(0);
    expect(progression.shipSpeedLevel).toBe(0);
    expect(progression.spreadUnlocked).toBe(false);
    expect(progression.deflectorLevel).toBe(1);
    expect(progression.ownedWarpUnlockIds).toContain('bossBeacon');
    expect(progression.ownedWarpUnlockIds).toContain('droneSystems');
  });
});

describe('ship input movement', () => {
  it('applies swipe impulse as a one-frame movement burst', () => {
    const state = createGameState(800, 600);
    const startX = state.ship.position.x;
    const input = neutralInput();
    input.impulseVector = { x: 1, y: 0 };

    updateGame(state, input, 0.1);

    expect(state.ship.velocity.x).toBeGreaterThan(0);
    expect(state.ship.position.x).toBeGreaterThan(startX);
    expect(state.ship.rotation).toBeCloseTo(0);
  });
});

describe('first warp goal', () => {
  it('guides new saves toward the first gate boss', () => {
    const state = createGameState(800, 600);
    state.progression.achievementStats.asteroidsDestroyed = 120;
    state.progression.firstGateAsteroidsDestroyed = 3;

    const goal = getFirstWarpGoal(state);

    expect(goal?.type).toBe('drawGateBoss');
    expect(goal?.destroyed).toBe(3);
    expect(goal?.asteroidTarget).toBe(balance.bosses.firstGateAsteroids);
  });

  it('guides ready resets and first technology purchase without persisted UI state', () => {
    const state = createGameState(800, 600);
    state.progression.currentZoneIndex = zones.length - 1;
    state.progression.unlockedZoneIndex = zones.length - 1;
    state.progression.travelLevel = zones.length - 1;
    state.survival.active = true;
    state.survival.threatLevel = minimumCoreResetThreatLevel;

    expect(getFirstWarpGoal(state)?.type).toBe('warpForFirstCore');

    state.survival.active = false;
    state.survival.threatLevel = 0;
    state.progression.prestigeCores = WARP_UNLOCK_BY_ID.droneSystems.cost;

    expect(getFirstWarpGoal(state)?.type).toBe('installDroneSystems');

    state.progression.ownedWarpUnlockIds = ['droneSystems'];

    expect(getFirstWarpGoal(state)).toBeNull();
  });
});

describe('guided missions', () => {
  const completedGuidedPath = [
    'drawGateBoss',
    'defeatGateBoss',
    'travelToOrion',
    'collectWarpCrystals',
    'openVegaRoute',
    'travelToVega',
    'openCygnusRoute',
    'travelToCygnus',
    'openNovaRoute',
    'travelToNovaCrown',
    'warpForFirstCore',
    'installDroneSystems'
  ] as const;

  it('starts the guided mission sequence in the existing objective pill flow', () => {
    const state = createGameState(800, 600);

    const mission = getActiveGuidedMissionProgress(state);

    expect(mission?.id).toBe('drawGateBoss');
    expect(mission?.target).toBe(balance.bosses.firstGateAsteroids);
  });

  it('rewards mission completion and advances to the next mission', () => {
    const state = createGameState(800, 600);
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids;

    updateGame(state, neutralInput(), 0.016);

    expect(state.progression.guidedMissions.completedMissionIds).toContain('drawGateBoss');
    expect(state.progression.guidedMissions.activeMissionId).toBe('defeatGateBoss');
    expect(state.progression.shipDamageLevel).toBe(2);
    expect(state.money).toBeGreaterThanOrEqual(75);
    expect(state.rewardEvents.some((event) => event.text.includes('Mission complete'))).toBe(true);
  });

  it('selects repeatable missions after the first guided path', () => {
    const state = createGameState(800, 600);
    state.progression.guidedMissions.completedMissionIds = [...completedGuidedPath];
    state.progression.guidedMissions.activeMissionId = null;

    updateGame(state, neutralInput(), 0.016);

    expect(state.progression.guidedMissions.activeMissionId).toBe('clearAsteroids');
    state.progression.achievementStats.asteroidsDestroyed = state.progression.guidedMissions.startedAt.asteroidsDestroyed + 30;

    updateGame(state, neutralInput(), 0.016);

    expect(state.progression.guidedMissions.repeatCompletions).toBe(1);
    expect(state.progression.guidedMissions.activeMissionId).toBe('collectCredits');
    expect(state.progression.passiveIncomeLevel).toBe(0);
    expect(state.money).toBeGreaterThan(0);
  });

  it('resets the deathless repeatable mission window after a death', () => {
    const state = createGameState(800, 600);
    state.progression.guidedMissions.completedMissionIds = [...completedGuidedPath];
    state.progression.guidedMissions.repeatCompletions = 2;
    state.progression.guidedMissions.activeMissionId = null;

    updateGame(state, neutralInput(), 0.016);

    expect(state.progression.guidedMissions.activeMissionId).toBe('surviveAsteroids');
    state.progression.achievementStats.asteroidsDestroyed = state.progression.guidedMissions.startedAt.asteroidsDestroyed + 10;
    state.progression.achievementStats.deaths += 1;

    updateGame(state, neutralInput(), 0.016);

    expect(getActiveGuidedMissionProgress(state)?.current).toBe(0);
    expect(state.progression.guidedMissions.startedAt.deaths).toBe(state.progression.achievementStats.deaths);
  });

  it('adds crystal and boss repeatable missions once later zones are unlocked', () => {
    const state = createGameState(800, 600);
    state.progression.unlockedZoneIndex = 1;
    state.progression.currentZoneIndex = 1;
    state.progression.guidedMissions.completedMissionIds = [...completedGuidedPath];
    state.progression.guidedMissions.repeatCompletions = 3;
    state.progression.guidedMissions.activeMissionId = null;

    updateGame(state, neutralInput(), 0.016);

    expect(state.progression.guidedMissions.activeMissionId).toBe('collectCrystals');
    expect(getActiveGuidedMissionProgress(state)?.target).toBe(5);
    state.progression.achievementStats.crystalsCollected = state.progression.guidedMissions.startedAt.crystalsCollected + 5;
    const crystalsBeforeReward = state.crystals;

    updateGame(state, neutralInput(), 0.016);

    expect(state.crystals).toBe(crystalsBeforeReward);
  });
});

describe('crystal spending and talents', () => {
  it('normalizes crystal balance before spending', () => {
    const state = createGameState(800, 600);
    state.crystals = 7.9;

    expect(getCrystalBalance(state)).toBe(7);
    expect(spendCrystals(state, 3)).toBe(true);
    expect(state.crystals).toBe(4);
    expect(spendCrystals(state, 5)).toBe(false);
    expect(state.crystals).toBe(4);
  });

  it('buys affordable talent ranks and refuses locked branches', () => {
    const state = createGameState(800, 600);
    state.crystals = 5;

    expect(purchaseTalentRank(state, 'refineryYield')).toBe(true);
    expect(state.progression.talentRanks.refineryYield).toBe(1);
    expect(state.crystals).toBe(3);
    expect(purchaseTalentRank(state, 'semiAutoOptics')).toBe(false);
    expect(state.progression.talentRanks.semiAutoOptics).toBe(0);

    state.progression.droneCounts.sentry = 1;
    expect(purchaseTalentRank(state, 'semiAutoOptics')).toBe(true);
    expect(state.progression.talentRanks.semiAutoOptics).toBe(1);
    expect(state.crystals).toBe(0);
  });
});

describe('core ship upgrades', () => {
  it('keeps core credit upgrade curves cheap early and scales offline income from the current build', () => {
    const tracks = [
      { baseCost: balance.economy.offlineIncome.baseCost, scale: balance.economy.offlineIncome.scale },
      { baseCost: balance.shop.ship.damage.baseCost, scale: balance.shop.ship.damage.scale },
      { baseCost: balance.shop.ship.fireRate.baseCost, scale: balance.shop.ship.fireRate.scale },
      { baseCost: balance.shop.ship.hp.baseCost, scale: balance.shop.ship.hp.scale }
    ];

    tracks.forEach(({ baseCost, scale }) => {
      expect(scaledCost(baseCost, 0, scale)).toBeLessThanOrEqual(70);
      expect(scaledCost(baseCost, 25, scale)).toBeLessThanOrEqual(160);
    });

    const earlyProgression = createProgression();
    earlyProgression.passiveIncomeLevel = 1;
    const builtProgression = createProgression();
    builtProgression.passiveIncomeLevel = 1;
    builtProgression.shipDamageLevel = 10;
    builtProgression.shipFireRateLevel = 6;

    expect(getOfflineIncomeRate(createProgression())).toBe(0);
    expect(getOfflineIncomeRate(earlyProgression)).toBeGreaterThan(0);
    expect(getOfflineIncomeRate(builtProgression)).toBeGreaterThan(getOfflineIncomeRate(earlyProgression));
  });

  it('does not award offline income levels as live credits during gameplay', () => {
    const state = createGameState(800, 600);
    state.progression.passiveIncomeLevel = 20;

    updateGame(state, neutralInput(), 10);

    expect(state.money).toBe(0);
  });

  it('keeps capped fire-rate purchases effective through the current upgrade cap', () => {
    const progression = createProgression();
    progression.shipFireRateLevel = balance.shop.upgradeBaseCap;

    expect(getFireRateMultiplier(progression)).toBe(36);
    expect(getPlayerFireInterval(progression)).toBeGreaterThan(balance.shop.ship.fireRate.minimumInterval);
  });

});

describe('boss gates and core reset', () => {
  it('paces boss HP and zone density from first gate to late route checks', () => {
    const state = createGameState(800, 600);
    const makePendingBoss = (bossZoneIndex: number): PendingBossState => ({
      bossType: zones[bossZoneIndex].bossType,
      bossZoneIndex,
      spawnIn: 0,
      position: { x: 100, y: 100 },
      velocity: { x: 0, y: 0 }
    });

    const firstBoss = createZoneBossFromPending(state, makePendingBoss(1));
    const prismBoss = createZoneBossFromPending(state, makePendingBoss(2));
    const midBoss = createZoneBossFromPending(state, makePendingBoss(3));
    const finalBoss = createZoneBossFromPending(state, makePendingBoss(4));

    expect(firstBoss.bossType).toBe('crusher');
    expect(firstBoss.maxHp).toBe(36);
    expect(prismBoss.bossType).toBe('prism');
    expect(zones[2].bossType).toBe('prism');
    expect(midBoss.maxHp).toBeGreaterThan(firstBoss.maxHp);
    expect(finalBoss.maxHp).toBeGreaterThan(midBoss.maxHp);
    expect(zones.map((zone) => zone.asteroidDensityBonus)).toEqual([0, 1, 3, 6, 9]);
    expect(zones.map((zone) => zone.asteroidDamageMultiplier)).toEqual([1, 1.25, 1.55, 1.95, 2.45]);
    expect(zones.at(-1)?.rewardMultiplier).toBeGreaterThan(zones.at(-1)?.asteroidHpMultiplier ?? 0);
    zones.forEach((zone) => {
      expect(zone.identity.callsign.length).toBeGreaterThan(0);
      expect(zone.identity.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(zone.identity.fieldTintAlpha).toBeGreaterThan(0);
      expect(balance.asteroids.variantWeights[zone.id].some((entry) => entry.variant === zone.identity.variantFocus)).toBe(true);
    });
  });

  it('does not create a pending run reward choice when a route boss is defeated', () => {
    const state = createGameState(800, 600);
    const boss = makeBossAsteroid(1);
    state.asteroids = [boss];
    state.bullets = [
      {
        id: 900,
        owner: 'player',
        position: { ...boss.position },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 4,
        damage: boss.hp,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    resolveCollisions(state);

    expect(state.progression.bossDefeats).toBe(1);
    expect(state.bossRewards.pendingChoiceIds).toEqual([]);
    expect(state.bossRewards.activeIds).toEqual([]);
  });

  it('applies boss reward choices as temporary run modifiers', () => {
    const state = createGameState(800, 600);
    state.bossRewards.pendingChoiceIds = ['rapidFire', 'droneOverdrive', 'salvageSurge'];

    expect(applyBossRewardChoice(state, 'rapidFire')).toBe(true);
    firePlayerWeapon(state);

    expect(state.bossRewards.activeIds).toEqual(['rapidFire']);
    expect(state.bossRewards.pendingChoiceIds).toEqual([]);
    expect(state.ship.fireCooldown).toBeCloseTo(getPlayerFireInterval(state.progression) * 0.82);
  });

  it('applies salvage boss reward to later credit payouts', () => {
    const baseState = createGameState(800, 600);
    const boostedState = createGameState(800, 600);
    boostedState.bossRewards.activeIds = ['salvageSurge'];
    const asteroid = createAsteroid(baseState, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'common');

    expect(getAsteroidReward(boostedState, asteroid).money).toBeGreaterThan(getAsteroidReward(baseState, asteroid).money);
  });

  it('fires prism boss shots as limited ricochet projectiles', () => {
    const state = createGameState(800, 600);
    state.ship.position = { x: 400, y: 300 };
    state.asteroids = [
      {
        ...makeBossAsteroid(2),
        position: { x: 100, y: 300 },
        bossType: 'prism',
        bossFireCooldown: 0,
        hp: 10,
        maxHp: 10
      }
    ];

    updateBosses(state, 0);

    expect(state.bullets).toHaveLength(balance.bosses.stats.prism.bulletAngleOffsets.length);
    expect(state.bullets.every((bullet) => bullet.kind === 'ricochet')).toBe(true);
    expect(state.bullets.every((bullet) => bullet.ricochetLeft === balance.bosses.ricochetBounces)).toBe(true);
  });

  it('bounces prism ricochet shots off normal asteroids', () => {
    const state = createGameState(800, 600);
    state.ship.position = { x: 600, y: 500 };
    state.asteroids = [
      createAsteroid(state, 'large', { x: 200, y: 200 }, { x: 0, y: 0 }, 'common')
    ];
    state.bullets = [
      {
        id: 900,
        owner: 'boss',
        position: { x: 240, y: 200 },
        velocity: { x: -120, y: 0 },
        age: 0,
        radius: 6,
        damage: 18,
        pierceLeft: 0,
        ricochetLeft: 2,
        kind: 'ricochet',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    const bullet = state.bullets.find((candidate) => candidate.id === 900);
    expect(bullet).toBeDefined();
    expect(bullet?.velocity.x).toBeGreaterThan(0);
    expect(bullet?.ricochetLeft).toBe(1);
  });

  it('destroys prism ricochet shots after their final bounce is spent', () => {
    const state = createGameState(800, 600);
    state.ship.position = { x: 600, y: 500 };
    state.asteroids = [
      createAsteroid(state, 'large', { x: 200, y: 200 }, { x: 0, y: 0 }, 'common')
    ];
    state.bullets = [
      {
        id: 901,
        owner: 'boss',
        position: { x: 240, y: 200 },
        velocity: { x: -120, y: 0 },
        age: 0,
        radius: 6,
        damage: 18,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'ricochet',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.bullets.some((bullet) => bullet.id === 901)).toBe(false);
  });

  it('uses tuned hostile projectile damage when hitting the ship', () => {
    const state = createGameState(800, 600);
    state.ship.invulnerableFor = 0;
    state.ship.hp = 100;
    state.asteroids = [];
    state.bullets = [
      {
        id: 900,
        owner: 'boss',
        position: { ...state.ship.position },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 18,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.ship.hp).toBe(82);
  });

  it('detects the first gate boss after enough asteroid kills', () => {
    const state = createGameState(800, 600);
    state.progression.achievementStats.asteroidsDestroyed = 1000;
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids - 1;
    state.asteroids = [
      createAsteroid(state, 'small', { x: 100, y: 100 }, { x: 0, y: 0 }, 'common')
    ];
    state.bullets = [
      {
        id: 902,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 1,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.pendingBoss?.bossZoneIndex).toBe(1);
    expect(state.pendingBoss?.bossType).toBe(zones[1].bossType);
    expect(state.rewardEvents.some((event) => event.kind === 'boss' && event.text.includes('First gate boss'))).toBe(true);
  });

  it('does not trigger the first boss from lifetime asteroid kills after core reset', () => {
    const state = createGameState(800, 600);
    state.progression.achievementStats.asteroidsDestroyed = 1000;
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids;

    const nextState = createCoreResetState(state, 800, 600, 1);

    updateGame(nextState, neutralInput(), 0);

    expect(nextState.progression.achievementStats.asteroidsDestroyed).toBe(1000);
    expect(nextState.progression.firstGateAsteroidsDestroyed).toBe(0);
    expect(nextState.pendingBoss).toBeNull();
  });

  it('discovers rare post-first gate bosses from asteroid progress', () => {
    const state = createGameState(800, 600);
    state.progression.unlockedZoneIndex = 1;
    state.progression.currentZoneIndex = 1;
    state.progression.travelLevel = 1;
    state.progression.bossDiscovery.rareBossProgress = balance.bosses.rareDiscoveryAsteroids;

    updateGame(state, neutralInput(), 0);

    expect(state.pendingBoss?.bossZoneIndex).toBe(2);
    expect(state.pendingBoss?.bossType).toBe(zones[2].bossType);
    expect(state.progression.bossDiscovery.rareBossProgress).toBe(0);
    expect(state.progression.bossDiscovery.rareBossesFound).toBe(1);
  });

  it('waits to discover rare bosses until the player reaches the current frontier zone', () => {
    const state = createGameState(800, 600);
    state.progression.unlockedZoneIndex = 2;
    state.progression.currentZoneIndex = 1;
    state.progression.travelLevel = 2;
    state.progression.bossDiscovery.rareBossProgress = balance.bosses.rareDiscoveryAsteroids;

    updateGame(state, neutralInput(), 0);

    expect(state.pendingBoss).toBeNull();
    expect(state.progression.bossDiscovery.rareBossProgress).toBe(balance.bosses.rareDiscoveryAsteroids);
  });

  it('calculates global core gain from Nova Crown threat level', () => {
    const state = createGameState(800, 600);
    state.crystals = crystalsPerPrestigeCore * 2 + 3;

    expect(getPrestigeCoreGain(state)).toBe(0);

    state.progression.currentZoneIndex = zones.length - 1;
    state.progression.unlockedZoneIndex = zones.length - 1;
    state.progression.travelLevel = zones.length - 1;
    state.survival.active = true;
    state.survival.threatLevel = minimumCoreResetThreatLevel - 1;

    expect(crystalsPerPrestigeCore).toBe(12);
    expect(getPrestigeCoreGain(state)).toBe(0);

    state.survival.threatLevel = 20;

    expect(getPrestigeCoreGain(state)).toBe(2);
  });

  it('defeating a boss unlocks the next zone without moving the current zone', () => {
    const state = createGameState(800, 600);
    state.asteroids = [makeBossAsteroid(1)];
    state.bullets = [
      {
        id: 900,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 1,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.progression.unlockedZoneIndex).toBe(1);
    expect(state.progression.currentZoneIndex).toBe(0);
    expect(state.progression.mapUnlocked).toBe(true);
    expect(state.progression.bossDefeats).toBe(1);
    expect(state.rewardEvents.some((event) => event.kind === 'unlock' && event.text.includes('Orion Forge'))).toBe(true);
    expect(state.audioEvents.some((event) => event.type === 'bossDefeated')).toBe(true);
  });

  it('awards difficulty-scaled global cores when defeating a boss inside Nova Crown', () => {
    const state = createGameState(800, 600);
    state.progression.currentZoneIndex = zones.length - 1;
    state.progression.unlockedZoneIndex = zones.length - 1;
    state.progression.travelLevel = zones.length - 1;
    state.survival.active = true;
    state.survival.difficulty = 5;
    state.asteroids = [makeBossAsteroid(zones.length - 1)];
    state.bullets = [
      {
        id: 900,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 1,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.progression.prestigeCores).toBe(getNovaCrownCoreReward(5));
    expect(state.rewardEvents.some((event) => event.text.includes('Nova Crown boss defeated'))).toBe(true);
  });

  it('recharges shield bubble state after it breaks', () => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];
    state.shieldBubble = {
      active: false,
      broken: true,
      rechargeFor: 1,
      hitFlashFor: 0.2
    };

    updateGame(state, neutralInput(), 1.1);

    expect(state.shieldBubble).toEqual({
      active: true,
      broken: false,
      rechargeFor: 0,
      hitFlashFor: 0
    });
  });

  it('shield bubble absorbs one asteroid collision before hull damage', () => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];
    state.shieldBubble = {
      active: true,
      broken: false,
      rechargeFor: 0,
      hitFlashFor: 0
    };
    state.ship.invulnerableFor = 0;
    state.ship.hp = 100;
    state.asteroids = [
      createAsteroid(state, 'large', { ...state.ship.position }, { x: 0, y: 0 }, 'common')
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.ship.hp).toBe(100);
    expect(state.shieldBubble.active).toBe(false);
    expect(state.shieldBubble.broken).toBe(true);
    expect(state.shieldBubble.rechargeFor).toBeGreaterThan(0);
    expect(state.shieldBubble.hitFlashFor).toBeGreaterThan(0);
  });

  it('pushes the ship out of asteroid overlap on direct collision', () => {
    const state = createGameState(800, 600);
    const asteroid = createAsteroid(state, 'large', { ...state.ship.position }, { x: 0, y: 0 }, 'common');
    state.ship.invulnerableFor = 0;
    state.ship.velocity = { x: 0, y: 0 };
    state.asteroids = [asteroid];

    updateGame(state, neutralInput(), 0);

    const separation = Math.hypot(
      state.ship.position.x - asteroid.position.x,
      state.ship.position.y - asteroid.position.y
    );
    const minimumSeparation =
      state.ship.radius +
      asteroid.radius * balance.asteroids.collisionRadiusMultiplier +
      balance.collisions.shipContactSeparationPadding;

    expect(separation).toBeGreaterThanOrEqual(minimumSeparation);
    expect(Math.hypot(state.ship.velocity.x, state.ship.velocity.y)).toBeGreaterThan(0);
    expect(state.ship.hp).toBeLessThan(state.ship.maxHp);
  });

  it('shield bubble absorbs one hostile projectile before hull damage', () => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];
    state.shieldBubble = {
      active: true,
      broken: false,
      rechargeFor: 0,
      hitFlashFor: 0
    };
    state.ship.invulnerableFor = 0;
    state.ship.hp = 100;
    state.asteroids = [];
    state.bullets = [
      {
        id: 900,
        owner: 'boss',
        position: { ...state.ship.position },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 28,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    updateGame(state, neutralInput(), 0);

    expect(state.ship.hp).toBe(100);
    expect(state.bullets).toHaveLength(0);
    expect(state.shieldBubble.active).toBe(false);
    expect(state.shieldBubble.broken).toBe(true);
  });

  it('core reset preserves global progress while resetting bought ship upgrades', () => {
    const state = createGameState(800, 600);
    state.money = 5000;
    state.crystals = 48;
    state.progression.prestigeCores = 2;
    state.progression.ownedWarpUnlockIds = ['droneSystems', 'bossBeacon'];
    state.progression.announcedAffordableWarpUnlockIds = ['droneSystems', 'bossBeacon'];
    state.progression.maxHp = 150;
    state.progression.shipDamageLevel = 2;
    state.progression.guidedMissions = {
      activeMissionId: 'warpForFirstCore',
      completedMissionIds: ['drawGateBoss', 'defeatGateBoss', 'collectWarpCrystals'],
      repeatCompletions: 0,
      startedAt: {
        firstGateAsteroidsDestroyed: balance.bosses.firstGateAsteroids,
        asteroidsDestroyed: 0,
        moneyEarned: 0,
        crystalsCollected: 0,
        deaths: 0,
        bossDefeats: 1,
        crystals: 0,
        prestigeCores: 2
      }
    };
    state.progression.unlockedZoneIndex = 3;
    state.progression.currentZoneIndex = 3;
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids;
    state.progression.novaCrownCoreRewardedDifficultyKeys = ['1', '4'];
    state.bossRewards.activeIds = ['rapidFire'];
    state.bossRewards.pendingChoiceIds = ['droneOverdrive'];
    state.progression.achievementStats.asteroidsDestroyed = 120;
    state.progression.achievementStats.prestigeWarps = 4;
    state.progression.unlockedAchievements.firstBlood = true;

    const nextState = createCoreResetState(state, 800, 600, 3);

    expect(nextState.money).toBe(0);
    expect(nextState.crystals).toBe(0);
    expect(nextState.progression.prestigeCores).toBe(5);
    expect(nextState.progression.ownedWarpUnlockIds).toEqual(['droneSystems', 'bossBeacon']);
    expect(nextState.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems', 'bossBeacon']);
    expect(nextState.progression.maxHp).toBe(100);
    expect(nextState.progression.shipDamageLevel).toBe(1);
    expect(nextState.progression.shipFireRateLevel).toBe(0);
    expect(nextState.progression.passiveIncomeLevel).toBe(0);
    expect(nextState.bossRewards.activeIds).toEqual([]);
    expect(nextState.bossRewards.pendingChoiceIds).toEqual([]);
    expect(nextState.progression.shipExchanges).toBe(0);
    expect(nextState.progression.unlockedShipFrameIds).toEqual(['vector']);
    expect(nextState.progression.activeShipFrameId).toBe('vector');
    expect(nextState.progression.guidedMissions.activeMissionId).toBe('warpForFirstCore');
    expect(nextState.progression.guidedMissions.completedMissionIds).toEqual(['drawGateBoss', 'defeatGateBoss', 'collectWarpCrystals']);
    expect(nextState.ship.maxHp).toBe(100);
    expect(nextState.progression.unlockedZoneIndex).toBe(0);
    expect(nextState.progression.currentZoneIndex).toBe(0);
    expect(nextState.progression.firstGateAsteroidsDestroyed).toBe(0);
    expect(nextState.progression.novaCrownCoreRewardedDifficultyKeys).toEqual(['1', '4']);
    expect(nextState.progression.achievementStats.asteroidsDestroyed).toBe(120);
    expect(nextState.progression.achievementStats.prestigeWarps).toBe(5);
    expect(nextState.progression.unlockedAchievements.firstBlood).toBe(true);
  });

  it('keeps separate money, crystals, and upgrades for each unlocked ship frame', () => {
    const state = createGameState(800, 600);
    state.money = 1400;
    state.crystals = 9;
    state.progression.shipDamageLevel = 12;
    state.progression.passiveIncomeLevel = 7;
    state.progression.prestigeCores = 5;
    state.progression.ownedWarpUnlockIds = ['droneSystems'];
    state.progression.unlockedShipFrameIds = ['vector', 'kestrel'];
    state.progression.shipExchanges = 1;

    const kestrelState = createShipFrameSwitchState(state, 800, 600, 'kestrel');

    expect(kestrelState.progression.activeShipFrameId).toBe('kestrel');
    expect(kestrelState.money).toBe(0);
    expect(kestrelState.crystals).toBe(0);
    expect(kestrelState.progression.shipDamageLevel).toBe(1);
    expect(kestrelState.progression.passiveIncomeLevel).toBe(0);
    expect(kestrelState.progression.prestigeCores).toBe(5);
    expect(kestrelState.progression.ownedWarpUnlockIds).toEqual(['droneSystems']);

    kestrelState.money = 320;
    kestrelState.crystals = 2;
    kestrelState.progression.shipDamageLevel = 3;

    const vectorState = createShipFrameSwitchState(kestrelState, 800, 600, 'vector');

    expect(vectorState.progression.activeShipFrameId).toBe('vector');
    expect(vectorState.money).toBe(1400);
    expect(vectorState.crystals).toBe(9);
    expect(vectorState.progression.shipDamageLevel).toBe(12);
    expect(vectorState.progression.passiveIncomeLevel).toBe(7);

    const restoredKestrel = createShipFrameSwitchState(vectorState, 800, 600, 'kestrel');

    expect(restoredKestrel.money).toBe(320);
    expect(restoredKestrel.crystals).toBe(2);
    expect(restoredKestrel.progression.shipDamageLevel).toBe(3);
  });

  it('core reset resets the active ship without unlocking the next ship frame', () => {
    const state = createGameState(800, 600);
    state.money = 2200;
    state.crystals = crystalsPerPrestigeCore;
    state.progression.travelLevel = zones.length - 1;
    state.progression.unlockedZoneIndex = zones.length - 1;
    state.progression.currentZoneIndex = zones.length - 1;
    state.progression.shipDamageLevel = 10;
    state.progression.shipFireRateLevel = 8;

    const nextState = createCoreResetState(state, 800, 600, 1);

    expect(nextState.progression.activeShipFrameId).toBe('vector');
    expect(nextState.progression.unlockedShipFrameIds).toEqual(['vector']);
    expect(nextState.money).toBe(0);
    expect(nextState.crystals).toBe(0);
    expect(nextState.progression.shipDamageLevel).toBe(1);
    expect(nextState.progression.shipRuns.vector?.money).toBe(0);
    expect(nextState.progression.shipRuns.vector?.crystals).toBe(0);
    expect(nextState.progression.shipRuns.vector?.shipDamageLevel).toBe(1);
  });

  it('starts with only Vector and does not unlock ships from exchange count', () => {
    expect(createProgression().unlockedShipFrameIds).toEqual(['vector']);
    expect(getUnlockedShipFrameIdsForExchangeCount(9)).toEqual(['vector']);
  });

  it('unlocks ship frames from their milestone progress', () => {
    const state = createGameState(800, 600);

    state.progression.achievementStats.asteroidsDestroyed = 1000;
    state.progression.shipUnlockProgress.asteroidCollisions = 1000;
    state.progression.shipUnlockProgress.asteroidBurstBest = 3;
    state.progression.shipUnlockProgress.novaCrownShipFrameIds = ['vector', 'kestrel', 'bulwark'];
    state.progression.shipUnlockProgress.meteorImpactsSurvived = 250;
    state.progression.shipUnlockProgress.wraithNoDamageSeconds = 180;
    state.progression.survivalBestSeconds = 600;
    state.progression.survivalBestThreatLevel = 30;

    syncShipUnlocks(state);

    expect(state.progression.unlockedShipFrameIds).toEqual([
      'vector',
      'kestrel',
      'bulwark',
      'needle',
      'atlas',
      'ember',
      'voidRunner',
      'wraith',
      'aurora',
      'nivitron'
    ]);
  });

  it('unlocks Prism from rare boss drop or pity progress', () => {
    const dropState = createGameState(800, 600);
    recordPrismBossDefeatUnlockProgress(dropState, 0.01);
    syncShipUnlocks(dropState);
    expect(dropState.progression.unlockedShipFrameIds).toContain('prism');

    const pityState = createGameState(800, 600);
    for (let index = 0; index < 50; index += 1) {
      recordPrismBossDefeatUnlockProgress(pityState, 0.99);
    }
    syncShipUnlocks(pityState);
    expect(pityState.progression.unlockedShipFrameIds).toContain('prism');
  });
});

describe('asteroid rewards', () => {
  it('keeps crystal asteroids out of the first zone spawn table', () => {
    const firstZoneCrystalWeight = balance.asteroids.variantWeights.lyraGate.find((entry) => entry.variant === 'crystal')?.weight;
    const secondZoneCrystalWeight = balance.asteroids.variantWeights.orionForge.find((entry) => entry.variant === 'crystal')?.weight;

    expect(firstZoneCrystalWeight).toBe(0);
    expect(secondZoneCrystalWeight).toBeGreaterThan(0);
  });

  it('calculates reward variants from current progression multipliers', () => {
    const state = createGameState(800, 600);

    expect(getAsteroidReward(state, createAsteroid(state, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'common'))).toEqual({
      money: 20,
      crystals: 0
    });
    expect(getAsteroidReward(state, createAsteroid(state, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'metallic'))).toEqual({
      money: 45,
      crystals: 0
    });
    expect(getAsteroidReward(state, createAsteroid(state, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'crystal'))).toEqual({
      money: 13,
      crystals: 3
    });
    expect(getAsteroidReward(state, createAsteroid(state, 'large', { x: 0, y: 0 }, { x: 0, y: 0 }, 'dense'))).toEqual({
      money: 35,
      crystals: 0
    });
  });

  it('scales asteroid durability contact damage and rewards by current zone', () => {
    const firstZone = createGameState(800, 600);
    const finalZone = createGameState(800, 600);
    finalZone.progression.unlockedZoneIndex = 4;
    finalZone.progression.currentZoneIndex = 4;
    finalZone.progression.travelLevel = 4;

    const firstAsteroid = createAsteroid(firstZone, 'small', { x: 0, y: 0 }, { x: 0, y: 0 }, 'common');
    const finalAsteroid = createAsteroid(finalZone, 'small', { x: 0, y: 0 }, { x: 0, y: 0 }, 'common');

    expect(finalAsteroid.maxHp).toBeGreaterThan(firstAsteroid.maxHp);
    expect(getAsteroidReward(finalZone, finalAsteroid).money).toBeGreaterThan(getAsteroidReward(firstZone, firstAsteroid).money);

    firstZone.ship.invulnerableFor = 0;
    finalZone.ship.invulnerableFor = 0;
    firstZone.asteroids = [createAsteroid(firstZone, 'small', { ...firstZone.ship.position }, { x: 0, y: 0 }, 'common')];
    finalZone.asteroids = [createAsteroid(finalZone, 'small', { ...finalZone.ship.position }, { x: 0, y: 0 }, 'common')];

    updateGame(firstZone, neutralInput(), 0);
    updateGame(finalZone, neutralInput(), 0);

    expect(100 - finalZone.ship.hp).toBeGreaterThan(100 - firstZone.ship.hp);
  });
});
