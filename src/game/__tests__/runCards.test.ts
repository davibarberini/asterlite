import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyRunCardChoice,
  getEligibleRunCards,
  getRunCardDamageMultiplier,
  getRunCardFireRateMultiplier,
  getRunCardAreaMultiplier,
  getRunCardDashImpulseMultiplier,
  getRunCardImpactDamage,
  getRunCardKnockbackMultiplier,
  queueRunCardChoices,
  queueLevelUpCardChoices
} from '../progression/runCards';
import { normalizeRunCardState, syncRunCardDerivedState } from '../progression/runCards';
import { createGameState, syncActiveDrones } from '../simulation/state';
import { damageShip } from '../simulation/systems/playerDamage';
import { fireBullet, firePlayerWeapon, updateBullets } from '../simulation/systems/weapons';
import { createAsteroid } from '../simulation/systems/asteroids';
import { updateDrones } from '../simulation/systems/drones';

afterEach(() => vi.restoreAllMocks());

describe('run cards', () => {
  it('rolls projectile critical damage once and never boosts enemy shots', () => {
    const state = createGameState(800, 600);
    state.runCards.selectedStacks.criticalReactor = 1;
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    firePlayerWeapon(state);
    expect(state.bullets[0].critical).toBe(true);
    const criticalDamage = state.bullets[0].damage;
    vi.mocked(Math.random).mockReturnValue(0.9);
    firePlayerWeapon(state);
    expect(state.bullets[1].damage).toBeCloseTo(criticalDamage / 2);
    fireBullet(state, 'boss', state.ship.position, 0, 100, 7);
    expect(state.bullets[2].damage).toBe(7);
    expect(state.bullets[2].critical).toBe(false);
  });

  it('steers radar shots without changing speed and flies straight after the target disappears', () => {
    const state = createGameState(800, 600);
    state.runCards.selectedStacks.huntingRadar = 1;
    state.ship.rotation = 0;
    state.asteroids = [createAsteroid(state, 'large', {
      x: state.ship.position.x + 100, y: state.ship.position.y + 100
    }, { x: 0, y: 0 }, 'common')];
    firePlayerWeapon(state);
    const speed = Math.hypot(state.bullets[0].velocity.x, state.bullets[0].velocity.y);
    updateBullets(state, 0.1);
    expect(state.bullets[0].velocity.y).toBeGreaterThan(0);
    expect(Math.hypot(state.bullets[0].velocity.x, state.bullets[0].velocity.y)).toBeCloseTo(speed);
    state.asteroids = [];
    const velocity = { ...state.bullets[0].velocity };
    updateBullets(state, 0.1);
    expect(state.bullets[0].velocity).toEqual(velocity);
  });

  it('restores temporary sentries, fires them, and keeps permanent ownership unchanged', () => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = ['droneSystems'];
    state.runCards.pendingChoiceIds = ['sentryWing'];
    state.runCards.queuedChoiceCount = 1;
    expect(applyRunCardChoice(state, 'sentryWing')).toBe(true);
    expect(state.drones).toHaveLength(1);
    expect(state.progression.achievementStats.dronesRecruited).toBe(1);
    state.drones[0].fireCooldown = 0;
    state.asteroids = [createAsteroid(state, 'large', {
      x: state.ship.position.x + 100, y: state.ship.position.y
    }, { x: 0, y: 0 }, 'common')];
    updateDrones(state, 0.016);
    expect(state.bullets.some((bullet) => bullet.owner === 'drone')).toBe(true);
    const drone = state.drones[0];
    syncRunCardDerivedState(state);
    expect(state.drones[0]).toBe(drone);
    const restored = createGameState(800, 600);
    restored.runCards = normalizeRunCardState(JSON.parse(JSON.stringify(state.runCards)));
    syncActiveDrones(restored);
    expect(restored.drones).toHaveLength(1);
    expect(restored.progression.achievementStats.dronesRecruited).toBe(0);
  });

  it('offers rare cards without duplicates and filters projectile effects for Ember', () => {
    const state = createGameState(800, 600);
    state.progression.ownedWarpUnlockIds = ['droneSystems'];
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    queueRunCardChoices(state, 1);
    expect(new Set(state.runCards.pendingChoiceIds).size).toBe(3);
    expect(state.runCards.pendingChoiceIds).toEqual(['sentryWing', 'huntingRadar', 'criticalReactor']);
    const offer = [...state.runCards.pendingChoiceIds];
    queueRunCardChoices(state, 1);
    expect(state.runCards.pendingChoiceIds).toEqual(offer);
    state.progression.activeShipFrameId = 'ember';
    expect(getEligibleRunCards(state).map((card) => card.id)).not.toContain('criticalReactor');
    expect(getEligibleRunCards(state).map((card) => card.id)).not.toContain('huntingRadar');
    expect(getEligibleRunCards(state).map((card) => card.id)).toContain('sentryWing');
  });
  it('queues each gained level and applies selected card stacks', () => {
    const state = createGameState(800, 600);

    queueLevelUpCardChoices(state, 2);

    expect(state.runCards.pendingChoiceIds).toHaveLength(3);
    expect(state.runCards.queuedChoiceCount).toBe(2);
    const firstChoice = state.runCards.pendingChoiceIds[0];
    expect(applyRunCardChoice(state, firstChoice)).toBe(true);
    expect(state.runCards.selectedStacks[firstChoice]).toBe(1);
    expect(state.runCards.pendingChoiceIds).toHaveLength(3);
    expect(state.runCards.queuedChoiceCount).toBe(1);

    expect(applyRunCardChoice(state, state.runCards.pendingChoiceIds[0])).toBe(true);
    expect(state.runCards.pendingChoiceIds).toEqual([]);
    expect(state.runCards.queuedChoiceCount).toBe(0);
  });

  it('queues one card choice for a non-level reward source', () => {
    const state = createGameState(800, 600);

    queueRunCardChoices(state, 1);

    expect(state.runCards.pendingChoiceIds).toHaveLength(3);
    expect(state.runCards.queuedChoiceCount).toBe(1);
  });

  it('filters projectile cards that do not affect Ember or Nivitron', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';

    const emberCards = getEligibleRunCards(state).map((card) => card.id);
    expect(emberCards).not.toContain('splitChamber');
    expect(emberCards).not.toContain('piercingCore');

    state.progression.activeShipFrameId = 'nivitron';
    const nivitronCards = getEligibleRunCards(state).map((card) => card.id);
    expect(nivitronCards).not.toContain('splitChamber');
    expect(nivitronCards).not.toContain('piercingCore');
  });

  it('exposes stacked damage and fire-rate effects to combat systems', () => {
    const state = createGameState(800, 600);
    state.runCards.selectedStacks.kineticAmplifier = 2;
    state.runCards.selectedStacks.rapidCycler = 2;

    expect(getRunCardDamageMultiplier(state)).toBeCloseTo(1.2 ** 2);
    expect(getRunCardFireRateMultiplier(state)).toBeCloseTo(1.15 ** 2);
  });

  it('exposes the new common-card modifiers without a stack limit', () => {
    const state = createGameState(800, 600);
    state.runCards.selectedStacks.expandedCaliber = 2;
    state.runCards.selectedStacks.thorns = 3;
    state.runCards.selectedStacks.impulseVector = 2;
    state.runCards.selectedStacks.inertialArmor = 2;
    state.runCards.selectedStacks.kineticAmplifier = 12;

    expect(getRunCardAreaMultiplier(state)).toBeCloseTo(1.3);
    expect(getRunCardImpactDamage(state)).toBe(54);
    expect(getRunCardDashImpulseMultiplier(state)).toBeCloseTo(1.3);
    expect(getRunCardKnockbackMultiplier(state)).toBeCloseTo(0.85 ** 2);
    expect(getRunCardDamageMultiplier(state)).toBeCloseTo(1.2 ** 12);
  });

  it('preserves a chosen emergency barrier after it absorbs a hit', () => {
    const state = createGameState(800, 600);
    state.runCards.pendingChoiceIds = ['emergencyBarrier'];
    state.runCards.queuedChoiceCount = 1;

    expect(applyRunCardChoice(state, 'emergencyBarrier')).toBe(true);
    damageShip(state, 20);

    expect(state.runCards.selectedStacks.emergencyBarrier).toBe(1);
    expect(state.runCards.shieldCharges).toBe(0);
    expect(state.ship.hp).toBe(state.ship.maxHp);
  });
});
