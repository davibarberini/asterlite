# Asteridle Technical Debt

Use this file as the source of truth for engineering improvements. Keep items small enough that one Codex run can implement and verify them.

## Ready

### Extract Survival Hazard Renderer

Keep the vector renderer from absorbing every new survival visual.

Context:
- `VectorRenderer.ts` is close to 1,000 lines and now owns ship, bullet, asteroid, boss, saucer, drone, particle, mine, hunter, and survival visual details.
- Upcoming timed hazards will add more visual rules unless survival rendering is isolated.

Acceptance:
- Move survival hazard drawing helpers out of `VectorRenderer.ts` into a focused renderer/helper module.
- Keep renderer objects disposable and Phaser-only.
- Preserve current mine, hunter, and elite saucer readability.
- Run `pnpm run build`.

### Normalize Legacy Weapon Save State

Remove old weapon-mode concepts from active runtime surfaces while preserving save compatibility.

Context:
- Combat identity now comes from ship frames and the Weapons tab has been removed.
- Legacy fields such as `weaponMode`, `spreadUnlocked`, `piercingUnlocked`, `spreadBattery`, and `piercingRail` still exist for old saves and ship-run persistence.

Acceptance:
- Decide which legacy fields must remain in saved v1 data and which can be normalized away during load.
- Keep old saves loading without changing standard ship firing behavior.
- Remove active UI copy and runtime dependencies that imply manual weapon selection.
- Add or update tests for legacy save compatibility.
- Run `pnpm test` and `pnpm run build`.

### Native Release Signing and Store Prep

Turn the native shells into store-ready release builds.

Acceptance:
- Configure Android release signing or document local keystore generation.
- Configure iOS bundle signing/team settings for device/TestFlight builds.
- Replace default native app icons and launch/splash assets with Asteridle assets.
- Document Play Console/TestFlight build commands and artifact locations.
