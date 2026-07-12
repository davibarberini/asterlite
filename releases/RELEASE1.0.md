# Asteridle Release 1.0

Completed backlog and technical debt items moved out for the 1.0 release snapshot.

## Backlog Completed

### Skill Tree Hidden Drone Region

Moved drone talents into a fogged side region of the draggable skill tree.

Notes:
- Expanded the skill tree canvas to 11 columns and moved semi-auto, shotgun, and missile nodes outside the initial core/impact/speed path.
- Added a locked drone region overlay that hides/fogs drone nodes until Drone Systems is installed.
- Changed drone talent access to be technology-gated: Drone Systems opens semi-auto, Ranger Hangar opens shotgun, and Missile Foundry opens missile talents.
- Kept existing drone talent effects and added tests for locked/unlocked access plus a semi-auto range effect.
- Updated the skill tree UI with hidden-region node/line styling and compact locked-region copy.
- Validated with `pnpm test` and `pnpm run build`.

### Skill Tree Draggable Canvas

Made the skill tree modal behave like a panning tree map instead of a fixed compact board.

Notes:
- Wrapped the skill tree nodes, connector lines, and tooltip layer in a draggable viewport.
- Added touch and mouse panning with movement-threshold handling so tap selection still works on nodes.
- Added a small recenter control that returns the tree to the starting Core Calibration area.
- Preserved selected-node tooltip behavior while the tree is translated inside the viewport.
- Updated compact tree layout math so the 7-column tree lines, nodes, and tooltips align in the draggable canvas.
- Kept the warp core tree on the existing static compact layout by scoping draggable styles to the skill tree board.

### Skill Tree Impact and Speed Branches

Split the early skill tree into build-oriented impact/tank and speed/attack directions.

Notes:
- Added `core`, `impact`, and `speed` talent branches with a wider left/right layout.
- Reworked early nodes into Core Calibration, Impact Plating, Shockwave Capacitor, Impulse Jets, Rapid Vectoring, Bulwark Protocol, and Afterburner Doctrine.
- Bulwark Protocol reduces incoming damage and increases level-up shockwave radius while lowering ship speed.
- Afterburner Doctrine increases ship speed and fire cadence while increasing incoming damage.
- New skill effects now flow through progression helpers for incoming damage, shockwave radius, ship speed, and ship fire interval.
- Updated the skill tree UI branch colors and Portuguese copy for the new build identities.
- Added tests for impact mitigation, speed/fire bonuses, branch definitions, and keystone tradeoffs.

### Skill Tree Unique Node Model

Reworked the skill tree foundation so future build-oriented nodes can be more meaningful.

Notes:
- Added explicit skill node types: minor, notable, keystone, and locked-region entry.
- Added per-node skill point costs instead of a universal one-point purchase cost.
- Reduced current tree ranks so most nodes are single-purchase choices, with only a few minor nodes keeping two ranks.
- Updated requirements that referenced old high-rank thresholds to fit the normalized tree.
- Save loading now clamps old persisted ranks into the new max-rank structure and recalculates spent skill points from the normalized current tree.
- Skill purchase, available point checks, respec cost, and tooltip copy now use per-node point costs.
- Added tests for node type/cost definitions, point spending, respec, and old-rank normalization.

### Survival Run Modifiers

Expanded Nova Crown threat rewards into more run-defining survival choices.

Notes:
- Added new serializable run modifiers for ship damage, drone damage, incoming damage reduction, and a ship-damage tradeoff.
- Glass Reactor adds a stronger ship damage/fire cadence boost while increasing incoming damage.
- Existing threat milestone rewards now rotate available choices so later milestones surface different modifier types instead of always showing the same first three.
- Player weapon damage, Ember aura damage, drone damage, drone cooldown, credit payout, and incoming damage now read from the active run modifier state.
- The survival HUD now shows compact active modifier chips only while Nova Crown survival is active.
- Added tests for later milestone choice rotation, ship/drone modifier effects, incoming damage modifiers, and existing run reset behavior.

### Ship Skill Respec and Crystal Role

Added a crystal-paid rebuild path for the point-based ship skill tree.

Notes:
- Added a respec action for the active ship's skill build.
- Respec costs crystals based on spent skill points and refunds all spent points.
- Respec clears talent ranks without losing ship level, XP, or total earned skill points.
- The Skills tab now communicates the crystal cost and disables respec when there are no spent ranks or not enough crystals.
- Crystal guidance copy now frames crystals as a rebuild/support resource instead of the direct skill purchase currency.
- Added tests for respec cost, successful refund behavior, and insufficient-crystal preservation.

### Ship Skill Tree Rebuild

Reworked crystal-purchased ship skills into limited build choices driven by ship level and skill points.

Notes:
- Added serializable per-ship level, XP, total skill points, and spent skill points.
- Ships now gain XP from destroyed asteroids and bosses, with level-ups granting finite skill points.
- Talent ranks now cost skill points instead of crystals, so crystals no longer gate the skill tree.
- Existing saves with already-purchased talent ranks migrate with enough level/points to preserve those ranks.
- Ship level and skill point state are captured per ship run and restored when switching ships.
- The skill UI now shows level, XP, available points, and spent ranks instead of treating crystals as the purchase currency.
- Added tests for point-based talent buying, ship XP/level-up, finite point cap, save persistence, and ship switching.

### Remove Ship Reset Loop

Removed ship/core reset as a primary progression mechanic.

Notes:
- Removed the player-facing Core Reset panel and action from the Technologies tab.
- Removed reset-based core gain from Nova Crown threat; cores now come from Nova Crown boss and first-clear rewards.
- Removed the core reset state factory and obsolete ship exchange count unlock helpers.
- Renamed the first-core guided mission from the legacy `warpForFirstCore` path to `earnFirstCore`, with save migration for old mission ids.
- Run reward choices now describe lasting until the current Nova Crown survival attempt ends, and active/pending run rewards clear when survival ends.
- Existing saves keep global cores, owned Technologies, unlocked ships, ship runs, and Nova Crown records without needing the old reset path.
- Updated tests away from reset behavior and kept coverage for ship switching, core rewards, and legacy mission migration.

### Boss Identity and Pattern Pass

Made route bosses read more like distinct fights instead of larger asteroid targets.

Notes:
- Increased boss radius and HP scaling so route bosses feel more substantial.
- Sentinel now favors a standoff orbit movement profile instead of direct chase.
- Crusher now charges more aggressively and keeps a heavier forward pressure profile.
- Crusher fires a wider four-shot spread with higher bullet damage, while Sentinel keeps a tighter aimed volley.
- Prism keeps its ricochet projectile identity and received larger boss sizing to match the pass.
- Added tests for boss HP/size tuning, distinct Sentinel/Crusher movement, and distinct attack patterns.

### Threat Milestone Reward Choices

Moved run reward choices away from boss defeat and into Nova Crown threat milestones.

