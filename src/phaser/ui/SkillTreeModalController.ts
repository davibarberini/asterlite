import {
  TALENT_BY_ID,
  TALENT_DEFINITIONS,
  TALENT_GRID_COLUMNS,
  TALENT_GRID_ROWS,
  canBuyTalentRank,
  getTalentNodeState,
  getTalentPointCost,
  getTalentRank,
  getTalentRankLabel
} from '../../game/progression/talentTree';
import type { LanguageCode } from '../../game/i18n';
import type { DroneType, ProgressionState, TalentId } from '../../game/simulation/types';

type SkillTreeRenderState = {
  progression: ProgressionState;
  language: LanguageCode;
  selectedTalentId: TalentId | null;
  onSelectTalent: (id: TalentId | null) => void;
  onBuyTalent: (id: TalentId) => void;
};

const talentCompactNodeWidth = 72;
const talentCompactNodeHeight = 72;
const droneLabels: Record<DroneType, string> = {
  sentry: 'Semi-Auto',
  ranger: 'Shotgun',
  breaker: 'Missile'
};

const talentPtBr: Partial<Record<TalentId, { name: string; summary: string }>> = {
  refineryYield: { name: 'Calibração do Núcleo', summary: '+10% de créditos offline por nível. Abre builds de impacto e velocidade.' },
  combatBounty: { name: 'Blindagem de Impacto', summary: '-10% de dano recebido.' },
  crystalSeam: { name: 'Capacitor de Onda', summary: '+25% de raio da onda de choque ao subir de nível.' },
  bulwarkProtocol: { name: 'Protocolo Bulwark', summary: '-28% de dano recebido e +35% de raio da onda, mas -12% de velocidade da nave.' },
  propulsionTuning: { name: 'Jatos de Impulso', summary: '+8% de propulsão e velocidade máxima da nave por nível.' },
  vectorNozzles: { name: 'Vetoração Rápida', summary: '+12% de velocidade da nave e -10% de intervalo de tiro da nave.' },
  afterburnerDoctrine: { name: 'Doutrina Afterburner', summary: '+28% de velocidade e -16% de intervalo de tiro, mas +18% de dano recebido.' },
  salvageLoop: { name: 'Ciclo de Salvamento', summary: '+25% de créditos offline.' },
  semiAutoOptics: { name: 'Óptica de Mira', summary: 'Desbloqueia o ramo semi-auto e adiciona +50 de alcance de mira.' },
  semiAutoRange: { name: 'Lente Longa', summary: '+40 de alcance para semi-auto por nível.' },
  semiAutoPierce: { name: 'Perfuração Linear', summary: '+1 perfuração de asteroide por nível. Semi-auto começa com 1 perfuração.' },
  semiAutoCadence: { name: 'Ritmo de Rajada', summary: '-10% de intervalo de tiro semi-auto por nível.' },
  semiAutoOverdrive: { name: 'Munição Overdrive', summary: '+2 de dano para tiros semi-auto.' },
  shotgunLoad: { name: 'Carga Pesada', summary: 'Desbloqueia o ramo shotgun e adiciona +1 de dano por projétil.' },
  shotgunChoke: { name: 'Estrangulador Fechado', summary: '+1 de dano por projétil shotgun por nível.' },
  shotgunSpread: { name: 'Dispersão Ampla', summary: '+1 projétil shotgun por nível.' },
  shotgunBarrage: { name: 'Ciclo de Barragem', summary: '-12% de intervalo de tiro shotgun.' },
  shotgunSlag: { name: 'Munição Incandescente', summary: '+2 de dano por projétil shotgun contra asteroides densos.' },
  missileGuidance: { name: 'Link de Guiagem', summary: 'Desbloqueia o ramo de mísseis e adiciona +20% de curva por nível.' },
  missileYield: { name: 'Alto Impacto', summary: '+1 de dano de míssil por nível.' },
  missileReload: { name: 'Recarga Rápida', summary: '-10% de intervalo de tiro de mísseis por nível.' },
  missileWarhead: { name: 'Ogiva Explosiva', summary: 'Mísseis explodem no impacto e causam dano em área.' },
  missileShrapnel: { name: 'Estilhaços', summary: '+18% de raio de explosão e +1 de dano em área por nível.' },
  missileChain: { name: 'Detonação em Cadeia', summary: 'Explosões de míssil causam +60% de dano em área.' }
};

