import {
  WARP_UNLOCK_BY_ID,
  WARP_UNLOCK_DEFINITIONS,
  WARP_UNLOCK_GRID_COLUMNS,
  WARP_UNLOCK_GRID_ROWS,
  getAvailableWarpCores,
  getWarpUnlockNodeState,
  type WarpUnlockNodeState
} from '../../game/progression/warpUnlocks';
import type { LanguageCode } from '../../game/i18n';
import type { ProgressionState, WarpUnlockId } from '../../game/simulation/types';

type WarpCoreTreeRenderState = {
  progression: ProgressionState;
  language: LanguageCode;
  selectedUnlockId: WarpUnlockId | null;
  onSelectUnlock: (id: WarpUnlockId | null) => void;
  onBuyUnlock: (id: WarpUnlockId) => void;
};

const nodeWidth = 72;
const nodeHeight = 72;
const stateLabels: Record<WarpUnlockNodeState, string> = {
  owned: 'Owned',
  available: 'Available',
  locked: 'Locked',
  unaffordable: 'Needs cores'
};

const stateLabelsPtBr: Record<WarpUnlockNodeState, string> = {
  owned: 'Instalada',
  available: 'Disponível',
  locked: 'Bloqueada',
  unaffordable: 'Faltam núcleos'
};

const unlockPtBr: Record<WarpUnlockId, { title: string; summary: string; effect: string; impact: string }> = {
  launchLoadout: {
    title: 'Preparação de Lançamento',
    summary: 'Escolha um card temporário no início de cada nova run.',
    effect: 'Cada nova run começa com uma escolha de card.',
    impact: 'Novas runs: uma escolha normal antes do combate.'
  },
  expandedDraft: {
    title: 'Escolha Ampliada',
    summary: 'Mais opções, preservando as raridades e restrições de cada nave.',
    effect: 'Escolha um entre quatro cards em vez de três.',
    impact: 'Novas ofertas de nível, boss e preparação de lançamento.'
  },
  droneSystems: {
    title: 'Sistemas de Drones',
    summary: 'Adiciona drones sentinela ao conjunto de cards da run.',
    effect: 'Libera o card Sentry Wing.',
    impact: 'Cards: Sentry Wing recruta um drone sentinela temporário.'
  },
  deflectorFrame: {
    title: 'Estrutura Defletora',
    summary: 'Instala uma frente reforçada para sobreviver melhor ao atravessar detritos.',
    effect: 'Libera a melhoria de defletor da nave.',
    impact: 'Sistemas da nave: ativa o defletor direcional.'
  },
  shieldBubble: {
    title: 'Bolha de Escudo',
    summary: 'Instala um escudo circular recarregável ao redor da nave.',
    effect: 'Absorve um impacto antes de entrar em recarga.',
    impact: 'Sistemas da nave: adiciona um escudo recarregável contra impactos.'
  },
  bossBeacon: {
    title: 'Sinalizador de Boss',
    summary: 'Adiciona uma forma ativa de chamar o próximo boss de portal.',
    effect: 'Libera o botão de invocar boss em Technologies.',
    impact: 'Painel Technologies: adiciona invocação manual de boss.'
  },
  bossSuppression: {
    title: 'Supressão de Boss',
    summary: 'Desvia parte do tráfego de asteroides enquanto um boss está ativo.',
    effect: 'Reduz a densidade de asteroides durante lutas contra boss.',
    impact: 'Encontros de boss: menos asteroides permanecem na arena.'
  },
  rangerHangar: {
    title: 'Hangar Ranger',
    summary: 'Adiciona drones shotgun ao conjunto de cards da run.',
    effect: 'Libera o card Ranger Wing.',
    impact: 'Cards: Ranger Wing recruta um drone shotgun temporário.'
  },
  missileFoundry: {
    title: 'Fundição de Mísseis',
    summary: 'Adiciona drones de mísseis ao conjunto de cards da run.',
    effect: 'Libera o card Breaker Wing.',
    impact: 'Cards: Breaker Wing recruta um drone de mísseis temporário.'
  }
};

const getStateLabel = (language: LanguageCode, state: WarpUnlockNodeState): string =>
  language === 'pt-BR' ? stateLabelsPtBr[state] : stateLabels[state];

const getUnlockText = (language: LanguageCode, id: WarpUnlockId): { title: string; summary: string; effect: string; impact: string } => {
  const unlock = WARP_UNLOCK_BY_ID[id];
  if (language === 'pt-BR') {
    return unlockPtBr[id];
  }
  return { title: unlock.title, summary: unlock.summary, effect: unlock.effectSummary, impact: unlock.impactDetail };
};