Notes:
- Route boss defeats no longer queue run reward choices directly.
- Nova Crown survival now queues run reward choices at threat 10, 20, 30, and so on by default.
- The next reward threat level is stored in serializable survival state so active runs can persist safely.
- Added a `getThreatRewardInterval` hook so future Technologies can reduce the threat interval or otherwise tune reward pacing.
- Updated the reward choice modal copy from boss loot to Nova Crown threat pressure.
- Added tests for boss reward removal, threat milestone triggering, and save/load persistence of milestone progress.

### Nova Crown Core Economy

Moved technology core earning into Nova Crown challenge rewards.

Notes:
- Added difficulty-scaled global core rewards for bosses defeated while in Nova Crown survival.
- Added a first-clear global core reward for reaching threat level 11 on each Nova Crown difficulty.
- First-clear rewards are tracked per difficulty so repeat clears do not duplicate the milestone payout.
- Core rewards use the selected/active Nova Crown difficulty and persist globally across ship switching.
- Reward feed copy now explains when cores came from Nova Crown boss defeats or difficulty clears.
- Added tests for boss core rewards, first-clear rewards, save persistence, and reset preservation.

### Nova Crown Difficulty Ladder

Turned Nova Crown into a selectable infinite difficulty ladder instead of a single survival endpoint.

Notes:
- Traveling to Nova Crown now opens a compact difficulty picker before the zone travel animation starts.
- The picker shows selected difficulty, highest unlocked difficulty, best time for that difficulty, starting threat, and reward/asteroid/damage multipliers.
- Difficulty 1 is available by default; reaching threat level 11 on difficulty N unlocks difficulty N + 1.
- Difficulty scaling is formula-driven, with higher difficulties starting at higher threat, gaining threat faster, and scaling rewards, asteroid HP, and asteroid damage.
- Nova Crown survival bests are now tracked per difficulty while preserving the existing global best fields for older unlock logic.
- Save format moved to version 2; incompatible old save formats are cleared instead of migrated field-by-field.
- Added tests for selected difficulty threat scaling, threat 11 difficulty unlocks, and per-difficulty best persistence.

### Ship Build Identity Expansion

Expanded ship combat identities for Ember, Kestrel, Bulwark, and Wraith.

Notes:
- Added a new serializable-free `aura` ship weapon identity.
- Added a new serializable-free `velocity` ship weapon identity.
- Added a new serializable-free `ram` ship weapon identity.
- Added a new `phase` ship identity with serializable cooldown/flash state.
- Ember now uses the aura identity instead of the standard cannon.
- The Ember aura deals continuous nearby damage to asteroids and survival hazards.
- Aura damage scales with ship damage, ship frame damage bonuses, achievement damage, fire-rate upgrades, and rapid-fire boss rewards.
- Pressing fire on Ember no longer creates standard cannon bullets.
- Kestrel now gains shot damage and reduced shot cooldown from current movement speed.
- Bulwark now damages asteroids by ramming, destroys weak asteroids on impact, reduces contact damage, and applies stronger impact knockback.
- Wraith now absorbs the first real HP hit while its phase shield is ready, gains brief invulnerability, and then waits for the phase shield cooldown.
- The vector renderer shows Ember's active aura as a subtle orange field around the ship.
- The vector renderer shows Wraith's phase shield readiness and absorption pulse as a subtle ghost ring.
- The Hangar now labels aura, velocity, ram, and phase ships clearly in their weapon identity text.
- Added tests for Ember's no-bullet aura behavior, attack-speed-scaled aura damage, Kestrel speed scaling, Bulwark ram collision behavior, and Wraith phase shield absorption.

### Global Core Reset Progression

Moved core earning from ship exchange/crystal routing into Nova Crown survival.

Notes:
- Superseded by `Remove Ship Reset Loop`: the player-facing reset action and reset state path have been removed.
- Core Reset is now available only during active Nova Crown survival at threat level 10 or higher.
- Core gain now scales from current threat level: 1 core at threat 10, 2 at threat 20, 3 at threat 30, and so on.
- Warp/ship exchange reset was removed from the Hangar UI.
- The Hangar now focuses only on ship unlock progress and per-ship run state.
- The Technologies tab now owns the Core Reset panel because cores and installed technologies are global.
- Core Reset resets the current ship's local run state while preserving global cores, installed technologies, ship unlocks, achievements, and survival bests.
- Installed technologies now remain available when switching between ships; per-ship money, crystals, skills, and upgrades stay local to the ship.
- Removed the obsolete ship exchange requirement module.
- Updated player-facing copy away from "ship exchange" and "warp crystals" where it described the old reset model.
- Updated tests for core gain, reset preservation, and the new Nova Crown threshold.

### Ship Unlock Milestones

Replaced exchange-order ship unlocks with ship-specific gameplay milestones.

Notes:
- Added serializable ship unlock progress for asteroid collisions, burst destroys, Prism boss pity, Nova Crown ship visits, meteor impacts, and no-damage survival time.
- New games now start with only Vector unlocked; Nivitron is a real endgame unlock at Nova Crown threat level 30.
- Kestrel unlocks from destroying 1,000 asteroids.
- Bulwark unlocks from colliding with 1,000 asteroids.
- Needle unlocks from destroying 3 asteroids in the same collision resolution window.
- Prism unlocks from a 2% Prism Boss drop with a guaranteed unlock on the 50th Prism Boss defeat.
- Atlas unlocks after reaching Nova Crown with 3 different ships.
- Ember unlocks after surviving 250 meteor impacts in Nova Crown.
- Void Runner unlocks after surviving 10 minutes in Nova Crown.
- Wraith unlocks after surviving 3 minutes in Nova Crown without taking HP damage.
- Aurora unlocks at Nova Crown threat level 20.
- Warp reset now preserves the current hangar instead of unlocking the next ship by exchange count.
- Hangar locked cards now show each ship's milestone requirement and progress.
- Added tests for exchange behavior and milestone unlock rules.

### Survival Toxic Damage Fields

Added persistent toxic fields for Nova Crown spatial pressure.

Notes:
- Added serializable `damageField` timed event state alongside meteor lanes and gravity pulses.
- Damage fields start after their configured survival threat threshold.
- Fields spawn as active huge fixed-position toxic zones within a large range around the player.
- Toxic fields use low counts so each one reads as a major space-denial hazard.
- Fields persist while nearby and are recycled only after they move far enough away that the player should not notice.
- Fields damage the ship in cooldown-based ticks while the ship is inside the radius.
- Field damage respects shield bubble absorption through the existing collision path.
- The vector renderer draws fields as drifting toxic smoke instead of hard circular markers.
- Added tests for threat-gated spawn eligibility, fixed-position recycling, and field damage behavior.

### Survival Gravity Pulse Events

Added the second timed survival hazard for Nova Crown escalation.

