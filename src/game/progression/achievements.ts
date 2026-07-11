import type { AchievementStats, AchievementId, ProgressionState } from '../simulation/types';

export type AchievementBonusCategory =
  | 'money'
  | 'damage'
  | 'speed'
  | 'maxHp'
  | 'passive'
  | 'crystals'
  | 'armor'
  | 'droneDamage';

export type { AchievementId };

export type AchievementDefinition = {
  id: AchievementId;
  name: string;
  description: string;
  icon: string;
  bonusCategory: AchievementBonusCategory;
  bonusPercent: number;
  getProgress: (progression: ProgressionState, stats: AchievementStats) => { current: number; target: number };
};

export const ACHIEVEMENT_BONUS_LABELS: Record<AchievementBonusCategory, string> = {
  money: 'credits',
  damage: 'dano',
  speed: 'velocidade',
  maxHp: 'HP máximo',
  passive: 'offline',
  crystals: 'cristais',
  armor: 'armadura',
  droneDamage: 'dano de drones'
};

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'firstBlood',
    name: 'Primeiro Fragmento',
    description: 'Destrua seu primeiro asteroide.',
    icon: '☄',
    bonusCategory: 'damage',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.asteroidsDestroyed, target: 1 })
  },
  {
    id: 'rockBreaker',
    name: 'Quebra-Rochas',
    description: 'Destrua 50 asteroides.',
    icon: '☄',
    bonusCategory: 'damage',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.asteroidsDestroyed, target: 50 })
  },
  {
    id: 'beltPatrol',
    name: 'Patrulha do Cinturão',
    description: 'Destrua 250 asteroides.',
    icon: '☄',
    bonusCategory: 'damage',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.asteroidsDestroyed, target: 250 })
  },
  {
    id: 'fieldSweeper',
    name: 'Varredor de Campo',
    description: 'Destrua 1.000 asteroides.',
    icon: '☄',
    bonusCategory: 'damage',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.asteroidsDestroyed, target: 1000 })
  },
  {
    id: 'annihilator',
    name: 'Aniquilador',
    description: 'Destrua 5.000 asteroides.',
    icon: '☄',
    bonusCategory: 'damage',
    bonusPercent: 1.5,
    getProgress: (_p, stats) => ({ current: stats.asteroidsDestroyed, target: 5000 })
  },
  {
    id: 'pocketChange',
    name: 'Troco de Bolso',
    description: 'Ganhe $500 em créditos no total.',
    icon: '$',
    bonusCategory: 'money',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.moneyEarned, target: 500 })
  },
  {
    id: 'steadyIncome',
    name: 'Renda Estável',
    description: 'Ganhe $5.000 em créditos no total.',
    icon: '$',
    bonusCategory: 'money',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.moneyEarned, target: 5000 })
  },
  {
    id: 'creditBaron',
    name: 'Barão de Créditos',
    description: 'Ganhe $25.000 em créditos no total.',
    icon: '$',
    bonusCategory: 'money',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.moneyEarned, target: 25000 })
  },
  {
    id: 'sectorTycoon',
    name: 'Magnata do Setor',
    description: 'Ganhe $100.000 em créditos no total.',
    icon: '$',
    bonusCategory: 'money',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.moneyEarned, target: 100000 })
  },
  {
    id: 'galacticMint',
    name: 'Casa da Moeda Galáctica',
    description: 'Ganhe $500.000 em créditos no total.',
    icon: '$',
    bonusCategory: 'money',
    bonusPercent: 1.5,
    getProgress: (_p, stats) => ({ current: stats.moneyEarned, target: 500000 })
  },
  {
    id: 'crystalTouch',
    name: 'Toque de Cristal',
    description: 'Colete 1 cristal.',
    icon: '◆',
    bonusCategory: 'crystals',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.crystalsCollected, target: 1 })
  },
  {
    id: 'seamProspector',
    name: 'Prospector de Veios',
    description: 'Colete 25 cristais.',
    icon: '◆',
    bonusCategory: 'crystals',
    bonusPercent: 0.5,
    getProgress: (_p, stats) => ({ current: stats.crystalsCollected, target: 25 })
  },
  {
    id: 'crystalRunner',
    name: 'Corredor de Cristais',
    description: 'Colete 100 cristais.',
    icon: '◆',
    bonusCategory: 'crystals',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.crystalsCollected, target: 100 })
  },
  {
    id: 'shardMagnate',
    name: 'Magnata de Fragmentos',
    description: 'Colete 500 cristais.',
    icon: '◆',
    bonusCategory: 'crystals',
    bonusPercent: 1.5,
    getProgress: (_p, stats) => ({ current: stats.crystalsCollected, target: 500 })
  },
  {
    id: 'refineryBoot',
    name: 'Relé Online',
    description: 'Compre o nível 1 de ganho offline.',
    icon: 'R',
    bonusCategory: 'passive',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.passiveIncomeLevel, target: 1 })
  },
  {
    id: 'oreFlow',
    name: 'Fluxo Offline',
    description: 'Alcance nível 5 de ganho offline.',
    icon: 'R',
    bonusCategory: 'passive',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.passiveIncomeLevel, target: 5 })
  },
  {
    id: 'megaFoundry',
    name: 'Banco Orbital',
    description: 'Alcance nível 15 de ganho offline.',
    icon: 'R',
    bonusCategory: 'passive',
    bonusPercent: 1,
    getProgress: (p) => ({ current: p.passiveIncomeLevel, target: 15 })
  },
  {
    id: 'titanSmelter',
    name: 'Rede Autônoma',
    description: 'Alcance nível 30 de ganho offline.',
    icon: 'R',
    bonusCategory: 'passive',
    bonusPercent: 1.5,
    getProgress: (p) => ({ current: p.passiveIncomeLevel, target: 30 })
  },
  {
    id: 'hullPatch',
    name: 'Remendo de Casco',
    description: 'Alcance 150 HP máximo.',
    icon: 'H',
    bonusCategory: 'maxHp',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.maxHp, target: 150 })
  },
  {
    id: 'reinforcedFrame',
    name: 'Estrutura Reforçada',
    description: 'Alcance 250 HP máximo.',
    icon: 'H',
    bonusCategory: 'maxHp',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.maxHp, target: 250 })
  },
  {
    id: 'dreadnought',
    name: 'Casco Dreadnought',
    description: 'Alcance 400 HP máximo.',
    icon: 'H',
    bonusCategory: 'maxHp',
    bonusPercent: 1,
    getProgress: (p) => ({ current: p.maxHp, target: 400 })
  },
  {
    id: 'lightPlating',
    name: 'Blindagem Leve',
    description: 'Alcance 5 de armadura.',
    icon: 'A',
    bonusCategory: 'armor',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.armor, target: 5 })
  },
  {
    id: 'ablativeShell',
    name: 'Casco Ablativo',
    description: 'Alcance 20 de armadura.',
    icon: 'A',
    bonusCategory: 'armor',
    bonusPercent: 1,
    getProgress: (p) => ({ current: p.armor, target: 20 })
  },
  {
    id: 'hotRod',
    name: 'Hot Rod',
    description: 'Alcance nível 3 de velocidade.',
    icon: 'S',
    bonusCategory: 'speed',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.shipSpeedLevel, target: 3 })
  },
  {
    id: 'afterburner',
    name: 'Pós-Combustão',
    description: 'Alcance nível 8 de velocidade.',
    icon: 'S',
    bonusCategory: 'speed',
    bonusPercent: 1,
    getProgress: (p) => ({ current: p.shipSpeedLevel, target: 8 })
  },
  {
    id: 'wingLead',
    name: 'Líder de Esquadrão',
    description: 'Compre seu primeiro drone.',
    icon: 'D',
    bonusCategory: 'droneDamage',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.dronesPurchased, target: 1 })
  },
  {
    id: 'swarmOps',
    name: 'Operações Enxame',
    description: 'Comande 9 drones.',
    icon: 'D',
    bonusCategory: 'droneDamage',
    bonusPercent: 1,
    getProgress: (p) => ({ current: p.dronesPurchased, target: 9 })
  },
  {
    id: 'droneArmada',
    name: 'Armada de Drones',
    description: 'Comande 24 drones.',
    icon: 'D',
    bonusCategory: 'droneDamage',
    bonusPercent: 1.5,
    getProgress: (p) => ({ current: p.dronesPurchased, target: 24 })
  },
  {
    id: 'deepScan',
    name: 'Varredura Profunda',
    description: 'Compre o nível 1 do scanner de viagem.',
    icon: 'N',
    bonusCategory: 'money',
    bonusPercent: 0.5,
    getProgress: (p) => ({ current: p.travelLevel, target: 1 })
  },
  {
    id: 'warpVeteran',
    name: 'Veterano do Warp',
    description: 'Complete 1 reset warp.',
    icon: 'W',
    bonusCategory: 'money',
    bonusPercent: 1,
    getProgress: (_p, stats) => ({ current: stats.prestigeWarps, target: 1 })
  }
];

