# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Completed

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

### Warp Unlock Visual Polish

Make the warp-core tree feel distinct from the crystal skill tree while retaining the same interaction model.

Design:
- Use the same compact square nodes and floating tooltip behavior.
- Use a different visual theme: core/reactor/route styling instead of talent constellation styling.
- Keep it mobile-first and readable in a bottom drawer.

Acceptance:
- Add reusable icons for warp unlock categories.
- Add node states for owned, available, locked, and unaffordable.
- Keep the tree mostly vertical/linear on mobile.
- Clicking outside the tooltip closes it.

### Combat Readability Upgrade

Make impacts, threats, and defensive states easier to read during active combat.

Design:
- Preserve the vector style while adding stronger moment-to-moment feedback.
- Prioritize shield/deflector hits, asteroid damage, boss warnings, and hostile projectiles.
- Use effects sparingly so the playfield remains readable on mobile.

Acceptance:
- Add clear visual feedback for asteroid hits and asteroid destruction beyond existing particles.
- Add distinct hostile projectile styling for saucer and boss shots.
- Add stronger boss arrival/threat telegraphing.
- Keep effects renderer-only and avoid adding Phaser objects to simulation state.

### Warp Tree Preview Details

Make each warp unlock explain what changes in the actual run after purchase.

Design:
- Node tooltips should answer "what will I see or be able to do after buying this?"
- Major systems should call out their affected tab, weapon mode, drone family, or defensive mechanic.
- Keep the current compact tree interaction model.

Acceptance:
- Add run-impact details for every warp unlock tooltip.
- Distinguish immediate stat effects from feature access unlocks.
- For locked nodes, show missing prerequisites in player-readable terms.
- Keep warp unlock definitions pure data.

### Run Plan Drawer

Add a compact current-run planning surface for long-term idle decisions.

Design:
- The drawer should summarize the current route, likely core gain, crystal progress, next boss, and active build identity.
- It should bridge arcade play and idle planning without becoming a dashboard.
- It can live in the Warp tab or as an info surface from the HUD.

Acceptance:
- Show current zone, next zone/boss, crystals, estimated core gain, and available permanent unlock opportunities.
- Show current build summary from owned weapon/drone/talent choices.
- Update immediately after boss defeat, crystal spending, and warp reset.
- Do not duplicate dense details already visible in the full skill or warp trees.

### Zone Identity Pass

Make each zone feel distinct beyond reward, asteroid HP, and density tuning.

Design:
- Each zone should have a readable combat flavor and visual identity.
- Start with lightweight differences before adding heavy new systems.
- Use background tint, asteroid variant bias, map copy, boss intro, and music/filter changes where useful.

Acceptance:
- Add visible zone identity to the HUD/map or playfield.
- Make asteroid variant expectations legible per zone.
- Add at least one per-zone presentation difference that does not affect balance.
- Keep zone definitions serializable and data-driven.

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

### Drone Bay Personality Pass

Give each drone family a stronger identity in the UI and progression presentation.

Design:
- Semi-Auto should read as precision support.
- Shotgun should read as close burst control.
- Missile should read as slower heavy area control.
- The Drones tab should preview behavior before the player invests.

Acceptance:
- Add distinct iconography and behavior copy for each drone family.
- Improve locked, owned, and buyable drone row states.
- Add concise info modal facts for target range, fire rhythm, and combat role.
- Keep drone behavior unchanged unless a follow-up explicitly tunes balance.

### Boss Gate Event Polish

Make boss summoning and zone unlocking feel like deliberate route events.

Design:
- Boss summon should feel like a chosen challenge, not just another purchase.
- The player should see the boss, its purpose, and the unlock reward clearly.
- Preserve the current boss-gated zone flow.

Acceptance:
- Add a boss HP/status strip while a gate boss is active.
- Improve the summon countdown and arrival warning.
- Preview the next zone reward/unlock before summoning.
- Keep boss defeat unlocking the next map node without forced travel.

### Achievement Presentation Polish

Make achievements easier to scan and more satisfying to complete.

Design:
- Achievements should support motivation without dominating the idle UI.
- The player should see recent unlocks and near-complete goals quickly.
- Grouping should make bonus categories more understandable.

Acceptance:
- Group achievements by category or bonus type.
- Highlight recent unlocks and near-complete achievements.
- Add clearer progress text for locked/incomplete achievements.
- Preserve existing achievement save data.

### Warp Route Specialization

Expand the warp route into recognizable long-term playstyles.

Design:
- Add branches that support manual ace, drone commander, tank/shield, and crystal miner directions.
- Early route should stay guided; specialization should open after the first few permanent unlocks.
- Each branch should have clear tradeoffs and readable identity.

Acceptance:
- Add data definitions for a second set of warp unlock nodes beyond the current route.
- Keep unlock effects serializable and pure.
- Show branch identity in the warp tree UI.
- Do not rebalance the whole economy in the same slice.

### Contracts and Missions

Add optional run objectives that give short-term direction and rewards.

Design:
- Contracts should be small and readable during an idle/action run.
- Examples: destroy crystal asteroids, survive a boss, clear dense asteroids, collect credits without dying.
- Rewards should include small permanent improvements where appropriate, plus crystals, credits, or temporary run boosts without breaking warp pacing.

Acceptance:
- Add serializable active contract state.
- Generate a small set of objectives appropriate to current zone/progression.
- Show active contract progress in a compact UI surface.
- Reward completion through existing currency, permanent progression, and reward feed systems.

### Run Modifiers After Warp

Offer temporary modifiers after warp reset to make each run feel a little different.

Design:
- After a warp, offer a small choice of temporary run traits.
- Modifiers should create tradeoffs, not only flat bonuses.
- Examples: richer crystals but denser belts, faster drones but fragile hull, higher boss rewards but stronger bosses.

Acceptance:
- Add serializable current-run modifier state.
- Present a choice after warp reset before normal play resumes.
- Apply modifiers through existing balance/system helpers.
- Clear or replace modifiers on the next warp reset.

### Sector Events

Add lightweight random events during play to reduce run flatness.

Design:
- Events should be readable and time-limited.
- Examples: comet storm, derelict cache, unstable crystal cluster, saucer wave, rich metallic belt.
- Events should create a short decision or opportunity without requiring a new screen.

Acceptance:
- Add serializable event state with timer/type.
- Render event announcements through the reward/system feed.
- Add at least two event types with distinct gameplay effects.
- Keep event spawning tuned so normal asteroid play remains stable.

### Ship Module Slots

Add a small active/passive module layer for ship build expression.

Design:
- Modules should be unlocked by warp route progression.
- Keep the first module set small and easy to understand.
- Examples: shield burst, salvage magnet, overdrive, mine pulse, emergency repair.

Acceptance:
- Add serializable module ownership/equip state.
- Add a UI surface for viewing and equipping modules.
- Implement one passive module and one active module as the first slice.
- Keep input mapping mobile-friendly and avoid crowding the HUD.

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