Notes:
- Added serializable `gravityPulse` timed event state alongside meteor lanes.
- Gravity pulses start after their configured survival threat threshold.
- Gravity wells spawn as active fixed-position hazards within a large range around the player.
- Gravity wells persist while nearby and are recycled only after they move far enough away that the player should not notice.
- Gravity wells pull the ship toward the center while the ship is inside the radius.
- Gravity well rendering now reads more like a black hole with a dark core, halo, and orbit/accretion lines.
- Added tests for threat-gated spawn eligibility, fixed-position recycling, and pull behavior.

### Survival Meteor Lane Events

Added the first timed survival hazard for Nova Crown threat escalation.

Notes:
- Added serializable `meteorLane` survival event state and a dedicated timed event system.
- Meteor lanes begin spawning only after the configured survival threat threshold.
- Meteor lanes warn before becoming active, then track the camera only along the lane direction so players can still escape perpendicular to the barrage.
- Higher threat levels can create multiple concurrent meteor lanes.
- Each lane spawns denser mixed-size medium/small asteroids from one side with faster, heavier fire trails and staggered tracks to reduce visual overlap.
- Barrage damage comes from individual meteor hits, not from standing inside the warning area.
- Meteor hits knock the ship away harder than normal asteroid contact.
- Meteor hits respect the existing shield bubble absorption and per-event hit cooldown.
- The vector renderer draws lanes as simple warning/active bands without adding extra HUD clutter.
- Added tests for threat-gated spawn eligibility, threat-scaled multi-lane barrages, area safety, and meteor-hit collision behavior.

### Survival Elite Saucer

Added the first elite survival enemy variant for high-threat Nova Crown runs.

Notes:
- Saucers now have a serializable `normal` or `elite` kind.
- Elite saucers begin spawning only in Nova Crown after the configured survival threat threshold.
- Elite saucers have a larger readable silhouette, magenta styling, higher reward, and a three-shot spread pattern.
- Added tests for elite spawn eligibility and elite saucer projectile damage.

### Survival Hunter Hazard

Added the first chasing survival enemy for Nova Crown pressure.

Notes:
- Added `survivalHunter` as a serializable survival hazard type.
- Hunters begin spawning only after the configured Nova Crown threat threshold.
- Hunters steer toward the ship with a lateral weave, collide through the existing hazard collision path, and disappear on contact.
- Hunters can be damaged and destroyed by player or drone shots.
- The renderer draws hunters as bright green arrowhead threats with a trail based on their actual recent path.
- Proximity mines now read as small red blinking points with a larger threat area, bigger explosion burst, and smooth white fuse flash.
- Added tests for hunter spawn threshold, steering, contact removal, shot damage, and impact damage.

### Survival Proximity Mines

Added the first survival-only hazard for Nova Crown escalation.

Notes:
- Added serializable `proximityMine` hazard state and a survival hazard system.
- Added a serializable rare-spawn system with `proximityMine` as its first spawn kind.
- Rare proximity mines can now appear from Vega Drift onward before the player reaches Nova Crown.
- Proximity mines begin spawning only after Nova Crown reaches the configured threat threshold.
- Mines drift in from the screen edge, arm after a short delay, detonate on ship contact, respect shield bubble absorption, and are cleared when leaving survival.
- The vector renderer draws mines with a compact warning ring and armed-state pulse.
- Added tests for spawn eligibility and mine detonation damage.

### Nova Crown Survival Foundation

Turned the final zone into the first endgame survival benchmark for build testing.

Notes:
- Nova Crown now starts a serializable survival attempt while the ship is alive in the final zone.
- Survival tracks current time, threat level, best time, and best threat level.
- Nova Crown smoothly fades out the normal money/crystal/hull/objective HUD and shows a minimal top timer with a vertical threat meter on the left.
- Settings and the submenu remain available during survival attempts.
- Dying in Nova Crown ends the survival attempt and returns the current run to Cygnus Reef.
- Threat level now increases asteroid pressure through simulation data by raising asteroid density and speed.
- Current survival attempts and best records persist through save/load when appropriate.
- Added tests for timer/best tracking, death reset behavior, threat-based asteroid pressure, and save/load persistence.

### Mini Boss Reward Choice

Added boss-defeat reward choices that create run-scoped build decisions.

Notes:
- Superseded by `Threat Milestone Reward Choices`: bosses no longer queue these choices directly.
- Superseded by `Remove Ship Reset Loop`: run rewards now clear when the Nova Crown survival attempt ends.
- Originally, defeating a route boss queued a serializable pending reward choice.
- The player can choose between faster ship fire, faster deployed drone reloads, or stronger credit salvage.
- Chosen rewards persist through save/load during the current run.
- Warp reset or ship exchange clears active and pending boss rewards with the rest of run state.
- Added a modal choice UI that waits for priority popups before opening.
- Added tests for boss defeat choice generation, choice application, credit reward scaling, save/load persistence, and reset clearing.

### Ship Weapon Identity

Moved combat identity onto ship frames instead of selectable Technology weapon modes.

Notes:
- Added a ship weapon identity field to ship frame data.
- Vector and other standard ships use the baseline cannon and differentiate through ship stats.
- Prism now fires as a spread/refraction ship even when Spread Battery is not installed.
- Needle now fires as a piercing/rail ship even when Piercing Rail is not installed.
- Nivitron now uses the same data model for its rotating turret identity.
- Manual weapon selection was removed; ship weapon identity now appears in the Hangar.
- Spread Battery and Piercing Rail were removed from the active Technology route because ship identity now owns those patterns.
- Legacy save fields for old weapon modes remain tolerated but no longer drive standard ship firing.
- Added tests covering legacy mode compatibility, Prism spread identity, Needle piercing identity, and Nivitron turret compatibility.

### Legendary Nivitron Ship

Added a legendary ship with a hand-like silhouette and stepped turret weapon.

Notes:
- Added `Nivitron` as a legendary ship frame unlocked from the start for easier testing.
- Its silhouette is an original faceted arm/hand form with palm and finger-like points.
- Nivitron rotates its mini turret 10 degrees each time it fires instead of continuously rotating over time.
- Attack-speed upgrades now shorten the delay between Nivitron turret steps, so higher attack speed builds toward circular coverage through faster repeated shots.
- Added renderer support for the rotating turret and tests for unlock pacing and turret-angle firing.

### Ship Hangar UI Pass

Made unlocked ship frames read as a small hangar instead of a plain unlock list.

Notes:
- Ship cards now show a vector preview of the ship silhouette.
- Cards show rarity, bonus identity, current/selection state, and a compact snapshot of that ship's individual credits, crystals, damage, and attack-speed levels.
- Unlocked ships can be equipped directly from the hangar cards.
- Locked ships still preview their unlock exchange and bonus identity.
- Hangar now has its own tab, keeping Technologies focused on gameplay unlock nodes and boss beacon actions.

### Technology Tree Clarity Pass

Made the Technologies tree clearer as a gameplay expansion route.

