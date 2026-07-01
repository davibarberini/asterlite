import type { ProgressionState, ShipFrameId, Vec2 } from '../simulation/types';

export type ShipFrameRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export type ShipFrameDefinition = {
  id: ShipFrameId;
  name: string;
  rarity: ShipFrameRarity;
  unlockExchange: number;
  shape: Vec2[];
  bonuses: {
    damageMultiplier?: number;
    fireRateMultiplier?: number;
    speedMultiplier?: number;
    maxHpMultiplier?: number;
    incomeMultiplier?: number;
  };
};

export const SHIP_FRAME_DEFINITIONS: ShipFrameDefinition[] = [
  {
    id: 'vector',
    name: 'Vector',
    rarity: 'common',
    unlockExchange: 0,
    shape: [
      { x: 18, y: 0 },
      { x: -13, y: 12 },
      { x: -7, y: 0 },
      { x: -13, y: -12 }
    ],
    bonuses: {}
  },
  {
    id: 'kestrel',
    name: 'Kestrel',
    rarity: 'uncommon',
    unlockExchange: 1,
    shape: [
      { x: 20, y: 0 },
      { x: -5, y: 8 },
      { x: -16, y: 15 },
      { x: -10, y: 0 },
      { x: -16, y: -15 },
      { x: -5, y: -8 }
    ],
    bonuses: {
      speedMultiplier: 1.08
    }
  },
  {
    id: 'bulwark',
    name: 'Bulwark',
    rarity: 'uncommon',
    unlockExchange: 2,
    shape: [
      { x: 16, y: 0 },
      { x: 2, y: 14 },
      { x: -15, y: 10 },
      { x: -17, y: -10 },
      { x: 2, y: -14 }
    ],
    bonuses: {
      maxHpMultiplier: 1.12
    }
  },
  {
    id: 'prism',
    name: 'Prism',
    rarity: 'rare',
    unlockExchange: 4,
    shape: [
      { x: 19, y: 0 },
      { x: 5, y: 12 },
      { x: -12, y: 12 },
      { x: -4, y: 0 },
      { x: -12, y: -12 },
      { x: 5, y: -12 }
    ],
    bonuses: {
      fireRateMultiplier: 1.08
    }
  },
  {
    id: 'voidRunner',
    name: 'Void Runner',
    rarity: 'epic',
    unlockExchange: 7,
    shape: [
      { x: 21, y: 0 },
      { x: 3, y: 10 },
      { x: -8, y: 18 },
      { x: -14, y: 5 },
      { x: -6, y: 0 },
      { x: -14, y: -5 },
      { x: -8, y: -18 },
      { x: 3, y: -10 }
    ],
    bonuses: {
      damageMultiplier: 1.08,
      incomeMultiplier: 1.08
    }
  },
  {
    id: 'needle',
    name: 'Needle',
    rarity: 'common',
    unlockExchange: 3,
    shape: [
      { x: 23, y: 0 },
      { x: -2, y: 7 },
      { x: -15, y: 5 },
      { x: -18, y: 0 },
      { x: -15, y: -5 },
      { x: -2, y: -7 }
    ],
    bonuses: {
      damageMultiplier: 1.05
    }
  },
  {
    id: 'atlas',
    name: 'Atlas',
    rarity: 'rare',
    unlockExchange: 5,
    shape: [
      { x: 17, y: 0 },
      { x: 8, y: 13 },
      { x: -10, y: 16 },
      { x: -18, y: 0 },
      { x: -10, y: -16 },
      { x: 8, y: -13 }
    ],
    bonuses: {
      maxHpMultiplier: 1.18,
      incomeMultiplier: 1.04
    }
  },
  {
    id: 'ember',
    name: 'Ember',
    rarity: 'rare',
    unlockExchange: 6,
    shape: [
      { x: 20, y: 0 },
      { x: 2, y: 11 },
      { x: -12, y: 15 },
      { x: -7, y: 3 },
      { x: -18, y: 0 },
      { x: -7, y: -3 },
      { x: -12, y: -15 },
      { x: 2, y: -11 }
    ],
    bonuses: {
      fireRateMultiplier: 1.05,
      damageMultiplier: 1.05
    }
  },
  {
    id: 'wraith',
    name: 'Wraith',
    rarity: 'epic',
    unlockExchange: 8,
    shape: [
      { x: 22, y: 0 },
      { x: 4, y: 8 },
      { x: -6, y: 17 },
      { x: -12, y: 6 },
      { x: -18, y: 12 },
      { x: -10, y: 0 },
      { x: -18, y: -12 },
      { x: -12, y: -6 },
      { x: -6, y: -17 },
      { x: 4, y: -8 }
    ],
    bonuses: {
      speedMultiplier: 1.12,
      fireRateMultiplier: 1.06
    }
  },
  {
    id: 'aurora',
    name: 'Aurora',
    rarity: 'epic',
    unlockExchange: 9,
    shape: [
      { x: 21, y: 0 },
      { x: 8, y: 9 },
      { x: -2, y: 18 },
      { x: -12, y: 9 },
      { x: -7, y: 0 },
      { x: -12, y: -9 },
      { x: -2, y: -18 },
      { x: 8, y: -9 }
    ],
    bonuses: {
      damageMultiplier: 1.08,
      speedMultiplier: 1.08,
      incomeMultiplier: 1.08
    }
  },
  {
    id: 'nivitron',
    name: 'Nivitron',
    rarity: 'legendary',
    unlockExchange: 0,
    shape: [
      { x: 24, y: 0 },
      { x: 15, y: 7 },
      { x: 10, y: 18 },
      { x: 4, y: 12 },
      { x: -1, y: 20 },
      { x: -7, y: 12 },
      { x: -12, y: 17 },
      { x: -16, y: 8 },
      { x: -22, y: 6 },
      { x: -15, y: 0 },
      { x: -22, y: -6 },
      { x: -16, y: -8 },
      { x: -12, y: -17 },
      { x: -7, y: -12 },
      { x: -1, y: -20 },
      { x: 4, y: -12 },
      { x: 10, y: -18 },
      { x: 15, y: -7 }
    ],
    bonuses: {
      fireRateMultiplier: 1.08,
      damageMultiplier: 1.06
    }
  }
];

