import { beforeEach, describe, expect, it, vi } from 'vitest';
import { neutralInput } from '../input/actions';
import { loadGameState, saveGameState } from '../progression/saveData';
import { createGameState } from '../simulation/state';
import { getAsteroidTargetCount } from '../simulation/systems/asteroids';
import { resolveCollisions } from '../simulation/systems/collisions';
import { updateSaucer } from '../simulation/systems/enemies';
import { updateGame } from '../simulation/systems/gameLoop';
import { updateRareSpawns } from '../simulation/systems/rareSpawns';
import { getSurvivalThreatLevel } from '../simulation/systems/survival';
import { updateSurvivalHazards } from '../simulation/systems/survivalHazards';
import { zones } from '../simulation/zones';
import { balance } from '../balance';

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

const putInFinalZone = (state: ReturnType<typeof createGameState>): void => {
  const finalZoneIndex = zones.length - 1;
  state.progression.unlockedZoneIndex = finalZoneIndex;
  state.progression.currentZoneIndex = finalZoneIndex;
  state.progression.travelLevel = finalZoneIndex;
  state.asteroids = [];
  state.saucerTimer = 999;
};

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: createLocalStorage()
  });
});

describe('nova crown survival', () => {
  it('tracks the current survival timer, threat level, and best run while alive in the final zone', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);

    updateGame(state, neutralInput(), balance.survival.threatLevelSeconds + 0.5);

    expect(state.survival.active).toBe(true);
    expect(state.survival.currentSeconds).toBeCloseTo(balance.survival.threatLevelSeconds + 0.5);
    expect(state.survival.threatLevel).toBe(2);
    expect(state.progression.survivalBestSeconds).toBeCloseTo(state.survival.currentSeconds);
    expect(state.progression.survivalBestThreatLevel).toBe(2);

    state.ship.alive = false;
    state.ship.respawnFor = 1;
    updateGame(state, neutralInput(), 0.1);

    expect(state.survival.active).toBe(false);
    expect(state.survival.currentSeconds).toBe(0);
    expect(state.progression.survivalBestThreatLevel).toBe(2);
    expect(state.progression.currentZoneIndex).toBe(zones.length - 2);
  });

  it('adds asteroid pressure as survival threat rises', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = getSurvivalThreatLevel(0);
    const startingTarget = getAsteroidTargetCount(state);

    state.survival.threatLevel = getSurvivalThreatLevel(balance.survival.threatLevelSeconds * 4);

    expect(getAsteroidTargetCount(state)).toBeGreaterThan(startingTarget);
  });

  it('persists survival bests and an active final-zone survival timer', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival = {
      active: true,
      currentSeconds: 76,
      threatLevel: 3,
      lastAnnouncedThreatLevel: 3,
      hazardSpawnCooldown: 0,
      hunterSpawnCooldown: 0
    };
    state.progression.survivalBestSeconds = 76;
    state.progression.survivalBestThreatLevel = 3;

    saveGameState(state);
    const loaded = loadGameState(800, 600);

    expect(loaded.progression.currentZoneIndex).toBe(zones.length - 1);
    expect(loaded.survival.currentSeconds).toBe(76);
    expect(loaded.survival.threatLevel).toBe(3);
    expect(loaded.progression.survivalBestSeconds).toBe(76);
    expect(loaded.progression.survivalBestThreatLevel).toBe(3);
  });

  it('spawns proximity mines only after survival threat reaches the mine threshold', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.mines.startsAtThreatLevel - 1;
    state.survival.hazardSpawnCooldown = 0;

    updateSurvivalHazards(state, 1);

    expect(state.hazards).toHaveLength(0);

    state.survival.threatLevel = balance.survival.mines.startsAtThreatLevel;
    updateSurvivalHazards(state, 1);

    expect(state.hazards).toHaveLength(1);
    expect(state.hazards[0]?.kind).toBe('proximityMine');
  });

  it('uses the rare spawn system to introduce scarce mines from the third zone onward', () => {
    const earlyState = createGameState(800, 600);
    earlyState.progression.unlockedZoneIndex = 1;
    earlyState.progression.currentZoneIndex = 1;
    earlyState.progression.travelLevel = 1;
    earlyState.rareSpawns.cooldowns.proximityMine = 0;

    updateRareSpawns(earlyState, 1);

    expect(earlyState.hazards).toHaveLength(0);

    const thirdZoneState = createGameState(800, 600);
    thirdZoneState.progression.unlockedZoneIndex = 2;
    thirdZoneState.progression.currentZoneIndex = 2;
    thirdZoneState.progression.travelLevel = 2;
    thirdZoneState.rareSpawns.cooldowns.proximityMine = 0;

    updateRareSpawns(thirdZoneState, 1);

    expect(thirdZoneState.hazards).toHaveLength(1);
    expect(thirdZoneState.hazards[0]?.kind).toBe('proximityMine');
    expect(thirdZoneState.rareSpawns.cooldowns.proximityMine).toBeGreaterThan(0);
  });

  it('detonates armed proximity mines against the ship', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.hazards = [
      {
        id: 999,
        kind: 'proximityMine',
        position: { ...state.ship.position },
        velocity: { x: 0, y: 0 },
        radius: balance.survival.mines.radius,
        trail: [],
        age: 2,
        armFor: 0,
        fuseFor: balance.survival.mines.fuseSeconds,
        hp: 1,
        maxHp: 1,
        damage: balance.survival.mines.damage
      }
    ];

    resolveCollisions(state);

    expect(state.hazards).toHaveLength(0);
    expect(state.ship.hp).toBe(100 - balance.survival.mines.damage);
  });

  it('spawns survival hunters only after the hunter threat threshold', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.hunters.startsAtThreatLevel - 1;
    state.survival.hunterSpawnCooldown = 0;

    updateSurvivalHazards(state, 1);

    expect(state.hazards.some((hazard) => hazard.kind === 'survivalHunter')).toBe(false);

    state.survival.threatLevel = balance.survival.hunters.startsAtThreatLevel;
    updateSurvivalHazards(state, 1);

    expect(state.hazards.some((hazard) => hazard.kind === 'survivalHunter')).toBe(true);
  });

  it('upgrades saucer spawns into elite survival saucers after the elite threat threshold', () => {
    const normalState = createGameState(800, 600);
    putInFinalZone(normalState);
    normalState.survival.active = true;
    normalState.survival.threatLevel = balance.saucer.elite.startsAtSurvivalThreatLevel - 1;
    normalState.saucerTimer = 0;

    updateSaucer(normalState, 0);

    expect(normalState.saucer?.kind).toBe('normal');

    const eliteState = createGameState(800, 600);
    putInFinalZone(eliteState);
    eliteState.survival.active = true;
    eliteState.survival.threatLevel = balance.saucer.elite.startsAtSurvivalThreatLevel;
    eliteState.saucerTimer = 0;

    updateSaucer(eliteState, 0);

    expect(eliteState.saucer?.kind).toBe('elite');
    expect(eliteState.saucer?.radius).toBe(balance.saucer.elite.radius);
  });

  it('fires elite saucer spread shots that damage the ship', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.survival.active = true;
    state.survival.threatLevel = balance.saucer.elite.startsAtSurvivalThreatLevel;
    state.saucerTimer = 0;

    updateSaucer(state, 0);
    expect(state.saucer?.kind).toBe('elite');

    state.saucer!.position = { x: state.ship.position.x - 120, y: state.ship.position.y };
    state.saucer!.fireCooldown = 0;
    updateSaucer(state, 0);

    expect(state.bullets).toHaveLength(balance.saucer.elite.bulletAngleOffsets.length);
    expect(state.bullets[0]?.damage).toBe(balance.saucer.elite.bulletDamage);

    state.bullets[0].position = { ...state.ship.position };
    resolveCollisions(state);

    expect(state.ship.hp).toBe(100 - balance.saucer.elite.bulletDamage);
  });

  it('steers survival hunters toward the ship and removes them on contact', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.hazards = [
      {
        id: 1001,
        kind: 'survivalHunter',
        position: { x: state.ship.position.x - 120, y: state.ship.position.y },
        velocity: { x: 0, y: 0 },
        radius: balance.survival.hunters.radius,
        trail: [{ x: state.ship.position.x - 120, y: state.ship.position.y }],
        age: 0,
        armFor: 0,
        fuseFor: 0,
        hp: balance.survival.hunters.hp,
        maxHp: balance.survival.hunters.hp,
        damage: balance.survival.hunters.damage
      }
    ];

    updateSurvivalHazards(state, 0.5);

    expect(state.hazards[0]?.velocity.x).toBeGreaterThan(0);
    expect(state.hazards[0]?.trail.length).toBeGreaterThan(1);

    state.hazards[0].position = { ...state.ship.position };
    resolveCollisions(state);

    expect(state.hazards).toHaveLength(0);
    expect(state.ship.hp).toBe(100 - balance.survival.hunters.damage);
  });

  it('lets player shots damage and destroy survival hunters', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.hazards = [
      {
        id: 1002,
        kind: 'survivalHunter',
        position: { x: state.ship.position.x + 64, y: state.ship.position.y },
        velocity: { x: 0, y: 0 },
        radius: balance.survival.hunters.radius,
        trail: [{ x: state.ship.position.x + 64, y: state.ship.position.y }],
        age: 0,
        armFor: 0,
        fuseFor: 0,
        hp: 1,
        maxHp: balance.survival.hunters.hp,
        damage: balance.survival.hunters.damage
      }
    ];
    state.bullets = [
      {
        id: 2002,
        owner: 'player',
        position: { ...state.hazards[0].position },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 3,
        damage: 1,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    resolveCollisions(state);

    expect(state.hazards).toHaveLength(0);
    expect(state.bullets).toHaveLength(0);
  });
});