Notes:
- Added pure data impact categories and run-impact descriptions to every Technology.
- Replaced node abbreviations with reusable SVG icons for drone, boss, weapon, and defense unlocks.
- Added category styling so drone, boss, weapon, and defensive technologies read differently on mobile.
- Updated tooltips to highlight the actual gameplay surface affected and show missing prerequisites in player-readable text.
- Kept Technology behavior and costs unchanged.

### Drone Bay Personality Pass

Gave each drone family clearer identity in the Drones tab.

Notes:
- Replaced abbreviation-only drone icons with compact SVG icons for Semi-Auto, Shotgun, and Missile drones.
- Added role, rhythm, and purchase-state copy to each drone row so families read differently before buying.
- Improved locked, ready, and owned row styling without changing drone behavior or balance.
- Expanded drone info modals with combat role, range, fire rhythm, owned count, and next cost.

### Ship Exchange Gating Refinement

Refined when the player earns a ship exchange after the first loop.

Notes:
- Added a small progression module that evaluates route, crystal/core, and mission requirements for ship exchange.
- Kept the first exchange gated only by route and crystals so the player can learn the loop without an extra wall.
- Repeated exchanges now require guided mission progress, scaling gently with completed ship exchanges.
- Updated the Ship Exchange panel to show mission progress compactly and block the exchange button until all requirements are met.
- Added tests covering first-exchange pacing and repeated-exchange mission gating.

### Guided Mission Tuning Follow-Up

Tuned repeatable Guided Missions after the first playability pass.

Notes:
- Increased repeatable mission targets slightly so they do not complete too quickly.
- Repeatable missions now pay run resources instead of permanent stats, avoiding infinite attribute farming.
- First-path mission completions use the priority popup for clearer reward feedback.
- Repeatable mission completions stay in the reward feed to avoid interrupting normal play.

### Guided Mission UI and Balance Polish

Polished repeatable Guided Missions after the first implementation.

Notes:
- Added compact reward previews to the existing Guided Mission pill.
- Added a deathless asteroid-clear mission that resets its progress window after a death.
- Removed extra crystal rewards from repeatable crystal and boss missions so missions do not bypass ship-exchange/core pacing.
- Added tests for deathless mission reset behavior and crystal mission reward pacing.

### Ship Exchange Reset

Reframed the reset loop as exchanging into a new ship frame.

Notes:
- Added a 10-ship frame catalog with simple vector shapes, rarity labels, unlock order, and light bonuses.
- Each ship exchange unlocks and equips the next ship in the catalog.
- The exchange still grants cores for Technologies, but the player-facing reset copy now talks about changing ships.
- Normal run upgrades such as damage, fire rate, income, hull, speed, armor, drones, money, crystals, zone progress, and boss progress reset with the new ship.
- Meta progress such as technologies, cores, achievements, guided missions, and ship collection persists.
- The active ship frame changes the rendered ship shape and applies small damage, speed, attack speed, hull, or income bonuses.

### Guided Mission Variety and Reward Expansion

Expanded Guided Missions beyond the first path with repeatable mission selection.

Notes:
- Added repeatable mission rotation after the first Drone Systems path.
- Added clear asteroid, collect credits, collect crystals, and defeat zone boss mission types.
- Mission targets now scale with current zone where appropriate.
- Repeatable mission rewards use small credit, crystal, and existing permanent stat rewards without adding paid-style progression.
- Added tests covering repeatable mission selection and later-zone crystal mission availability.

### Guided Missions: First Path

Converted the existing next-objective pill into the first Guided Missions surface.

Notes:
- Added serializable guided mission state with active mission, completed mission ids, and mission start snapshots.
- Reused the compact objective pill for mission title and progress so no new persistent HUD panel was added.
- Added an initial sequence for drawing the first boss, defeating it, collecting warp crystals, warping for a core, and installing Drone Systems.
- Mission completions now grant small permanent rewards through existing progression stats plus modest credits.
- Guided mission state is saved, loaded, and preserved through warp reset.

### Zone Identity Pass

Made each zone more distinct through data-driven presentation instead of new mechanics.

Notes:
- Added serializable zone identity data: callsign, flavor, dominant asteroid variant, accent color, and field tint.
- The playfield now uses the current zone's tint and grid color so travel has immediate visual feedback.
- The map route nodes now show each zone's callsign and expected dominant asteroid variant.
- The HUD map label uses the current zone callsign to keep zone identity visible without adding a new panel.

### Boss Gate Event Polish

Made boss summoning and zone unlocking read as deliberate route events.

Notes:
- Added a compact boss event strip to the HUD for pending and active gate bosses.
- Pending bosses now show countdown progress and the zone they will unlock.
- Active bosses now show HP progress and the zone reward target.
- The Boss Beacon panel now previews the next zone, boss HP, and base boss reward before summoning.
- Manual boss summon feed text now names the zone unlocked by the incoming boss.

### Zone Asteroid Scaling

Added stronger per-zone asteroid scaling for durability, contact damage, and rewards.

Notes:
- Asteroid HP multipliers now ramp harder across zones so later belts require stronger ship upgrades.
- Asteroid contact damage now scales by zone through serializable zone data instead of staying flat.
- Zone reward multipliers now scale above HP multipliers in later zones so harder belts pay meaningfully more credits.
- Added tests covering zone reward/HP/damage progression and direct collision damage scaling.

### Combat Readability Upgrade

Improved moment-to-moment combat readability while keeping the effects renderer-local.

Notes:
- Added renderer-local asteroid hit flashes by comparing asteroid HP between frames.
- Added asteroid destruction shockwaves when asteroids leave the render set through normal combat.
- Added stronger damaged-asteroid crack/ring styling so partial damage is easier to read.
- Made boss and saucer projectiles visually distinct with hostile bullet trails, halos, and ricochet styling.
- Strengthened boss arrival telegraphing with expanding warning rings and a screen-to-center threat line.
- Added extra shield flash and deflector cone styling without changing serializable simulation state.

### Crystal, Warp, and Reward Economy Balance Pass

Balanced the non-credit reset economy as a data-only tuning slice before adding more progression layers.

Tuning notes:
- Reset core price: increased from 10 to 12 crystals so cores stretch slightly longer after the first reset.
- First gate boss reward: increased from 3 to 4 crystals so the boss clearly starts reset progress.
- Large crystal asteroid reward: increased from 2 to 3 crystals, making a fully cleared crystal asteroid chain worth enough to complete the first-core target after the first boss reward.
- Technology costs: kept `Drone Systems` at 1 core, kept `Boss Beacon` at 2 cores, raised `Spread Battery` to 3 cores, raised `Deflector Prow` to 4 cores, and raised late route unlocks to 7-8 cores.
- Total current technology route cost now sits in the 38-45 core range, giving later gameplay unlocks more reset runway without delaying the first drone unlock.

Notes:
- Added guard tests for first-core crystal pacing, boss/crystal rewards, and total technology route cost.
- Left skill costs, achievement multipliers, and zone credit multipliers unchanged for later targeted tuning if playtests show pressure there.

### Core Credit Economy Curve Pass

Split the long-term economy work into a first data-only tuning pass for the starting credit upgrades.

