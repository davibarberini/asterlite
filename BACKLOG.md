# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Completed

### Mini Boss Reward Choice

Added boss-defeat reward choices that create run-scoped build decisions.

Notes:
- Defeating a route boss now queues a serializable pending reward choice.
- The player can choose between faster ship fire, faster deployed drone reloads, or stronger credit salvage.
- Chosen rewards persist through save/load during the current run.
- Warp reset or ship exchange clears active and pending boss rewards with the rest of run state.
- Added a modal choice UI that waits for priority popups before opening.
- Added tests for boss defeat choice generation, choice application, credit reward scaling, save/load persistence, and reset clearing.

### Ship Weapon Identity and Info-Only Weapons Tab

Moved combat identity onto ship frames instead of selectable Technology weapon modes.

Notes:
- Added a ship weapon identity field to ship frame data.
- Vector and other standard ships use the baseline cannon and differentiate through ship stats.
- Prism now fires as a spread/refraction ship even when Spread Battery is not installed.
- Needle now fires as a piercing/rail ship even when Piercing Rail is not installed.
- Nivitron now uses the same data model for its rotating turret identity.
- Manual weapon selection was removed; the Weapons tab is now information-only for the active ship weapon.
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
- Hidden Drones, Skills, Weapons, Achievements, and Technologies tabs until their related progression state exists.
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

## Ready

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

## Completed

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
- Kept the Weapons tab focused on weapon mode switching and removed ship-stat information from it.
- Added purchasable core nodes for Hull Reinforcement, Cannon Amplifier, Armor Plating, Flight Thrusters, Deflector Frame, Spread Battery, Piercing Rail, and drone-family access.
- Core nodes now install their effect directly; ship stats and weapon unlocks no longer require separate credit purchases from the Weapons tab.
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
- The Weapons tab shows the active weapon and provides unlock/set buttons.

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
