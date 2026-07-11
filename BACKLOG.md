# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Skill Tree Unique Node Model

Rework the ship skill tree data model so it supports fewer, more meaningful build decisions.

Design:
- Reduce most skill nodes to one rank, with only a few minor nodes having two ranks.
- Add explicit node types such as minor, notable, keystone, and locked-region entry.
- Preserve current per-ship level, XP, skill point, spent point, and respec behavior.
- Keep save state serializable and migrate/normalize old talent ranks into the new structure without crashing.

Acceptance:
- Talent definitions support unique/notable/keystone nodes with per-node point costs.
- Existing save data with old ranks loads into a valid new tree state.
- Skill purchasing and respec still work with the new model.
- Tests cover old-rank normalization, point spending, and respec after the model change.

### Skill Tree Impact and Speed Branches

Replace the current incremental tree with a larger build-oriented tree split around distinct playstyles.

Design:
- Build a left-side impact/tank/area branch focused on hull, asteroid collision, shockwaves, AoE size, aura/explosion area, and reactive effects.
- Build a right-side speed/attack branch focused on attack speed, movement speed, swipe/dash feel, cooldown bursts, and velocity-based damage.
- Include stronger notables and keystones that meaningfully change build direction.
- Avoid filling the tree with small repeated percentage-only nodes.

Acceptance:
- The tree has clear visual left/right identity for impact/tank and speed/attack builds.
- At least two keystones add strong upside with a meaningful tradeoff.
- New node effects are applied through simulation/progression helpers, not UI-only state.
- Tests cover at least one impact/tank node, one speed/attack node, and one keystone tradeoff.

### Skill Tree Draggable Canvas

Make the skill tree modal behave like a large draggable ascension/tree map.

Design:
- Replace the fixed compact board with a draggable/pannable tree container for touch and mouse.
- Keep node interactions reliable on mobile: drag pans, tap selects.
- Add a simple recenter/start button if the tree can move far from the starting area.
- Keep layout stable without zoom in the first pass unless it becomes necessary.

Acceptance:
- Players can pan around a larger skill tree on touch and mouse.
- Tapping nodes still selects and purchases through the existing tooltip flow.
- The starting area is easy to recover if the player pans away.
- Build passes and tree UI remains usable on mobile viewport sizes.

### Skill Tree Hidden Drone Region

Add a drone-focused region that is hidden until drone systems are unlocked.

Design:
- Place drone nodes outside the initial visible tree path so the tree feels larger once drones unlock.
- Hide or fog the drone region until the player owns/unlocks drone systems.
- Add drone-focused nodes for sentry/semi-auto, ranger/shotgun, breaker/missile, and hybrid ship-drone builds.
- Keep locked region copy compact and avoid spoiling every drone node too early.

Acceptance:
- Before drones, the drone region is visibly locked or hidden and cannot be purchased.
- After drones unlock, the region becomes reachable/purchasable.
- Drone node effects apply to the relevant drone mechanics.
- Tests cover locked/unlocked drone region behavior and at least one drone node effect.

### Skill Tree Level Cap and Balance Pass

Balance the larger tree around finite points and future technology-based level cap increases.

Design:
- Set a clear base ship level cap target, likely 20.
- Leave room for future global technologies to increase max ship level.
- Tune point income and node costs so players cannot fill the entire tree at base cap.
- Keep crystals as support/rebuild currency for now rather than mandatory node purchase currency.

Acceptance:
- Base skill point cap is lower than total available tree cost.
- UI communicates level, XP, available points, spent points, and respec cost clearly.
- Existing tests are updated for the new cap and point economy.
- Add follow-up backlog notes for technology-based max level increases if not implemented in this slice.

### Space Masters Naming Pass

Evaluate whether the project should move from Asteridle toward a broader survival-build identity such as `Space Masters`.

Design:
- Treat this as a branding/content pass after the survival loop proves itself.
- Consider names that support incremental progression, ship mastery, and survival runs.
- Update player-facing title, manifest, and copy only once the direction is stable.