Tuning notes:
- Core credit upgrades: first purchases stay between 40 and 70 credits, level 25 costs stay under 160 credits, and final level-500 purchases benchmark at 8+ hours of capped passive income.
- Fire rate: per-level gain moved to 3% so all 500 purchasable levels still affect the cooldown before the current minimum interval.
- Drone costs: kept the prior 600/700/800 first-buy targets with 2x scaling per drone purchase.
- Rewards, crystals, warp cores, skill costs, technology costs, achievements, boss rewards, passive reward multipliers, and reset pacing were reviewed as separate follow-up surfaces instead of being changed in the same slice.

Notes:
- Retuned passive income, shot damage, fire rate, and hull HP credit cost curves.
- Added balance guard tests for early affordability, late multi-hour costs, and fire-rate cap usefulness.
- Fixed the first-boss HUD countdown to use current first-gate progress instead of lifetime asteroid kills.

### First Warp Goal UI

Added a compact current objective chip for the first warp path.

Notes:
- The HUD now shows a small first-warp goal derived from serializable game state.
- Early goals progress through first boss discovery, gate boss defeat, crystal collection, first warp reset, and `Drone Systems`.
- The chip mutes itself while drawers or modals are open so it does not compete with active UI.
- Added pure progression tests for the first-warp goal states.

### Starting Loadout and Guided Onboarding

Completed the first-run onboarding path around the initial permanent unlock.

Notes:
- New saves start with zero drones and only the basic cannon.
- `Drone Systems` is the first Technology and gates the Drones tab plus semi-auto drone purchase.
- Advanced drone families and weapon modes remain behind Technology route nodes.
- Added one-time feed announcements when a Technology becomes affordable, capped to one new Technology notice per update.
- Persisted announced Technology notices so saves and warp resets do not repeat stale prompts.

### Gameplay-Only Technologies Tree

Refocused Technologies around gameplay unlocks instead of stat upgrades.

Notes:
- Removed pure stat upgrades from the active Technologies tree.
- Made `Drone Systems` the first Technology and first core spend.
- Reconnected boss summon, weapon modes, deflector, shield, and advanced drone families as gameplay branches.
- Preserved old saves by mapping removed legacy technology ids into the closest gameplay unlocks.
- Kept attribute growth in the normal Upgrades tab.

### Boss Discovery and Technology Summon

Changed post-first boss gates from pure shop-style summons into progression discoveries with a Technology-gated manual summon.

Notes:
- Added serializable boss discovery progress for rare post-first-gate boss signals.
- Rare boss discovery now accumulates from asteroid clears at the current frontier zone.
- Rare boss discovery will not overlap an active or pending boss.
- Added `Boss Beacon` to Technologies to unlock deliberate manual boss summoning.
- Manual boss summon no longer spends crystals and is hidden until `Boss Beacon` is owned.
- Added tests for boss discovery persistence, rare boss eligibility, frontier gating, and the new Technology route.

### Core Upgrade and Tab Reveal Onboarding

Reworked the early progression surface so the game introduces systems gradually.

Notes:
- Added the four starting upgrade tracks: shot damage, fire rate, hull, and income.
- Added a base upgrade cap of 500 levels so Technologies can raise it later.
- Renamed the Warp tab/tree surface to `Technologies` while keeping warp cores as the currency.
- Hidden Drones, Skills, Achievements, and Technologies tabs until their related progression state exists.
- Moved crystal asteroid spawning out of the first zone so Skills appears later.
- Added automatic first gate boss detection after the early asteroid kill target.
- Added save/default handling and tests for fire rate progression.

### Prism Ricochet Boss

Added a new mid-route boss pattern for bullet-hell pressure.

Notes:
- Added the `Prism Warden` boss type to Vega Drift.
- Prism shots use serializable ricochet projectile state with a limited bounce count.
- Ricochet shots bounce off normal asteroids and disappear after their final bounce is spent.
- Added distinct vector styling for the prism boss, warning marker, and ricochet shots.
- Covered prism firing and asteroid ricochet behavior with simulation tests.

### Boss Zone Difficulty Pacing

Tuned boss and zone scaling so early gates are approachable and later gates pressure upgrades.

Notes:
- Reduced first gate boss HP and projectile pressure so basic cannon play is less punitive.
- Increased later boss HP/speed/firing pressure through per-zone scaling.
- Adjusted zone asteroid density bonuses to ramp from `[0, 1, 3, 6, 9]`.
- Hostile projectile collisions now use the projectile's tuned damage value instead of a fixed fallback.
- Saucer shots now carry their configured bullet damage.
- Added progression tests for boss HP scaling, zone density ramp, and hostile projectile damage.

### Warp Core Gain and Unlock Cost Tuning

Tuned the first warp cycles so permanent unlocks require repeated resets.

Notes:
- First warp reset eligibility now starts after the first route gate instead of requiring a deeper second gate.
- One warp core now costs 10 crystals.
- Core Stabilizer and the first two stat nodes remain cheap at 1 core each.
- Armor Plating and Flight Thrusters now cost 2 cores each.
- Drone Systems now costs 3 cores and requires 10 total route cores to reach and install.
- Deflector, Shield Bubble, Spread Battery, Ranger Hangar, Missile Foundry, and Piercing Rail costs were increased to stretch major system unlocks.
- Added progression tests for first core gain timing and early route cost pacing.

### Warp Reset Opportunity Preview

Added a compact reset planning panel to the Warp tab.

Notes:
- Warp tab now shows current crystal progress, reset core gain, projected available cores after reset, and owned route count.
- The panel restores the `Warp Reset` action directly next to the core route.
- Preview copy names affordable next unlocks when the reset would make route progress possible.
- The broad warp economy item was split into narrower Ready tuning items for core gain/cost pacing and boss zone difficulty.

### Circular Deflector Shield

Added breakable circular shield behavior behind the `Shield Bubble` warp unlock.

Notes:
- Shield Bubble now absorbs one asteroid or hostile projectile hit before hull damage.
- Absorbing a hit breaks the bubble, starts the recharge timer, briefly grants collision grace, and emits hit particles/audio.
- Active, hit-flash, and recharging states now render as circular vector shield rings around the ship.
- Shield state remains serializable with active/broken/recharge timer and hit flash fields.
- HUD status now says when the shield is armed or recharging.

### Finish Remaining Warp Gates

Finished moving remaining major feature access into the warp-core route.

Notes:
- New saves already start with zero drones, and semi-auto drone purchases remain gated by `Drone Systems`.
- Shotgun and missile drone purchases now name their required warp nodes directly in disabled shop rows and info modals.
- The Drones tab shows a locked bay state before `Drone Systems`, explaining that the warp route must authorize drone purchases.
- Persisted Shield Bubble state now migrates into owned `Shield Bubble` and prerequisite `Deflector Frame` warp unlocks before shield state is loaded.
- Shield Bubble runtime state remains serializable and continues to be disabled unless the matching warp unlock is owned.

