import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { getMothershipPhase, updateMothership } from '../simulation/systems/bossMothership';
import { getChaseBossPhase, updateBosses } from '../simulation/systems/enemies';
import type { AsteroidState, GameState } from '../simulation/types';

const createMothership = (overrides: Partial<AsteroidState> = {}): AsteroidState => ({
  id: 1,
  position: { x: 500, y: 500 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  rotationSpeed: 0.18,
  radius: 128,
  size: 'large',
  variant: 'dense',
  hp: 200,
  maxHp: 200,
  shape: [1, 1, 1],
  bossType: 'mothership',
  bossZoneIndex: 4,
  bossFireCooldown: 0,
  ...overrides
});

const createSentinel = (overrides: Partial<AsteroidState> = {}): AsteroidState => ({
  id: 2,
  position: { x: 260, y: 0 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  rotationSpeed: 1.5,
  radius: 74,
  size: 'large',
  variant: 'dense',
  hp: 120,
  maxHp: 120,
  shape: [1, 1, 1],
  bossType: 'sentinel',
  bossZoneIndex: 1,
  bossFireCooldown: 0,
  ...overrides
});

const centerState = (): GameState => {
  const state = createGameState(800, 600);
  state.camera = { x: 0, y: 0 };
  state.ship.position = { x: 0, y: 0 };
  state.ship.alive = true;
  state.bullets = [];
  return state;
};

describe('mothership boss', () => {
  it('maps HP ratio to escalating phases', () => {
    expect(getMothershipPhase(1)).toBe(1);
    expect(getMothershipPhase(0.7)).toBe(1);
    expect(getMothershipPhase(0.5)).toBe(2);
    expect(getMothershipPhase(0.33)).toBe(3);
    expect(getMothershipPhase(0.05)).toBe(3);
  });

  it('steers toward a camera-relative anchor above the ship instead of chasing', () => {
    const state = centerState();
    const boss = createMothership();

    updateMothership(state, boss, 0.016);

    // Anchor sits up and toward the camera, so it should pull the boss up-left.
    expect(boss.velocity.x).toBeLessThan(0);
    expect(boss.velocity.y).toBeLessThan(0);

    for (let step = 0; step < 200; step += 1) {
      updateMothership(state, boss, 0.05);
      boss.position.x += boss.velocity.x * 0.05;
      boss.position.y += boss.velocity.y * 0.05;
    }

    expect(Math.abs(boss.position.x)).toBeLessThan(40);
    expect(boss.position.y).toBeLessThan(0);
  });

  it('telegraphs an attack before firing any bullets', () => {
    const state = centerState();
    const boss = createMothership();

    updateMothership(state, boss, 0.016);

    expect(boss.bossTelegraphFor ?? 0).toBeGreaterThan(0);
    expect(boss.bossTelegraphKind).toBeDefined();
    expect(state.bullets).toHaveLength(0);

    updateMothership(state, boss, 2);

    expect(state.bullets.length).toBeGreaterThan(0);
    expect(boss.bossTelegraphFor).toBe(0);
    expect(boss.bossFireCooldown ?? 0).toBeGreaterThan(0);
  });

  it('fires denser ring volleys in later phases', () => {
    const fireRing = (hp: number): number => {
      const state = centerState();
      const boss = createMothership({ hp, maxHp: 200, bossTelegraphKind: 'ring', bossTelegraphFor: 0.01 });
      updateMothership(state, boss, 1);
      return state.bullets.length;
    };

    const phase1Bullets = fireRing(200);
    const phase3Bullets = fireRing(20);

    expect(phase1Bullets).toBeGreaterThan(0);
    expect(phase3Bullets).toBeGreaterThan(phase1Bullets);
  });

  it('summons phase-gated minions as real serializable threats', () => {
    const phase1State = centerState();
    const phase1Boss = createMothership({ hp: 200, maxHp: 200, bossTelegraphKind: 'summon', bossTelegraphFor: 0.01 });
    updateMothership(phase1State, phase1Boss, 1);

    const phase2State = centerState();
    const phase2Boss = createMothership({ hp: 100, maxHp: 200, bossTelegraphKind: 'summon', bossTelegraphFor: 0.01 });
    updateMothership(phase2State, phase2Boss, 1);
    updateMothership(phase2State, phase2Boss, 1.3);

    expect(phase1State.bossMinions).toHaveLength(0);
    expect(phase2State.bossMinions).toHaveLength(2);
    expect(phase2State.bossMinions[0]).toMatchObject({
      alive: true,
      hp: expect.any(Number),
      fireCooldown: expect.any(Number)
    });
    expect(phase2State.bullets.some((bullet) => bullet.owner === 'saucer')).toBe(true);
  });

  it('telegraphs the beam before activating damage', () => {
    const state = centerState();
    const boss = createMothership({
      position: { x: 0, y: 0 },
      hp: 100,
      maxHp: 200,
      bossTelegraphKind: 'beam',
      bossTelegraphFor: 0.2,
      bossAimAngle: 0
    });
    state.ship.position = { x: 180, y: 0 };
    state.ship.invulnerableFor = 0;
    const hpBefore = state.ship.hp;

    updateMothership(state, boss, 0.1);

    expect(boss.bossTelegraphFor ?? 0).toBeGreaterThan(0);
    expect(boss.bossBeamFor ?? 0).toBe(0);
    expect(state.ship.hp).toBe(hpBefore);

    updateMothership(state, boss, 0.2);

    expect(boss.bossBeamFor ?? 0).toBeGreaterThan(0);
    expect(state.ship.hp).toBe(hpBefore);

    updateMothership(state, boss, 0.65);

    expect(state.ship.hp).toBeLessThan(hpBefore);
  });

  it('overlaps ring, fan, and summon pressure in phase 3', () => {
    const phase1State = centerState();
    const phase1Boss = createMothership({ hp: 200, maxHp: 200, bossTelegraphKind: 'ring', bossTelegraphFor: 0.01 });
    updateMothership(phase1State, phase1Boss, 1);

    const phase3State = centerState();
    const phase3Boss = createMothership({ hp: 20, maxHp: 200, bossTelegraphKind: 'ring', bossTelegraphFor: 0.01 });
    updateMothership(phase3State, phase3Boss, 1);

    expect(phase3State.bullets.length).toBeGreaterThan(phase1State.bullets.length);
    expect(phase3State.bossMinions.length).toBeGreaterThan(0);
  });
});

describe('chase boss personalities', () => {
  it('maps chase boss HP ratio to escalating phases', () => {
    expect(getChaseBossPhase(1)).toBe(1);
    expect(getChaseBossPhase(0.5)).toBe(2);
    expect(getChaseBossPhase(0.2)).toBe(3);
  });

  it('telegraphs Sentinel precision volley before firing', () => {
    const state = centerState();
    const boss = createSentinel();
    state.asteroids = [boss];

    updateBosses(state, 0.016);

    expect(boss.bossPhase).toBe(1);
    expect(boss.bossTelegraphKind).toBe('sentinelVolley');
    expect(boss.bossTelegraphFor ?? 0).toBeGreaterThan(0);
    expect(state.bullets).toHaveLength(0);
    expect(Math.abs(boss.velocity.y)).toBeGreaterThan(0);

    updateBosses(state, 1);

    expect(boss.bossTelegraphFor).toBe(0);
    expect(boss.bossFireCooldown ?? 0).toBeGreaterThan(0);
    expect(state.bullets).toHaveLength(1);
  });

  it('fires denser Sentinel precision volleys in phase 3', () => {
    const fireSentinelVolley = (hp: number): number => {
      const state = centerState();
      const boss = createSentinel({
        hp,
        maxHp: 120,
        bossTelegraphKind: 'sentinelVolley',
        bossTelegraphFor: 0.01,
        bossAimAngle: 0
      });
      state.asteroids = [boss];
      updateBosses(state, 1);
      return state.bullets.length;
    };

    const phase1Bullets = fireSentinelVolley(120);
    const phase3Bullets = fireSentinelVolley(20);

    expect(phase1Bullets).toBe(1);
    expect(phase3Bullets).toBeGreaterThan(phase1Bullets);
  });
});
