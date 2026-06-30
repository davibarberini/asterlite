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
const iconLabels: Record<WarpUnlockId, string> = {
  droneSystems: 'DRN',
  deflectorFrame: 'DEF',
  shieldBubble: 'SHD',
  bossBeacon: 'BOSS',
  spreadBattery: 'SPR',
  rangerHangar: 'RNG',
  missileFoundry: 'MSL',
  piercingRail: 'RIL'
};

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

const unlockPtBr: Record<WarpUnlockId, { title: string; summary: string; effect: string }> = {
  droneSystems: {
    title: 'Sistemas de Drones',
    summary: 'Libera a baía de drones e transforma tecnologias em novas opções de gameplay.',
    effect: 'Permite comprar drones semi-auto com créditos.'
  },
  deflectorFrame: {
    title: 'Estrutura Defletora',
    summary: 'Instala uma frente reforçada para sobreviver melhor ao atravessar detritos.',
    effect: 'Libera a melhoria de defletor da nave.'
  },
  shieldBubble: {
    title: 'Bolha de Escudo',
    summary: 'Instala um escudo circular recarregável ao redor da nave.',
    effect: 'Absorve um impacto antes de entrar em recarga.'
  },
  bossBeacon: {
    title: 'Sinalizador de Boss',
    summary: 'Adiciona uma forma ativa de chamar o próximo boss de portal.',
    effect: 'Libera o botão de invocar boss em Technologies.'
  },
  spreadBattery: {
    title: 'Bateria Spread',
    summary: 'Libera um modo de arma em leque para controlar multidões.',
    effect: 'Adiciona o modo Spread Shot na aba de armas.'
  },
  rangerHangar: {
    title: 'Hangar Ranger',
    summary: 'Amplia a baía para drones shotgun.',
    effect: 'Permite comprar drones shotgun com créditos.'
  },
  missileFoundry: {
    title: 'Fundição de Mísseis',
    summary: 'Abre os sistemas necessários para drones de míssil.',
    effect: 'Permite comprar drones de míssil com créditos.'
  },
  piercingRail: {
    title: 'Trilho Perfurante',
    summary: 'Libera um modo de arma focado em tiros que atravessam alvos.',
    effect: 'Adiciona o modo Piercing na aba de armas.'
  }
};

const getStateLabel = (language: LanguageCode, state: WarpUnlockNodeState): string =>
  language === 'pt-BR' ? stateLabelsPtBr[state] : stateLabels[state];

const getUnlockText = (language: LanguageCode, id: WarpUnlockId): { title: string; summary: string; effect: string } => {
  const unlock = WARP_UNLOCK_BY_ID[id];
  if (language === 'pt-BR') {
    return unlockPtBr[id];
  }
  return { title: unlock.title, summary: unlock.summary, effect: unlock.effectSummary };
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
    node.className = `talent-node talent-node--compact warp-node is-${nodeState}`;
    node.classList.toggle('is-selected', selected);
    node.style.gridColumn = `${unlock.route.col}`;
    node.style.gridRow = `${unlock.route.row}`;
    node.setAttribute('aria-label', `${text.title}. ${getStateLabel(state.language, nodeState)}.`);
    node.setAttribute('aria-pressed', selected.toString());
    node.addEventListener('click', () => state.onSelectUnlock(selected ? null : id));

    const icon = document.createElement('span');
    icon.className = 'talent-node-icon warp-node-icon';
    icon.textContent = iconLabels[id];

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
    const requirementText = unlock.requires.length > 0
      ? unlock.requires.map((requiredId) => getUnlockText(state.language, requiredId).title).join(', ')
      : (state.language === 'pt-BR' ? 'Nenhum' : 'None');

    const panel = document.createElement('section');
    this.positionTooltip(panel, unlock.route.col, unlock.route.row);
    panel.className = `talent-tooltip warp-tooltip is-${nodeState}`;

    const heading = document.createElement('div');
    heading.className = 'talent-tooltip__heading';
    const icon = document.createElement('span');
    icon.className = 'talent-tooltip__icon warp-tooltip__icon';
    icon.textContent = iconLabels[id];
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
      ? `Custo ${formatCoreCost(state.language, unlock.cost)} · Requer ${requirementText}`
      : `Cost ${formatCoreCost(state.language, unlock.cost)} · Requires ${requirementText}`;

    const balance = document.createElement('div');
    balance.className = 'talent-tooltip__meta warp-tooltip__meta';
    balance.textContent = state.language === 'pt-BR'
      ? `Disponíveis ${availableCores} · Guardados ${state.progression.prestigeCores}`
      : `Available ${availableCores} · Banked ${state.progression.prestigeCores}`;

    const effect = document.createElement('div');
    effect.className = 'talent-tooltip__meta warp-tooltip__meta';
    effect.textContent = text.effect;

    const buyButton = document.createElement('button');
    buyButton.className = 'shop-buy talent-tooltip__buy warp-tooltip__buy';
    buyButton.type = 'button';
    buyButton.disabled = nodeState !== 'available';
    buyButton.textContent = this.getActionLabel(state.language, nodeState, unlock.cost);
    buyButton.addEventListener('click', (event) => {
      event.stopPropagation();
      state.onBuyUnlock(id);
    });

    panel.append(heading, summary, effect, meta, balance, buyButton);
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

  private positionTooltip(panel: HTMLElement, col: number, row: number): void {
    const nodeSize = 54;
    const gridGap = 10;
    const boardPadding = 10;
    const tooltipWidth = 196;
    const tooltipHeight = 206;
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