const formatCoreCost = (language: LanguageCode, count: number): string => {
  if (language === 'pt-BR') {
    return `${count} ${count === 1 ? 'núcleo' : 'núcleos'}`;
  }
  return `${count} core${count === 1 ? '' : 's'}`;
};

export class WarpCoreTreeController {
  render(state: WarpCoreTreeRenderState): HTMLElement {
    const board = document.createElement('div');
    board.className = 'talent-tree-board talent-tree-board--compact warp-tree-board';
    board.style.setProperty('--talent-grid-columns', WARP_UNLOCK_GRID_COLUMNS.toString());
    board.style.setProperty('--talent-grid-rows', WARP_UNLOCK_GRID_ROWS.toString());
    board.addEventListener('pointerdown', (event) => {
      if (!state.selectedUnlockId || !(event.target instanceof Element)) {
        return;
      }

      if (event.target.closest('.warp-node, .warp-tooltip')) {
        return;
      }

      state.onSelectUnlock(null);
    });

    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lines.setAttribute('class', 'talent-tree-lines warp-tree-lines');
    lines.setAttribute('viewBox', `0 0 ${WARP_UNLOCK_GRID_COLUMNS * nodeWidth} ${WARP_UNLOCK_GRID_ROWS * nodeHeight}`);
    lines.setAttribute('preserveAspectRatio', 'none');
    this.appendConnections(lines, state.progression);

    const grid = document.createElement('div');
    grid.className = 'talent-tree-grid talent-tree-grid--compact warp-tree-grid';
    WARP_UNLOCK_DEFINITIONS.forEach((unlock) => {
      grid.append(this.createNode(unlock.id, state));
    });

    const tooltipLayer = document.createElement('div');
    tooltipLayer.className = 'talent-tooltip-layer warp-tooltip-layer';
    if (state.selectedUnlockId) {
      tooltipLayer.append(this.createTooltip(state.selectedUnlockId, state));
    }

    board.append(lines, grid, tooltipLayer);
    return board;
  }

  private appendConnections(svg: SVGSVGElement, progression: ProgressionState): void {
    WARP_UNLOCK_DEFINITIONS.forEach((unlock) => {
      unlock.requires.forEach((requiredId) => {
        const from = WARP_UNLOCK_BY_ID[requiredId];
        const start = this.getNodeCenter(from.route.col, from.route.row);
        const end = this.getNodeCenter(unlock.route.col, unlock.route.row);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const unlocked = progression.ownedWarpUnlockIds.includes(requiredId);
        line.setAttribute('x1', start.x.toString());
        line.setAttribute('y1', start.y.toString());
        line.setAttribute('x2', end.x.toString());
        line.setAttribute('y2', end.y.toString());
        line.setAttribute('class', unlocked ? 'talent-tree-line warp-tree-line is-unlocked' : 'talent-tree-line warp-tree-line');
        svg.append(line);
      });
    });
  }

  private getNodeCenter(col: number, row: number): { x: number; y: number } {
    return {
      x: (col - 0.5) * nodeWidth,
      y: (row - 0.5) * nodeHeight
    };
  }

  private createNode(id: WarpUnlockId, state: WarpCoreTreeRenderState): HTMLElement {
    const unlock = WARP_UNLOCK_BY_ID[id];
    const text = getUnlockText(state.language, id);
    const nodeState = getWarpUnlockNodeState(state.progression, getAvailableWarpCores(state.progression), id);
    const selected = state.selectedUnlockId === id;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `talent-node talent-node--compact warp-node warp-node--${unlock.impactTarget} is-${nodeState}`;
    node.classList.toggle('is-selected', selected);
    node.style.gridColumn = `${unlock.route.col}`;
    node.style.gridRow = `${unlock.route.row}`;
    node.setAttribute('aria-label', `${text.title}. ${getStateLabel(state.language, nodeState)}.`);
    node.setAttribute('aria-pressed', selected.toString());
    node.addEventListener('click', () => state.onSelectUnlock(selected ? null : id));

    const icon = document.createElement('span');
    icon.className = 'talent-node-icon warp-node-icon';
    icon.append(this.createTechnologyIcon(id));

    const cost = document.createElement('span');
    cost.className = 'talent-node-rank warp-node-cost';
    cost.textContent = nodeState === 'owned' ? 'ON' : `${unlock.cost}C`;

    const status = document.createElement('span');
    status.className = 'talent-node-dot warp-node-dot';
    status.setAttribute('aria-hidden', 'true');

    node.append(icon, cost, status);
    return node;
  }

