# Asterlite Monetization Plan

This plan is intentionally not an implementation request. Monetization should only be built after the core loop, mid-game progression, and economy pacing are stable enough that paid or ad-based rewards do not distort the game.

## Monetization Readiness Gate

Do not implement monetization until most of these are true:

- The first 60-120 minutes of play are fun without ads, purchases, or artificial waits.
- Guided missions, Technologies, Drones, Skills, bosses, and zone travel form a coherent path.
- Credit, crystal, warp core, drone, and upgrade pacing have been playtested across early and mid-game.
- The game has at least one durable cosmetic surface: ship skins, drone skins, projectile styles, trails, HUD themes, or warp effects.
- Saves and progression migrations are stable enough to support inventory and entitlement state.
- The mobile app publishing path is proven for Android and iOS test builds.
- We can distinguish analytics events for normal play, rewarded ad offers, purchases, and failed/declined monetization prompts.

If these are not true, only implement foundations that are useful without monetization, such as cosmetic inventory data, reward offer abstractions, or analytics event naming.

## Principles

- Monetization must be optional. The game should remain playable and satisfying without spending money or watching ads.
- Rewarded ads should be player-initiated. Avoid forced interstitial ads, mid-combat ads, or ads after death unless the player explicitly chooses a reward.
- Do not sell major permanent power early. Permanent power can easily break idle pacing and make balance meaningless.
- Prefer cosmetics, convenience, and temporary boosts over direct progression skips.
- Never hide core systems behind payment. Technologies, Drones, Skills, Weapons, bosses, and warp progression should remain earned through play.
- Monetization prompts should be sparse, contextual, and dismissible.
- All paid inventory and durable entitlements must be serializable and recoverable.

## Recommended Monetization Types

### 1. Rewarded Ads

Rewarded ads are the best first monetization layer because they are optional and can map cleanly to idle-game moments.

Good rewarded ad offers:

- Double offline credits after returning to the game.
- Repair for free after death instead of paying credits.
- Add a short temporary credit multiplier.
- Add a short temporary crystal find bonus.
- Instantly complete or boost a non-critical mission objective.
- Reroll a mission after repeatable mission variety exists.
- Boost drone production or drone fire rate for a limited time.

Avoid:

- Ads required to claim normal rewards.
- Ads that give warp cores directly.
- Ads that grant large permanent stat upgrades.
- Ads that interrupt active boss fights or combat.
- Ads shown automatically on app open, warp reset, or zone travel.

Recommended limits:

- One offline reward ad prompt per return session.
- One death repair ad prompt per death.
- A small daily cap for economy boosters.
- Cooldowns on repeated offers so the HUD does not become ad-driven.

### 2. Cosmetics

Cosmetics should be the healthiest long-term monetization layer.

Candidate cosmetic categories:

- Ship skins.
- Drone skins.
- Projectile styles.
- Engine trails.
- Warp travel effects.
- Boss defeat effects.
- HUD themes.
- Zone map marker styles.

Cosmetics should not affect gameplay stats. If a cosmetic is bundled with resources, the resource amount should be small and framed as a bonus, not the main value.

### 3. Starter and Support Packs

Use small one-time packs after the early progression is proven.

Possible packs:

- Starter Pack: cosmetic ship skin, small credits, small crystals.
- Drone Support Pack: drone skin, small credit boost, no exclusive drone behavior.
- Warp Support Pack: warp visual effect, small crystal bundle.
- Founder Pack: cosmetic bundle and permanent account badge if accounts ever exist.

Avoid packs that include:

- Large permanent damage, fire-rate, HP, or income upgrades.
- Direct unlocks of Technologies.
- Direct unlocks of boss gates or later zones.
- Large warp core bundles.

### 4. Optional Premium Currency

Only add premium currency if the cosmetic catalog becomes large enough to justify it.

If introduced:

