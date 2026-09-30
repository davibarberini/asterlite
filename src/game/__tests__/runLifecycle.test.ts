import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../simulation/state';
import { damageShip } from '../simulation/systems/playerDamage';
import { updateGame } from '../simulation/systems/gameLoop';
import { neutralInput } from '../input/actions';
import { startNewRun } from '../progression/runLifecycle';
import { saveGameState, loadGameState } from '../progression/saveData';
import { grantNovaCrownMilestoneRewards } from '../progression/novaCrownRewards';

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal('window', { localStorage: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key)
  } });
});
afterEach(() => vi.unstubAllGlobals());

describe('roguelite run lifecycle', () => {
  it('ends on death, freezes progression, and survives reload without respawning', () => {
    const state = createGameState(800, 600);
    state.run.elapsedSeconds = 123;
    state.progression.currentZoneIndex = 4;
    state.progression.unlockedZoneIndex = 4;
    state.survival.active = true;
    state.survival.currentSeconds = 123;
    state.survival.threatLevel = 5;
    state.money = 500;
    state.runCards.pendingChoiceIds = ['kineticAmplifier'];
    state.runCards.queuedChoiceCount = 1;
    damageShip(state, state.ship.maxHp + 1);
    expect(state.phase).toBe('ended');
    expect(state.money).toBe(500);
    expect(state.runCards.pendingChoiceIds).toEqual([]);
    updateGame(state, neutralInput(), 60);
    damageShip(state, 100);
    expect(state.ship.alive).toBe(false);
    expect(state.run.elapsedSeconds).toBe(123);
    expect(state.progression.achievementStats.deaths).toBe(1);
    saveGameState(state);
    const restored = loadGameState(800, 600);
    expect(restored.phase).toBe('ended');
    expect(restored.run.elapsedSeconds).toBe(123);
    expect(restored.survival.currentSeconds).toBe(123);
    expect(restored.survival.threatLevel).toBe(5);
    updateGame(restored, neutralInput(), 60);
    expect(restored.ship.alive).toBe(false);
  });

  it('resets every temporary build and route while retaining meta progression', () => {
    const state = createGameState(800, 600);
    state.progression.unlockedShipFrameIds.push('kestrel');
    state.progression.ownedWarpUnlockIds = ['deflectorFrame', 'shieldBubble'];
    state.progression.prestigeCores = 30;
    state.progression.shipLevel = 18;
    state.progression.shipXp = 800;
    state.progression.unlockedZoneIndex = 4;
    state.progression.currentZoneIndex = 4;
    state.progression.mapUnlocked = true;
    state.progression.bossDefeats = 4;
    state.progression.novaCrownHighestDifficulty = 3;
    state.progression.novaCrownBestSecondsByDifficulty = { '2': 333 };
    state.progression.achievementStats.asteroidsDestroyed = 3456;
    state.runCards.selectedStacks.sentryWing = 4;
    state.runCards.selectedStacks.kineticAmplifier = 5;
    state.runCards.shieldCharges = 2;
    state.money = 1000;
    state.crystals = 80;
    const next = startNewRun(state, 'kestrel');
    expect(next.progression.activeShipFrameId).toBe('kestrel');
    expect(next.progression.prestigeCores).toBe(30);
    expect(next.progression.novaCrownBestSecondsByDifficulty).toEqual({ '2': 333 });
    expect(next.progression.achievementStats.asteroidsDestroyed).toBe(3456);
    expect(next.progression.deflectorLevel).toBe(1);
    expect(next.shieldBubble.active).toBe(true);
    expect(next.progression.shipLevel).toBe(1);
    expect(next.progression.shipXp).toBe(0);
    expect(next.progression.currentZoneIndex).toBe(0);
    expect(next.progression.unlockedZoneIndex).toBe(0);
    expect(next.progression.mapUnlocked).toBe(false);
    expect(next.progression.bossDefeats).toBe(0);
    expect(next.money + next.crystals).toBe(0);
    expect(next.drones).toEqual([]);
    expect(next.runCards.selectedStacks.kineticAmplifier).toBe(0);
    expect(next.runCards.shieldCharges).toBe(0);
    expect(next.ship.hp).toBe(next.ship.maxHp);
    expect(next.run.elapsedSeconds).toBe(0);
    expect(next.run).not.toBe(state.run);
    expect(startNewRun(state, 'hisoka')).toBe(state);
  });

  it('preserves living run cards and pending choices through reload', () => {
    const state = createGameState(800, 600);
    state.run.elapsedSeconds = 80;
    state.runCards.selectedStacks.sentryWing = 2;
    state.runCards.selectedStacks.rangerWing = 1;
    state.runCards.selectedStacks.breakerWing = 1;
    state.runCards.pendingChoiceIds = ['incendiaryCharge', 'criticalReactor'];
    state.runCards.queuedChoiceCount = 2;
    saveGameState(state);
    const loaded = loadGameState(800, 600);
    expect(loaded.phase).toBe('playing');
    expect(loaded.run.elapsedSeconds).toBe(80);
    expect(loaded.runCards).toEqual(state.runCards);
    expect(loaded.drones.map((drone) => drone.type)).toEqual(['sentry', 'sentry', 'ranger', 'breaker']);
    expect(loaded.progression.achievementStats.dronesRecruited).toBe(0);
  });

  it('rewards each survival milestone once per run, including repeat difficulties', () => {
    const state = createGameState(800, 600);
    state.progression.currentZoneIndex = 4;
    state.progression.unlockedZoneIndex = 4;
    state.survival.active = true;
    state.survival.currentSeconds = 300;
    state.survival.threatLevel = 11;
    expect(grantNovaCrownMilestoneRewards(state)).toBe(1);
    expect(grantNovaCrownMilestoneRewards(state)).toBe(0);
    saveGameState(state);
    const loaded = loadGameState(800, 600);
    expect(grantNovaCrownMilestoneRewards(loaded)).toBe(0);
    loaded.survival.threatLevel = 21;
    expect(grantNovaCrownMilestoneRewards(loaded)).toBe(1);
    const next = startNewRun(loaded);
    next.survival.active = true;
    next.survival.threatLevel = 11;
    expect(grantNovaCrownMilestoneRewards(next)).toBe(1);
    expect(next.progression.prestigeCores).toBe(3);
    expect(next.run.coresEarned).toBe(1);
  });
});