  private createTooltip(id: WarpUnlockId, state: WarpCoreTreeRenderState): HTMLElement {
    const unlock = WARP_UNLOCK_BY_ID[id];
    const text = getUnlockText(state.language, id);
    const availableCores = getAvailableWarpCores(state.progression);
    const nodeState = getWarpUnlockNodeState(state.progression, availableCores, id);
    const missingRequirements = unlock.requires.filter((requiredId) => !state.progression.ownedWarpUnlockIds.includes(requiredId));
    const hasRequirements = unlock.requires.length > 0;
    const requirementText = missingRequirements.length > 0
      ? missingRequirements.map((requiredId) => getUnlockText(state.language, requiredId).title).join(', ')
      : (hasRequirements
        ? (state.language === 'pt-BR' ? 'Pré-requisitos instalados' : 'Requirements installed')
        : (state.language === 'pt-BR' ? 'Nenhum' : 'None'));
    const requirementLabel = missingRequirements.length > 0
      ? (state.language === 'pt-BR' ? 'Falta' : 'Missing')
      : (state.language === 'pt-BR' ? 'Requisito' : 'Requirement');

    const panel = document.createElement('section');
    this.positionTooltip(panel, unlock.route.col, unlock.route.row);
    panel.className = `talent-tooltip warp-tooltip is-${nodeState}`;

    const heading = document.createElement('div');
    heading.className = 'talent-tooltip__heading';
    const icon = document.createElement('span');
    icon.className = 'talent-tooltip__icon warp-tooltip__icon';
    icon.append(this.createTechnologyIcon(id));
    const titleWrap = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = text.title;
    const stateLabel = document.createElement('span');
    stateLabel.textContent = getStateLabel(state.language, nodeState);
    titleWrap.append(title, stateLabel);
    heading.append(icon, titleWrap);

    const summary = document.createElement('p');
    summary.textContent = text.summary;

    const meta = document.createElement('div');
    meta.className = 'talent-tooltip__meta warp-tooltip__meta';
    meta.textContent = state.language === 'pt-BR'
      ? `Custo ${formatCoreCost(state.language, unlock.cost)} · ${requirementLabel} ${requirementText}`
      : `Cost ${formatCoreCost(state.language, unlock.cost)} · ${requirementLabel} ${requirementText}`;

    const balance = document.createElement('div');
    balance.className = 'talent-tooltip__meta warp-tooltip__meta';
    balance.textContent = state.language === 'pt-BR'
      ? `Disponíveis ${availableCores} · Guardados ${state.progression.prestigeCores}`
      : `Available ${availableCores} · Banked ${state.progression.prestigeCores}`;

    const effect = document.createElement('div');
    effect.className = 'talent-tooltip__meta warp-tooltip__meta';
    effect.textContent = text.effect;

    const impact = document.createElement('div');
    impact.className = 'talent-tooltip__impact warp-tooltip__impact';
    impact.textContent = text.impact;

    const buyButton = document.createElement('button');
    buyButton.className = 'shop-buy talent-tooltip__buy warp-tooltip__buy';
    buyButton.type = 'button';
    buyButton.disabled = nodeState !== 'available';
    buyButton.textContent = this.getActionLabel(state.language, nodeState, unlock.cost);
    buyButton.addEventListener('click', (event) => {
      event.stopPropagation();
      state.onBuyUnlock(id);
    });

    panel.append(heading, summary, impact, effect, meta, balance, buyButton);
    return panel;
  }

  private getActionLabel(language: LanguageCode, nodeState: WarpUnlockNodeState, cost: number): string {
    if (language === 'pt-BR') {
      if (nodeState === 'owned') {
        return 'Instalada';
      }

      if (nodeState === 'locked') {
        return 'Rota bloqueada';
      }

      if (nodeState === 'unaffordable') {
        return `Faltam ${formatCoreCost(language, cost)}`;
      }

      return `Instalar ${formatCoreCost(language, cost)}`;
    }

    if (nodeState === 'owned') {
      return 'Installed';
    }

    if (nodeState === 'locked') {
      return 'Route locked';
    }

    if (nodeState === 'unaffordable') {
      return `Needs ${formatCoreCost(language, cost)}`;
    }

    return `Install ${formatCoreCost(language, cost)}`;
  }

