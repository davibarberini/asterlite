import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { createAsteroid } from '../simulation/systems/asteroids';
import { destroyAsteroid } from '../simulation/systems/asteroidDestruction';
import { emitAsteroidDestruction, MAX_ASTEROID_VISUAL_EVENTS } from '../simulation/events';
import { startNewRun } from '../progression/runLifecycle';

describe('bounded asteroid visual feedback', () => {
  it('emits a detached snapshot only for real destruction, even without audio', () => {
    const state = createGameState(390, 844);
    state.asteroids = [];
    expect(state.asteroidDestructionEvents).toEqual([]);
    const rock = createAsteroid(state, 'small', { x: 100, y: 200 });
    destroyAsteroid(state, rock, [], { emitDestroyAudio: false });
    rock.position.x = 999;
    expect(state.asteroidDestructionEvents).toHaveLength(1);
    expect(state.asteroidDestructionEvents[0].position.x).toBe(100);
    expect(JSON.parse(JSON.stringify(state.asteroidDestructionEvents))[0].id).toBe(rock.id);
  });

  it('caps bursts without discarding every effect and resets on new runs', () => {
    const state = createGameState(390, 844);
    for (let i = 0; i < 100; i += 1) emitAsteroidDestruction(state, createAsteroid(state, 'small', { x: i, y: 0 }));
    expect(state.asteroidDestructionEvents).toHaveLength(MAX_ASTEROID_VISUAL_EVENTS);
    expect(state.asteroidDestructionEvents.at(-1)?.position.x).toBe(99);
    expect(startNewRun(state).asteroidDestructionEvents).toEqual([]);
  });
});
