# Enemy Variety QA

## Scope

- Normal scout, new Skirmisher, new Sniper, existing elite saucer.
- Renderer-only combat UI: silhouette, charge arc, projected shot pattern, discharge flash.
- Bosses, hunters, menus, and player ship geometry are unchanged.

## Independent Review

An independent reviewer checked attack timing, mobile projection, locked aim, death cancellation, silhouettes, and spawn gates. The review found a mismatch between simulation visibility and mobile rendering scale; both now use `getWorldViewScale`. Charge cues also avoid the top HUD area. Short-pattern previews were lengthened and their starting contrast increased.

The independent reviewer could not access a working browser. Independent live visual approval is therefore pending; the browser inspection below was performed by the implementing agent, not the reviewer.

The reviewer subsequently inspected `/tmp/asteridle-enemy-sniper.png` (390 x 844): no visual blocker in that frame; silhouette, charge arc, and dotted trajectory are distinguishable without hiding the player. This is static-image approval only, not animation/timing/full-HUD approval.

## Verification

- 169 simulation/progression tests pass, including enemy gates, all four telegraphs, fixed sniper origin/aim, offscreen cancellation/reentry, HUD-safe firing, death cancellation, and single reward for simultaneous lethal hits.
- Web build passes. Existing bundle-size warning remains.
- Actual Phaser renderer inspected at 390 x 844 through `reviews/enemy-preview.html`; sniper and skirmisher silhouettes and shot previews are distinguishable, with no browser errors.
- Fixture uses production simulation and rendering with a selector and pause control. It does not save or modify a run.
- Normal and elite now intentionally wait through the telegraph after their normal cooldown, reducing instantaneous shot pressure.

## Remaining Validation

- Physical touch devices, finger occlusion, dense combat, and the full HUD during moving encounters need real-play validation.
- No claim of a complete boss/enemy rebalance. This is a bounded variety/readability pass.
