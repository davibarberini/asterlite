# Asterlite Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Zone Identity Pass

Give each zone a readable identity after the card loop is in place.

Design:
- Give each zone one compact gameplay modifier, hazard emphasis, or visual identity.
- Keep modifiers data-driven and visible in the map/zone UI.
- Avoid hazards that obscure mobile readability.
- Use background tint, asteroid mix, event weighting, or enemy emphasis before adding entirely new systems.

Acceptance:
- Zone data defines at least one identity modifier.
- The simulation applies modifier effects through serializable state/data.
- Map or HUD previews the modifier compactly.
- Tests cover at least two zone modifier effects.

### Boss Memorability Pass - Mothership First

Polish bosses around distinct patterns, readable tells, size, movement, and role in the roguelite run.

Design:
- Start with the Nova Matriarch/Mothership because it is the current final-zone gate.
- Run a difficulty/readability tuning pass on `balance.bosses.mothership`: ring/fan counts, bullet speeds, telegraph seconds, anchor offset, and HP.
- Consider a spiral pattern only if variety is still lacking after tuning.
- Keep other boss changes as separate slices.

Acceptance:
- Balance numbers are reviewed against actual play and adjusted.
- Spiral pattern is added or explicitly deferred with a reason.
- Fight remains readable on mobile.
- Tests updated if pattern logic changes.

## Deferred Until Run Flow Is Polished

### Rare Cards - Dash and Defense

Implement Nova de Dash, Fase de Impacto, Placa Reativa (5-second cooldown), and Campo de Repulsão. Use explicit dash state, serialized timers, readable area effects, and tests for damage/cooldown boundaries.

### Epic and Legendary Cards

Implement the remaining approved cards in `UPGRADE_CARDS.md` in small playable slices. Keep Coração de Fornalha exclusive to Ember and Protocolo Fênix limited to one rescue per run. Define repeat-stack behavior before adding each card to the pool.

## Done

- **Enemy Variety and Combat Readability**: Added weaving, twin-shot Skirmishers from Orion and stationary-charge Snipers from Vega. Lyra retains normal scouts; Nova Threat 6+ retains elite priority. Four silhouettes now have distinct shapes, charge arcs, pattern previews, and discharge flashes; sniper aim locks for 1.15 seconds and matches the projectile. Shots cancel outside the shared mobile viewport projection and HUD-safe firing area. Fixed dead saucers firing on the next frame and duplicate bullet rewards against already-dead saucers. Normal/elite cooldowns now include an intentional extra warning window. Added a standalone renderer QA fixture at `reviews/enemy-preview.html` and simulation regression tests. Bosses and hunters unchanged in this slice.

- **Opening Balance - First Five Minutes, Initial Tuning**: New runs start with two common small and two common medium asteroids already visible, moving slowly across the firing area rather than toward the ship. Remaining population and later respawns are unchanged. Kept the approved XP curve (first choice at two kills); first gate now requires 37 kills, reaching level 5 with four level-up choices before the encounter. Ordinary Lyra collision damage is reduced to 65%; knockback, boss damage, and later zones are unchanged. Restart still restores full hull with a fresh temporary build. Added viewport-safe spawning, XP/gate, damage scope, and restart tests. All 159 tests pass. Follow-up: measure first-card/first-boss timings and survival rate on physical mobile before treating the full five-minute pacing as validated; no UI changes in this pass.

- **Run UI and Death Feedback**: Replaced the preparation dropdown with real ship silhouettes, selected-state checks, traits, and inspectable locked objectives. Separated results from next-run preparation. Death now briefly shows the existing destruction particles with restrained shake and dimming before results; reduced motion skips shake/launch effects. Added distinct Lucide icons to all 18 active cards, keyboard focus containment, Space activation, and a death devtool. Independent UX/QA review found focus, capture, and motion issues; corrected them and the header drag stealing close-button clicks. Browser-tested 360px/390px mobile flows. See `reviews/RUN_UI_QA.md`.