export const createAchievementStats = (): AchievementStats => ({
  asteroidsDestroyed: 0,
  moneyEarned: 0,
  crystalsCollected: 0,
  saucersDestroyed: 0,
  deaths: 0,
  prestigeWarps: 0
});

export const createUnlockedAchievements = (): Record<AchievementId, boolean> =>
  Object.fromEntries(ACHIEVEMENT_DEFINITIONS.map((def) => [def.id, false])) as Record<AchievementId, boolean>;

export const isAchievementUnlocked = (progression: ProgressionState, id: AchievementId): boolean =>
  progression.unlockedAchievements[id] === true;

export const isAchievementComplete = (def: AchievementDefinition, progression: ProgressionState): boolean => {
  const { current, target } = def.getProgress(progression, progression.achievementStats);
  return current >= target;
};

export const getAchievementProgressRatio = (def: AchievementDefinition, progression: ProgressionState): number => {
  const { current, target } = def.getProgress(progression, progression.achievementStats);
  if (target <= 0) {
    return 1;
  }
  return Math.max(0, Math.min(1, current / target));
};

export const countUnlockedAchievements = (progression: ProgressionState): number =>
  ACHIEVEMENT_DEFINITIONS.filter((def) => isAchievementUnlocked(progression, def.id)).length;