const getTalentText = (id: TalentId, language: LanguageCode): { name: string; summary: string } => {
  const talent = TALENT_BY_ID[id];
  if (language === 'pt-BR') {
    return talentPtBr[id] ?? { name: talent.name, summary: talent.summary };
  }
  return { name: talent.name, summary: talent.summary };
};

const formatSkillPointCost = (language: LanguageCode, cost: number): string =>
  language === 'pt-BR'
    ? `${cost} ${cost === 1 ? 'ponto' : 'pontos'}`
    : `${cost} ${cost === 1 ? 'point' : 'points'}`;

const formatRankLabel = (language: LanguageCode, progression: ProgressionState, id: TalentId): string => {
  const rankLabel = getTalentRankLabel(progression, id);
  if (language !== 'pt-BR') {
    return rankLabel;
  }
  return rankLabel.replace('Rank', 'Nível').replace('Maxed', 'Máximo');
};

export class SkillTreeModalController {
  private board: HTMLElement | null = null;
  private tooltipLayer: HTMLElement | null = null;
  private selectedTalentId: TalentId | null = null;
  private readonly nodeById = new Map<TalentId, HTMLButtonElement>();

  render(state: SkillTreeRenderState): HTMLElement {
    this.nodeById.clear();
    this.selectedTalentId = state.selectedTalentId;
    const board = document.createElement('div');
    this.board = board;
    board.className = 'talent-tree-board talent-tree-board--compact';
    board.style.setProperty('--talent-grid-columns', TALENT_GRID_COLUMNS.toString());
    board.style.setProperty('--talent-grid-rows', TALENT_GRID_ROWS.toString());
    board.addEventListener('pointerdown', (event) => {
      if (!this.selectedTalentId || !(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest('.talent-node, .talent-tooltip')) {
        return;
      }

      state.onSelectTalent(null);
    });

    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lines.setAttribute('class', 'talent-tree-lines');
    lines.setAttribute('viewBox', `0 0 ${TALENT_GRID_COLUMNS * talentCompactNodeWidth} ${TALENT_GRID_ROWS * talentCompactNodeHeight}`);
    lines.setAttribute('preserveAspectRatio', 'none');
    this.appendTalentConnections(lines, state.progression);

    const grid = document.createElement('div');
    grid.className = 'talent-tree-grid talent-tree-grid--compact';
    TALENT_DEFINITIONS.forEach((talent) => {
      grid.append(this.createTalentNode(talent.id, state));
    });

    const tooltipLayer = document.createElement('div');
    tooltipLayer.className = 'talent-tooltip-layer';
    this.tooltipLayer = tooltipLayer;

    board.append(lines, grid, tooltipLayer);
    if (state.selectedTalentId) {
      tooltipLayer.append(this.createTalentTooltip(state.selectedTalentId, state));
    }

    return board;
  }

  selectTalent(state: SkillTreeRenderState): boolean {
    if (!this.board || !this.tooltipLayer) {
      return false;
    }

    const previousTalentId = this.selectedTalentId;
    this.selectedTalentId = state.selectedTalentId;
    this.setNodeSelected(previousTalentId, false);
    this.setNodeSelected(state.selectedTalentId, true);
    this.tooltipLayer.replaceChildren();
    if (state.selectedTalentId) {
      this.tooltipLayer.append(this.createTalentTooltip(state.selectedTalentId, state));
    }
    return true;
  }

  private setNodeSelected(id: TalentId | null, selected: boolean): void {
    if (!id) {
      return;
    }

    const node = this.nodeById.get(id);
    if (!node) {
      return;
    }

    node.classList.toggle('is-selected', selected);
    node.setAttribute('aria-pressed', selected.toString());
  }

  private appendTalentConnections(svg: SVGSVGElement, progression: ProgressionState): void {
    TALENT_DEFINITIONS.forEach((talent) => {
      talent.requires.forEach((requirement) => {
        const from = TALENT_BY_ID[requirement.id];
        const start = this.getTalentNodeCenter(from.grid.col, from.grid.row);
        const end = this.getTalentNodeCenter(talent.grid.col, talent.grid.row);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const unlocked =
          getTalentRank(progression, requirement.id) >= requirement.rank &&
          getTalentNodeState(progression, talent.id) !== 'locked';
        line.setAttribute('x1', start.x.toString());
        line.setAttribute('y1', start.y.toString());
        line.setAttribute('x2', end.x.toString());
        line.setAttribute('y2', end.y.toString());
        line.setAttribute('class', unlocked ? 'talent-tree-line is-unlocked' : 'talent-tree-line');
        svg.append(line);
      });
    });
  }

  private getTalentNodeCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - 0.5) * talentCompactNodeWidth,
      y: (row - 0.5) * talentCompactNodeHeight
    };
  }

  private createTalentNode(id: TalentId, state: SkillTreeRenderState): HTMLElement {
    const talent = TALENT_BY_ID[id];
    const rank = getTalentRank(state.progression, id);
    const nodeState = getTalentNodeState(state.progression, id);
    const text = getTalentText(id, state.language);

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `talent-node talent-node--compact talent-node--${talent.branch} talent-node--${talent.nodeType} is-${nodeState}`;
    node.classList.toggle('is-selected', state.selectedTalentId === id);
    node.style.gridColumn = `${talent.grid.col}`;
    node.style.gridRow = `${talent.grid.row}`;
    node.setAttribute('aria-label', `${text.name}. ${formatRankLabel(state.language, state.progression, id)}.`);
    node.setAttribute('aria-pressed', (state.selectedTalentId === id).toString());
    const toggleTalent = (): void => {
      state.onSelectTalent(this.selectedTalentId === id ? null : id);
    };
    let handledPointerSelection = false;
    node.addEventListener('pointerdown', (event) => {
      if (event.pointerType !== 'mouse') {
        event.preventDefault();
      }
    });
    node.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') {
        event.preventDefault();
        handledPointerSelection = true;
        toggleTalent();
      }
    });
    node.addEventListener('click', () => {
      if (handledPointerSelection) {
        handledPointerSelection = false;
        return;
      }
      toggleTalent();
    });

    const icon = document.createElement('span');
    icon.className = 'talent-node-icon';
    icon.append(this.createTalentIconSvg(id));

    const rankLabel = document.createElement('span');
    rankLabel.className = 'talent-node-rank';
    rankLabel.textContent = `${rank}/${talent.maxRank}`;

    const status = document.createElement('span');
    status.className = 'talent-node-dot';
    status.setAttribute('aria-hidden', 'true');

    node.append(icon, rankLabel, status);
    this.nodeById.set(id, node);
    return node;
  }

  private createTalentTooltip(id: TalentId, state: SkillTreeRenderState): HTMLElement {
    const talent = TALENT_BY_ID[id];
    const text = getTalentText(id, state.language);
    const rank = getTalentRank(state.progression, id);
    const nodeState = getTalentNodeState(state.progression, id);
    const nextCost = getTalentPointCost(id);
    const canBuy = canBuyTalentRank(state.progression, id);

    const panel = document.createElement('section');
    this.positionTalentTooltip(panel, talent.grid.col, talent.grid.row);
    panel.className = `talent-tooltip talent-tooltip--${talent.branch}`;

    const heading = document.createElement('div');
    heading.className = 'talent-tooltip__heading';
    const icon = document.createElement('span');
    icon.className = 'talent-tooltip__icon';
    icon.append(this.createTalentIconSvg(id));
    const titleWrap = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = text.name;
    const rankLabel = document.createElement('span');
    rankLabel.textContent = formatRankLabel(state.language, state.progression, id);
    titleWrap.append(title, rankLabel);
    heading.append(icon, titleWrap);

    const summary = document.createElement('p');
    summary.textContent = text.summary;

    const meta = document.createElement('div');
    meta.className = 'talent-tooltip__meta';
    if (nodeState === 'maxed') {
      meta.textContent = state.language === 'pt-BR' ? 'Máximo' : 'Maxed';
    } else if (talent.requiresDrone && state.progression.droneCounts[talent.requiresDrone] <= 0) {
      meta.textContent = state.language === 'pt-BR' ? `Precisa de ${droneLabels[talent.requiresDrone]}` : `Needs ${droneLabels[talent.requiresDrone]}`;
    } else if (nodeState === 'locked') {
      meta.textContent = state.language === 'pt-BR' ? 'Bloqueado' : 'Locked';
    } else if (!canBuy) {
      meta.textContent = state.language === 'pt-BR' ? 'Sem pontos disponíveis' : 'No points available';
    } else {
      meta.textContent = state.language === 'pt-BR' ? `Pronto · ${formatSkillPointCost(state.language, nextCost)}` : `Ready · ${formatSkillPointCost(state.language, nextCost)}`;
    }

    const buyButton = document.createElement('button');
    buyButton.className = 'shop-buy talent-tooltip__buy';
    buyButton.type = 'button';
    buyButton.disabled = !canBuy;
    buyButton.textContent = nodeState === 'maxed'
      ? (state.language === 'pt-BR' ? 'Máximo' : 'Maxed')
      : (state.language === 'pt-BR' ? `Comprar ${formatSkillPointCost(state.language, nextCost)}` : `Buy ${formatSkillPointCost(state.language, nextCost)}`);
    buyButton.addEventListener('click', () => state.onBuyTalent(id));

    panel.append(heading, summary, meta, buyButton);
    return panel;
  }

  private positionTalentTooltip(panel: HTMLElement, col: number, row: number): void {
    const nodeSize = 54;
    const gridGap = 10;
    const boardPadding = 10;
    const tooltipWidth = 188;
    const tooltipHeight = 150;
    const boardWidth = boardPadding * 2 + TALENT_GRID_COLUMNS * nodeSize + (TALENT_GRID_COLUMNS - 1) * gridGap;
    const boardHeight = boardPadding * 2 + TALENT_GRID_ROWS * nodeSize + (TALENT_GRID_ROWS - 1) * gridGap;
    const nodeLeft = boardPadding + (col - 1) * (nodeSize + gridGap);
    const nodeTop = boardPadding + (row - 1) * (nodeSize + gridGap);
    const nodeCenterX = nodeLeft + nodeSize / 2;
    const nodeCenterY = nodeTop + nodeSize / 2;
    const offset = 9;

    let placement: 'left' | 'right' | 'above' | 'below';
    let left = 0;
    let top = 0;

    if (col <= 2) {
      placement = 'right';
      left = nodeLeft + nodeSize + offset;
      top = nodeCenterY - tooltipHeight / 2;
    } else if (col >= 4) {
      placement = 'left';
      left = nodeLeft - tooltipWidth - offset;
      top = nodeCenterY - tooltipHeight / 2;
    } else if (row <= Math.ceil(TALENT_GRID_ROWS / 2)) {
      placement = 'below';
      left = nodeCenterX - tooltipWidth / 2;
      top = nodeTop + nodeSize + offset;
    } else {
      placement = 'above';
      left = nodeCenterX - tooltipWidth / 2;
      top = nodeTop - tooltipHeight - offset;
    }

    left = Math.max(boardPadding, Math.min(boardWidth - tooltipWidth - boardPadding, left));
    top = Math.max(boardPadding, Math.min(boardHeight - tooltipHeight - boardPadding, top));
    panel.dataset.placement = placement;
    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  }

  private createTalentIconSvg(id: TalentId): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
    use.setAttribute('href', `${import.meta.env.BASE_URL}skill-icons.svg#${this.getTalentIconId(id)}`);
    svg.append(use);
    return svg;
  }

  private getTalentIconId(id: TalentId): string {
    if (id.includes('refinery')) {
      return 'skill-refinery';
    }
    if (id.includes('combatBounty') || id.includes('bulwark')) {
      return 'skill-bounty';
    }
    if (id.includes('crystal')) {
      return 'skill-crystal';
    }
    if (id.includes('propulsion') || id.includes('Nozzles') || id.includes('afterburner')) {
      return 'skill-generic';
    }
    if (id.includes('salvage')) {
      return 'skill-salvage';
    }
    if (id.includes('semiAuto')) {
      return 'skill-targeting';
    }
    if (id.includes('shotgun')) {
      return 'skill-shotgun';
    }
    if (id.includes('missile')) {
      return 'skill-missile';
    }
    return 'skill-generic';
  }
}
