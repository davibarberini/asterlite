import { describe, expect, it } from 'vitest';
import { createGameState } from '../simulation/state';
import { createAsteroid } from '../simulation/systems/asteroids';
import { firePlayerWeapon } from '../simulation/systems/weapons';
import { resolveCollisions } from '../simulation/systems/collisions';
import { getEligibleRunCards } from '../progression/runCards';

const setup = () => {
  const state = createGameState(800, 600);
  state.asteroids = [];
  state.ship.position = { x: 600, y: 500 };
  return state;
};

const target = (state: ReturnType<typeof setup>, hp: number) => {
  const rock = createAsteroid(state, 'small', { x: 100, y: 100 }, { x: 0, y: 0 }, 'common');
  rock.hp = rock.maxHp = hp;
  state.asteroids.push(rock);
  return rock;
};

describe('rare projectile cards', () => {
  it('ricochets before piercing and cannot hit the same asteroid twice', () => {
    const state = setup();
    state.runCards.selectedStacks.unstableRicochet = 1;
    state.runCards.selectedStacks.piercingCore = 1;
    const rock = target(state, 100);
    firePlayerWeapon(state);
    const bullet = state.bullets[0];
    bullet.position = { x: 99, y: 100 };
    bullet.velocity = { x: 100, y: 0 };
    resolveCollisions(state);
    expect(bullet.velocity.x).toBeLessThan(0);
    expect(bullet.ricochetLeft).toBe(0);
    expect(bullet.pierceLeft).toBe(1);
    const hp = rock.hp;
    bullet.position = { ...rock.position };
    resolveCollisions(state);
    expect(rock.hp).toBe(hp);
    const second = target(state, 100);
    resolveCollisions(state);
    expect(second.hp).toBeLessThan(100);
    expect(bullet.pierceLeft).toBe(0);
  });

  it('burn deals damage over time and awards a kill exactly once', () => {
    const state = setup();
    state.runCards.selectedStacks.incendiaryCharge = 2;
    const rock = target(state, 1.8);
    firePlayerWeapon(state);
    state.bullets[0].position = { ...rock.position };
    resolveCollisions(state);
    expect(rock.hp).toBeCloseTo(0.8);
    resolveCollisions(state, 1);
    expect(rock.hp).toBeCloseTo(0.3);
    resolveCollisions(state, 1);
    expect(state.asteroids).toHaveLength(0);
    expect(state.progression.achievementStats.asteroidsDestroyed).toBe(1);
    resolveCollisions(state, 5);
    expect(state.progression.achievementStats.asteroidsDestroyed).toBe(1);
  });

  it('burn expires after three seconds even with a long update', () => {
    const state = setup();
    state.runCards.selectedStacks.incendiaryCharge = 1;
    const rock = target(state, 100);
    firePlayerWeapon(state);
    state.bullets[0].position = { ...rock.position };
    resolveCollisions(state);
    resolveCollisions(state, 10);
    expect(rock.hp).toBeCloseTo(98.25);
    expect(rock.burn).toBeUndefined();
  });

  it('refreshes burn without adding unbounded damage for repeated shots', () => {
    const state = setup();
    state.runCards.selectedStacks.incendiaryCharge = 1;
    const rock = target(state, 100);
    firePlayerWeapon(state);
    state.bullets[0].position = { ...rock.position };
    resolveCollisions(state);
    resolveCollisions(state, 2);
    firePlayerWeapon(state);
    state.bullets[0].position = { ...rock.position };
    resolveCollisions(state);
    expect(rock.burn).toEqual({ seconds: 3, damagePerSecond: 0.25 });
    expect(rock.hp).toBeCloseTo(97.5);
  });

  it('kill fragments start next frame and never recursively fragment', () => {
    const state = setup();
    state.runCards.selectedStacks.fragmentationChamber = 2;
    state.runCards.selectedStacks.incendiaryCharge = 1;
    const rock = target(state, 0.5);
    firePlayerWeapon(state);
    state.bullets[0].position = { ...rock.position };
    resolveCollisions(state);
    expect(state.bullets).toHaveLength(4);
    expect(state.bullets.every((bullet) => bullet.fragmentCount === 0 && bullet.damage === 0.35)).toBe(true);
    target(state, 0.1);
    resolveCollisions(state);
    expect(state.progression.achievementStats.asteroidsDestroyed).toBe(2);
    expect(state.bullets).toHaveLength(3);
  });

  it('filters dead cards for Ember and preserves Hisoka ricochet identity', () => {
    const state = setup();
    state.progression.activeShipFrameId = 'ember';
    const ember = getEligibleRunCards(state).map((card) => card.id);
    expect(ember).not.toContain('unstableRicochet');
    expect(ember).not.toContain('incendiaryCharge');
    expect(ember).not.toContain('fragmentationChamber');
    state.progression.activeShipFrameId = 'hisoka';
    expect(getEligibleRunCards(state).map((card) => card.id)).not.toContain('unstableRicochet');
    state.runCards.selectedStacks.fragmentationChamber = 1;
    const rock = target(state, 0.01);
    firePlayerWeapon(state);
    const shot = state.bullets[0];
    shot.position = { ...rock.position };
    const damage = shot.damage;
    resolveCollisions(state);
    expect(shot.damage).toBeCloseTo(damage - 0.01);
    expect(state.bullets.filter((bullet) => bullet.kind === 'standard')).toHaveLength(2);
  });
});