export const getAchievementBonusPercent = (progression: ProgressionState, category: AchievementBonusCategory): number =>
  ACHIEVEMENT_DEFINITIONS.reduce((total, def) => {
    if (def.bonusCategory !== category || !isAchievementUnlocked(progression, def.id)) {
      return total;
    }
    return total + def.bonusPercent;
  }, 0);

export const getAchievementMultiplier = (progression: ProgressionState, category: AchievementBonusCategory): number =>
  1 + getAchievementBonusPercent(progression, category) / 100;

export const getEffectiveMaxHp = (progression: ProgressionState): number =>
  Math.round(progression.maxHp * getAchievementMultiplier(progression, 'maxHp'));

export const recordMoneyEarned = (progression: ProgressionState, amount: number): void => {
  if (amount > 0) {
    progression.achievementStats.moneyEarned += amount;
  }
};

export const recordCrystalsCollected = (progression: ProgressionState, amount: number): void => {
  if (amount > 0) {
    progression.achievementStats.crystalsCollected += amount;
  }
};

export const syncAchievements = (progression: ProgressionState, onUnlock?: (def: AchievementDefinition) => void): void => {
  ACHIEVEMENT_DEFINITIONS.forEach((def) => {
    if (isAchievementUnlocked(progression, def.id)) {
      return;
    }
    if (isAchievementComplete(def, progression)) {
      progression.unlockedAchievements[def.id] = true;
      onUnlock?.(def);
    }
  });
};

export const formatAchievementProgress = (def: AchievementDefinition, progression: ProgressionState): string => {
  const { current, target } = def.getProgress(progression, progression.achievementStats);
  return `${Math.min(current, target).toLocaleString('en-US')} / ${target.toLocaleString('en-US')}`;
};

export const getTotalAchievementBonusSummary = (progression: ProgressionState): string => {
  const categories = Object.keys(ACHIEVEMENT_BONUS_LABELS) as AchievementBonusCategory[];
  const parts = categories
    .map((category) => {
      const percent = getAchievementBonusPercent(progression, category);
      return percent > 0 ? `+${percent.toFixed(1)}% ${ACHIEVEMENT_BONUS_LABELS[category]}` : null;
    })
    .filter((part): part is string => part !== null);

  return parts.length > 0 ? parts.join(' · ') : 'Nenhum bônus ainda';
};
