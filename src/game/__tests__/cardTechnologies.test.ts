import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGameState } from '../simulation/state';
import { startNewRun } from '../progression/runLifecycle';
import { applyRunCardChoice, getEligibleRunCards, queueRunCardChoices } from '../progression/runCards';
import { getAvailableWarpCores, purchaseWarpUnlock } from '../progression/warpUnlocks';
import { loadGameState, saveGameState } from '../progression/saveData';

afterEach(() => vi.unstubAllGlobals());

describe('permanent card technologies', () => {
  it('keeps the default three-card offer and no starting choice', () => {
    const state = startNewRun(createGameState(800, 600));
    expect(state.runCards.queuedChoiceCount).toBe(0);
    queueRunCardChoices(state, 1);
    expect(state.runCards.pendingChoiceIds).toHaveLength(3);
  });

  it('requires and charges each unlock once without modifying current offers', () => {
    const state = createGameState(800, 600);
    state.progression.prestigeCores = 4;
    queueRunCardChoices(state, 1);
    const pending = [...state.runCards.pendingChoiceIds];
    expect(purchaseWarpUnlock(state.progression, 'expandedDraft')).toBe(false);
    expect(purchaseWarpUnlock(state.progression, 'launchLoadout')).toBe(true);
    expect(purchaseWarpUnlock(state.progression, 'launchLoadout')).toBe(false);
    expect(purchaseWarpUnlock(state.progression, 'expandedDraft')).toBe(true);
    expect(getAvailableWarpCores(state.progression)).toBe(0);
    expect(state.runCards.pendingChoiceIds).toEqual(pending);
    expect(state.runCards.queuedChoiceCount).toBe(1);
  });

  it('grants one starting choice each run and four distinct eligible options across ships', () => {
    const previous = createGameState(800, 600);
    previous.progression.ownedWarpUnlockIds = ['launchLoadout', 'expandedDraft'];
    previous.progression.unlockedShipFrameIds.push('ember');
    for (const frame of ['vector', 'ember'] as const) {
      const state = startNewRun(previous, frame);
      expect(state.runCards.queuedChoiceCount).toBe(1);
      expect(state.runCards.pendingChoiceIds).toHaveLength(4);
      expect(new Set(state.runCards.pendingChoiceIds).size).toBe(4);
      const eligible = getEligibleRunCards(state).map((card) => card.id);
      expect(state.runCards.pendingChoiceIds.every((id) => eligible.includes(id))).toBe(true);
      queueRunCardChoices(state, 2);
      expect(applyRunCardChoice(state, state.runCards.pendingChoiceIds[0])).toBe(true);
      expect(state.runCards.queuedChoiceCount).toBe(2);
      expect(state.runCards.pendingChoiceIds).toHaveLength(4);
    }
  });

  it('reloads pending and consumed starting choices without granting duplicates', () => {
    const values = new Map<string, string>();
    vi.stubGlobal('window', { localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value)
    } });
    const previous = createGameState(800, 600);
    previous.progression.ownedWarpUnlockIds = ['launchLoadout', 'expandedDraft'];
    previous.progression.prestigeCores = 4;
    const state = startNewRun(previous);
    saveGameState(state);
    const loaded = loadGameState(800, 600);
    expect(loaded.runCards).toEqual(state.runCards);
    expect(loaded.progression.ownedWarpUnlockIds).toEqual(previous.progression.ownedWarpUnlockIds);
    applyRunCardChoice(loaded, loaded.runCards.pendingChoiceIds[0]);
    saveGameState(loaded);
    const resumed = loadGameState(800, 600);
    expect(resumed.runCards.queuedChoiceCount).toBe(0);
    expect(resumed.runCards.pendingChoiceIds).toEqual([]);
    expect(startNewRun(resumed).runCards.queuedChoiceCount).toBe(1);
  });
});
