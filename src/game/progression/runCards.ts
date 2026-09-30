import { getEffectiveMaxHp } from './achievements';
import { getShipFrameBonusMultiplier } from './shipFrames';
import { syncActiveDrones } from '../simulation/state';
import type { GameState, RunCardId, RunCardRarity, RunCardState, RunCardTag, ShipFrameId, WarpUnlockId } from '../simulation/types';

export type RunCardEffect = {
  damageMultiplier?: number;
  fireRateMultiplier?: number;
  maxHp?: number;
  projectileCount?: number;
  pierce?: number;
  areaMultiplier?: number;
  impactDamage?: number;
  dashImpulseMultiplier?: number;
  knockbackMultiplier?: number;
  shieldCharges?: number;
  criticalChance?: number;
  homingTurnRate?: number;
};

export type RunCardDefinition = {
  id: RunCardId;
  title: string;
  summary: string;
  rarity: RunCardRarity;
  tags: RunCardTag[];
  effect: RunCardEffect;
  allowedShipFrameIds?: ShipFrameId[];
  excludedShipFrameIds?: ShipFrameId[];
  requiresWarpUnlockId?: WarpUnlockId;
};

export const RUN_CARD_DEFINITIONS: RunCardDefinition[] = [
  {
    id: 'unstableRicochet', title: 'Unstable Ricochet', summary: '+1 asteroid ricochet per projectile.', rarity: 'rare',
    tags: ['offense'], effect: {}, excludedShipFrameIds: ['ember', 'hisoka']
  },
  {
    id: 'incendiaryCharge', title: 'Incendiary Charge', summary: 'Shots burn asteroids for 25% of shot damage per second for 3 seconds per stack.', rarity: 'rare',
    tags: ['offense'], effect: {}, excludedShipFrameIds: ['ember']
  },
  {
    id: 'fragmentationChamber', title: 'Fragmentation Chamber', summary: 'Direct asteroid kills release 2 fragments per stack at 35% shot damage. Fragments cannot split.', rarity: 'rare',
    tags: ['offense'], effect: {}, excludedShipFrameIds: ['ember']
  },
  {
    id: 'kineticAmplifier', title: 'Kinetic Amplifier', summary: '+20% weapon damage.', rarity: 'common',
    tags: ['offense'], effect: { damageMultiplier: 1.2 }
  },
  {
    id: 'rapidCycler', title: 'Rapid Cycler', summary: '+15% fire rate.', rarity: 'common',
    tags: ['offense'], effect: { fireRateMultiplier: 1.15 }
  },
  {
    id: 'reinforcedHull', title: 'Reinforced Hull', summary: '+20 max hull.', rarity: 'common',
    tags: ['defense'], effect: { maxHp: 20 }
  },
  {
    id: 'splitChamber', title: 'Split Chamber', summary: '+1 projectile per shot.', rarity: 'common',
    tags: ['offense'], effect: { projectileCount: 1 }, excludedShipFrameIds: ['ember', 'kestrel', 'nivitron', 'prism', 'needle', 'hisoka']
  },
  {
    id: 'piercingCore', title: 'Piercing Core', summary: '+1 projectile pierce.', rarity: 'common',
    tags: ['offense'], effect: { pierce: 1 }, excludedShipFrameIds: ['ember', 'kestrel', 'nivitron', 'prism', 'hisoka']
  },
  {
    id: 'expandedCaliber', title: 'Expanded Caliber', summary: '+15% projectile and wave size.', rarity: 'common',
    tags: ['offense'], effect: { areaMultiplier: 0.15 }
  },
  {
    id: 'thorns', title: 'Thorns', summary: '+18 asteroid impact damage while dashing.', rarity: 'common',
    tags: ['mobility'], effect: { impactDamage: 18 }
  },
  {
    id: 'impulseVector', title: 'Impulse Vector', summary: '+15% dash impulse.', rarity: 'common',
    tags: ['mobility'], effect: { dashImpulseMultiplier: 0.15 }
  },
  {
    id: 'inertialArmor', title: 'Inertial Armor', summary: '-15% collision knockback.', rarity: 'common',
    tags: ['defense'], effect: { knockbackMultiplier: 0.85 }
  },
  {
    id: 'emergencyBarrier', title: 'Emergency Barrier', summary: 'Absorb +1 incoming hit.', rarity: 'common',
    tags: ['defense'], effect: { shieldCharges: 1 }
  },
  {
    id: 'criticalReactor', title: 'Critical Reactor', summary: '15% chance of double projectile damage. Each stack adds another chance.', rarity: 'rare',
    tags: ['offense'], effect: { criticalChance: 0.15 }, excludedShipFrameIds: ['ember']
  },
  {
    id: 'huntingRadar', title: 'Hunting Radar', summary: 'Projectiles gently steer toward nearby enemies. Stacks improve steering.', rarity: 'rare',
    tags: ['offense'], effect: { homingTurnRate: 0.65 }, excludedShipFrameIds: ['ember']
  },
  {
    id: 'sentryWing', title: 'Sentry Wing', summary: '+1 temporary sentry drone.', rarity: 'rare',
    tags: ['drone'], effect: {}, requiresWarpUnlockId: 'droneSystems'
  },
  {
    id: 'rangerWing', title: 'Ranger Wing', summary: '+1 temporary shotgun drone.', rarity: 'rare',
    tags: ['drone'], effect: {}, requiresWarpUnlockId: 'rangerHangar'
  },
  {
    id: 'breakerWing', title: 'Breaker Wing', summary: '+1 temporary missile drone.', rarity: 'rare',
    tags: ['drone'], effect: {}, requiresWarpUnlockId: 'missileFoundry'
  }
];