Acceptance:
- Decide on the project name or keep Asteridle intentionally.
- Update app title, manifest, main menu, and relevant docs if renamed.
- Avoid changing package/release identifiers until publishing implications are reviewed.

### Run Modifiers and Zone Hazards

Make zones change how a run feels instead of only scaling numbers.

Design:
- Give each zone one readable modifier or hazard.
- Examples: faster asteroid drift, denser crystal pockets with higher threat, dense asteroid belts that favor piercing/missiles, or limited visibility storms.
- Keep modifiers data-driven and visible in the map/zone UI.
- Avoid adding hazards that obscure mobile readability.

Acceptance:
- Zone data defines at least one gameplay modifier.
- The simulation applies the modifier through serializable zone state/data.
- Map or HUD copy previews the modifier compactly.
- Add tests for at least two zone modifier effects.

### Drone Loadout Presets

Let players save active drone count presets for quick build testing.

Design:
- Build on the current active drone count controls.
- Support compact presets such as all off, balanced, missile only, and player-saved current loadout.
- Keep purchased drone counts separate from active/deployed counts.

Acceptance:
- Players can apply at least three preset loadouts from the Drones tab.
- Presets clamp to owned drone counts.
- Custom active counts remain saved.
- Add tests for preset clamping and active drone synchronization.

### More Enemy and Threat Variety

Add one or two new lightweight combat threats that change movement decisions.

Design:
- Prefer simple serializable threats over a large enemy framework.
- Candidates: proximity mine/drifter, shard that lightly homes, or an elite saucer pattern.
- Keep visuals distinct and readable on mobile.

Acceptance:
- Add at least one new threat type with serializable state.
- Spawn it in an appropriate zone or event.
- Render it distinctly and cover collision/combat behavior with tests.

### Contextual Onboarding Beats

Add short milestone prompts for the first-time path through the game's major systems.

Design:
- Use transient feed/modal copy sparingly.
- Prompt around actual player milestones instead of opening a tutorial on launch.
- Focus on first asteroid reward, first crystal, boss summon, first warp core, and first permanent unlock.

Acceptance:
- Add one-time onboarding flags to serializable progression state.
- Trigger concise messages for the first few major milestones.
- Avoid repeating messages on existing saves that already passed the milestone.
- Keep combat input uninterrupted.

## Later

### Ship Unlock Pacing and Identity

Refine how ships unlock so each new ship feels earned instead of just being the next reset reward.

Design:
- Keep ship collection as a long-term customization layer.
- Revisit this after ships have stronger weapon identities.
- Consider boss salvage, route milestones, mission chains, ship parts, or zone-specific unlock requirements only if they add meaningful decisions.
- Keep the first extra ship understandable and reachable.
- Avoid turning ship unlocks into a second confusing technology tree.

Acceptance:
- Define unlock requirements in ship data or a small progression module.
- Update the hangar card locked state to explain the requirement compactly.
- Preserve existing saves that already unlocked ships through exchanges.
- Add tests for at least first, mid, and late ship unlock pacing.

## Conditional

### Monetization Foundation Readiness Check

Read `MONETIZATION_PLAN.md` and implement monetization only if the readiness gate in that document is clearly satisfied.

Design:
- This task is intentionally not part of `Ready`; do not pick it from a normal `develop-feature` pass.
- First verify that the core loop, mid-game progression, balance, mobile publishing path, and cosmetic surfaces are mature enough.
- If the gate is not satisfied, leave monetization blocked and optionally implement only non-monetized foundations that improve the game independently.
- Prefer cosmetics, optional rewarded ads, and temporary convenience boosts over direct permanent power.

Acceptance:
- Start by reading and summarizing `MONETIZATION_PLAN.md`.
- Explicitly decide whether the readiness gate is satisfied before implementation.
- If satisfied, implement the smallest safe foundation slice from the plan.
- If not satisfied, do not add ads, purchases, premium currency, store prompts, or paid progression.
- Keep gameplay state serializable and isolated from platform SDK objects.

## Process Notes

- Prefer implementing one backlog item at a time.
- Keep simulation state serializable.
- Run `pnpm run build` before finishing implementation work.
- Update this backlog when a feature is completed or split.
