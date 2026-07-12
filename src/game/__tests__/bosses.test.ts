import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { getMothershipPhase, updateMothership } from '../simulation/systems/bossMothership';
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
});
