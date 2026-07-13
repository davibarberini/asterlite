import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { getMothershipPhase, updateMothership } from '../simulation/systems/bossMothership';
import { resolveCollisions } from '../simulation/systems/collisions';
import { getChaseBossPhase, updateBosses } from '../simulation/systems/enemies';
import type { AsteroidState, GameState } from '../simulation/types';

const createMothership = (overrides: Partial<AsteroidState> = {}): AsteroidState => ({
  id: 1,
  position: { x: 500, y: 500 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  rotationSpeed: 0.18,
  radius: 256,
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

const createCrusher = (overrides: Partial<AsteroidState> = {}): AsteroidState => ({
  id: 3,
  position: { x: 260, y: 0 },
  velocity: { x: 0, y: 0 },
  rotation: 0,
  rotationSpeed: -0.8,
  radius: 92,
  size: 'large',
  variant: 'dense',
  hp: 140,
  maxHp: 140,
  shape: [1, 1, 1],
  bossType: 'crusher',
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

  it('anchors partially outside the camera edge instead of chasing the ship', () => {
    const state = centerState();
    const boss = createMothership();

    updateMothership(state, boss, 0.016);

    expect(boss.velocity.x).toBeLessThan(0);
    expect(boss.velocity.y).toBeLessThan(0);

    for (let step = 0; step < 200; step += 1) {
      updateMothership(state, boss, 0.05);
      boss.position.x += boss.velocity.x * 0.05;
      boss.position.y += boss.velocity.y * 0.05;
    }

    expect(Math.abs(boss.position.x) > state.width / 2 || Math.abs(boss.position.y) > state.height / 2).toBe(true);
    const aimDelta = Math.atan2(
      Math.sin(Math.atan2(state.ship.position.y - boss.position.y, state.ship.position.x - boss.position.x) - boss.rotation),
      Math.cos(Math.atan2(state.ship.position.y - boss.position.y, state.ship.position.x - boss.position.x) - boss.rotation)
    );
    expect(Math.abs(aimDelta)).toBeLessThan(0.2);
  });

  it('does not retreat out of view just because a new attack starts', () => {
    const state = centerState();
    const boss = createMothership({
      position: { x: state.width / 2 + 80, y: 0 },
      bossEdgeAngle: 0,
      bossLastPhase: 1,
      bossFireCooldown: 0
    });

    updateMothership(state, boss, 0.016);

    expect(boss.bossTelegraphKind).toBeDefined();
    expect(boss.bossRetreatFor ?? 0).toBe(0);
    expect(boss.bossNextEdgeAngle).toBeUndefined();
    expect(boss.bossEdgeAngle).toBe(0);
  });

  it('retreats out of view and re-enters from a new camera edge on HP phase changes', () => {
    const state = centerState();
    const boss = createMothership({
      position: { x: state.width / 2 + 80, y: 0 },
      hp: 100,
      maxHp: 200,
      bossEdgeAngle: 0,
      bossLastPhase: 1,
      bossFireCooldown: 1
    });

    updateMothership(state, boss, 0.016);

    expect(boss.bossRetreatFor ?? 0).toBeGreaterThan(0);
    expect(boss.bossNextEdgeAngle).toBeDefined();
    expect(boss.bossEdgeAngle).toBe(0);

    updateMothership(state, boss, 0.8);

    expect(boss.bossRetreatFor).toBe(0);
    expect(boss.bossNextEdgeAngle).toBeUndefined();
    expect(boss.bossEdgeAngle).not.toBe(0);
    expect(Math.abs(boss.position.x) > state.width / 2 || Math.abs(boss.position.y) > state.height / 2).toBe(true);
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

  it('fires the opening ring from the visible camera edge', () => {
    const state = centerState();
    const boss = createMothership({
      position: { x: state.width / 2 + 96, y: 0 },
      bossEdgeAngle: 0,
      bossTelegraphKind: 'ring',
      bossTelegraphFor: 0.01
    });

    updateMothership(state, boss, 1);

    expect(state.bullets.length).toBeGreaterThan(0);
    expect(state.bullets.some((bullet) =>
      bullet.position.x >= state.camera.x - state.width / 2 &&
      bullet.position.x <= state.camera.x + state.width / 2 &&
      bullet.position.y >= state.camera.y - state.height / 2 &&
      bullet.position.y <= state.camera.y + state.height / 2
    )).toBe(true);
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

  it('removes Mothership seekers when the mothership is defeated', () => {
    const state = centerState();
    const boss = createMothership({ hp: 1, maxHp: 200 });
    state.asteroids = [boss];
    state.bossMinions = [
      {
        id: 90,
        position: { x: 20, y: 20 },
        velocity: { x: 0, y: 0 },
        radius: 14,
        hp: 10,
        maxHp: 10,
        damage: 14,
        fireCooldown: 1,
        alive: true
      }
    ];
    state.bullets = [
      {
        id: 81,
        owner: 'player',
        position: { ...boss.position },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 8,
        damage: 4,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      },
      {
        id: 82,
        owner: 'saucer',
        position: { x: 40, y: 40 },
        velocity: { x: 0, y: 0 },
        age: 0,
        radius: 6,
        damage: 10,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'standard',
        homingTargetId: null
      }
    ];

    resolveCollisions(state);

    expect(state.bossMinions).toHaveLength(0);
    expect(state.bullets.every((bullet) => bullet.owner !== 'boss' && bullet.owner !== 'saucer')).toBe(true);
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

  it('telegraphs Crusher shockwave before firing while preserving direct chase', () => {
    const state = centerState();
    const boss = createCrusher();
    state.asteroids = [boss];

    updateBosses(state, 0.016);

    expect(boss.bossPhase).toBe(1);
    expect(boss.bossTelegraphKind).toBe('crusherShockwave');
    expect(boss.bossTelegraphFor ?? 0).toBeGreaterThan(0);
    expect(state.bullets).toHaveLength(0);
    expect(boss.velocity.x).toBeLessThan(0);
    expect(Math.abs(boss.velocity.y)).toBeLessThan(1);

    updateBosses(state, 1);

    expect(boss.bossTelegraphFor).toBe(0);
    expect(boss.bossFireCooldown ?? 0).toBeGreaterThan(0);
    expect(state.bullets).toHaveLength(8);
  });

  it('fires denser Crusher shockwaves in phase 3', () => {
    const fireCrusherShockwave = (hp: number): number => {
      const state = centerState();
      const boss = createCrusher({
        hp,
        maxHp: 140,
        bossTelegraphKind: 'crusherShockwave',
        bossTelegraphFor: 0.01
      });
      state.asteroids = [boss];
      updateBosses(state, 1);
      return state.bullets.length;
    };

    const phase1Bullets = fireCrusherShockwave(140);
    const phase3Bullets = fireCrusherShockwave(20);

    expect(phase1Bullets).toBe(8);
    expect(phase3Bullets).toBeGreaterThan(phase1Bullets);
  });
});
