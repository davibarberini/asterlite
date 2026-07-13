import {
  TALENT_BY_ID,
  TALENT_DEFINITIONS,
  TALENT_GRID_COLUMNS,
  TALENT_GRID_ROWS,
  canBuyTalentRank,
  getTalentNodeState,
  getTalentPointCost,
  getTalentRank,
  getTalentRankLabel,
  hasDroneTalentAccess,
  isDroneTalent,
  isDroneTalentRegionUnlocked
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
const talentMinZoom = 0.62;
const talentMaxZoom = 1.45;
const talentDragThresholdPx = 7;
const droneRegionBounds = {
  colStart: 8,
  rowStart: 1,
  colSpan: 4,
  rowSpan: 7
};
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
  missileChain: { name: 'Detonação em Cadeia', summary: 'Explosões de míssil causam +60% de dano em área.' },
  droneCommandLink: { name: 'Link de Comando', summary: '+12% de dano de todos os drones e -6% de intervalo de tiro da nave.' },
  carrierDoctrine: { name: 'Doutrina Carrier', summary: '+20% de dano de drones e -8% de intervalo de tiro dos drones, mas +10% de intervalo de tiro da nave.' }
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
  private viewport: HTMLElement | null = null;
  private panContent: HTMLElement | null = null;
  private tooltipLayer: HTMLElement | null = null;
  private selectedTalentId: TalentId | null = null;
  private pan = { x: 0, y: 0 };
  private zoom = 1;
  private hasPanPosition = false;
  private activePointers = new Map<number, { x: number; y: number; target: EventTarget | null }>();
  private drag:
    | {
      pointerId: number;
      startX: number;
      startY: number;
      originX: number;
      originY: number;
      moved: boolean;
      target: EventTarget | null;
    }
    | null = null;
  private pinch:
    | {
      startDistance: number;
      startZoom: number;
      centerWorld: { x: number; y: number };
      moved: boolean;
    }
    | null = null;
  private suppressNextTalentClick = false;
  private lastTalentPointerSelection = false;
  private readonly nodeById = new Map<TalentId, HTMLButtonElement>();

  render(state: SkillTreeRenderState): HTMLElement {
    this.nodeById.clear();
    this.selectedTalentId = state.selectedTalentId;
    const droneRegionUnlocked = isDroneTalentRegionUnlocked(state.progression);
    const board = document.createElement('div');
    this.board = board;
    board.className = 'talent-tree-board talent-tree-board--compact talent-tree-board--draggable';
    board.classList.toggle('is-drone-region-locked', !droneRegionUnlocked);
    board.classList.toggle('is-drone-region-unlocked', droneRegionUnlocked);
    board.style.setProperty('--talent-grid-columns', TALENT_GRID_COLUMNS.toString());
    board.style.setProperty('--talent-grid-rows', TALENT_GRID_ROWS.toString());
    board.style.setProperty('--talent-world-width', `${TALENT_GRID_COLUMNS * talentCompactNodeWidth}px`);
    board.style.setProperty('--talent-world-height', `${TALENT_GRID_ROWS * talentCompactNodeHeight}px`);

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

    const panContent = document.createElement('div');
    panContent.className = 'talent-tree-pan';
    panContent.append(lines, grid, tooltipLayer);
    if (!droneRegionUnlocked) {
      panContent.append(this.createDroneRegionGate(state.language));
    }
    this.panContent = panContent;

    const viewport = document.createElement('div');
    viewport.className = 'talent-tree-viewport';
    viewport.append(panContent);
    this.viewport = viewport;
    this.bindPanHandlers(viewport, state);

    const recenterButton = document.createElement('button');
    recenterButton.className = 'talent-tree-recenter';
    recenterButton.type = 'button';
    recenterButton.title = state.language === 'pt-BR' ? 'Centralizar árvore' : 'Recenter tree';
    recenterButton.setAttribute('aria-label', recenterButton.title);
    recenterButton.append(this.createRecenterIcon());
    recenterButton.addEventListener('click', () => this.centerPanOnStart());

    board.append(viewport, recenterButton);
    if (state.selectedTalentId) {
      tooltipLayer.append(this.createTalentTooltip(state.selectedTalentId, state));
    }
    requestAnimationFrame(() => {
      if (this.hasPanPosition) {
        this.applyPan(true);
      } else {
        this.centerPanOnStart();
      }
    });

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

  private bindPanHandlers(viewport: HTMLElement, state: SkillTreeRenderState): void {
    viewport.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest('.talent-tooltip'))) {
        return;
      }

      this.activePointers.set(event.pointerId, { x: event.clientX, y: event.clientY, target: event.target });
      viewport.setPointerCapture(event.pointerId);
      if (this.activePointers.size >= 2) {
        this.beginPinch();
        return;
      }

      this.drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: this.pan.x,
        originY: this.pan.y,
        moved: false,
        target: event.target
      };
      this.board?.classList.add('is-grabbing');
    });

    viewport.addEventListener('pointermove', (event) => {
      const activePointer = this.activePointers.get(event.pointerId);
      if (activePointer) {
        activePointer.x = event.clientX;
        activePointer.y = event.clientY;
      }

      if (this.activePointers.size >= 2) {
        if (!this.pinch) {
          this.beginPinch();
        }
        this.updatePinch();
        event.preventDefault();
        return;
      }

      if (!this.drag || this.drag.pointerId !== event.pointerId) {
        return;
      }

      const dx = event.clientX - this.drag.startX;
      const dy = event.clientY - this.drag.startY;
      if (!this.drag.moved && Math.hypot(dx, dy) > talentDragThresholdPx) {
        this.drag.moved = true;
        this.suppressNextTalentClick = true;
        this.board?.classList.add('is-panning');
      }

      if (!this.drag.moved) {
        return;
      }

      event.preventDefault();
      this.pan = {
        x: this.drag.originX + dx,
        y: this.drag.originY + dy
      };
      this.applyPan(true);
    });

    viewport.addEventListener('pointerup', (event) => {
      this.finishPan(event, state);
    });
    viewport.addEventListener('pointercancel', (event) => {
      this.finishPan(event, state);
    });
  }

  private finishPan(event: PointerEvent, state: SkillTreeRenderState): void {
    this.activePointers.delete(event.pointerId);
    if (this.viewport?.hasPointerCapture(event.pointerId)) {
      this.viewport.releasePointerCapture(event.pointerId);
    }

    if (this.pinch) {
      const moved = this.pinch.moved;
      this.pinch = null;
      this.drag = null;
      this.board?.classList.remove('is-grabbing', 'is-panning');
      if (moved) {
        this.hasPanPosition = true;
        this.applyPan(true);
      }
      return;
    }

    if (!this.drag || this.drag.pointerId !== event.pointerId) {
      return;
    }

    const moved = this.drag.moved;
    const target = this.drag.target;
    this.drag = null;
    this.board?.classList.remove('is-grabbing', 'is-panning');

    if (moved) {
      this.hasPanPosition = true;
      this.applyPan(true);
      return;
    }

    if (
      this.selectedTalentId &&
      target instanceof Element &&
      !target.closest('.talent-node, .talent-tooltip, .talent-tree-recenter')
    ) {
      state.onSelectTalent(null);
    }
  }

  private beginPinch(): void {
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }

    const pointers = [...this.activePointers.values()].slice(0, 2);
    if (pointers.length < 2) {
      return;
    }

    const center = this.getPointerPairCenter(pointers[0], pointers[1]);
    this.drag = null;
    this.pinch = {
      startDistance: Math.max(1, this.getPointerPairDistance(pointers[0], pointers[1])),
      startZoom: this.zoom,
      centerWorld: {
        x: (center.x - this.pan.x) / this.zoom,
        y: (center.y - this.pan.y) / this.zoom
      },
      moved: false
    };
    this.suppressNextTalentClick = true;
    this.board?.classList.add('is-grabbing', 'is-panning');
  }

  private updatePinch(): void {
    if (!this.pinch) {
      return;
    }

    const pointers = [...this.activePointers.values()].slice(0, 2);
    if (pointers.length < 2) {
      return;
    }

    const distance = Math.max(1, this.getPointerPairDistance(pointers[0], pointers[1]));
    const center = this.getPointerPairCenter(pointers[0], pointers[1]);
    const nextZoom = this.clampZoom(this.pinch.startZoom * (distance / this.pinch.startDistance));
    this.zoom = nextZoom;
    this.pan = {
      x: center.x - this.pinch.centerWorld.x * nextZoom,
      y: center.y - this.pinch.centerWorld.y * nextZoom
    };
    this.pinch.moved = true;
    this.applyPan(true);
  }

  private getPointerPairCenter(
    first: { x: number; y: number },
    second: { x: number; y: number }
  ): { x: number; y: number } {
    const rect = this.viewport?.getBoundingClientRect();
    return {
      x: (first.x + second.x) / 2 - (rect?.left ?? 0),
      y: (first.y + second.y) / 2 - (rect?.top ?? 0)
    };
  }

  private getPointerPairDistance(first: { x: number; y: number }, second: { x: number; y: number }): number {
    return Math.hypot(first.x - second.x, first.y - second.y);
  }

  private clampZoom(zoom: number): number {
    return Math.max(talentMinZoom, Math.min(talentMaxZoom, zoom));
  }

  private centerPanOnStart(): void {
    const startTalent = TALENT_BY_ID.refineryYield;
    const startCenter = this.getTalentNodeCenter(startTalent.grid.col, startTalent.grid.row);
    const viewport = this.viewport;
    if (!viewport) {
      return;
    }

    this.pan = {
      x: viewport.clientWidth / 2 - startCenter.x * this.zoom,
      y: viewport.clientHeight * 0.28 - startCenter.y * this.zoom
    };
    this.hasPanPosition = true;
    this.applyPan(true);
  }

  private applyPan(clamp = false): void {
    const viewport = this.viewport;
    const panContent = this.panContent;
    if (!viewport || !panContent) {
      return;
    }

    if (clamp) {
      const margin = 42;
      const scaledWidth = panContent.offsetWidth * this.zoom;
      const scaledHeight = panContent.offsetHeight * this.zoom;
      const minX = Math.min(margin, viewport.clientWidth - scaledWidth - margin);
      const maxX = Math.max(margin, viewport.clientWidth - scaledWidth - margin);
      const minY = Math.min(margin, viewport.clientHeight - scaledHeight - margin);
      const maxY = Math.max(margin, viewport.clientHeight - scaledHeight - margin);
      this.pan = {
        x: Math.max(minX, Math.min(maxX, this.pan.x)),
        y: Math.max(minY, Math.min(maxY, this.pan.y))
      };
    }

    panContent.style.transform = `translate3d(${this.pan.x}px, ${this.pan.y}px, 0) scale(${this.zoom})`;
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
    const droneRegionUnlocked = isDroneTalentRegionUnlocked(progression);
    TALENT_DEFINITIONS.forEach((talent) => {
      talent.requires.forEach((requirement) => {
        const from = TALENT_BY_ID[requirement.id];
        const start = this.getTalentNodeCenter(from.grid.col, from.grid.row);
        const end = this.getTalentNodeCenter(talent.grid.col, talent.grid.row);
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        const unlocked =
          getTalentRank(progression, requirement.id) >= requirement.rank &&
          getTalentNodeState(progression, talent.id) !== 'locked';
        const hiddenRegionLine = !droneRegionUnlocked && (isDroneTalent(talent.id) || isDroneTalent(from.id));
        line.setAttribute('x1', start.x.toString());
        line.setAttribute('y1', start.y.toString());
        line.setAttribute('x2', end.x.toString());
        line.setAttribute('y2', end.y.toString());
        line.setAttribute('class', [
          'talent-tree-line',
          unlocked ? 'is-unlocked' : '',
          hiddenRegionLine ? 'is-region-hidden' : ''
        ].filter(Boolean).join(' '));
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
    const hiddenDroneRegion = isDroneTalent(id) && !isDroneTalentRegionUnlocked(state.progression);

    const node = document.createElement('button');
    node.type = 'button';
    node.className = `talent-node talent-node--compact talent-node--${talent.branch} talent-node--${talent.nodeType} is-${nodeState}`;
    node.classList.toggle('is-selected', state.selectedTalentId === id);
    node.classList.toggle('is-region-hidden', hiddenDroneRegion);
    node.disabled = hiddenDroneRegion;
    if (id === this.getTutorialAvailableTalentId(state.progression)) {
      node.dataset.tutorialTarget = 'skill-node-available';
    }
    node.style.gridColumn = `${talent.grid.col}`;
    node.style.gridRow = `${talent.grid.row}`;
    node.setAttribute(
      'aria-label',
      hiddenDroneRegion
        ? (state.language === 'pt-BR' ? 'Região de drones bloqueada. Instale Sistemas de Drones.' : 'Drone region locked. Install Drone Systems.')
        : `${text.name}. ${formatRankLabel(state.language, state.progression, id)}.`
    );
    node.setAttribute('aria-pressed', (state.selectedTalentId === id).toString());
    const toggleTalent = (): void => {
      state.onSelectTalent(this.selectedTalentId === id ? null : id);
    };
    node.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) {
        return;
      }
      this.lastTalentPointerSelection = false;
    });
    node.addEventListener('pointerup', (event) => {
      if (event.button !== 0) {
        return;
      }
      this.lastTalentPointerSelection = true;
      if (this.drag?.moved || this.pinch?.moved) {
        return;
      }
      toggleTalent();
    });
    node.addEventListener('click', () => {
      if (this.suppressNextTalentClick) {
        this.suppressNextTalentClick = false;
        return;
      }
      if (this.lastTalentPointerSelection) {
        this.lastTalentPointerSelection = false;
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
    } else if (isDroneTalent(id) && !isDroneTalentRegionUnlocked(state.progression)) {
      meta.textContent = state.language === 'pt-BR' ? 'Instale Sistemas de Drones' : 'Install Drone Systems';
    } else if (talent.requiresDrone && !hasDroneTalentAccess(state.progression, talent.requiresDrone)) {
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
    if (canBuy) {
      buyButton.dataset.tutorialTarget = 'skill-buy';
    }
    buyButton.textContent = nodeState === 'maxed'
      ? (state.language === 'pt-BR' ? 'Máximo' : 'Maxed')
      : (state.language === 'pt-BR' ? `Comprar ${formatSkillPointCost(state.language, nextCost)}` : `Buy ${formatSkillPointCost(state.language, nextCost)}`);
    buyButton.addEventListener('click', () => state.onBuyTalent(id));

    panel.append(heading, summary, meta, buyButton);
    return panel;
  }

  private getTutorialAvailableTalentId(progression: ProgressionState): TalentId | null {
    return TALENT_DEFINITIONS.find((talent) => canBuyTalentRank(progression, talent.id))?.id ?? null;
  }

  private createDroneRegionGate(language: LanguageCode): HTMLElement {
    const gate = document.createElement('div');
    gate.className = 'talent-drone-region-gate';
    const left = (droneRegionBounds.colStart - 1) * talentCompactNodeWidth - 8;
    const top = (droneRegionBounds.rowStart - 1) * talentCompactNodeHeight - 8;
    gate.style.left = `${left}px`;
    gate.style.top = `${top}px`;
    gate.style.width = `${droneRegionBounds.colSpan * talentCompactNodeWidth + 16}px`;
    gate.style.height = `${droneRegionBounds.rowSpan * talentCompactNodeHeight + 16}px`;

    const title = document.createElement('strong');
    title.textContent = language === 'pt-BR' ? 'Região de drones' : 'Drone region';
    const copy = document.createElement('span');
    copy.textContent = language === 'pt-BR'
      ? 'Instale Sistemas de Drones para revelar.'
      : 'Install Drone Systems to reveal.';
    gate.append(title, copy);
    return gate;
  }

  private positionTalentTooltip(panel: HTMLElement, col: number, row: number): void {
    const nodeSize = 54;
    const trackWidth = talentCompactNodeWidth;
    const trackHeight = talentCompactNodeHeight;
    const tooltipWidth = 188;
    const tooltipHeight = 150;
    const boardPadding = 8;
    const boardWidth = TALENT_GRID_COLUMNS * trackWidth;
    const boardHeight = TALENT_GRID_ROWS * trackHeight;
    const nodeLeft = (col - 1) * trackWidth + (trackWidth - nodeSize) / 2;
    const nodeTop = (row - 1) * trackHeight + (trackHeight - nodeSize) / 2;
    const nodeCenterX = nodeLeft + nodeSize / 2;
    const nodeCenterY = nodeTop + nodeSize / 2;
    const offset = 9;

    let placement: 'left' | 'right' | 'above' | 'below';
    let left = 0;
    let top = 0;

    if (col <= 3) {
      placement = 'right';
      left = nodeLeft + nodeSize + offset;
      top = nodeCenterY - tooltipHeight / 2;
    } else if (col >= 5) {
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

  private createRecenterIcon(): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '12');
    circle.setAttribute('cy', '12');
    circle.setAttribute('r', '5.5');
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M12 3v4M12 17v4M3 12h4M17 12h4');
    svg.append(circle, path);
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
    if (id.includes('droneCommand') || id.includes('carrier')) {
      return 'skill-targeting';
    }
    return 'skill-generic';
  }
}