### Shield Bubble State Skeleton

Added serializable shield bubble state without collision behavior.

Notes:
- Added `ShieldBubbleState` with active, broken, and recharge timer fields on `GameState`.
- Shield bubble state is enabled behind the `Shield Bubble` warp unlock and defaults/migrates safely for existing saves.
- Save/load now persists shield bubble state, including broken recharge timers.
- Game update recharges a broken shield back to active, but does not absorb damage yet.
- HUD status text now shows shield bubble standby/recharge placeholders.

### Dedicated Warp Core Route Tab

Made the warp-core route its own dedicated shop tab.

Notes:
- Rendered the warp-core tree as the only content in a dedicated Warp tab.
- Kept the Upgrades tab focused on Ore Refinery and removed unrelated map/warp/core stats from it.
- Kept the old weapon-mode surface separate from ship-stat information before weapon identity moved into the Hangar.
- Added purchasable core nodes for Hull Reinforcement, Cannon Amplifier, Armor Plating, Flight Thrusters, Deflector Frame, Spread Battery, Piercing Rail, and drone-family access.
- Core nodes now install their effect directly; ship stats and old weapon unlocks no longer require separate credit purchases.
- Drones remain credit purchases after their matching core node is installed.
- Warp reset now preserves permanent core route effects, and old saves migrate previously purchased ship/weapon/drone access into owned core nodes.

### Warp Core Tree Drawer Shell

Added a mobile-first warp-core route drawer using compact tree interactions.

Notes:
- Added a Warp Cores entry point in the Upgrades/Warp Reset area.
- Added `WarpCoreTreeController` to render compact square warp nodes, route lines, floating details, current core balance, and owned/available/locked/unaffordable states.
- Tooltips toggle from nodes and close when tapping outside the node/tooltip area.
- Kept this slice display-only; gameplay systems are not gated and warp unlock purchases are not wired yet.

### Warp Core Unlock Definitions

Created pure data definitions for the first permanent warp-core route.

Notes:
- Added typed `WarpUnlockId` values for Core Stabilizer, Drone Systems, Deflector Frame, Shield Bubble, Spread Battery, Ranger Hangar, Missile Foundry, and Piercing Rail.
- Added `warpUnlocks.ts` with node definitions, costs, icon ids, route positions, prerequisites, and pure owned/available/locked/unaffordable helper state.
- Save normalization now keeps only known warp unlock ids.
- Added progression tests for route completeness, helper states, and unknown-id filtering.
- No Phaser or DOM rendering was added in this slice.

### Warp Core Save Model

Added the serializable progression state needed for permanent warp-core unlocks.

Notes:
- Added `ownedWarpUnlockIds` to `ProgressionState` with empty defaults for new games and existing saves.
- Save loading now normalizes warp unlock ids by accepting non-empty strings, deduping them, and ignoring malformed values.
- Save writing now copies the owned unlock id array explicitly.
- Added progression tests for default migration, normalization, and save/load round trip.
- No gameplay systems are gated by warp unlocks yet.

### Background Zone Music

Added looping background music to the playable scene.

Notes:
- Added `public/audio/zone-1.mp3` as the current background track.
- Music starts after the first player pointer/key interaction to satisfy browser autoplay rules.
- Settings now expose separate SFX and Music volume sliders.
- Audio settings now open in the main modal/drawer surface and close from the backdrop.
- Music volume uses a Web Audio gain node so the slider works reliably on mobile browsers.
- Music defaults to 50% volume and saves independently from SFX volume.
- The PWA service worker pre-caches the background track for installed/offline play.

### Boss Unlock Flow, Priority Feed, and Sound Polish

Improved progression feedback and key audio moments.

Notes:
- Defeating a gate boss now unlocks the next zone on the map without immediately moving the player there.
- Boss defeat no longer clears the asteroid field or player/drone bullets, avoiding a scene-reset feel after victory.
- Boss summons, boss entry, zone unlocks, achievements, and system messages now use prioritized feed styling and last longer than credit payouts.
- Credit and crystal payout messages stay compact and capped so they do not compete with rare progression events.
- Added richer procedural sound events for boss summon, boss firing, boss defeat, zone unlock, wormhole travel, hyperspace, and warp reset.

### Crystal Balance UI Sync

Hardened crystal balance handling after resets and crystal spending.

Notes:
- HUD, boss summon, skill affordability, skill tooltip, and warp reset now all read from the same normalized crystal balance helper.
- Boss summon and talent purchases now spend crystals through one shared path that invalidates shop/modal rendering immediately.
- Warp reset clears any selected skill tooltip so a reset tree cannot show stale talent detail state.

### UI Slow Motion and Pause

Added gameplay time scaling around mobile UI surfaces.

Notes:
- Opening the floating submenu slows the game simulation to cinematic slow motion.
- Opening any drawer/modal/settings surface pauses the game simulation immediately.
- Touching outside the floating submenu closes it and ramps gameplay speed back to normal over one second.
- The time scale is scene-only runtime state and is not saved.

### Reusable Skill Icons and Floater Cleanup

Cleaned up mobile HUD chrome and skill icon rendering.

Notes:
- Skill tree opens with no selected talent, so the tooltip starts closed.
- Tapping the same selected talent or the empty tree background closes the tooltip.
- Skill icons now use a reusable SVG symbol sprite at `public/skill-icons.svg` and are referenced from talent nodes and tooltips.
- The mobile empty status panel above the floating menu is hidden instead of rendering as a blank box.
- The floating menu is anchored independently at the bottom-right on mobile, with its expanded nav positioned above it.

### Mobile Hold Fire and Slingshot Dead Zone

Improved mobile combat control and quick-menu spacing.

Notes:
- Touching the playfield now fires immediately even before the ship starts moving.
- Slingshot movement now has a larger dead zone on mobile, so the player can hold position while shooting.
- Touching inside the dead zone rotates and fires along the slingshot direction with hold braking, but does not add thrust until the pull leaves the larger dead zone.
- The collapsed floating menu no longer leaves an empty invisible nav row in the dock.

### Space Map View and Stable Skill Tooltip

Refined the route map and stabilized mobile skill interactions.

Notes:
- The zone map is now a vertical space route with starfield styling and no stats/copy inside the map view.
- Zone nodes show only the travel icon and zone name.
- The map background now uses layered stars and nebula-like light so it reads as an in-world space map.
- Skill tree node taps avoid mobile focus/scroll side effects, and the compact tree surface now has fixed containment to reduce UI shaking.

### Floating Skill Tooltips and Cleaner Combat HUD

Refined mobile drawer and HUD behavior.

Notes:
- Skill details now open as a floating tooltip anchored to the selected talent node.
- Tooltip placement chooses the side with more space so it avoids fighting the compact talent grid.
- Drawer drag-close now tracks pointer capture on the full drawer surface and closes on a downward pull.
- Credit/crystal reward notifications now appear under the money and hull panel instead of the center playfield.

