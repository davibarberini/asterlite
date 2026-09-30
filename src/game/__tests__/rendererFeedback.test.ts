import { describe, expect, it, vi } from 'vitest';
vi.mock('phaser', () => ({ default: {} }));
import { VectorRenderer } from '../../phaser/view/VectorRenderer';
import { createGameState } from '../simulation/state';
import { createAsteroid } from '../simulation/systems/asteroids';
import { emitAsteroidDestruction } from '../simulation/events';
import type { GameState } from '../simulation/types';

type FeedbackHarness = {
  asteroidSnapshots: Map<number, unknown>;
  asteroidFlashes: Map<number, unknown>;
  graphics: { clear: () => void };
  clear: () => void;
  updateAsteroidReadabilityState: (state: GameState, now: number) => void;
};
const createHarness = (): FeedbackHarness => Object.assign(Object.create(VectorRenderer.prototype), {
  asteroidSnapshots: new Map(), asteroidFlashes: new Map(), graphics: { clear: vi.fn() }
});

describe('renderer feedback lifecycle', () => {
  it('does not mistake field cleanup for destruction', () => {
    const renderer = createHarness();
    const state = createGameState(390, 844);
    renderer.updateAsteroidReadabilityState(state, 0);
    state.asteroids = [];
    renderer.updateAsteroidReadabilityState(state, 0.1);
    expect(renderer.asteroidFlashes.size).toBe(0);
    expect(renderer.asteroidSnapshots.size).toBe(0);
  });

  it('drains simultaneous destruction events and expires the resulting flashes', () => {
    const renderer = createHarness();
    const state = createGameState(390, 844);
    renderer.updateAsteroidReadabilityState(state, 0);
    for (let i = 0; i < 20; i += 1) emitAsteroidDestruction(state, createAsteroid(state, 'small', { x: i, y: 0 }));
    renderer.updateAsteroidReadabilityState(state, 0.1);
    expect(state.asteroidDestructionEvents).toEqual([]);
    expect(renderer.asteroidFlashes.size).toBe(20);
    renderer.updateAsteroidReadabilityState(state, 1);
    expect(renderer.asteroidFlashes.size).toBe(0);
  });

  it('clears old-zone feedback and resets histories when hidden', () => {
    const renderer = createHarness();
    const state = createGameState(390, 844);
    renderer.updateAsteroidReadabilityState(state, 0);
    emitAsteroidDestruction(state, state.asteroids[0]);
    state.progression.currentZoneIndex = 1;
    renderer.updateAsteroidReadabilityState(state, 0.1);
    expect(state.asteroidDestructionEvents).toEqual([]);
    expect(renderer.asteroidFlashes.size).toBe(0);
    renderer.clear();
    expect(renderer.asteroidSnapshots.size).toBe(0);
  });
});
