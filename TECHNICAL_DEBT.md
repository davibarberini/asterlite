# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Split Progression Test File By Domain

Reduce the single large progression test file into focused suites.

Context:
- `src/game/__tests__/progression.test.ts` is over 1,700 lines and now covers save loading, economy, weapons, drones, survival, bosses, zones, and UI-adjacent progression rules.
- This makes feature work slower to navigate and increases merge friction.

Acceptance:
- Split tests into at least two domain files, such as survival/weapons and progression/save.
- Keep tests Phaser-independent.
- Preserve all existing test coverage.
- Run `pnpm test` and `pnpm run build`.

### Extract Survival Hazard Renderer

Keep the vector renderer from absorbing every new survival visual.

Context:
- `VectorRenderer.ts` is close to 1,000 lines and now owns ship, bullet, asteroid, boss, saucer, drone, particle, mine, hunter, and survival visual details.
- Upcoming timed hazards will add more visual rules unless survival rendering is isolated.

Acceptance:
- Move survival hazard drawing helpers out of `VectorRenderer.ts` into a focused renderer/helper module.
- Keep renderer objects disposable and Phaser-only.
- Preserve current mine, hunter, and elite saucer readability.
- Run `pnpm run build`.

### Normalize Legacy Weapon Save State

Remove old weapon-mode concepts from active runtime surfaces while preserving save compatibility.

Context:
- Combat identity now comes from ship frames and the Weapons tab has been removed.
- Legacy fields such as `weaponMode`, `spreadUnlocked`, `piercingUnlocked`, `spreadBattery`, and `piercingRail` still exist for old saves and ship-run persistence.

Acceptance:
- Decide which legacy fields must remain in saved v1 data and which can be normalized away during load.
- Keep old saves loading without changing standard ship firing behavior.
- Remove active UI copy and runtime dependencies that imply manual weapon selection.
- Add or update tests for legacy save compatibility.
- Run `pnpm test` and `pnpm run build`.

### Native Release Signing and Store Prep

Turn the native shells into store-ready release builds.

Acceptance:
- Configure Android release signing or document local keystore generation.
- Configure iOS bundle signing/team settings for device/TestFlight builds.
- Replace default native app icons and launch/splash assets with Asteridle assets.
- Document Play Console/TestFlight build commands and artifact locations.

## Completed

### Extract Shop and Hangar UI Controllers

Reduced `GameScene.ts` ownership of Hangar UI rendering.

Notes:
- Added `HangarController` for the ship-exchange panel, Hangar shortcut, ship cards, ship preview SVGs, and Hangar-specific copy.
- `GameScene` now delegates Hangar rendering through explicit state, formatting, and callback inputs.
- Preserved current mobile drawer behavior, tab visibility rules, ship unlock, and ship switching behavior.
- `GameScene.ts` dropped from over 3,200 lines to under 3,000 lines after the extraction and weapon-tab removal.
- Validated with `pnpm run build`.

### Add Capacitor Native Packaging

Added Android and iOS native shells around the existing Vite/Phaser game.

Notes:
- Added Capacitor 8 dependencies, `capacitor.config.ts`, and generated `android/` and `ios/` projects.
- Split Vite builds into web (`/asteridle/`) and native (`./`) base paths.
- Skipped service worker registration for native bundles.
- Added Node 22 project hint and native sync/build scripts.
- Validated `pnpm run build:native`, `cap sync`, Android debug APK generation, and iOS simulator build.

### Reduce Skill Tree DOM Churn

Reduced full DOM rebuilds in the compact skill tree modal.

Notes:
- `SkillTreeModalController` now keeps the mounted board, node references, and tooltip layer for simple selection changes.
- Selecting or dismissing a talent now updates selected node state and replaces only the tooltip layer instead of rebuilding the SVG lines and every node.
- Removed talent tooltip selection from the shop render signature so selection does not invalidate the whole shop/modal render path.

### Centralize Balance Tuning

Moved combat, economy, reward, spawn, boss, saucer, drone, and ship tuning into one module.

Notes:
- Added `src/game/balance.ts` as the central tuning surface for economy costs, prestige, ship movement, weapons, drones, asteroid rewards/spawns, boss stats, saucer behavior, and collision damage.
- Replaced duplicated tuning constants across simulation systems, save/offline income, prestige, and the Phaser shop UI with `balance` references.
- Preserved existing behavior during extraction; progression tests and production build pass.

### Improve PWA Cache Versioning

Made service worker updates less likely to serve stale GitHub Pages builds.

Notes:
- Added a Vite-defined build id and registered `sw.js` with that id as a query parameter.
- Changed the service worker cache name to derive from the registered worker URL instead of a permanently fixed cache name.
- Scoped activation cleanup to old `asteridle-shell-*` caches and preserved network-first caching with offline app-shell fallback.

### Version Saves Explicitly

Moved save compatibility from a single version equality check toward explicit migrations.

Notes:
- Added documented `SAVE_VERSION_NOTES` for the current v1 save shape.
- Split v1 save reading into `readSavedGameV1` and routed loading through `migrateSavedGameToCurrent`.
- Added tests that verify v1 saves still round-trip through the migration path and unsupported versions fall back to a fresh game.

### Keep Ready Backlogs Populated

Kept implementation queues actionable before broad feature work.

Notes:
- Added smaller Ready feature slices to `BACKLOG.md` for warp core save data, unlock definitions, drawer shell, first drone gate, weapon gates, and shield state plumbing.
- Left feature work in `BACKLOG.md` and kept engineering work in this file.
- The next `develop-feature` can now start with a narrow data-model slice instead of a broad warp-core tree implementation.

