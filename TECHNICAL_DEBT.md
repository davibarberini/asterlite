# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

Current engineering shape:
- `GameScene.ts` is the largest orchestration file and mixes Phaser lifecycle, HUD rendering, shop/modal DOM, tutorial triggers, purchases, travel, and settings.
- `VectorRenderer.ts` now owns most visual language: ships, asteroids, bosses, hazards, survival events, particles, level shockwaves, and special ship effects.
- Save loading intentionally clears incompatible versions, but still carries several legacy normalization paths from old weapons/drone/reset-era systems.
- The new skill tree is becoming a larger touch UI surface and should keep interaction logic isolated from progression rules.
- `styles.css` has grown into a monolithic stylesheet with unrelated HUD, modal, map, tree, hangar, tutorial, and settings rules in one file.

## Ready

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

### Split Stylesheet By Surface

Extracted the skill/talent/warp tech-tree surface out of the monolithic `styles.css`.

- Moved the contiguous tree block (`.skill-tree*`, `.skill-branch*`, `.skill-node*`, `.talent-tree*`, `.talent-node*`, `.talent-tooltip*`, `.warp-tree*`, `.warp-node*`, `.warp-tooltip*`) into `src/styles/skillTree.css` (875 lines).
- Imported it in `main.ts` before `./styles.css` so the base tree rules keep their original cascade position ahead of the shared `:focus-visible`, `.skill-node:disabled`, and `@media (max-width: 720px)` overrides that still live in `styles.css`.
- Verified nothing was lost (875 extracted + 2693 remaining + 1 collapsed blank line = 3569 original) and that the bundled CSS keeps the same order and byte size (54.42 kB): tree rules first, then the rest of `styles.css`, then the responsive media block last.
- No selectors renamed and no DOM changes; `pnpm run build` and `pnpm test` are green.
- Follow-up: HUD, shop/modal, and bottom-nav surfaces are the next natural extractions.

### Split Save Readers By Domain

Started breaking the monolithic `saveData.ts` into domain-focused save readers.

- Added `saveSerialization.ts` with the shared defensive primitives (`isRecord`, `isFiniteNumber`, `readNumber`, `readNonNegativeNumber`) so domain readers can reuse them without importing the large `saveData` module (avoids import cycles).
- Added `survivalSave.ts` owning the Nova Crown survival domain readers (`readSurvival`, `readRareSpawns`).
- `saveData.ts` now imports these instead of defining them inline, and dropped the now-unused `createRareSpawnState`/`getSurvivalThreatLevel` imports.
- `loadGameState`, `saveGameState`, and `clearAllAsteridleData` behavior is unchanged; existing save/load tests still pass (`pnpm test`, 111) and `pnpm run build` is green.
- Follow-up (still worthwhile): extract the larger ship-run/unlock reader group next, which shares more helpers (`readDroneCounts`, `readTalentRanks`, `readShipLevelProgress`).

### Normalize Legacy Weapon Save State

Manual weapon-mode selection is gone from active runtime surfaces; combat identity comes entirely from ship frames.

- Removed the `WeaponMode` type and the `weaponMode`/`spreadUnlocked`/`piercingUnlocked` fields from `ProgressionState`, plus `weaponMode` from `ShipRunState` and its ship-run persistence in `shipRuns.ts`.
- Dropped the dead `spreadBattery`/`piercingRail` warp-unlock ids (no definition or effect remained) from the `WarpUnlockId` union and the warp tree / hangar UI copy.
- `saveData.ts` no longer reads or writes these fields; old v2 saves keep loading and their legacy fields are normalized away (extra JSON keys ignored, and `ownedWarpUnlockIds` already filters unknown ids like `spreadBattery`/`piercingRail`).
- Standard ship firing is unchanged: ship-frame identity still drives cannon/spread/piercing behavior.
- Tests: updated `weapons.test.ts` (frame-driven firing) and added a `progression.test.ts` case asserting a legacy v2 save loads without the removed fields and fires a single standard bullet. Verified with `pnpm test` (111 passing) and `pnpm run build`.

### Extract Survival Event Renderer

Survival timed events and hazards now render through a dedicated Phaser helper.

- Added `src/phaser/view/SurvivalEventRenderer.ts` owning meteor lanes, gravity pulses, toxic (damage) fields, proximity mines, and hunters (with trails).
- `VectorRenderer.ts` delegates to it via a small `SurvivalRenderView` adapter that exposes the shared world-to-screen transforms and arc drawing, keeping the new renderer disposable and Phaser-only.
- Readability for meteor lanes, gravity pulses, toxic fields, mines, hunters, and elite saucers is unchanged; drawing logic was moved verbatim.
- Verified with `pnpm run build` and `pnpm test` (111 passing).
