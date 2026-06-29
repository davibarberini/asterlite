import {
  WARP_UNLOCK_BY_ID,
  WARP_UNLOCK_DEFINITIONS,
  WARP_UNLOCK_GRID_COLUMNS,
  WARP_UNLOCK_GRID_ROWS,
  getAvailableWarpCores,
  getWarpUnlockNodeState,
  type WarpUnlockNodeState
} from '../../game/progression/warpUnlocks';
import type { ProgressionState, WarpUnlockId } from '../../game/simulation/types';

type WarpCoreTreeRenderState = {
  progression: ProgressionState;
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
    const nodeState = getWarpUnlockNodeState(state.progression, getAvailableWarpCores(state.progression), id);
    const selected = state.selectedUnlockId === id;

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `talent-node talent-node--compact warp-node is-${nodeState}`;
    node.classList.toggle('is-selected', selected);
    node.style.gridColumn = `${unlock.route.col}`;
    node.style.gridRow = `${unlock.route.row}`;
    node.setAttribute('aria-label', `${unlock.title}. ${stateLabels[nodeState]}.`);
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
    const availableCores = getAvailableWarpCores(state.progression);
    const nodeState = getWarpUnlockNodeState(state.progression, availableCores, id);
    const requirementText = unlock.requires.length > 0
      ? unlock.requires.map((requiredId) => WARP_UNLOCK_BY_ID[requiredId].title).join(', ')
      : 'None';

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
    title.textContent = unlock.title;
    const stateLabel = document.createElement('span');
    stateLabel.textContent = stateLabels[nodeState];
    titleWrap.append(title, stateLabel);
    heading.append(icon, titleWrap);

    const summary = document.createElement('p');
    summary.textContent = unlock.summary;

    const meta = document.createElement('div');
    meta.className = 'talent-tooltip__meta warp-tooltip__meta';
    meta.textContent = `Cost ${unlock.cost} core${unlock.cost === 1 ? '' : 's'} · Requires ${requirementText}`;

    const balance = document.createElement('div');
    balance.className = 'talent-tooltip__meta warp-tooltip__meta';
    balance.textContent = `Available ${availableCores} · Banked ${state.progression.prestigeCores}`;

    const effect = document.createElement('div');
    effect.className = 'talent-tooltip__meta warp-tooltip__meta';
    effect.textContent = unlock.effectSummary;

    const buyButton = document.createElement('button');
    buyButton.className = 'shop-buy talent-tooltip__buy warp-tooltip__buy';
    buyButton.type = 'button';
    buyButton.disabled = nodeState !== 'available';
    buyButton.textContent = this.getActionLabel(nodeState, unlock.cost);
    buyButton.addEventListener('click', (event) => {
      event.stopPropagation();
      state.onBuyUnlock(id);
    });

    panel.append(heading, summary, effect, meta, balance, buyButton);
    return panel;
  }

  private getActionLabel(nodeState: WarpUnlockNodeState, cost: number): string {
    if (nodeState === 'owned') {
      return 'Installed';
    }

    if (nodeState === 'locked') {
      return 'Route locked';
    }

    if (nodeState === 'unaffordable') {
      return `Needs ${cost} core${cost === 1 ? '' : 's'}`;
    }

    return `Install ${cost} core${cost === 1 ? '' : 's'}`;
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
