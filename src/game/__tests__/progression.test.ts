import { beforeEach, describe, expect, it, vi } from 'vitest';
import { neutralInput } from '../input/actions';
import { getCrystalBalance, purchaseTalentRank, spendCrystals } from '../progression/currency';
import { createProgression } from '../simulation/state';
import { getFireRateMultiplier, getPlayerFireInterval, getRefineryMilestoneMultiplier } from '../progression/idleBonuses';
import { createWarpResetState, crystalsPerPrestigeCore, getPrestigeCoreGain, minimumPrestigeTravelLevel } from '../progression/prestige';
import { clearAllAsteridleData, loadGameState, saveGameState, SAVE_VERSION_NOTES } from '../progression/saveData';
import { getFirstWarpGoal } from '../progression/firstWarpGoal';
import { WARP_UNLOCK_BY_ID, WARP_UNLOCK_DEFINITIONS, getWarpUnlockNodeState, hasWarpUnlock, meetsWarpUnlockRequirements, purchaseWarpUnlock } from '../progression/warpUnlocks';
import { createGameState } from '../simulation/state';
import { createAsteroid, createZoneBossFromPending, getAsteroidReward } from '../simulation/systems/asteroids';
import { updateDrones } from '../simulation/systems/drones';
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
    expect(SAVE_VERSION_NOTES[1]).toContain('progression');
    expect(SAVE_VERSION_NOTES[1]).toContain('ship');
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
    savedState.progression.ownedWarpUnlockIds = ['droneSystems'];
    savedState.progression.announcedAffordableWarpUnlockIds = ['droneSystems'];
    savedState.ship.position = { x: 180, y: 220 };
    savedState.ship.hp = 72;

    saveGameState(savedState);
    const stored = JSON.parse(window.localStorage.getItem(saveKey) ?? '{}') as { version?: unknown };

    expect(stored.version).toBe(1);

    const loadedState = loadGameState(800, 600);

    expect(loadedState.money).toBe(250);
    expect(loadedState.crystals).toBe(6);
    expect(loadedState.progression.shipDamageLevel).toBe(3);
    expect(loadedState.progression.shipFireRateLevel).toBe(4);
    expect(loadedState.progression.bossDiscovery).toEqual({
      rareBossProgress: 12,
      rareBossesFound: 1
    });
    expect(loadedState.progression.ownedWarpUnlockIds).toEqual(['droneSystems']);
    expect(loadedState.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems']);
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
        version: 1,
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
        version: 1,
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

    expect(state.progression.ownedWarpUnlockIds).toEqual(['droneSystems', 'spreadBattery']);
  });

  it('defaults shield bubble state for saves without shield data', () => {
    const progression = createProgression();
    progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];

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

  it('migrates persisted shield bubble state into owned warp unlocks', () => {
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

    expect(state.progression.ownedWarpUnlockIds).toEqual(['deflectorFrame', 'shieldBubble']);
    expect(state.progression.deflectorLevel).toBe(1);
    expect(state.shieldBubble).toEqual({
      active: false,
      broken: true,
      rechargeFor: 5,
      hitFlashFor: 0.1
    });
  });
});

