# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

Current engineering shape:
- `GameScene.ts` is the largest orchestration file and mixes Phaser lifecycle, HUD rendering, shop/modal DOM, tutorial triggers, purchases, travel, and settings.
- `VectorRenderer.ts` still owns broad visual language for ships, asteroids, bosses, bullets, drones, particles, level shockwaves, saucers, and special ship effects.
- `SurvivalEventRenderer.ts` now owns Nova Crown timed event and hazard visuals.
- Save loading intentionally clears incompatible versions, and the Nova Crown/survival readers now live outside the main save orchestration file.
- The new skill tree is becoming a larger touch UI surface and should keep interaction logic isolated from progression rules.
- `styles.css` still mixes several surfaces (shop/modal, map, hangar), but main menu, skill/warp tree, tutorial, bottom-nav, settings, and in-game HUD surfaces now live in their own imported stylesheets under `src/styles/`.

## Ready

### Continue Stylesheet Surface Splits

Keep reducing CSS coupling as new UI surfaces settle.

Context:
- `styles.css` remains large and still mixes shop/modal, map, and hangar rules.
- Main menu, HUD, and skill/warp tree surfaces have already been extracted, which gives the next split a clear pattern.
- Tutorial guide, bottom-nav, and settings styles have also been extracted, so the next useful split should target a larger interactive surface.

Acceptance:
- Extract another coherent surface, such as shop/modal, hangar, tutorial, bottom-nav, or settings, into a separate imported stylesheet.
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

### Split Stylesheet By Surface — Settings controls

Extracted the settings/input controls into their own stylesheet.

- Moved `.settings-modal-control*`, `.settings-danger-*`, and `.input-mode-*` rules into `src/styles/settings.css`.
- Imported the new stylesheet in `main.ts` before the remaining shared `styles.css`.
- Kept the shared modal shell in `styles.css`; this split only moves settings-specific controls used by audio, input mode, and reset/danger actions.
- Follow-up: shop/modal, map, and hangar remain in `styles.css`.

### Split Stylesheet By Surface — Bottom navigation

Extracted the mobile-first bottom navigation surface into its own stylesheet.

- Moved `.menu-toggle`, `.bottom-nav`, `.nav-button*`, `nav-label-reveal`, and the related mobile `#idle-dock`/bottom-nav overrides into `src/styles/bottomNav.css`.
- Imported the new stylesheet in `main.ts` before the remaining shared `styles.css`, matching the existing surface stylesheet pattern.
- Kept button visuals unchanged by moving the `.nav-button` base declarations out of the old shared `.shop-close`/`.shop-buy` group and into the bottom-nav stylesheet.
- Follow-up: shop/modal, map, hangar, and settings remain in `styles.css`.

### Split Stylesheet By Surface — Tutorial guide

Extracted the tutorial overlay into its own stylesheet.

- Moved `.tutorial-guide*`, the tutorial pulse keyframes, and the reduced-motion override into `src/styles/tutorial.css`.
- Imported the new stylesheet in `main.ts` with the other surface stylesheets before the remaining shared `styles.css`.
- Kept selectors and DOM structure unchanged; this is only a stylesheet ownership split.
- Follow-up: shop/modal, bottom-nav, hangar, and map/settings remain good candidates for the next CSS extraction.

### Split Stylesheet By Surface — HUD surface

Follow-up slice of the stylesheet split: extracted the in-game HUD / overlay surface.

- Moved the contiguous HUD block (boss health bar, `.hud-panel*`, `.money-readout`, HP / ship-xp meters, `.map-toggle`/`.route-toggle`/`.settings-*` toggles, `.survival-*`, `.run-modifier*`, `.first-warp-goal*`, and `.reward-feed-item*` plus its keyframes) into `src/styles/hud.css` (715 lines).
- Imported it in `main.ts` before `./styles/skillTree.css` and `./styles.css`, matching the original top-to-bottom order so base HUD rules keep their cascade position ahead of the shared `:focus-visible` rules, the higher-specificity `#app.is-zone-travel` state rules, and the `@media (max-width: 720px)` overrides that still live in `styles.css`.
- Verified integrity (715 extracted + 1977 remaining + 1 collapsed blank = 2693) and that the bundled CSS keeps the same byte size (54.42 kB) with base HUD rules first and the responsive overrides last.
- No selectors renamed and no DOM changes; `pnpm run build` and `pnpm test` (111) are green.
- Follow-up: shop/modal and bottom-nav are the next natural CSS extractions.

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