- **Permanent Technology Role Pass - Drone Economy Conversion**: Removed the drone shop tab, purchase/deployment controls, pricing, purchased inventory, and unused upgrade levels from runtime/save data. Drone Systems, Ranger Hangar, and Missile Foundry now gate rare Sentry Wing, Ranger Wing, and Breaker Wing cards. Each stack recruits one temporary drone with its original weapon. New runs clear drones; saves reconstruct the active fleet from cards. Drone achievements track lifetime card recruits. Obsolete purchased inventory is ignored; locked pending offers are replaced without losing the queued choice. The drone technology mission now grants crystals instead of an unused damage level. All 150 tests and web build pass.

- **Permanent Technology Role Pass - Card Options**: Launch Loadout costs 1 core and grants one starting card choice per new run. Expanded Draft costs 3 cores, requires Launch Loadout, and offers four distinct eligible cards instead of three. Both are global, saved unlocks; loading or buying a technology does not grant another starting choice. Existing offers stay unchanged. The initial choice opens after the launch animation before combat. Current technology audit: boss beacon/deflector/shield unlock mechanics; suppression changes encounter density (intentionally retained); drone/ranger/missile unlock purchases and need the next conversion slice. No numeric-only damage/fire-rate technology nodes exist in the current catalog. Rarities remain available without a new paywall.

- **Run End and Reward Boundary Pass**: Death now ends the run without repair or automatic respawn. A summary records time, zone, level, asteroid kills, Threat, and cores. Preparation offers unlocked ship selection and technologies before launching a fresh Zone 1 run. Cards, XP, money, crystals, drones, and routes reset; ships, technologies, achievements, cores, and survival records persist. Removed per-ship run slots. Living runs and ended summaries survive reload. Nova Crown awards permanent cores at Threat 11, 21, 31, etc., once per milestone per run, including repeated difficulties; bosses no longer award cores. Added lifecycle and reward/save boundary tests.

- **Rare Cards - Projectile Effects**: Added Unstable Ricochet, Incendiary Charge, and Fragmentation Chamber. Burn has timed damage, visible orange arcs, and normal asteroid rewards. Fragment kills do not recursively spawn fragments; projectile hit history prevents repeated asteroid damage while overlapping. Ship exclusions preserve Ember and Hisoka identities. Card pool now has 16 implemented cards.
- **Card Effect Conversion Pass / First Rare Cards**: 13 cards are now active, including Critical Reactor, Hunting Radar, and Sentry Wing. Critical shots double actual damage and have a gold outline; radar projectiles steer toward nearby living targets; temporary sentries fire without modifying purchased drones. Rarity is rolled before the individual card. Added combat, save-state, eligibility, and offer tests; 132 tests and web build pass.
- **Common Card Pass**: Added the ten selected common cards, unlimited stacks, weighted random offers, and visible emergency-barrier layers. The full card inventory and implementation status live in `UPGRADE_CARDS.md`.
- **Run cards consolidation**: Removed the legacy Nova Crown threat reward modifiers and modal. Temporary build choices now come only from level-up cards.
- **Boss card rewards and faster XP curve**: Route bosses now grant one standard run-card choice. Asteroid XP is one per destroy, with the roguelite level curve set to `2, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 1200`, then +200 per level.
- **Level-up shockwave deferred**: Removed the automatic level-up shockwave and asteroid clear. The underlying effect can return later through a technology unlock.

### Run Cards Foundation and Level-Up Choice Modal

Implemented the first temporary roguelite build loop.

- Added serializable `GameState.runCards`, with selected stacks, shield charges, offered card ids, and a queued level-choice count; active cards persist only as the current game state, not permanent progression.
- Added eight initial definitions with id, rarity, tags, max stacks, effect payloads, and per-ship blacklist support: damage, fire rate, max hull, projectile count, pierce, dash impact, barrier, and temporary sentry drone.
- Weapon, Ember wave, contact, ship-damage, hull, and drone systems now query card effects directly from simulation/progression code.
- Every ship filters out projectile cards that would have no effect on its weapon; Ember and Nivitron do not receive projectile/pierce cards.
- Gaining a level now queues a deterministic 1-of-3 offer. The choice modal pauses gameplay, cannot be dismissed, advances queued choices, saves the selected stack, and immediately returns to action after the last choice.
- Added compact common/rare card UI and focused tests for queues, stacks, filtering, stat hooks, and barrier consumption.