### Formalize Game Event Helpers

Centralized reward and audio event creation.

Notes:
- Added typed `emitAudio` and `emitReward` helpers in `simulation/events.ts`.
- Replaced direct `state.audioEvents.push` and `state.rewardEvents.push` usage across simulation systems and the boss summon UI path.
- Direct event queue pushes now live only inside the helper module, keeping event emission consistent and serializable.

### Extract Collision and Reward Resolution

Completed the queued split of `gameLoop.ts` into smaller serializable simulation systems.

Notes:
- Added `collisions.ts` for bullet/asteroid/saucer/ship collision resolution, deflector collision, flak and missile splash, asteroid destruction, boss unlock rewards, saucer rewards, and ship death handling.
- Kept reward and audio events as serializable pushes on `GameState`.
- `gameLoop.ts` now stays focused on orchestration, idle income, asteroid movement/spawn maintenance, and achievement sync.

### Extract Boss and Saucer Systems

Continued splitting `gameLoop.ts` into smaller serializable simulation systems.

Notes:
- Added `enemies.ts` for pending boss spawn, boss movement/fire patterns, saucer spawn/movement/fire lifecycle, and shared boss/saucer damage constants.
- Reused projectile helpers from `weapons.ts` for boss and saucer shots.
- Kept saucer rewards and boss death/unlock resolution in the collision system for the next extraction slice.

### Extract Drone Combat System

Continued splitting `gameLoop.ts` into smaller serializable simulation systems.

Notes:
- Added `drones.ts` for drone orbit updates, target acquisition, weapon selection, target ranges, fire intervals, and per-frame drone bullet caps.
- Reused projectile helpers from `weapons.ts` for all drone shots.
- Preserved existing sentry/ranger/breaker behavior and kept `updateGame` as the orchestration entrypoint.

### Extract Ship Movement System

Continued splitting `gameLoop.ts` into smaller serializable simulation systems.

Notes:
- Added `shipMovement.ts` for ship movement, slingshot/aim movement, keyboard thrust, fire cooldowns, hyperspace movement, camera follow, and respawn countdown.
- Added `particles.ts` for serializable particle updates and burst creation so movement and collision systems can share effects without renderer objects.
- `updateGame` remains the single orchestration entrypoint and now imports ship movement, camera, and particle updates.

### Extract Weapons and Projectile System

Started splitting `gameLoop.ts` into smaller simulation systems.

Notes:
- Added `weapons.ts` for bullet creation, player weapon firing, projectile updates, screen culling, and missile homing steering.
- `updateGame` remains the single orchestration entrypoint and now imports `updateBullets`.
- Drone, boss, and saucer systems reuse the exported `fireBullet` helper without moving renderer objects into simulation logic.

### Extract Skill Tree Modal Controller

Completed the queued `GameScene` UI controller extraction work.

Notes:
- Extracted compact skill tree board rendering, connection lines, talent nodes, floating tooltip placement, SVG icon selection, and buy button wiring into `SkillTreeModalController`.
- `GameScene` now only configures modal chrome, passes progression/crystal state, and keeps talent selection and purchase orchestration.
- Removed stale skill tree helper code from `GameScene` while preserving the current mobile tooltip and drawer behavior.

### Extract Info Modal Controller

Continued breaking the large Phaser scene into focused UI controllers.

Notes:
- Extracted generic info modal body rendering for facts and bullet lists into `InfoModalController`.
- Moved the shared `ModalContent` type next to that controller.
- `GameScene` now only fills modal chrome and delegates info body DOM creation.

### Extract Zone Map Modal Controller

Continued breaking the large Phaser scene into focused UI controllers.

Notes:
- Extracted zone map DOM rendering, route line creation, node states, labels, and travel button wiring into `ZoneMapController`.
- `GameScene` now only configures modal chrome and passes current/unlocked zone state plus the travel callback.
- Preserved the current vertical constellation layout, locked/current zone states, and zone travel behavior.

### Extract Audio Settings Controller

Continued breaking the large Phaser scene into focused UI controllers.

Notes:
- Extracted audio settings storage, saved volume application, slider rendering, and settings toggle binding into `AudioSettingsController`.
- `GameScene` now only opens/closes the settings modal and passes volume callbacks to audio systems.
- Preserved existing SFX/music volume keys, defaults, slider ranges, and modal behavior.

### Split GameScene UI Controllers

Started breaking the large Phaser scene into focused UI controllers.

Notes:
- Extracted reward feed DOM rendering, reward priority, lifetime, and capping into `RewardFeedController`.
- `GameScene` now only passes queued reward events to the controller.
- Preserved current reward feed behavior and kept gameplay simulation state unchanged.

### Add Simulation and Progression Tests

Added a lightweight test runner and covered high-risk pure game logic.

Notes:
- Added `vitest` and a `pnpm run test` script.
- Added tests for save/load normalization, crystal balance and spending, talent purchase requirements, boss zone unlock behavior, warp reset preservation, and asteroid reward variants.
- Extracted crystal spending, talent purchasing, and warp reset creation into pure progression helpers that are reused by `GameScene`.
- Tests stay independent from Phaser and browser rendering.

### README Documentation Refresh

Updated stale project documentation after major gameplay/UI changes.

Notes:
- Controls now document keyboard, mobile slingshot aiming, firing, map travel, drawers, and respawn timing.
- Feature list now reflects zones, boss gates, talents, achievements, PWA installability, and priority feed.
- Architecture notes now describe the simulation/Phaser/DOM separation more accurately.