### Installable PWA and Zoom Guard

Made the GitHub Pages build installable as a mobile app and reduced accidental zoom.

Notes:
- Added a web app manifest, theme metadata, standalone mobile tags, and an app icon.
- Added a service worker scoped to `/asteridle/` so the production build can be installed from GitHub Pages.
- Registered the service worker only in production builds.
- Blocked pinch and fast double-tap zoom gestures while preserving drawer scrolling and button interactions.

### Compact Skill Drawer and Drag Close

Improved mobile drawer handling and skill-tree readability.

Notes:
- Shop and modal drawers can now be pulled downward from their handle/header to close.
- The Skills tab now opens only the talent tree drawer instead of stacking the shop drawer behind it.
- Talent nodes are compact square icon buttons with rank/status indicators.
- Tapping a talent node opens a compact details panel with the explanation, lock state, cost, and buy button.

### Zone Travel Wormhole

Added a short visual transition when moving between unlocked zones.

Notes:
- Selecting another unlocked zone now pauses combat briefly and clears asteroids, bullets, particles, saucers, and pending bosses.
- The starfield accelerates into a wormhole-style effect with long streaking stars and ring lines before the new zone loads.
- Zone state, ship position, drones, asteroid field, and save data update after the travel animation completes.
- Mobile drawers now anchor to the bottom edge with no visible gap, using safe-area padding inside the drawer instead.

### Drawer UI and Low Hull Warning

Converted overlays into bottom drawers and improved hull readability.

Notes:
- Shop, settings, and modal surfaces now behave as bottom drawers with smooth slide-in transitions, backdrop closing, and handle controls where useful.
- The map and settings icon buttons are centered in compact square controls.
- Hull moved beside the money readout and now shows a green ship-shaped fill that drains with current HP.
- Low hull triggers a desaturated gray oxygen-loss screen veil that ramps up as HP falls.

### Slingshot Controls and Mobile Drawers

Reworked pointer movement and mobile shop ergonomics.

Notes:
- Touch and mouse input now use a slingshot gesture: drag away from the intended travel direction and the ship thrusts opposite the pull.
- The slingshot input sends only a transient normalized vector into simulation, keeping saved game state serializable.
- A lightweight canvas indicator shows the drag anchor, pull line, and travel direction while aiming.
- The old bottom menu panel now behaves as a mobile drawer with a backdrop and grab handle, so tapping outside closes it without needing the X button.
- Help text now describes slingshot movement while keyboard movement remains available.

### Constellation Zone Gates

Replaced distance-based travel with a linear constellation route gated by boss fights.

Notes:
- Saves now track serializable `currentZoneIndex`, `unlockedZoneIndex`, and `bossDefeats`.
- The Upgrades tab opens a constellation map where unlocked zones can be revisited freely.
- Summoning a gate boss costs crystals, and defeating it unlocks the next zone.
- Bosses cycle between Star Sentinel and Gravity Crusher, render as alien ships, and fire hostile projectiles.
- Boss summons now close the menu, show a 3-second off-screen warning indicator, then spawn from outside the camera.
- Dying removes active and pending boss encounters, plays an explosion beat before fading out, and respawns with drones ready.
- Mobile HUD now removes FPS, moves zone access behind a purchased Star Map icon, and collapses shop tabs into a floating quick menu.
- Zone progression now scales asteroid HP, density, and reward multipliers.

### Talent Constellation

Replaced the old linear drone skills with a connected crystal talent tree.

Notes:
- Saves now track serializable `talentRanks` across economy, semi-auto, shotgun, and missile branches.
- Semi-auto drones start with pierce 1 and scale through the Linear Pierce talent line.
- Missile drones can unlock blast warheads, shrapnel radius, and chain detonation splash.
- Economy talents boost refinery income, combat bounties, crystal seams, and death recovery.
- Legacy `droneSkillLevels` saves migrate automatically into the closest new nodes.

### Mobile and Mouse Movement

Added held pointer movement for touch and mouse.

Notes:
- Holding on the playfield now points the ship at the press location, thrusts toward it, and fires while pressed.
- Keyboard movement and spacebar fire remain available.
- Pointer presses on shop, settings, and modal UI are ignored for movement and firing.

### Reward Feed

Added transient payout messages for asteroid destruction.

Notes:
- Simulation now emits serializable `rewardEvents`.
- Destroyed asteroids show short credit and crystal payout messages above the shop dock.
- The feed is capped and transient so it avoids covering the center playfield.

### Drone Skill Tree Requirements

Added prerequisites and caps to the first drone skill nodes.

Notes:
- Sentry, ranger, and breaker skills each require owning the matching drone type.
- Skill rows now show locked, level, maxed, and cost states.
- Early drone skill nodes cap at level 5.

### Drone Abilities and Shop Readability

Reworked drone types and upgrade presentation.

Notes:
- Sentry drones now fire paired interceptor shots.
- Ranger drones now fire long-range rail shots that pierce one asteroid.
- Breaker drones now fire slower flak rounds that splash nearby asteroids.
- Drone and upgrade purchases now render as separated icon-led rows with clear title, effect text, status, and cost.
- The bottom shop navigation now includes a Skills tab.

### Drone Skill Tree Foundation

Added a crystal-spending drone skill tab.

Notes:
- Saves now track `droneSkillLevels` for sentry range, ranger focus, and breaker capacitor.
- The new Skills tab spends crystals earned from crystal asteroids.
- Sentry Optics increases sentry targeting range, Ranger Focus increases ranger damage, and Breaker Capacitor improves breaker fire timing.
- Skills affect existing drones immediately because drone behavior reads progression state every update.

### Combat Weapon Branches

Added selectable weapon modes beyond the main cannon.

Notes:
- Saves now track `weaponMode`, `spreadUnlocked`, and `piercingUnlocked`.
- Spread Shot fires three lower-damage shots with a slower cooldown for crowd control.
- Piercing Rounds fire a faster shot that can pass through one asteroid before expiring.
- The original implementation exposed active weapon selection through a now-removed weapon surface.

### Better Death Loop

Expanded death into a stronger but still automatic setback.

Notes:
- Repair costs now scale with current zone danger and still cap at available money.
- Passive refinery income is temporarily reduced after death.
- Drones pause for a short reboot delay after destruction.
- Death still auto-respawns after 3 seconds and never drives money below zero.

### Prestige / Warp Reset

Added a long-term warp reset with permanent cores.

Notes:
- Saves now include `prestigeCores` separately from run currencies and upgrade levels.
- Warp is unavailable until Travel 2 and at least 12 crystals.
- The Upgrades tab previews core gain and states that cores are kept while money, crystals, ship upgrades, drones, and travel scanners reset.
- Each core adds a permanent money multiplier used by asteroid rewards and passive/offline refinery income.

### Exploration Zones

Added position-derived space regions with travel-gated rewards.

