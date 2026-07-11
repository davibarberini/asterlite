# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Survival Run Modifiers

Expand boss rewards into run-defining survival choices with tradeoffs.

Priority order:
- Add more positive run modifiers for ship weapons, drones, economy, and defense.
- Add optional tradeoff modifiers such as more damage with less hull.
- Show active run modifiers compactly in the HUD or relevant tab.
- Tie some modifier choices to survival milestones or mini-bosses.

Acceptance:
- New modifiers are serializable and reset with the run.
- At least one modifier has a meaningful tradeoff.
- UI communicates active modifiers without adding a large permanent panel.
- Tests cover modifier application and reset behavior.

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
