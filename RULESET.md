# Asteridle Ruleset

Use this file as the shared implementation contract for agents working in this repository. Prefer these rules over inventing new local patterns.

## Product Direction

- Asteridle is a mobile-first Phaser/Vite 2D browser game with DOM HUD, shop, modal, hangar, and skill-tree UI.
- The game should feel immediately playable, readable, and fast. Prefer small playable systems over broad rewrites.
- Preserve borderless movement and the camera-followed playfield.
- Death is a repair-cost setback with automatic respawn, not a hard game over.
- Nova Crown is the long-run survival/replayability zone. Changes there should support escalating threat, build experimentation, and clear readable danger.

## Workflows

- `BACKLOG.md` is the source of truth for player-facing feature work.
- `TECHNICAL_DEBT.md` is the source of truth for engineering improvements.
- If a Ready item is too broad, split it first and implement the first useful slice.
- Keep changes scoped to the chosen item and directly required support work.
- Update the relevant backlog/debt file after implementation.
- Run `pnpm run build` before finishing feature or improvement work.
- Run focused tests, or `pnpm test`, when simulation/progression/save logic changes.

## Architecture

- Keep game simulation state serializable and separate from Phaser renderer objects.
- Simulation code belongs under `src/game/**`; Phaser rendering/controllers belong under `src/phaser/**`.
- Renderer helpers may depend on Phaser. Progression, balance, save, and simulation modules should not.
- Prefer domain-focused modules over growing orchestration files further. Current high-pressure files include `GameScene.ts`, `VectorRenderer.ts`, `collisions.ts`, `saveData.ts`, and `styles.css`.
- Use existing helpers and local patterns before adding new abstractions.

## Save Data

- Save loading may clear incompatible formats instead of preserving full backwards compatibility.
- Defensive save readers should use shared serialization helpers when available.
- Do not store Phaser objects, DOM nodes, functions, class instances, or renderer-only state in saved simulation/progression data.
- When removing dead systems, normalize old save fields away rather than keeping runtime compatibility shims.

## UI And CSS

- The UI is mobile-first. Avoid desktop-only controls as required gameplay paths.
- Keep the first screen usable, not marketing-oriented.
- Keep UI modern, simple, readable, and consistent with the existing neon/dark space style.
- Prefer icons for compact controls and keep labels/tooltips only where they improve clarity.
- Do not add visible tutorial/explanatory copy unless the feature explicitly needs it; prefer intuitive highlights and direct interaction.
- Split CSS by coherent surface under `src/styles/` when touching large UI areas.
- Preserve cascade order when extracting CSS: imported surface stylesheets should keep the same visual output as before.
- Do not redesign a surface during a technical CSS split.

## Gameplay And Balance

- Ship-specific identity should come from ship frames, unique weapons, and unique traits.
- Global technology/core progression should apply across ships unless the backlog item says otherwise.
- Skill/talent changes should encourage builds and tradeoffs instead of allowing every node to be trivially filled.
- Nova Crown difficulty should scale through threat/difficulty systems rather than one-off hardcoded spikes.
- Damage zones, mines, meteor lanes, hunters, and survival hazards must be visually readable before they punish the player.
- Mobile input should remain simple and dynamic; avoid adding virtual joystick/buttons unless deliberately chosen.

## Rendering

- Visual hazards should communicate danger by motion, color, scale, and timing, not by dense UI text.
- Trails should represent recent path/motion when that is the visual intent, not merely stick to the object.
- Keep effects performant: prefer bounded particle counts, reusable graphics patterns, and simple geometry unless a feature requires more.

## Testing And Validation

- `pnpm run build` is the minimum verification before finishing a feature/improvement pass.
- Use `pnpm test` for changes to simulation, progression, save loading, unlocks, rewards, damage, weapons, or core formulas.
- If tests/build cannot be run, state that clearly in the final response.
- Keep test coverage proportional to risk: focused for narrow logic, broader for shared progression/simulation contracts.

## Git Hygiene

- Do not revert user changes unless explicitly asked.
- Commit only when requested, or when the workflow explicitly asks for commit/push.
- Before committing, check `git status --short --branch` and make sure only intended files are included.
- Prefer small commits with clear messages.
- If pushing to `main`, verify the branch is clean and aligned afterward.