Notes:
- The current zone is derived from ship distance from origin.
- The HUD sector readout now includes the zone name and marks locked zones as low yield.
- Zone definitions live in `src/game/simulation/zones.ts`.
- Deeper zones adjust asteroid density, variant spawn weights, and reward multipliers.
- A saved `travelLevel` powers a Travel Scanner upgrade in the Upgrades tab; deep zones pay reduced rewards until the required travel level is purchased.

### Asteroid Resource Types

Introduced asteroid variants that drop different rewards.

Notes:
- Asteroids now carry a serializable `variant`: common, metallic, crystal, or dense.
- Metallic asteroids pay more money, crystal asteroids pay some money plus crystals, and dense asteroids have more HP with better money rewards.
- Variant spawn weights are centralized in the asteroid system for tuning.
- Variants render with distinct vector colors and markings.
- The HUD money panel now also shows saved crystal currency.

### Additional Drone Types

Implemented more drone variety after drone damage and fire rate.

Notes:
- Saves now track serializable `droneCounts` for sentry, ranger, and breaker drones.
- Sentry drones are balanced, ranger drones orbit farther and shoot at longer range, and breaker drones fire slower heavy shots.
- The Drones tab sells each drone type with independent price scaling.
- Detailed drone upgrades are intentionally left for a later skill tree.

### Drone Damage Upgrade

Implemented the first drone-specific upgrade branch.

Notes:
- Drones now have a saved `droneDamageLevel`.
- Existing and newly purchased drones use the current damage level immediately.
- The Drones tab includes a separate Drone Damage purchase with independent price scaling.

### Drone Fire Rate Upgrade

Implemented the second drone-specific upgrade branch.

Notes:
- Drones now have a saved `droneFireRateLevel`.
- Existing and newly purchased drones use the current fire interval immediately.
- The Drones tab includes a separate Fire Rate purchase with independent price scaling.
- Fire rate has a lower interval cap to avoid runaway projectile load.

### Offline Earnings

Implemented capped offline refinery earnings using the save timestamp.

Notes:
- Save data now stores `lastSeenAt`.
- On load, passive refinery income is awarded for elapsed offline time, capped at 8 hours.
- Drones and combat do not generate offline rewards yet.
- A short HUD status message shows the offline payout.

### Save and Load Progress

Implemented `localStorage` persistence for money, progression upgrades, drone count, current HP, and ship position.

Notes:
- Save data is plain serializable simulation state.
- Saves load automatically on game start.
- Invalid, missing, or unsupported save data falls back to a fresh game.
- Runtime-only entities such as asteroids, bullets, particles, and Phaser objects are rebuilt instead of persisted.

## Technical Debt Completed

### Split Main Menu Stylesheet

Moved the start screen and language menu styling out of the main stylesheet.

Notes:
- Added `styles/main-menu.css` for the main menu overlay, language picker, tap-to-start state, launch warp streaks, and menu-specific keyframes.
- Imported the new stylesheet from `main.ts` between the base app stylesheet and other extracted surfaces.
- Kept global app travel visibility and app shake behavior in `styles.css`, because those classes are also used outside the menu.
- Preserved existing selectors and visual values without redesigning the UI.
- Validated with `pnpm run build`.

### Split Skill Tree Stylesheet

Moved the skill and warp tree UI styling out of the main stylesheet.

Notes:
- Added `styles/skillTree.css` for skill tree layout, draggable talent tree, warp tree nodes, icons, tooltips, focus states, and mobile tree layout.
- Imported the tree stylesheet from `main.ts` alongside the other extracted UI surfaces.
- Left shared modal stat styling in `styles.css` because it is used outside the tree surface.
- Preserved existing selectors and visual values without redesigning the UI.
- Validated with `pnpm run build`.

### Split Save Readers By Domain

Moved Nova Crown save normalization out of the main save orchestration file.

Notes:
- Added `saveSerialization.ts` and `survivalSave.ts` for shared save parsing primitives, survival state, and rare spawn cooldown normalization.
- Kept `saveData.ts` focused on save migration orchestration and composing normalized domain state.
- Preserved existing public save APIs and v2 save/load behavior.
- Validated with `pnpm test` and `pnpm run build`.

### Normalize Legacy Weapon Save State

Removed old manual weapon selection state from active progression and ship-run data.

Notes:
- Removed `weaponMode`, `spreadUnlocked`, and `piercingUnlocked` from runtime progression and per-ship run state.
- Removed stale `spreadBattery` and `piercingRail` technology IDs from active warp unlock typing and UI copy.
- Old v2 saves with those weapon fields still load, but the fields are normalized away during load.
- Ship frame identity remains the only source of player weapon behavior.
- Added save compatibility coverage for old weapon fields and updated weapon behavior tests.
- Validated with `pnpm test` and `pnpm run build`.

### Extract Survival Event Renderer

Moved Nova Crown timed event and hazard drawing out of `VectorRenderer.ts`.

Notes:
- Added `SurvivalEventRenderer` for meteor lanes, gravity pulses, toxic damage fields, proximity mines, and survival hunters.
- `VectorRenderer` now delegates survival event/hazard rendering while keeping draw order unchanged.
- Kept the renderer Phaser-only and disposable through the shared `Graphics` object.
- Preserved existing coordinate scaling, offscreen checks, meteor fire trails, toxic smoke field, mine blinking, and hunter trail visuals.
- Reduced `VectorRenderer.ts` from over 1,200 lines to under 1,000 lines.
- Validated with `pnpm run build`.

### Extract GameScene Skills Modal Presenter

Moved Skills tab and skill tree modal presentation out of `GameScene.ts`.

Notes:
- Added `SkillsModalController` to build Skills tab stats/actions and own skill tree modal chrome.
- `SkillsModalController` composes `SkillTreeModalController` and now owns selected talent tooltip state.
- `GameScene` keeps progression mutations, purchase/respec callbacks, audio, save, and HUD refresh behavior.
- Preserved current skill tree selection, purchase, respec, available points, level, XP, and modal copy behavior.
- Validated with `pnpm test` and `pnpm run build`.

### Rename Legacy Warp Reset UI Classes

Removed stale reset-era naming from current action panel DOM/CSS surfaces.

Notes:
- Renamed `warp-reset-panel` classes to neutral `action-panel` classes.
- Updated the Boss Beacon panel and Hangar panel/shortcut class usage.
- Preserved existing panel styling and shortcut modifier behavior.
- Left actual settings reset copy/classes untouched, because those still describe save reset behavior.
- Validated with `pnpm run build`.

### Split Progression Test File By Domain

Reduced the single large progression test file into focused suites.

Notes:
- Moved ship weapon identity, Nivitron firing, player fire cooldown, and drone damage tests into `weapons.test.ts`.
- Moved Nova Crown survival timer, pressure, hazard spawning, elite saucer, and survival hazard combat tests into `survival.test.ts`.
- Kept save/progression/boss/zone coverage in `progression.test.ts`.
- Preserved Phaser-independent simulation/progression tests.
- Validated with `pnpm test` and `pnpm run build`.

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