### Remove Basic Run Upgrade Shop

Removed the in-run basic upgrade menu role so the game stops reading as an incremental menu loop.

- Removed the `Upgrades` dock tab, first-upgrade tutorial flow, and all scene rendering/cost/buy handlers for damage, attack speed, HP, and offline income upgrades.
- Removed the saved progression/run fields for `shipDamageLevel`, `shipFireRateLevel`, `passiveIncomeLevel`, and upgrade-driven `maxHp`; old save fields are ignored on load and current saves no longer write them.
- Removed offline income payout/runtime state, offline popup/status, the offline income module, and old passive/max-HP achievements tied to those upgrades.
- Combat now uses base player damage/fire interval plus ship frame and achievement effects until the card system supplies temporary run power.
- Hangar summaries no longer show old `D/A` upgrade levels, and guided mission rewards no longer grant removed upgrade levels.
- Tests updated for the new base-combat/save boundaries.

### Remove Skills Tab and Talent Tree

Removed the permanent per-ship talent layer to clear the way for temporary roguelite cards.

- Removed the Skills dock tab, skill tutorial, tree modal/controllers, talent purchases, respec flow, and talent save/run fields.
- Old save fields such as `talentRanks` and skill-point counters are ignored; current saves no longer write them.
- Removed talent-derived combat, movement, drone, projectile, area, and economy effects. Their prior decisions now return to base values until the card system supplies temporary effects.
- Ship XP, level cap, HUD XP meter, and level-up shockwave remain as the foundation for the upcoming card-choice flow.

### Vector Tap Boost

Gave Vector a movement-specific identity for the swipe input model.

- Vector now stores one short tap-boost charge after a valid dash.
- A tap inside the charge window queues a smaller impulse in the same direction, consumes the charge, refreshes the thrust trail/indicator, and plays a compact boost sound.
- The charge expires quickly and is cleared when Vector is no longer the active ship.

### Ember Flame Wave Weapon

Remodeled Ember from a passive continuous aura into an explicit wave weapon.

- Ember attacks now spawn serializable expanding flame waves instead of invisible continuous aura damage.
- Flame waves apply damage only when the wave reaches asteroids, hazards, or Mothership seekers.
- Attack speed lowers the interval between flame waves through the normal ship fire cooldown path.
- Impact branch area bonuses now scale area effects globally: Ember wave radius, player/drone projectile radius, missile splash radius, and level-up shockwave radius.
- Renderer draws visible orange/yellow flame wave arcs, while Ember keeps only a small hot core instead of a misleading full aura circle.
- Tests cover wave creation, wave-only damage timing, attack speed interval scaling, and area bonus scaling.

### Mothership Boss - Polish (reward and localization)

Finished the low-risk Mothership polish slice before deeper tuning.

- Boss names now route through the i18n layer instead of hardcoded English in `GameScene`.
- Added pt-BR/en-US names for Sentinel, Crusher, Prism, and Mothership.
- Defeating the Nova Crown gate boss now grants a distinct Nova Matriarch reward with a +1 core gate bonus on top of the difficulty reward.
- Reward remains serializable because it only updates the existing global `prestigeCores` value.
- Tests cover localized boss names and the special Mothership bonus reward.

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

### Boss Personality Pass - Crusher Slice

Continued the chase boss personality pass with Crusher.

- Crusher now uses the shared HP phase mapping.
- Crusher keeps its direct chase movement identity.
- Added a telegraphed heavy shockwave ring attack.
- Shockwaves escalate by phase with denser/faster rings and shorter recovery.
- Renderer draws readable orange shockwave telegraph circles.
- Tests cover telegraph-before-fire, direct chase preservation, and phase-3 density.

### Mothership Boss - Test Action

Added a temporary settings action to speed up Nova Matriarch playtesting.

- Settings now includes a `Teste` button wired through `runSettingsTestAction`.
- Current test action clears active boss entities/minions and summons a Nova Crown `mothership` pending boss.
- Pending boss creation is reusable through `createPendingBoss`, keeping the test action on normal serializable boss state.
- Tests cover direct pending mothership creation.


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
