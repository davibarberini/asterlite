# Asteridle Backlog

Use this file as the source of truth for future feature work. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Warp Core Save Model

Add the serializable progression state needed for permanent warp-core unlocks.

Acceptance:
- Add an owned warp unlock id collection to progression/save data.
- Add save normalization and migration defaults for existing saves.
- Preserve current saves and do not gate any gameplay systems yet.
- Add or update pure progression tests for save/load normalization.

### Warp Core Unlock Definitions

Create data definitions for the first permanent warp unlock route without rendering the tree yet.

Acceptance:
- Add typed unlock ids for `Core Stabilizer`, `Drone Systems`, `Deflector Frame`, `Shield Bubble`, `Spread Battery`, `Ranger Hangar`, `Missile Foundry`, and `Piercing Rail`.
- Define each node with cost, icon id, title, summary, route position, and prerequisites.
- Add pure helpers for owned/available/locked/unaffordable node state.
- Keep definitions independent from Phaser and DOM rendering.

### Warp Core Tree Drawer Shell

Add a mobile-first warp-core tree drawer using existing compact tree interaction patterns.

Acceptance:
- Add a Warp Cores entry point from the upgrade/warp reset area.
- Render warp unlock nodes using compact square buttons and floating tooltip details.
- Show current warp core balance and owned/available/locked states.
- Tooltips close when tapping the same node or outside the tooltip.
- Do not gate gameplay systems in this slice.

### Drone Systems Warp Gate Slice

Gate only the Drones tab and basic sentry drone access behind the first drone warp unlock.

Acceptance:
- New saves start with no drones and locked Drones tab until `Drone Systems` is owned.
- Buying `Drone Systems` unlocks the Drones tab and the ability to buy the simple semi-auto drone.
- Existing saves with purchased drones migrate to owned `Drone Systems`.
- Ranger and breaker gating remains a later slice.

### Weapon Warp Gate Slice

Gate Spread Shot and Piercing Rounds behind their warp-core unlock nodes.

Acceptance:
- Spread Shot requires `Spread Battery` before it can be bought or used.
- Piercing Rounds requires `Piercing Rail` and keeps its existing money purchase after the warp unlock.
- Existing saves with these weapons unlocked migrate to the matching owned warp unlock.
- Shop labels and disabled states explain the missing warp unlock.

### Shield Bubble State Skeleton

Add serializable state and UI plumbing for the future circular shield without collision behavior yet.

Acceptance:
- Add shield state fields for active/broken/recharge timer behind the `Shield Bubble` warp unlock.
- Add save defaults and migration for shield state.
- Add HUD or info text placeholder for shield availability/recharge.
- Do not absorb damage in this slice; collision behavior remains a later feature item.

### Warp Core Unlock Tree Foundation

Add a permanent warp-core unlock tree that reuses the compact skill-tree design language but uses warp cores instead of crystals.

Design:
- This tree is meta-progression: purchases are permanent one-time unlocks that survive warp reset.
- The route should be mostly linear with small side branches, so the player has a guided unlock path instead of a wide open build tree.
- Crystal talents remain run/build progression; warp core unlocks control major systems and long-term pacing.

First route draft:
- `Core Stabilizer` unlocks the tree and keeps the current permanent money multiplier visible.
- `Drone Systems` unlocks the Drones tab/system and the first simple semi-auto drone purchase.
- `Deflector Frame` unlocks the deflector system.
- `Shield Bubble` unlocks a circular breakable deflector shield with recharge.
- `Spread Battery` unlocks Spread Shot.
- `Ranger Hangar` unlocks shotgun/ranger drones.
- `Missile Foundry` unlocks missile/breaker drones.
- `Piercing Rail` unlocks Piercing Rounds after Spread Shot.

Acceptance:
- Add serializable owned warp-core unlock ids to progression/save data.
- Add definitions for one-time warp unlock nodes with cost, icon, copy, and prerequisites.
- Add a Warp Cores modal/drawer using the existing compact node + floating tooltip pattern from the skill tree.
- Show current owned/available/locked state and current warp core balance.
- Do not rebalance existing systems yet; this slice is infrastructure and UI.

### Gate Major Systems Behind Warp Unlocks

Move major feature access from money-only purchases into the warp-core unlock tree.

Design:
- The player should start without drones and must manually destroy early asteroids.
- The Drones tab/system itself should require an early warp unlock.
- `Drone Systems` should unlock both the Drones tab and the simple semi-auto drone purchase; there should not be a separate sentry unlock node.
- Additional drone types, Spread Shot, Piercing Rounds, directional Deflector, and circular Shield Bubble should require their matching warp unlock before they can be bought or used in a run.
- Existing saves should not lose access to systems they already bought; migrate them into the matching owned warp unlocks.

Acceptance:
- Require warp unlocks for the Drones tab/simple sentry drone package, ranger drones, breaker drones, Spread Shot, Piercing Rounds, directional Deflector, and Shield Bubble.
- Update shop disabled states, labels, and info text to explain missing warp unlocks.
- Preserve existing player access by migrating old saves that already own those systems.
- Keep all unlock state serializable.

### Circular Deflector Shield

Add a breakable circular defensive shield unlocked by warp cores.

Design:
- This is separate from the current directional prow deflector.
- The circular shield surrounds the ship, blocks one or more hits, then breaks and recharges after a delay.
- It should be useful for mobile combat mistakes without making collisions irrelevant.
- It should be unlocked through the warp-core tree, then upgraded with run currency later if needed.

Acceptance:
- Add serializable shield state for active/broken/recharge timer.
- Add collision handling so the shield can absorb asteroid or hostile projectile hits before damaging the ship.
- Add clear vector rendering for active shield, hit flash, and recharge/broken state.
- Add HUD or tooltip feedback for shield recharge.
- Gate the system behind the `Shield Bubble` warp unlock.

### Warp Core Economy and Pacing Rebalance

Slow progression by making major unlocks depend on repeated warp cycles rather than early money spikes.

Design:
- Warp reset should feel like the main long-term loop, not only a money multiplier.
- Early runs should unlock a small number of permanent systems, then ask the player to push further for the next route node.
- Boss zones should become progressively harder enough that warp upgrades feel necessary.

Acceptance:
- Tune warp core gain, first reset timing, and core costs for the first 6-8 unlock nodes.
- Reduce or remove money-only access to major systems once they are warp gated.
- Keep the first run playable with only the basic cannon, manual aiming, and early asteroid rewards.
- Update the Upgrades/Warp Reset UI to preview unlock opportunities, not just core count.

### Starting Loadout and Guided Onboarding

Make the early experience clearer and slower by starting without drones and guiding the player toward the first warp.

Design:
- Start with only the basic cannon so the player learns movement, aiming, and asteroid rewards manually.
- Use the first drone-related warp unlock to introduce the Drones tab and simple semi-auto drone purchase together.
- Delay advanced weapons and drones behind warp-core route nodes.
- Use feed/modal copy sparingly to signal when a new permanent unlock is available.

Acceptance:
- New saves start with zero drones.
- The Drones tab is hidden or locked until `Drone Systems` is owned.
- After `Drone Systems`, the Drones tab allows buying simple semi-auto drones and distinguishes advanced locked-by-warp, owned, and buyable drone types.
- The first warp route node is cheap enough to teach the system.
- Feed announces newly affordable warp unlocks without cluttering combat.

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

## Process Notes

- Prefer implementing one backlog item at a time.
- Keep simulation state serializable.
- Run `pnpm run build` before finishing implementation work.
- Update this backlog when a feature is completed or split.

## Completed

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
