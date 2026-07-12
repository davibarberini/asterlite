# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

Current engineering shape:
- `GameScene.ts` is the largest orchestration file and mixes Phaser lifecycle, HUD rendering, shop/modal DOM, tutorial triggers, purchases, travel, and settings.
- `VectorRenderer.ts` now owns most visual language: ships, asteroids, bosses, hazards, survival events, particles, level shockwaves, and special ship effects.
- Save loading intentionally clears incompatible versions, but still carries several legacy normalization paths from old weapons/drone/reset-era systems.
- The new skill tree is becoming a larger touch UI surface and should keep interaction logic isolated from progression rules.
- `styles.css` has grown into a monolithic stylesheet with unrelated HUD, modal, map, tree, hangar, tutorial, and settings rules in one file.

## Ready

### Normalize Legacy Weapon Save State

Remove old weapon-mode concepts from active runtime surfaces while preserving save compatibility.

Context:
- Combat identity now comes from ship frames and the Weapons tab has been removed.
- Legacy fields such as `weaponMode`, `spreadUnlocked`, `piercingUnlocked`, `spreadBattery`, and `piercingRail` still exist for old saves and ship-run persistence.
- Current tests already assert that legacy weapon state does not change standard ship firing behavior.

Acceptance:
- Decide which legacy fields must remain in saved v2 data and which can be normalized away during load.
- Keep old saves loading without changing standard ship firing behavior.
- Remove active runtime dependencies that imply manual weapon selection.
- Add or update tests for legacy save compatibility.
- Run `pnpm test` and `pnpm run build`.

### Split Save Readers By Domain

Make save loading easier to change as Nova Crown, ships, skill trees, and technologies evolve.

Context:
- `saveData.ts` is over 750 lines and contains readers for achievements, ship unlocks, ship runs, drones, talents, bosses, Nova Crown difficulty, rare spawns, survival, and offline income.
- The project now intentionally clears incompatible save versions, so the current code can be structured around v2 domain readers instead of one long procedural file.

Acceptance:
- Extract at least one cohesive reader group, such as ship runs/unlocks or Nova Crown/survival, into a focused module.
- Keep `loadGameState`, `saveGameState`, and `clearAllAsteridleData` public behavior unchanged.
- Preserve existing save/load tests.
- Run `pnpm test` and `pnpm run build`.

### Split Stylesheet By Surface

Reduce CSS risk as HUD, modal, map, tree, hangar, and tutorial UI keep growing.

Context:
- `styles.css` is over 3,500 lines.
- Recent changes keep adding specialized modal/tree/HUD rules, making accidental selector coupling more likely.

Acceptance:
- Split at least one coherent surface into a separate imported stylesheet, starting with skill tree/modal tree styles or HUD styles.
- Preserve Vite CSS loading and current visual output.
- Keep selectors scoped to the same DOM structure; do not redesign the UI in this task.
- Run `pnpm run build`.

## Later

### Simulation System Boundary Pass

Review high-churn simulation systems once the current Nova Crown and skill tree loops settle.

Context:
- `collisions.ts` is over 800 lines and owns bullet hits, asteroid destruction, hazards, aura damage, shockwaves, ship damage, unlock progress, rewards, and death handling.
- This file changes often because many features need collision side effects.

Acceptance:
- Identify one cohesive extraction, such as player damage resolution, asteroid destruction rewards, or shockwave resolution.
- Keep simulation state serializable and renderer-free.
- Preserve existing tests.

### UI Interaction Regression Harness

Add lightweight coverage for DOM controller interactions that are hard to protect with simulation tests.

Context:
- Tutorial targets, draggable skill tree interactions, hangar lock progress, and zone navigation are mostly DOM behavior.
- Breakages here are currently caught manually.

Acceptance:
- Add a small DOM-capable test setup or isolated controller tests for one high-value UI surface.
- Prefer testing controller behavior without booting Phaser when possible.
- Cover at least one tap/click flow and one disabled/locked state.

### Native Release Signing and Store Prep

Turn the native shells into store-ready release builds.

Acceptance:
- Configure Android release signing or document local keystore generation.
- Configure iOS bundle signing/team settings for device/TestFlight builds.
- Replace default native app icons and launch/splash assets with Asteridle assets.
- Document Play Console/TestFlight build commands and artifact locations.

## Done

### Extract Survival Event Renderer

Survival timed events and hazards now render through a dedicated Phaser helper.

- Added `src/phaser/view/SurvivalEventRenderer.ts` owning meteor lanes, gravity pulses, toxic (damage) fields, proximity mines, and hunters (with trails).
- `VectorRenderer.ts` delegates to it via a small `SurvivalRenderView` adapter that exposes the shared world-to-screen transforms and arc drawing, keeping the new renderer disposable and Phaser-only.
- Readability for meteor lanes, gravity pulses, toxic fields, mines, hunters, and elite saucers is unchanged; drawing logic was moved verbatim.
- Verified with `pnpm run build` and `pnpm test` (111 passing).