export const RUN_CARD_BY_ID = Object.fromEntries(
  RUN_CARD_DEFINITIONS.map((definition) => [definition.id, definition])
) as Record<RunCardId, RunCardDefinition>;

const cardIds = RUN_CARD_DEFINITIONS.map((definition) => definition.id);

export const createRunCardState = (): RunCardState => ({
  selectedStacks: Object.fromEntries(cardIds.map((id) => [id, 0])) as Record<RunCardId, number>,
  shieldCharges: 0,
  pendingChoiceIds: [],
  queuedChoiceCount: 0
});

export const normalizeRunCardState = (value: Partial<RunCardState> | undefined): RunCardState => {
  const fallback = createRunCardState();
  if (!value) {
    return fallback;
  }
  RUN_CARD_DEFINITIONS.forEach((definition) => {
    fallback.selectedStacks[definition.id] = Math.max(0, Math.floor(value.selectedStacks?.[definition.id] ?? 0));
  });
  fallback.shieldCharges = Math.max(0, Math.floor(value.shieldCharges ?? 0));
  fallback.pendingChoiceIds = Array.isArray(value.pendingChoiceIds)
    ? value.pendingChoiceIds.filter((id): id is RunCardId => typeof id === 'string' && id in RUN_CARD_BY_ID)
    : [];
  fallback.queuedChoiceCount = Math.max(0, Math.floor(value.queuedChoiceCount ?? 0));
  return fallback;
};

const isCardEligible = (state: GameState, definition: RunCardDefinition): boolean => {
  const frame = state.progression.activeShipFrameId;
  if (definition.allowedShipFrameIds && !definition.allowedShipFrameIds.includes(frame)) {
    return false;
  }
  if (definition.excludedShipFrameIds?.includes(frame)) {
    return false;
  }
  if (definition.requiresWarpUnlockId && !state.progression.ownedWarpUnlockIds.includes(definition.requiresWarpUnlockId)) {
    return false;
  }
  return true;
};

export const getEligibleRunCards = (state: GameState): RunCardDefinition[] =>
  RUN_CARD_DEFINITIONS.filter((definition) => isCardEligible(state, definition));

export const getRunCardStacks = (state: GameState, id: RunCardId): number =>
  Math.max(0, Math.floor(state.runCards.selectedStacks[id] ?? 0));

const sumEffect = (state: GameState, key: keyof RunCardEffect): number =>
  RUN_CARD_DEFINITIONS.reduce((total, definition) => total + (definition.effect[key] ?? 0) * getRunCardStacks(state, definition.id), 0);

const productEffect = (state: GameState, key: 'damageMultiplier' | 'fireRateMultiplier' | 'knockbackMultiplier'): number =>
  RUN_CARD_DEFINITIONS.reduce((total, definition) => {
    const value = definition.effect[key];
    return value ? total * value ** getRunCardStacks(state, definition.id) : total;
  }, 1);

