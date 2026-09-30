import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { chooseSaucerKind, getSaucerTelegraphSeconds, updateSaucer } from '../simulation/systems/enemies';
import type { SaucerState } from '../simulation/types';
import { fireBullet } from '../simulation/systems/weapons';
import { resolveCollisions } from '../simulation/systems/collisions';

const encounter = (kind: SaucerState['kind']) => {
  const state = createGameState(390, 844);
  state.saucer = {
    id: 100, kind, position: { x: state.camera.x - 100, y: state.camera.y },
    velocity: { x: 30, y: 0 }, radius: 22, fireCooldown: 0, alive: true
  };
  return state;
};

describe('enemy variety and readable attacks', () => {
  it('introduces enemies by zone while preserving the elite threat gate', () => {
    const state = createGameState(390, 844);
    expect(chooseSaucerKind(state, 0.99)).toBe('normal');
    state.progression.currentZoneIndex = 1;
    expect(chooseSaucerKind(state, 0.99)).toBe('skirmisher');
    state.progression.currentZoneIndex = 2;
    expect(chooseSaucerKind(state, 0.99)).toBe('sniper');
    expect(chooseSaucerKind(state, 0.4)).toBe('skirmisher');
    expect(chooseSaucerKind(state, 0.1)).toBe('normal');
    state.progression.currentZoneIndex = 4;
    state.survival.active = true;
    state.survival.threatLevel = 6;
    expect(chooseSaucerKind(state, 0.99)).toBe('elite');
  });

  it.each(['normal', 'skirmisher', 'sniper', 'elite'] as const)('%s warns before firing the complete pattern', (kind) => {
    const state = encounter(kind);
    updateSaucer(state, 0);
    expect(state.bullets).toHaveLength(0);
    const duration = getSaucerTelegraphSeconds(kind);
    updateSaucer(state, duration - 0.01);
    expect(state.bullets).toHaveLength(0);
    updateSaucer(state, 0.02);
    expect(state.bullets).toHaveLength(kind === 'elite' ? 3 : kind === 'skirmisher' ? 2 : 1);
    expect(state.saucer?.shotFlashFor).toBeGreaterThan(0);
  });

  it('keeps the sniper origin and angle locked while the player dodges', () => {
    const state = encounter('sniper');
    updateSaucer(state, 0);
    const position = { ...state.saucer!.position };
    state.ship.position.y += 150;
    updateSaucer(state, getSaucerTelegraphSeconds('sniper'));
    expect(state.saucer?.position).toEqual(position);
    expect(state.bullets[0].velocity.y).toBeCloseTo(0);
    expect(state.bullets[0].velocity.x).toBeGreaterThan(0);
  });

  it('cancels offscreen attacks and grants a new full warning on reentry', () => {
    const state = encounter('sniper');
    updateSaucer(state, 0);
    state.saucer!.position.x = state.camera.x + state.width;
    updateSaucer(state, 1.2);
    expect(state.bullets).toHaveLength(0);
    expect(state.saucer?.telegraphFor).toBe(0);
    state.saucer!.position.x = state.camera.x - 100;
    updateSaucer(state, 0);
    expect(state.saucer?.telegraphFor).toBe(getSaucerTelegraphSeconds('sniper'));
  });

  it('never fires a pending shot after destruction', () => {
    const state = encounter('sniper');
    updateSaucer(state, 0);
    state.saucer!.alive = false;
    updateSaucer(state, 2);
    expect(state.saucer).toBeNull();
    expect(state.bullets).toHaveLength(0);
  });

  it('uses mobile projection and suppresses attacks beneath the HUD', () => {
    const state = encounter('sniper');
    state.saucer!.position.x = state.camera.x + 180;
    updateSaucer(state, 0);
    expect(state.saucer?.telegraphFor).toBeGreaterThan(0);
    state.saucer!.position.y = state.camera.y - 350;
    updateSaucer(state, 1.2);
    expect(state.bullets).toHaveLength(0);
    expect(state.saucer?.telegraphFor).toBe(0);
  });

  it('rewards a kill only once when simultaneous projectiles overlap the enemy', () => {
    const state = encounter('skirmisher');
    state.asteroids = [];
    for (let i = 0; i < 2; i += 1) fireBullet(state, 'player', state.saucer!.position, 0, 0, 1);
    resolveCollisions(state);
    expect(state.progression.achievementStats.saucersDestroyed).toBe(1);
    expect(state.audioEvents.filter((event) => event.type === 'saucerDestroyed')).toHaveLength(1);
  });
});
