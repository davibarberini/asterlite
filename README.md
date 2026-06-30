# Asteridle

Asteroids-style arcade idle game with mobile slingshot controls, zone gates, drones, talents, achievements, and installable PWA support.

## Run

```sh
pnpm install
pnpm run dev
```

Open `http://localhost:5173/`.

## Controls

- `A` / `Left`: rotate left
- `D` / `Right`: rotate right
- `W` / `Up`: thrust
- `S` / `Down` / `Shift`: brake
- `Space`: fire
- `H`: hyperspace
- Hold touch or mouse on the playfield to aim and fire.
- Drag from the touch anchor to slingshot: inside the dead zone the ship rotates and fires without thrusting, outside it the ship moves.
- Open the floating mobile menu for upgrades, drones, skills, weapons, and achievements.
- Open the map button after buying Star Map to travel between unlocked zones.
- Automatic respawn happens after a short death fade and repair setback.

## Current Features

- Smooth vector-style ship, asteroid, bullet, saucer, and debris rendering.
- Inertia-based ship movement with HP, armor, respawn shield, low-hull screen effect, and auto-respawn.
- Large, medium, and small asteroid splitting with varied silhouettes, speeds, and rotation.
- Asteroid variants for money, crystals, density, and tougher zone scaling.
- Continuous asteroid belt spawning, asteroid rewards, UFO/saucer spawns, saucer shots, hyperspace, and impact particles.
- Layered parallax starfield that responds subtly to ship movement.
- Linear constellation zone map with boss-gated unlocks and free travel between unlocked zones.
- Gate bosses cycle between alien ship types, cost crystals to summon, fire hostile projectiles, and unlock the next zone when defeated.
- Wormhole-style travel animation when moving between zones from the map.
- DOM HUD, mobile drawers, floating quick menu, priority feed, settings, and installable PWA shell.
- Idle progression with passive income, drone types, ship upgrades, weapon modes, prestige cores, achievements, and a crystal talent tree.

## Architecture

The arcade simulation is intentionally separate from Phaser:

- `src/game/simulation`: saveable source of truth for entities, collisions, continuous asteroid spawning, and rules.
- `src/game/input`: action-level input state.
- `src/game/progression`: achievements, talents, prestige, idle bonuses, and save/load handling.
- `src/phaser`: canvas scene orchestration, vector rendering, audio playback, starfield, DOM HUD integration, and mobile UI glue.

Gameplay rules should stay in serializable simulation/progression modules. Phaser scenes should adapt state into rendering, audio, camera, and DOM UI without becoming the saveable source of truth.

## Project Tracking

- `BACKLOG.md`: player-facing features and gameplay work.
- `TECHNICAL_DEBT.md`: engineering improvements and refactors.
- `AGENTS.md`: Codex workflows for `develop-feature` and `develop-improvement`.

## Mobile Path

The game ships as a PWA for web and has native Android/iOS shells through Capacitor.

Use Node 22 before running Capacitor commands:

```sh
nvm use
```

Build targets:

```sh
pnpm run build:web      # GitHub Pages / PWA, Vite base /asteridle/
pnpm run build:native   # Capacitor bundle, Vite base ./
pnpm run cap:sync       # build native web assets and sync android/ios
```

Android debug APK:

```sh
export JAVA_HOME=/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
pnpm run cap:build:android
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`.

iOS simulator build:

```sh
pnpm run cap:build:ios:sim
```

Output: `ios/build/DerivedData/Build/Products/Debug-iphonesimulator/App.app`.

Open native projects:

```sh
pnpm run cap:open:android
pnpm run cap:open:ios
```

Release signing, store metadata, final app icons, splash screens, and TestFlight/Play Console upload are separate store-prep tasks.