describe('warp unlock definitions', () => {
  it('defines the first permanent warp unlock route', () => {
    expect(WARP_UNLOCK_DEFINITIONS.map((unlock) => unlock.id)).toEqual([
      'droneSystems',
      'bossBeacon',
      'spreadBattery',
      'deflectorFrame',
      'shieldBubble',
      'rangerHangar',
      'missileFoundry',
      'piercingRail'
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
    expect(cost('spreadBattery')).toBe(3);
    expect(cost('deflectorFrame')).toBeGreaterThan(cost('bossBeacon'));
    expect(cost('shieldBubble')).toBeGreaterThan(cost('deflectorFrame'));
    expect(cost('missileFoundry')).toBeGreaterThanOrEqual(8);
    expect(cost('piercingRail')).toBeGreaterThanOrEqual(8);
    expect(totalCost).toBeGreaterThanOrEqual(38);
    expect(totalCost).toBeLessThanOrEqual(45);
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
    expect(purchaseWarpUnlock(progression, 'spreadBattery')).toBe(true);
    expect(purchaseWarpUnlock(progression, 'deflectorFrame')).toBe(true);

    expect(progression.shipDamageLevel).toBe(1);
    expect(progression.maxHp).toBe(100);
    expect(progression.armor).toBe(0);
    expect(progression.shipSpeedLevel).toBe(0);
    expect(progression.spreadUnlocked).toBe(true);
    expect(progression.deflectorLevel).toBe(1);
    expect(progression.ownedWarpUnlockIds).toContain('bossBeacon');
    expect(progression.ownedWarpUnlockIds).toContain('droneSystems');
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
    state.progression.travelLevel = minimumPrestigeTravelLevel;
    state.crystals = crystalsPerPrestigeCore;

    expect(getFirstWarpGoal(state)?.type).toBe('warpForFirstCore');

    state.crystals = 0;
    state.progression.prestigeCores = WARP_UNLOCK_BY_ID.droneSystems.cost;

    expect(getFirstWarpGoal(state)?.type).toBe('installDroneSystems');

    state.progression.ownedWarpUnlockIds = ['droneSystems'];

    expect(getFirstWarpGoal(state)).toBeNull();
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
  it('keeps core credit upgrade curves cheap early and multi-hour near the level cap', () => {
    const tracks = [
      { baseCost: balance.economy.passiveCost.base, scale: balance.economy.passiveCost.scale },
      { baseCost: balance.shop.ship.damage.baseCost, scale: balance.shop.ship.damage.scale },
      { baseCost: balance.shop.ship.fireRate.baseCost, scale: balance.shop.ship.fireRate.scale },
      { baseCost: balance.shop.ship.hp.baseCost, scale: balance.shop.ship.hp.scale }
    ];
    const lateIncomePerSecond =
      balance.shop.upgradeBaseCap *
      balance.economy.passiveIncomePerLevel *
      getRefineryMilestoneMultiplier(balance.shop.upgradeBaseCap);

    tracks.forEach(({ baseCost, scale }) => {
      expect(scaledCost(baseCost, 0, scale)).toBeLessThanOrEqual(70);
      expect(scaledCost(baseCost, 25, scale)).toBeLessThanOrEqual(160);
      expect(scaledCost(baseCost, balance.shop.upgradeBaseCap - 1, scale) / lateIncomePerSecond).toBeGreaterThanOrEqual(8 * 60 * 60);
    });
  });

  it('keeps capped fire-rate purchases effective through the current upgrade cap', () => {
    const progression = createProgression();
    progression.shipFireRateLevel = balance.shop.upgradeBaseCap;

    expect(getFireRateMultiplier(progression)).toBe(16);
    expect(getPlayerFireInterval(progression)).toBeGreaterThan(balance.shop.ship.fireRate.minimumInterval);
  });

  it('applies fire rate levels to player weapon cooldown', () => {
    const state = createGameState(800, 600);

    firePlayerWeapon(state);
    const baseCooldown = state.ship.fireCooldown;

    state.ship.fireCooldown = 0;
    state.progression.shipFireRateLevel = 10;
    firePlayerWeapon(state);

    expect(state.ship.fireCooldown).toBeLessThan(baseCooldown);
    expect(state.ship.fireCooldown).toBeGreaterThanOrEqual(balance.shop.ship.fireRate.minimumInterval);
  });

  it('paces spread shot from the normal cannon instead of a faster standalone cooldown', () => {
    const state = createGameState(800, 600);
    state.progression.spreadUnlocked = true;
    state.progression.weaponMode = 'spread';
    state.progression.shipDamageLevel = 10;

    firePlayerWeapon(state);

    expect(state.bullets).toHaveLength(balance.weapons.spreadAngleOffsets.length);
    expect(state.ship.fireCooldown).toBeCloseTo(balance.weapons.playerFireInterval * balance.weapons.spreadCooldownMultiplier);
    expect(state.bullets[0]?.damage).toBeCloseTo(
      state.progression.shipDamageLevel *
        balance.weapons.playerDamageMultiplier *
        balance.weapons.spreadDamageMultiplier
    );
  });

  it('scales drone damage from the current ship damage', () => {
    const state = createGameState(800, 600);
    state.progression.droneCounts.sentry = 1;
    state.drones = [
      {
        id: 10,
        type: 'sentry',
        position: { ...state.ship.position },
        angle: 0,
        orbitRadius: 42,
        fireCooldown: 0
      }
    ];
    state.asteroids = [
      createAsteroid(state, 'large', { x: state.ship.position.x + 80, y: state.ship.position.y }, { x: 0, y: 0 }, 'common')
    ];

    updateDrones(state, 0);
    const baseDamage = state.bullets[0]?.damage ?? 0;

    state.bullets = [];
    state.drones[0].fireCooldown = 0;
    state.progression.shipDamageLevel = 5;
    updateDrones(state, 0);

    expect(state.bullets[0]?.damage).toBeGreaterThan(baseDamage);
    expect(state.bullets[0]?.damage).toBeCloseTo(5 * balance.weapons.playerDamageMultiplier);
  });
});

describe('boss gates and warp reset', () => {
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

  it('does not trigger the first boss from lifetime asteroid kills after warp reset', () => {
    const state = createGameState(800, 600);
    state.progression.achievementStats.asteroidsDestroyed = 1000;
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids;

    const nextState = createWarpResetState(state, 800, 600, 1);

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

  it('calculates first warp core gain after the first route gate', () => {
    const state = createGameState(800, 600);
    state.crystals = crystalsPerPrestigeCore * 2 + 3;
    state.progression.travelLevel = minimumPrestigeTravelLevel - 1;

    expect(getPrestigeCoreGain(state)).toBe(0);

    state.progression.travelLevel = minimumPrestigeTravelLevel;

    expect(minimumPrestigeTravelLevel).toBe(1);
    expect(crystalsPerPrestigeCore).toBe(12);
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

  it('warp reset preserves cores and achievements while clearing run state', () => {
    const state = createGameState(800, 600);
    state.money = 5000;
    state.crystals = 48;
    state.progression.prestigeCores = 2;
    state.progression.ownedWarpUnlockIds = ['droneSystems', 'bossBeacon', 'spreadBattery'];
    state.progression.announcedAffordableWarpUnlockIds = ['droneSystems', 'bossBeacon'];
    state.progression.maxHp = 150;
    state.progression.shipDamageLevel = 2;
    state.progression.unlockedZoneIndex = 3;
    state.progression.currentZoneIndex = 3;
    state.progression.firstGateAsteroidsDestroyed = balance.bosses.firstGateAsteroids;
    state.progression.achievementStats.asteroidsDestroyed = 120;
    state.progression.achievementStats.prestigeWarps = 4;
    state.progression.unlockedAchievements.firstBlood = true;

    const nextState = createWarpResetState(state, 800, 600, 3);

    expect(nextState.money).toBe(0);
    expect(nextState.crystals).toBe(0);
    expect(nextState.progression.prestigeCores).toBe(5);
    expect(nextState.progression.ownedWarpUnlockIds).toEqual(['droneSystems', 'bossBeacon', 'spreadBattery']);
    expect(nextState.progression.announcedAffordableWarpUnlockIds).toEqual(['droneSystems', 'bossBeacon']);
    expect(nextState.progression.maxHp).toBe(150);
    expect(nextState.progression.shipDamageLevel).toBe(2);
    expect(nextState.ship.maxHp).toBe(150);
    expect(nextState.progression.unlockedZoneIndex).toBe(0);
    expect(nextState.progression.currentZoneIndex).toBe(0);
    expect(nextState.progression.firstGateAsteroidsDestroyed).toBe(0);
    expect(nextState.progression.achievementStats.asteroidsDestroyed).toBe(120);
    expect(nextState.progression.achievementStats.prestigeWarps).toBe(5);
    expect(nextState.progression.unlockedAchievements.firstBlood).toBe(true);
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
});
