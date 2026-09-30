import { describe, expect, it } from 'vitest';
import { balance } from '../balance';
import { neutralInput } from '../input/actions';
import { startNewRun } from '../progression/runLifecycle';
import { createGameState } from '../simulation/state';
import { createAsteroid, createAsteroidField, getAsteroidTargetCount } from '../simulation/systems/asteroids';
import { destroyAsteroid } from '../simulation/systems/asteroidDestruction';
import { updateGame } from '../simulation/systems/gameLoop';
import { collideShipWithAsteroid } from '../simulation/systems/shipContact';

describe('opening run balance', () => {
  it.each([[320, 568], [390, 844], [1280, 800]])('starts with visible, safe targets at %sx%s', (width, height) => {
    const state = createGameState(width, height);
    expect(state.asteroids).toHaveLength(getAsteroidTargetCount(state));
    const targets = state.asteroids.slice(0, balance.opening.visibleAsteroidCount);
    expect(targets.map((target) => target.hp)).toEqual([1, 1, 2, 2]);
    for (const target of targets) {
      const dx = target.position.x - state.ship.position.x;
      const dy = target.position.y - state.ship.position.y;
      expect(Math.abs(dx) + target.radius).toBeLessThan(width / 2);
      expect(Math.abs(dy) + target.radius).toBeLessThan(height / 2);
      expect(Math.hypot(dx, dy)).toBeGreaterThan(target.radius + state.ship.radius + 48);
      expect(dx * target.velocity.x + dy * target.velocity.y).toBeCloseTo(0);
      expect(Math.hypot(target.velocity.x, target.velocity.y)).toBeCloseTo(28);
    }
  });

  it('grants the first card at two kills and four level choices before the first boss', () => {
    const state = createGameState(390, 844);
    state.asteroids = [];
    for (let kills = 1; kills <= balance.bosses.firstGateAsteroids; kills += 1) {
      const asteroid = createAsteroid(state, 'small', { x: 9999, y: 9999 }, undefined, 'common');
      destroyAsteroid(state, asteroid, [], { split: false });
      state.asteroids = [];
      updateGame(state, neutralInput(), 0);
      if (kills === 1) expect(state.runCards.queuedChoiceCount).toBe(0);
      if (kills === 2) {
        expect(state.progression.shipLevel).toBe(2);
        expect(state.runCards.queuedChoiceCount).toBe(1);
      }
      if (kills < balance.bosses.firstGateAsteroids) expect(state.pendingBoss).toBeNull();
    }
    expect(state.progression.shipLevel).toBe(5);
    expect(state.runCards.queuedChoiceCount).toBe(4);
    expect(state.pendingBoss?.bossType).toBe('crusher');
  });

  it.each([[0, false, 29], [1, false, 56], [0, true, 45]])(
    'applies contact relief only to ordinary Lyra asteroids (zone %s, boss %s)', (zone, boss, damage) => {
      const state = createGameState(390, 844);
      state.progression.currentZoneIndex = zone;
      const asteroid = createAsteroid(state, 'large', { x: state.ship.position.x + 30, y: state.ship.position.y });
      if (boss) asteroid.bossType = 'crusher';
      const hp = state.ship.hp;
      collideShipWithAsteroid(state, asteroid, new Set(), []);
      expect(hp - state.ship.hp).toBe(damage);
      expect(Math.hypot(state.ship.velocity.x, state.ship.velocity.y)).toBeGreaterThan(0);
    }
  );

  it('restores opening targets on a new run without changing regular field regeneration', () => {
    const state = createGameState(390, 844);
    state.progression.shipLevel = 8;
    state.progression.currentZoneIndex = 2;
    const next = startNewRun(state);
    expect(next.asteroids.slice(0, 4).map((target) => target.size)).toEqual(['small', 'small', 'medium', 'medium']);
    expect(createAsteroidField(next).every((target) => target.size === 'large')).toBe(true);
    expect(next.ship.hp).toBe(next.ship.maxHp);
  });
});
