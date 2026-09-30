# Upgrade Cards

Temporary run cards are offered as three random, distinct choices (four with Expanded Draft). Cards can stack without a limit. Rarity weights are common 70, rare 22, epic 7, and legendary 1. Each draw picks an available rarity first, then a card uniformly within that rarity; weights are normalized over the available tiers. Pending offers persist through saves.

## Implemented

| Rarity | Card | Effect |
| --- | --- | --- |
| Common | Amplificador Cinético | +20% weapon damage per stack. |
| Common | Ciclo Rápido | +15% fire rate per stack. |
| Common | Casco Reforçado | +20 max HP per stack. |
| Common | Câmara Dupla | +1 projectile per stack. Excluded from weapons where it has no effect. |
| Common | Núcleo Perfurante | +1 projectile pierce per stack. Excluded from weapons where it has no effect. |
| Common | Calibre Expandido | +15% player projectile and Ember wave size per stack. |
| Common | Espinhos | +18 asteroid impact damage while dashing per stack. |
| Common | Vetor de Impulso | +15% swipe-dash impulse per stack. |
| Common | Blindagem Inercial | -15% collision knockback per stack. |
| Common | Barreira de Emergência | Adds one absorbable hit per stack, rendered as one thin shield ring per charge. |
| Rare | Reator Crítico | Player projectiles have a `1 - 0.85^stacks` chance of double damage, rolled once at firing. Critical shots have a gold outline. Excluded from Ember. |
| Rare | Sentry Wing | +1 temporary sentry per stack; requires Drone Systems. No purchase or deployment inventory. |
| Rare | Ranger Wing | +1 temporary shotgun drone per stack; requires Ranger Hangar. |
| Rare | Breaker Wing | +1 temporary missile drone per stack; requires Missile Foundry. |
| Rare | Radar de Caça | Player projectiles steer toward the nearest living asteroid/enemy within 420 units, at 0.65 radians/second per stack, retaining speed. Excluded from Ember. |
| Rare | Ricochete Instável | +1 asteroid bounce per stack, consumed before pierce. Each asteroid can be hit once by a projectile. Excluded from Ember and Hisoka, whose weapon already has damage-budget ricochets. |
| Rare | Carga Incendiária | Player shots burn asteroids (including bosses) for 25% of shot damage/second per stack for 3 seconds. Further hits refresh duration and retain the strongest burn; burn kills grant normal rewards. Excluded from Ember. |
| Rare | Câmara de Fragmentação | Direct asteroid kills release 2 fragments per stack at 35% of shot damage. Fragments keep burn/ricochet/pierce/homing, start colliding next frame, and never fragment again. Burn kills do not fragment. Excluded from Ember. |

## Planned

| Rarity | Card | Effect |
| --- | --- | --- |
| Rare | Nova de Dash | Dash ending creates a damaging area burst. |
| Rare | Fase de Impacto | Dash crosses one asteroid without damage. |
| Rare | Placa Reativa | Taking damage emits a defensive burst, once every 5 seconds. |
| Rare | Campo de Repulsão | Periodically pushes nearby asteroids away. |
| Epic | Rastro de Plasma | Dash leaves a damaging plasma trail. |
| Epic | Canhão de Íons | Projectiles pierce and explode in an area. |
| Epic | Matriz de Drones | Drones gain damage and fire rate. |
| Epic | Escudo Reciclável | Barrier recharges after a destruction threshold. |
| Epic | Coração de Fornalha | Ember-only: larger, stronger flame waves. |
| Epic | Cascata Prismática | +2 ricochets; projectiles grow after each hit. |
| Epic | Overdrive | Large fire-rate gain with lower max HP. |
| Legendary | Singularidade | Large slow projectiles pull asteroids before exploding. |
| Legendary | Protocolo Fênix | Prevents one death per run and restores HP. |