- Premium currency should primarily buy cosmetics.
- It may buy small convenience items, but not core progression.
- Prices should be clear and avoid confusing exchange chains.
- The game should also support direct purchase bundles where platform rules make that cleaner.

### 5. Battle Pass or Season Track

This should be late-stage only.

A season track could work if repeatable missions and cosmetic inventory are already strong.

Safe rewards:

- Cosmetics.
- HUD themes.
- Trails.
- Small resource bundles.
- Mission reroll tokens.

Unsafe rewards:

- Exclusive gameplay systems.
- Exclusive weapons.
- Exclusive drones with better behavior.
- Permanent stat upgrades that non-paying players cannot reasonably earn.

## Economy Guardrails

Monetized rewards should be evaluated against normal progression:

- Offline credit doubling should feel helpful, not mandatory.
- Temporary multipliers should be short and capped.
- Crystal rewards should not skip major warp pacing.
- Warp cores should generally remain earned through crystals and resets.
- Paid boosts should not invalidate long-term upgrade price curves.
- Cosmetics should be the default paid value whenever possible.

Suggested early rewarded ad values:

- Offline credits: x2 for the current offline claim only.
- Free repair: waives one repair cost after death.
- Credit boost: +25% to +50% credits for 5-10 minutes.
- Crystal boost: +10% to +20% crystal rewards for 5-10 minutes, only after crystals are already introduced.
- Mission boost: add 10-25% progress to a repeatable mission, never to first-time tutorial-critical missions.

## Required Technical Foundations

Before real monetization:

- `RewardOffer` model for ad/purchase/reward offers.
- `BoostState` model for temporary timed boosts.
- `CosmeticInventory` model for owned/equipped cosmetics.
- Entitlement persistence and migration.
- Restore purchases flow for iOS/Android.
- Analytics event names for offer shown, offer accepted, ad completed, ad failed, purchase started, purchase completed, purchase failed, and reward granted.
- Platform adapter boundary for web, Android, and iOS so gameplay code does not call ad or store SDKs directly.

Keep all gameplay state serializable and separate from platform SDK objects.

## Suggested Implementation Phases

### Phase 0: Design Only

Create data shapes and UI mocks without SDK integration.

Deliverables:

- Offer taxonomy.
- Cosmetic categories.
- Boost categories.
- Analytics event naming.
- Store/ad adapter interface.

This phase can be done before monetization is live if it does not add prompts to players.

### Phase 1: Cosmetic Inventory Foundation

Add owned/equipped cosmetic state and a local-only cosmetics menu.

Deliverables:

- Serializable cosmetic inventory.
- A few earnable cosmetics.
- Cosmetic equip UI.
- No real money and no ads yet.

This is useful even without monetization.

### Phase 2: Reward Offer Foundation

Add generic reward offers but use only non-monetized internal offers at first.

Deliverables:

- `RewardOffer` data.
- Claim flow.
- Timed boosts.
- Tests for reward grant and expiry.
- No SDK integration yet.

### Phase 3: Rewarded Ads

Add platform adapters and one or two rewarded ad placements.

First placements:

- Double offline credits.
- Free repair after death.

Do not add more until playtest data shows they are not annoying or balance-breaking.

### Phase 4: Cosmetic Store

Add paid cosmetics after inventory and platform purchase restore are reliable.

Deliverables:

- Store UI.
- Platform purchase adapter.
- Restore purchases.
- Cosmetic bundles.
- Purchase analytics.

### Phase 5: Packs or Season Track

Only after the game has enough content and retention.

Deliverables:

- Limited packs or season track.
- Mostly cosmetic rewards.
- Strict economy caps for resource rewards.

## Backlog Trigger

Before implementing any monetization task, read this document and explicitly verify the Monetization Readiness Gate. If the gate is not satisfied, do not implement ads, purchases, paid currency, or store prompts. Instead, either leave the task blocked or implement only non-monetized foundations that improve the game independently.
