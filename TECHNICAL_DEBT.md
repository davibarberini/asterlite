# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

Current engineering shape:
- `GameScene.ts` is the largest orchestration file and mixes Phaser lifecycle, HUD rendering, shop/modal DOM, tutorial triggers, purchases, travel, and settings.
- `VectorRenderer.ts` still owns broad visual language for ships, asteroids, bosses, bullets, drones, particles, level shockwaves, saucers, and special ship effects.
- `SurvivalEventRenderer.ts` now owns Nova Crown timed event and hazard visuals.
- Save loading intentionally clears incompatible versions, and the Nova Crown/survival readers now live outside the main save orchestration file.
- The new skill tree is becoming a larger touch UI surface and should keep interaction logic isolated from progression rules.
- `styles.css` has grown into a monolithic stylesheet with unrelated HUD, modal, map, tree, hangar, tutorial, and settings rules in one file.

## Ready

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