  private createTechnologyIcon(id: WarpUnlockId): Element {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 48 48');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('technology-icon', `technology-icon--${id}`);

    const make = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string>): SVGElementTagNameMap[K] => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
      return el;
    };

    if (id === 'droneSystems') {
      svg.append(
        make('path', { d: 'M24 8 L34 24 L24 40 L14 24 Z', class: 'technology-icon__shell' }),
        make('circle', { cx: '24', cy: '24', r: '5', class: 'technology-icon__core' }),
        make('path', { d: 'M8 24 H15 M33 24 H40 M24 4 V11 M24 37 V44', class: 'technology-icon__line' })
      );
      return svg;
    }

    if (id === 'bossBeacon' || id === 'bossSuppression') {
      svg.append(
        make('circle', { cx: '24', cy: '24', r: '8', class: 'technology-icon__core' }),
        make('path', { d: 'M24 6 V12 M24 36 V42 M6 24 H12 M36 24 H42 M12 12 L16 16 M36 12 L32 16 M12 36 L16 32 M36 36 L32 32', class: 'technology-icon__line' }),
        make('path', { d: 'M18 24 C20 18 28 18 30 24 C28 30 20 30 18 24 Z', class: 'technology-icon__shell' })
      );
      return svg;
    }

    if (id === 'deflectorFrame') {
      svg.append(
        make('path', { d: 'M11 24 C16 10 32 10 37 24 C32 38 16 38 11 24 Z', class: 'technology-icon__shell' }),
        make('path', { d: 'M18 24 H38 M30 17 L38 24 L30 31', class: 'technology-icon__line' })
      );
      return svg;
    }

    if (id === 'shieldBubble') {
      svg.append(
        make('circle', { cx: '24', cy: '24', r: '17', class: 'technology-icon__shell' }),
        make('path', { d: 'M24 13 L32 19 V27 C32 33 28 37 24 39 C20 37 16 33 16 27 V19 Z', class: 'technology-icon__core' })
      );
      return svg;
    }

    if (id === 'rangerHangar') {
      svg.append(
        make('path', { d: 'M10 16 H38 L42 34 H6 Z', class: 'technology-icon__shell' }),
        make('path', { d: 'M14 34 V23 H34 V34 M18 27 H30 M24 23 V34', class: 'technology-icon__line' })
      );
      return svg;
    }

    if (id === 'missileFoundry') {
      svg.append(
        make('path', { d: 'M24 6 C31 13 34 22 33 32 C30 39 18 39 15 32 C14 22 17 13 24 6 Z', class: 'technology-icon__shell' }),
        make('path', { d: 'M19 33 L14 43 M29 33 L34 43 M20 22 H28', class: 'technology-icon__line' })
      );
      return svg;
    }

    svg.append(
      make('path', { d: 'M9 27 H30 L39 18 M31 17 H39 V25', class: 'technology-icon__line' }),
      make('path', { d: 'M9 33 H24 M9 21 H20', class: 'technology-icon__line' }),
      make('circle', { cx: '12', cy: '27', r: '4', class: 'technology-icon__core' })
    );
    return svg;
  }

  private positionTooltip(panel: HTMLElement, col: number, row: number): void {
    const nodeSize = 54;
    const gridGap = 10;
    const boardPadding = 10;
    const tooltipWidth = 196;
    const tooltipHeight = 238;
    const boardWidth = boardPadding * 2 + WARP_UNLOCK_GRID_COLUMNS * nodeSize + (WARP_UNLOCK_GRID_COLUMNS - 1) * gridGap;
    const boardHeight = boardPadding * 2 + WARP_UNLOCK_GRID_ROWS * nodeSize + (WARP_UNLOCK_GRID_ROWS - 1) * gridGap;
    const nodeLeft = boardPadding + (col - 1) * (nodeSize + gridGap);
    const nodeTop = boardPadding + (row - 1) * (nodeSize + gridGap);
    const nodeCenterX = nodeLeft + nodeSize / 2;
    const nodeCenterY = nodeTop + nodeSize / 2;
    const offset = 9;

    let placement: 'left' | 'right' | 'above' | 'below';
    let left = 0;
    let top = 0;

    if (col <= 1) {
      placement = 'right';
      left = nodeLeft + nodeSize + offset;
      top = nodeCenterY - tooltipHeight / 2;
    } else if (col >= 3) {
      placement = 'left';
      left = nodeLeft - tooltipWidth - offset;
      top = nodeCenterY - tooltipHeight / 2;
    } else if (row <= Math.ceil(WARP_UNLOCK_GRID_ROWS / 2)) {
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
}