export const SHIP_FRAME_BY_ID = Object.fromEntries(SHIP_FRAME_DEFINITIONS.map((frame) => [frame.id, frame])) as Record<
  ShipFrameId,
  ShipFrameDefinition
>;

export const normalizeShipFrameIds = (ids: unknown): ShipFrameId[] => {
  const validIds = Array.isArray(ids)
    ? ids.filter((id): id is ShipFrameId => typeof id === 'string' && id in SHIP_FRAME_BY_ID)
    : [];
  return Array.from(new Set(['vector', 'nivitron', ...validIds]));
};

export const getActiveShipFrame = (progression: ProgressionState): ShipFrameDefinition =>
  SHIP_FRAME_BY_ID[progression.activeShipFrameId] ?? SHIP_FRAME_BY_ID.vector;

export const getUnlockedShipFrameIdsForExchangeCount = (exchangeCount: number): ShipFrameId[] =>
  SHIP_FRAME_DEFINITIONS
    .filter((frame) => frame.unlockExchange <= exchangeCount)
    .sort((a, b) => a.unlockExchange - b.unlockExchange)
    .map((frame) => frame.id);

export const getNextShipFrameId = (previousProgression: ProgressionState, nextExchangeCount: number): ShipFrameId => {
  const currentUnlocked = normalizeShipFrameIds(previousProgression.unlockedShipFrameIds);
  const nextUnlocked = getUnlockedShipFrameIdsForExchangeCount(nextExchangeCount);
  const newlyUnlocked = nextUnlocked.find((id) => !currentUnlocked.includes(id));
  if (newlyUnlocked) {
    return newlyUnlocked;
  }

  const activeIndex = Math.max(0, nextUnlocked.indexOf(previousProgression.activeShipFrameId));
  return nextUnlocked[(activeIndex + 1) % Math.max(1, nextUnlocked.length)] ?? 'vector';
};

export const getShipFrameBonusMultiplier = (
  progression: ProgressionState,
  bonus: keyof ShipFrameDefinition['bonuses']
): number =>
  getActiveShipFrame(progression).bonuses[bonus] ?? 1;
