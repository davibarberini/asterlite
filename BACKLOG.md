# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Boss Personality Pass - Crusher Slice

Give Crusher a distinct telegraphed attack while preserving its chase identity.

Design:
- Reuse the existing boss phase + telegraph state.
- Add a slow heavy shockwave/ring attack that fits Crusher's bruiser identity.
- Escalate the ring count, speed, or recovery by HP phase.
- Keep Crusher's direct chase movement intact.

Acceptance:
- Crusher gains an HP-based phase shift.
- Crusher telegraphs before emitting the shockwave/ring attack.
- Movement identity is preserved.
- Add tests for phase shift and signature attack.

### Boss Personality Pass - Prism Slice

Give Prism a distinct telegraphed attack while preserving its orbit/chase identity.

Design:
- Reuse the existing boss phase + telegraph state.
- Add a ricochet lattice attack that feels different from Sentinel precision and Crusher shockwaves.
- Escalate ricochet density, bounce count, or recovery by HP phase.
- Keep Prism's curved approach movement intact.

Acceptance:
- Prism gains an HP-based phase shift.
- Prism telegraphs before emitting the ricochet lattice.
- Movement identity is preserved.
- Add tests for phase shift and signature attack.

### Mothership Boss - Polish (reward, localization, tuning)

Finish the loose ends left after the mothership slice 1.

Design:
- Localize the boss name: `formatBossName` in `GameScene.ts` returns hardcoded English ('Nova Matriarch'); route it through the i18n `translate` layer like other UI copy.
- Add a distinct defeat reward for the Nova Crown gate mothership (e.g. bonus cores/crystals or an unlock), since it is a climax fight, not a normal gate boss.
- Run a difficulty/readability tuning pass on `balance.bosses.mothership` after playtesting: ring/fan counts, bullet speeds, telegraph seconds, anchor offset, and HP.
- Consider a spiral pattern as a third telegraphed attack if variety is still lacking.

Acceptance:
- Boss name is localized (pt-BR and en-US).
- Defeating the mothership grants a clearly special reward and stays serializable.
- Balance numbers are reviewed against actual play and adjusted.
- Tests updated if reward/logic changes.

### Technology-Based Max Ship Level

Let global technologies raise the pilot's level ceiling above the base cap.

Design:
- Build on the existing `getShipLevelCapBonus(progression)` seam in `shipLevel.ts`, which currently always returns 0.
- Grant bonus max levels from a global source (e.g. a new warp-core/technology node), not from a single ship frame.
- Each bonus level should keep granting one skill point, so the point economy stays below total tree cost unless several technologies are owned.
- Update the save reader clamp (currently `baseMaxShipLevel`) to account for the earned bonus so high-level saves are not clipped.

Acceptance:
- At least one technology increases max ship level through `getShipLevelCapBonus`.
- Skill point cap scales with the bonus and remains below total tree cost at the base tier.
- Skills UI shows the raised cap (level `x/max`).
- Add tests for the bonus cap and its skill-point income.

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

## Done

### Mothership Boss - Slice 1 (camera-anchored bullet-hell)

Introduced the first boss with real personality: the Nova Crown gate boss is now the `mothership`.

- New `mothership` boss type (Nova Matriarch) assigned to the Nova Crown gate; other bosses unchanged.
- Camera-anchored behavior in `bossMothership.ts`: instead of chasing, it hovers in the upper arena and tracks the ship horizontally, keeping borderless player movement for dodging.
- HP-based phases (`getMothershipPhase`) escalate bullet count, damage, and recovery speed.
- Two telegraphed bullet-hell patterns: a radial ring with a rotating dodge gap and an aimed fan; each is previewed by a warning ring/aim line before firing.
- Serializable boss brain fields on `AsteroidState` (`bossPhase`, `bossTelegraphFor`, `bossTelegraphKind`, `bossAimAngle`, `bossPatternCursor`); tuning lives in `balance.bosses.mothership`.
- Renderer draws a distinct capital-ship hull, magenta identity colors, and the attack telegraphs.
- Tests cover phase thresholds, camera anchoring/convergence, telegraph-before-fire, and phase-based ring density (`pnpm test`, 122). Build green.
- Follow-ups added to `Ready`: summons + beam (slice 2), and a personality pass for the other bosses.

### Mothership Boss - Slice 2 (summons and beam)

Continued the Nova Crown mothership into a fuller multi-phase encounter.

- Added serializable `bossMinions` to `GameState` and a lightweight mothership fighter minion with movement, HP, contact damage, and shots.
- Mothership summon bursts are phase-gated: phase 1 has none, later phases spawn fighters, and phase 3 spawns a larger burst.
- Added a telegraphed sweeping beam attack with active-window damage and beam hit cooldown.
- Phase 3 now overlaps ring + aimed fan pressure and summon bursts.
- Renderer draws active beam visuals and mothership minion fighters.
- Tests cover summon gating/cadence, beam telegraph vs active damage, and phase-3 escalation.

### Boss Personality Pass - Sentinel Slice

Started the chase boss personality pass with Sentinel.

- Split the broad sentinel/crusher/prism pass into smaller boss-specific slices.
- Added shared HP phase mapping for chase bosses.
- Sentinel now uses a telegraphed precision volley instead of instantly firing every cooldown.
- Sentinel volleys escalate by phase: later phases fire denser narrow bursts with shorter recovery.
- Sentinel keeps its existing orbit movement identity.
- Renderer draws a readable green precision-line telegraph.
- Tests cover phase mapping, telegraph-before-fire, phase-3 density, and preserved movement.

### Skill Tree Level Cap and Balance Pass

Lowered the base ship level ceiling and left a seam for future technology-based increases.

- Base ship level cap is now `baseMaxShipLevel = 20` (down from 25), so the base skill-point cap is 19 — well below the ~56 point total cost of the full tree, forcing build tradeoffs.
- Added `getShipLevelCapBonus(progression)` (currently 0) and `getMaxShipLevel(progression)` so global technologies can raise the ceiling later without touching callers; `getTotalShipSkillPointCap` now takes progression.
- `grantShipXp`, HUD XP meter, the skills modal, and the save reader clamp all use the dynamic/base cap; old saves above level 20 normalize down to the new cap.
- Skills modal now shows level as `current/max` and adds a `Spent` points stat alongside available points and respec cost.
- Crystals stay a respec/support currency; node costs were left unchanged.
- Tests updated for the new cap and point economy (`pnpm test`, 118) and `pnpm run build` is green.
- Follow-up added to `Ready`: `Technology-Based Max Ship Level`.

### Skill Tree Hidden Drone Region

Added the hidden drone region and completed its hybrid build slice.

- Drone talent nodes live outside the initial tree path and remain hidden/disabled until Drone Systems or owned drones unlock the region.
- Sentry/semi-auto, ranger/shotgun, and breaker/missile branches are gated by their matching drone technologies.
- Added `Command Link` and `Carrier Doctrine` hybrid nodes that connect ship-fire decisions with drone damage/fire-rate bonuses.
- Tests cover locked/unlocked drone region behavior, drone branch gates, hybrid talent gates, and hybrid talent effects.

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
