import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { createAsteroid } from '../simulation/systems/asteroids';
import { updateDrones } from '../simulation/systems/drones';
import { applyRunCardChoice, getEligibleRunCards, reconcilePendingRunCards, syncRunCardDerivedState } from '../progression/runCards';
import { startNewRun } from '../progression/runLifecycle';

const families = [
  ['sentryWing', 'droneSystems', 'sentry', 'standard'],
  ['rangerWing', 'rangerHangar', 'ranger', 'pellet'],
  ['breakerWing', 'missileFoundry', 'breaker', 'missile']
] as const;

describe('technology-gated temporary drone families', () => {
  it('gates each drone offer by its own technology', () => {
    const state = createGameState(800, 600);
    expect(getEligibleRunCards(state).filter((card) => card.tags.includes('drone'))).toEqual([]);
    for (const [card, unlock] of families) {
      state.progression.ownedWarpUnlockIds = [unlock];
      expect(getEligibleRunCards(state).filter((card) => card.tags.includes('drone')).map((card) => card.id)).toEqual([card]);
    }
  });

  it.each(families)('%s stacks and fires the correct weapon without spending credits', (card, unlock, type, kind) => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = [unlock];
    state.money = 123;
    for (let i = 0; i < 2; i++) {
      state.runCards.pendingChoiceIds = [card];
      state.runCards.queuedChoiceCount = 1;
      expect(applyRunCardChoice(state, card)).toBe(true);
    }
    expect(state.drones.map((drone) => drone.type)).toEqual([type, type]);
    expect(state.money).toBe(123);
    expect(state.progression.achievementStats.dronesRecruited).toBe(2);
    state.drones.forEach((drone) => { drone.fireCooldown = 0; });
    state.asteroids = [createAsteroid(state, 'large', { x: 480, y: 300 }, { x: 0, y: 0 }, 'common')];
    updateDrones(state, 0.016);
    expect(state.bullets.some((bullet) => bullet.owner === 'drone' && bullet.kind === kind)).toBe(true);
    const existing = [...state.drones];
    syncRunCardDerivedState(state);
    expect(state.drones[0]).toBe(existing[0]);
    expect(state.progression.achievementStats.dronesRecruited).toBe(2);
    const next = startNewRun(state);
    expect(next.drones).toEqual([]);
    expect(next.progression.ownedWarpUnlockIds).toContain(unlock);
    expect(next.progression.achievementStats.dronesRecruited).toBe(2);
  });

  it('replaces obsolete locked offers without losing the queued choice', () => {
    const state = createGameState(800, 600);
    state.runCards.pendingChoiceIds = ['sentryWing'];
    state.runCards.queuedChoiceCount = 2;
    reconcilePendingRunCards(state);
    expect(state.runCards.pendingChoiceIds).not.toContain('sentryWing');
    expect(state.runCards.pendingChoiceIds).toHaveLength(3);
    expect(state.runCards.queuedChoiceCount).toBe(2);
  });
});
