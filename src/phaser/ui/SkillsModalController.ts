import { getCrystalBalance, getTalentRespecCost } from '../../game/progression/currency';
import { getAvailableShipSkillPoints, getMaxShipLevel, getShipXpForNextLevel } from '../../game/progression/shipLevel';
import {
  countUnlockedTalentRanks,
  getOfflineIncomeTalentMultiplier,
  getSemiAutoPierceLeft
} from '../../game/progression/talentTree';
import { formatCompactNumber } from '../../game/numberFormat';
import { translate, type LanguageCode } from '../../game/i18n';
import type { GameState, TalentId } from '../../game/simulation/types';
import { SkillTreeModalController } from './SkillTreeModalController';
import type { TutorialTargetId } from './TutorialGuideController';

type SkillsShopAction = {
  label: string;
  disabled: boolean;
  onClick: () => boolean | void;
  icon?: string;
  title?: string;
  meta?: string;
  tutorialTarget?: TutorialTargetId;
};

export type SkillsShopContent = {
  kicker: string;
  title: string;
  copy: string;
  stats: [string, string][];
  actions: SkillsShopAction[];
};

type SkillTreeModalElements = {
  modalEl: HTMLElement;
  panelEl: HTMLElement;
  kickerEl: HTMLElement;
  titleEl: HTMLElement;
  copyEl: HTMLElement;
  bodyEl: HTMLElement;
};

type SkillTreeModalOptions = {
  elements: SkillTreeModalElements;
  state: GameState;
  language: LanguageCode;
  onBuyTalent: (id: TalentId) => void;
};

const modalPanelClasses = [
  'ui-modal__panel--warp',
  'ui-modal__panel--map',
  'ui-modal__panel--settings',
  'ui-modal__panel--nova-crown'
];

export class SkillsModalController {
  private readonly tree = new SkillTreeModalController();
  private selectedTalentId: TalentId | null = null;

  createShopContent(options: {
    state: GameState;
    language: LanguageCode;
    onOpenTree: () => void;
    onRespec: () => void;
  }): SkillsShopContent {
    const talentCount = countUnlockedTalentRanks(options.state.progression);
    const availablePoints = getAvailableShipSkillPoints(options.state.progression);
    const spentPoints = Math.max(0, Math.floor(options.state.progression.spentShipSkillPoints));
    const maxLevel = getMaxShipLevel(options.state.progression);
    const respecCost = getTalentRespecCost(options.state);
    const atMaxLevel = options.state.progression.shipLevel >= maxLevel;
    const nextLevelXp = atMaxLevel
      ? 'MAX'
      : `${Math.floor(options.state.progression.shipXp)}/${getShipXpForNextLevel(options.state.progression.shipLevel)}`;

    return {
      kicker: translate(options.language, 'nav.skills'),
      title: translate(options.language, 'shop.skillsTitle'),
      copy: translate(options.language, 'shop.skillsCopy'),
      stats: [
        [options.language === 'pt-BR' ? 'Nível' : 'Level', `${options.state.progression.shipLevel}/${maxLevel}`],
        ['XP', nextLevelXp],
        [options.language === 'pt-BR' ? 'Pontos' : 'Points', availablePoints.toString()],
        [options.language === 'pt-BR' ? 'Gastos' : 'Spent', spentPoints.toString()],
        [translate(options.language, 'shop.skillsStatTalents'), `${talentCount}/${options.state.progression.shipSkillPoints}`],
        [translate(options.language, 'shop.skillsStatSemiPierce'), getSemiAutoPierceLeft(options.state.progression).toString()],
        [translate(options.language, 'shop.skillsStatRefinery'), `x${getOfflineIncomeTalentMultiplier(options.state.progression).toFixed(2)}`]
      ],
      actions: [
        {
          icon: 'TREE',
          title: translate(options.language, 'shop.skillsActionTitle'),
          meta: translate(options.language, 'shop.skillsActionMeta', { count: talentCount }),
          label: translate(options.language, 'shop.skillsActionLabel'),
          disabled: false,
          tutorialTarget: 'skill-tree-open',
          onClick: options.onOpenTree
        },
        {
          icon: '↺',
          title: translate(options.language, 'shop.skillsRespecTitle'),
          meta: translate(options.language, 'shop.skillsRespecMeta'),
          label: translate(options.language, 'shop.skillsRespecLabel', { cost: formatCompactNumber(respecCost) }),
          disabled: respecCost <= 0 || getCrystalBalance(options.state) < respecCost,
          onClick: options.onRespec
        }
      ]
    };
  }

  clearSelection(): void {
    this.selectedTalentId = null;
  }

  renderTreeModal(options: SkillTreeModalOptions): void {
    const availablePoints = getAvailableShipSkillPoints(options.state.progression);
    options.elements.modalEl.classList.remove('is-hidden');
    options.elements.modalEl.setAttribute('aria-hidden', 'false');
    options.elements.panelEl.classList.remove(...modalPanelClasses);
    options.elements.panelEl.classList.add('ui-modal__panel--skills');
    options.elements.kickerEl.textContent = translate(options.language, 'nav.skills');
    options.elements.titleEl.textContent = translate(options.language, 'shop.skillsActionTitle');
    options.elements.copyEl.textContent = options.language === 'pt-BR'
      ? `${availablePoints} pontos disponíveis · nível ${options.state.progression.shipLevel} · ${countUnlockedTalentRanks(options.state.progression)} ${translate(options.language, 'unit.ranks')}`
      : `${availablePoints} points available · level ${options.state.progression.shipLevel} · ${countUnlockedTalentRanks(options.state.progression)} ${translate(options.language, 'unit.ranks')}`;
    options.elements.copyEl.classList.remove('is-hidden');

    options.elements.bodyEl.replaceChildren(this.tree.render({
      progression: options.state.progression,
      language: options.language,
      selectedTalentId: this.selectedTalentId,
      onSelectTalent: (id) => this.selectTalent(id, options),
      onBuyTalent: options.onBuyTalent
    }));
  }

  private selectTalent(id: TalentId | null, options: SkillTreeModalOptions): void {
    this.selectedTalentId = id;
    const updated = this.tree.selectTalent({
      progression: options.state.progression,
      language: options.language,
      selectedTalentId: this.selectedTalentId,
      onSelectTalent: (nextId) => this.selectTalent(nextId, options),
      onBuyTalent: options.onBuyTalent
    });

    if (!updated) {
      this.renderTreeModal(options);
    }
  }
}