export const getRunCardDamageMultiplier = (state: GameState): number => productEffect(state, 'damageMultiplier');
export const getRunCardFireRateMultiplier = (state: GameState): number => productEffect(state, 'fireRateMultiplier');
export const getRunCardMaxHpBonus = (state: GameState): number => sumEffect(state, 'maxHp');
export const getRunCardProjectileCount = (state: GameState): number => 1 + sumEffect(state, 'projectileCount');
export const getRunCardPierce = (state: GameState): number => sumEffect(state, 'pierce');
export const getRunCardCriticalChance = (state: GameState): number => 1 - 0.85 ** getRunCardStacks(state, 'criticalReactor');
export const getRunCardHomingTurnRate = (state: GameState): number => sumEffect(state, 'homingTurnRate');
export const getRunCardAreaMultiplier = (state: GameState): number => 1 + sumEffect(state, 'areaMultiplier');
export const getRunCardImpactDamage = (state: GameState): number => sumEffect(state, 'impactDamage');
export const getRunCardDashImpulseMultiplier = (state: GameState): number => 1 + sumEffect(state, 'dashImpulseMultiplier');
export const getRunCardKnockbackMultiplier = (state: GameState): number => productEffect(state, 'knockbackMultiplier');

export const consumeRunCardShield = (state: GameState): boolean => {
  if (state.runCards.shieldCharges <= 0) {
    return false;
  }
  state.runCards.shieldCharges -= 1;
  return true;
};

export const syncRunCardDerivedState = (state: GameState, preserveHpRatio = false): void => {
  const previousMaxHp = Math.max(1, state.ship.maxHp);
  const maxHp = Math.round(
    getEffectiveMaxHp(state.progression) * getShipFrameBonusMultiplier(state.progression, 'maxHpMultiplier') + getRunCardMaxHpBonus(state)
  );
  state.ship.maxHp = maxHp;
  state.ship.hp = preserveHpRatio
    ? Math.min(maxHp, Math.max(0, state.ship.hp * maxHp / previousMaxHp))
    : Math.min(maxHp, state.ship.hp);
  syncActiveDrones(state);
};

const rarityWeights: Record<RunCardRarity, number> = {
  common: 70,
  rare: 22,
  epic: 7,
  legendary: 1
};

const buildChoiceIds = (state: GameState): RunCardId[] => {
  const eligible = getEligibleRunCards(state);
  const choices: RunCardId[] = [];
  const available = [...eligible];
  const choiceCount = state.progression.ownedWarpUnlockIds.includes('expandedDraft') ? 4 : 3;
  while (available.length > 0 && choices.length < choiceCount) {
    const rarities = (Object.keys(rarityWeights) as RunCardRarity[]).filter((rarity) => available.some((card) => card.rarity === rarity));
    const totalWeight = rarities.reduce((total, rarity) => total + rarityWeights[rarity], 0);
    let roll = Math.random() * totalWeight;
    const rarityIndex = rarities.findIndex((rarity) => {
      roll -= rarityWeights[rarity];
      return roll <= 0;
    });
    const rarity = rarities[rarityIndex < 0 ? rarities.length - 1 : rarityIndex];
    const pool = available.filter((card) => card.rarity === rarity);
    const selected = pool[Math.floor(Math.random() * pool.length)];
    available.splice(available.indexOf(selected), 1);
    choices.push(selected.id);
  }
  if (choices.length <= 0) {
    return [];
  }
  return choices;
};

export const queueRunCardChoices = (state: GameState, count: number): void => {
  const safeCount = Math.max(0, Math.floor(count));
  if (safeCount <= 0) {
    return;
  }
  state.runCards.queuedChoiceCount += safeCount;
  if (state.runCards.pendingChoiceIds.length <= 0) {
    state.runCards.pendingChoiceIds = buildChoiceIds(state);
  }
};

export const queueLevelUpCardChoices = (state: GameState, levelsGained: number): void =>
  queueRunCardChoices(state, levelsGained);

export const reconcilePendingRunCards = (state: GameState): void => {
  if (state.runCards.pendingChoiceIds.some((id) => !isCardEligible(state, RUN_CARD_BY_ID[id]))) {
    state.runCards.queuedChoiceCount = Math.max(1, state.runCards.queuedChoiceCount);
    state.runCards.pendingChoiceIds = buildChoiceIds(state);
  }
};

export const applyRunCardChoice = (state: GameState, id: RunCardId): boolean => {
  if (!state.runCards.pendingChoiceIds.includes(id)) {
    return false;
  }
  const definition = RUN_CARD_BY_ID[id];
  if (!isCardEligible(state, definition)) {
    return false;
  }
  state.runCards.selectedStacks[id] += 1;
  if (definition.tags.includes('drone')) state.progression.achievementStats.dronesRecruited += 1;
  state.runCards.shieldCharges += definition.effect.shieldCharges ?? 0;
  state.runCards.queuedChoiceCount = Math.max(0, state.runCards.queuedChoiceCount - 1);
  state.runCards.pendingChoiceIds = state.runCards.queuedChoiceCount > 0 ? buildChoiceIds(state) : [];
  syncRunCardDerivedState(state, id === 'reinforcedHull');
  return true;
};
