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
import { getMeteorLaneCameraAnchoredCenter, updateSurvivalTimedEvents } from '../simulation/systems/survivalEvents';
import { updateSurvivalHazards } from '../simulation/systems/survivalHazards';
import { zones } from '../simulation/zones';
import { balance } from '../balance';
import {
  getNovaCrownBestSeconds,
  getNovaCrownDifficultyConfig,
  novaCrownClearThreatLevel
} from '../progression/novaCrownDifficulty';
import { getNovaCrownCoreReward } from '../progression/novaCrownRewards';

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

const distanceBetween = (a: { x: number; y: number }, b: { x: number; y: number }): number =>
  Math.hypot(a.x - b.x, a.y - b.y);

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
      difficulty: 1,
      currentSeconds: 76,
      threatLevel: 3,
      lastAnnouncedThreatLevel: 3,
      nextRewardThreatLevel: 10,
      hazardSpawnCooldown: 0,
      hunterSpawnCooldown: 0,
      timedEventCooldown: 0,
      gravityPulseCooldown: 0,
      damageFieldCooldown: 0
    };
    state.progression.survivalBestSeconds = 76;
    state.progression.survivalBestThreatLevel = 3;
    state.progression.novaCrownBestSecondsByDifficulty = { '1': 76 };

    saveGameState(state);
    const loaded = loadGameState(800, 600);

    expect(loaded.progression.currentZoneIndex).toBe(zones.length - 1);
    expect(loaded.survival.currentSeconds).toBe(76);
    expect(loaded.survival.threatLevel).toBe(3);
    expect(loaded.survival.nextRewardThreatLevel).toBe(10);
    expect(loaded.progression.survivalBestSeconds).toBe(76);
    expect(loaded.progression.survivalBestThreatLevel).toBe(3);
    expect(getNovaCrownBestSeconds(loaded.progression.novaCrownBestSecondsByDifficulty, 1)).toBe(76);
  });

  it('uses the selected Nova Crown difficulty for threat scaling and per-difficulty bests', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.progression.novaCrownHighestDifficulty = 4;
    state.progression.novaCrownSelectedDifficulty = 4;

    updateGame(state, neutralInput(), 1);

    expect(state.survival.active).toBe(true);
    expect(state.survival.difficulty).toBe(4);
    expect(state.survival.threatLevel).toBeGreaterThan(getSurvivalThreatLevel(1, 1));
    expect(getNovaCrownBestSeconds(state.progression.novaCrownBestSecondsByDifficulty, 4)).toBeCloseTo(1);
  });

  it('unlocks the next Nova Crown difficulty after surviving threat 10', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.progression.novaCrownHighestDifficulty = 2;
    state.progression.novaCrownSelectedDifficulty = 2;
    const config = getNovaCrownDifficultyConfig(state.progression.novaCrownSelectedDifficulty);
    const secondsToReachClearThreat =
      (novaCrownClearThreatLevel - config.startingThreatLevel) * config.threatLevelSeconds;

    updateGame(state, neutralInput(), secondsToReachClearThreat + 0.1);

    expect(state.survival.threatLevel).toBeGreaterThanOrEqual(novaCrownClearThreatLevel);
    expect(state.progression.novaCrownHighestDifficulty).toBe(3);
    expect(state.rewardEvents.some((event) => event.text.includes('difficulty 3 unlocked'))).toBe(true);
  });

  it('awards global cores for the first threat 11 clear on each Nova Crown difficulty', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.progression.novaCrownHighestDifficulty = 4;
    state.progression.novaCrownSelectedDifficulty = 4;
    const config = getNovaCrownDifficultyConfig(state.progression.novaCrownSelectedDifficulty);
    const secondsToReachClearThreat =
      (novaCrownClearThreatLevel - config.startingThreatLevel) * config.threatLevelSeconds;

    updateGame(state, neutralInput(), secondsToReachClearThreat + 0.1);

    expect(state.progression.prestigeCores).toBe(getNovaCrownCoreReward(4));
    expect(state.progression.novaCrownCoreRewardedDifficultyKeys).toEqual(['4']);
    expect(state.rewardEvents.some((event) => event.text.includes('difficulty 4 cleared'))).toBe(true);

    updateGame(state, neutralInput(), 1);

    expect(state.progression.prestigeCores).toBe(getNovaCrownCoreReward(4));
    expect(state.progression.novaCrownCoreRewardedDifficultyKeys).toEqual(['4']);
  });

  it('queues run reward choices at Nova Crown threat milestones', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);

    updateGame(state, neutralInput(), balance.survival.threatLevelSeconds * 9 + 0.1);

    expect(state.survival.threatLevel).toBe(10);
    expect(state.survival.nextRewardThreatLevel).toBe(20);
    expect(state.bossRewards.pendingChoiceIds).toEqual(['rapidFire', 'droneOverdrive', 'salvageSurge']);
    expect(state.rewardEvents.some((event) => event.text.includes('Nova Crown threat 10'))).toBe(true);

    saveGameState(state);
    const loaded = loadGameState(800, 600);

    expect(loaded.survival.nextRewardThreatLevel).toBe(20);
    expect(loaded.bossRewards.pendingChoiceIds).toEqual(['rapidFire', 'droneOverdrive', 'salvageSurge']);
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

  it('spawns meteor lane timed events only after the survival threat threshold', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.timedEvents.meteorLane.startsAtThreatLevel - 1;
    state.survival.timedEventCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    expect(state.survivalEvents).toHaveLength(0);

    state.survival.threatLevel = balance.survival.timedEvents.meteorLane.startsAtThreatLevel;
    updateSurvivalTimedEvents(state, 1);

    const meteorLane = state.survivalEvents.find((event) => event.kind === 'meteorLane');
    expect(meteorLane?.kind).toBe('meteorLane');
    if (!meteorLane || meteorLane.kind !== 'meteorLane') {
      throw new Error('Expected a meteor lane event');
    }
    expect(meteorLane.warningFor).toBeGreaterThan(0);
    expect(meteorLane.length).toBeGreaterThan(Math.hypot(state.width, state.height) * 2);
    expect(meteorLane.width).toBeGreaterThan(120);
    expect(meteorLane.meteors.length).toBeGreaterThanOrEqual(balance.survival.timedEvents.meteorLane.meteorCount[0]);
    expect(Math.max(...meteorLane.meteors.map((meteor) => meteor.radius))).toBeLessThanOrEqual(meteorLane.width / 6);
    const roundedTracks = new Set(meteorLane.meteors.map((meteor) => Math.round(meteor.crossOffset / 12)));
    expect(roundedTracks.size).toBeGreaterThanOrEqual(4);
  });

  it('scales meteor lanes into a mixed-size barrage as survival threat rises', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel =
      balance.survival.timedEvents.meteorLane.startsAtThreatLevel +
      balance.survival.timedEvents.meteorLane.threatLevelsPerExtraLane;
    state.survival.timedEventCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    const meteorLaneEvents = state.survivalEvents.filter((event) => event.kind === 'meteorLane');
    expect(meteorLaneEvents).toHaveLength(2);
    const meteorSizes = meteorLaneEvents.flatMap((event) => event.meteors.map((meteor) => meteor.size));
    expect(meteorSizes).toContain('medium');
    expect(meteorSizes).toContain('small');
    expect(meteorSizes).not.toContain('large');
  });

  it('spawns gravity pulse timed events only after the survival threat threshold', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.timedEvents.gravityPulse.startsAtThreatLevel - 1;
    state.survival.gravityPulseCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    expect(state.survivalEvents.some((event) => event.kind === 'gravityPulse')).toBe(false);

    state.survival.threatLevel = balance.survival.timedEvents.gravityPulse.startsAtThreatLevel;
    updateSurvivalTimedEvents(state, 1);

    const gravityPulse = state.survivalEvents.find((event) => event.kind === 'gravityPulse');
    expect(gravityPulse?.kind).toBe('gravityPulse');
    expect(gravityPulse?.warningFor).toBe(0);
    expect(gravityPulse?.radius).toBe(balance.survival.timedEvents.gravityPulse.radius);
    expect(gravityPulse?.radius).toBeGreaterThanOrEqual(380);
  });

  it('keeps gravity wells fixed nearby and recycles them only after a far range', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.timedEvents.gravityPulse.startsAtThreatLevel;
    state.survival.gravityPulseCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    const gravityWell = state.survivalEvents.find((event) => event.kind === 'gravityPulse');
    expect(gravityWell?.kind).toBe('gravityPulse');
    if (!gravityWell || gravityWell.kind !== 'gravityPulse') {
      throw new Error('Expected a gravity pulse event');
    }
    const originalCenter = { ...gravityWell.center };

    updateSurvivalTimedEvents(state, 20);

    const nearbyWell = state.survivalEvents.find((event) => event.id === gravityWell.id);
    expect(nearbyWell?.center).toEqual(originalCenter);

    state.ship.position = {
      x: originalCenter.x + balance.survival.timedEvents.gravityPulse.despawnDistance + 80,
      y: originalCenter.y
    };
    state.camera = { ...state.ship.position };
    updateSurvivalTimedEvents(state, 1);

    expect(state.survivalEvents.some((event) => event.id === gravityWell.id)).toBe(false);
  });

  it('pulls the ship while inside a gravity well', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.velocity = { x: 0, y: 0 };
    state.survivalEvents = [
      {
        id: 1450,
        kind: 'gravityPulse',
        center: { x: state.ship.position.x + 100, y: state.ship.position.y },
        radius: balance.survival.timedEvents.gravityPulse.radius,
        force: balance.survival.timedEvents.gravityPulse.force,
        age: 0,
        warningFor: 0,
        activeFor: 1
      }
    ];

    updateSurvivalTimedEvents(state, 1);

    expect(state.ship.velocity.x).toBeGreaterThan(0);
    expect(Math.abs(state.ship.velocity.y)).toBeLessThan(0.001);
  });

  it('spawns persistent toxic damage fields only after the survival threat threshold', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.timedEvents.damageField.startsAtThreatLevel - 1;
    state.survival.damageFieldCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    expect(state.survivalEvents.some((event) => event.kind === 'damageField')).toBe(false);

    state.survival.threatLevel = balance.survival.timedEvents.damageField.startsAtThreatLevel;
    updateSurvivalTimedEvents(state, 1);

    const damageField = state.survivalEvents.find((event) => event.kind === 'damageField');
    expect(damageField?.kind).toBe('damageField');
    expect(damageField?.warningFor).toBe(0);
    expect(damageField?.radius).toBe(balance.survival.timedEvents.damageField.radius);
    expect(damageField?.radius).toBeGreaterThanOrEqual(945);
    expect(damageField ? distanceBetween(damageField.center, state.ship.position) : 0).toBeGreaterThanOrEqual(balance.survival.timedEvents.damageField.spawnDistance[0]);
  });

  it('keeps toxic damage fields low-count even as threat rises', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel =
      balance.survival.timedEvents.damageField.startsAtThreatLevel +
      balance.survival.timedEvents.damageField.threatLevelsPerExtraField * 12;

    for (let index = 0; index < 24; index += 1) {
      state.survival.damageFieldCooldown = 0;
      updateSurvivalTimedEvents(state, 1);
    }

    expect(state.survivalEvents.filter((event) => event.kind === 'damageField').length).toBeLessThanOrEqual(balance.survival.timedEvents.damageField.maxCount);
  });

  it('keeps toxic damage fields fixed nearby and recycles them only after a far range', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.survival.active = true;
    state.survival.threatLevel = balance.survival.timedEvents.damageField.startsAtThreatLevel;
    state.survival.damageFieldCooldown = 0;

    updateSurvivalTimedEvents(state, 1);

    const damageField = state.survivalEvents.find((event) => event.kind === 'damageField');
    expect(damageField?.kind).toBe('damageField');
    if (!damageField || damageField.kind !== 'damageField') {
      throw new Error('Expected a damage field event');
    }
    const originalCenter = { ...damageField.center };

    updateSurvivalTimedEvents(state, 20);

    const nearbyField = state.survivalEvents.find((event) => event.id === damageField.id);
    expect(nearbyField?.center).toEqual(originalCenter);

    state.ship.position = {
      x: originalCenter.x + balance.survival.timedEvents.damageField.despawnDistance + 80,
      y: originalCenter.y
    };
    state.camera = { ...state.ship.position };
    updateSurvivalTimedEvents(state, 1);

    expect(state.survivalEvents.some((event) => event.id === damageField.id)).toBe(false);
  });

  it('damages the ship while inside a toxic damage field', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.survivalEvents = [
      {
        id: 1460,
        kind: 'damageField',
        center: { ...state.ship.position },
        radius: balance.survival.timedEvents.damageField.radius,
        damage: balance.survival.timedEvents.damageField.damage,
        hitCooldown: 0,
        age: 0,
        warningFor: 0,
        activeFor: 1
      }
    ];

    resolveCollisions(state);

    expect(state.ship.hp).toBe(100 - balance.survival.timedEvents.damageField.damage);
    expect(state.survivalEvents[0]?.kind === 'damageField' ? state.survivalEvents[0].hitCooldown : undefined).toBe(balance.survival.timedEvents.damageField.hitCooldown);
  });

  it('anchors meteor lanes to the camera only along the lane direction', () => {
    const horizontalLane = {
      id: 1400,
      kind: 'meteorLane' as const,
      center: { x: 400, y: 300 },
      anchorCenter: { x: 400, y: 300 },
      anchorCamera: { x: 400, y: 300 },
      direction: { x: 1, y: 0 },
      width: 200,
      length: 1000,
      age: 0,
      warningFor: 0,
      activeFor: 1,
      hitCooldown: 0,
      damage: 10,
      meteors: []
    };
    const verticalLane = {
      ...horizontalLane,
      direction: { x: 0, y: 1 }
    };

    expect(getMeteorLaneCameraAnchoredCenter(horizontalLane, { x: 700, y: 900 })).toEqual({ x: 700, y: 300 });
    expect(getMeteorLaneCameraAnchoredCenter(verticalLane, { x: 700, y: 900 })).toEqual({ x: 400, y: 900 });
  });

  it('does not damage the ship for standing inside an active meteor lane area', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.survivalEvents = [
      {
        id: 1401,
        kind: 'meteorLane',
        center: { ...state.ship.position },
        anchorCenter: { ...state.ship.position },
        anchorCamera: { ...state.camera },
        direction: { x: 1, y: 0 },
        width: balance.survival.timedEvents.meteorLane.width,
        length: 500,
        age: balance.survival.timedEvents.meteorLane.warningSeconds + 1,
        warningFor: 0,
        activeFor: 2,
        hitCooldown: 0,
        damage: balance.survival.timedEvents.meteorLane.damage,
        meteors: []
      }
    ];

    resolveCollisions(state);

    expect(state.ship.hp).toBe(100);
  });

  it('damages the ship only when an active meteor crosses the ship', () => {
    const state = createGameState(800, 600);
    putInFinalZone(state);
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    const length = 500;
    const width = balance.survival.timedEvents.meteorLane.width;
    const speedToShip = length / 2 + width * 1.5;
    state.survivalEvents = [
      {
        id: 1402,
        kind: 'meteorLane',
        center: { ...state.ship.position },
        anchorCenter: { ...state.ship.position },
        anchorCamera: { ...state.camera },
        direction: { x: 1, y: 0 },
        width,
        length,
        age: 0,
        warningFor: 0.5,
        activeFor: 2,
        hitCooldown: 0,
        damage: balance.survival.timedEvents.meteorLane.damage,
        meteors: [
          {
            crossOffset: 0,
            radius: 16,
            speed: speedToShip,
            spawnDelay: 0,
            size: 'medium',
            rotation: 0,
            rotationSpeed: 0,
            idSeed: 0
          }
        ]
      }
    ];

    resolveCollisions(state);

    expect(state.ship.hp).toBe(100);

    state.survivalEvents[0].warningFor = 0;
    state.survivalEvents[0].age = balance.survival.timedEvents.meteorLane.warningSeconds + 1;
    const positionBeforeHit = { ...state.ship.position };
    resolveCollisions(state);

    expect(state.ship.hp).toBe(100 - balance.survival.timedEvents.meteorLane.damage);
    expect(state.ship.position.x).toBeGreaterThan(positionBeforeHit.x);
    expect(state.ship.velocity.x).toBeGreaterThan(balance.collisions.shipContactKnockback);
    expect(state.survivalEvents[0]?.kind === 'meteorLane' ? state.survivalEvents[0].hitCooldown : undefined).toBe(balance.survival.timedEvents.meteorLane.hitCooldown);
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
