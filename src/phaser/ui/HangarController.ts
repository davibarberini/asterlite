import {
  SHIP_FRAME_BY_ID,
  SHIP_FRAME_DEFINITIONS,
  type ShipFrameRarity,
  type ShipWeaponIdentity
} from '../../game/progression/shipFrames';
import { SHIP_UNLOCK_DEFINITIONS, getShipUnlockProgress, getShipUnlockProgressLabel } from '../../game/progression/shipUnlocks';
import type { GameState, ShipFrameId } from '../../game/simulation/types';
import { formatCrystalUnit, type LanguageCode } from '../../game/i18n';
import { NIVITRON_HAND_DIAMOND_CENTER, NIVITRON_HAND_PATHS, NIVITRON_HAND_VIEWBOX } from '../view/nivitronHandShape';

type HangarRenderOptions = {
  state: GameState;
  language: LanguageCode;
  formatMoney: (value: number) => string;
  onSwitchShipFrame: (id: ShipFrameId) => void;
};

type HangarShortcutOptions = {
  state: GameState;
  language: LanguageCode;
  onOpenHangar: () => void;
};

export class HangarController {
  renderPanel(options: HangarRenderOptions): HTMLElement {
    const panel = document.createElement('section');
    panel.className = 'action-panel';

    const header = document.createElement('div');
    header.className = 'action-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'action-panel__kicker';
    kicker.textContent = options.language === 'pt-BR' ? 'Hangar de Naves' : 'Ship Hangar';
    const title = document.createElement('strong');
    title.textContent = options.language === 'pt-BR' ? 'Hangar de naves' : 'Ship hangar';
    titleWrap.append(kicker, title);

    header.append(titleWrap);

    const lockedDetail = this.createLockedShipDetail();
    const list = this.createShipFrameList(options, (id) => this.updateLockedShipDetail(lockedDetail, options, id));

    panel.append(header, lockedDetail, list);
    return panel;
  }

  renderShortcut(options: HangarShortcutOptions): HTMLElement {
    const panel = document.createElement('section');
    panel.className = 'action-panel action-panel--shortcut';

    const header = document.createElement('div');
    header.className = 'action-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'action-panel__kicker';
    kicker.textContent = 'Hangar';
    const title = document.createElement('strong');
    title.textContent = options.language === 'pt-BR' ? 'Naves e progresso individual' : 'Ships and individual progress';
    titleWrap.append(kicker, title);

    const button = document.createElement('button');
    button.className = 'shop-buy action-panel__button';
    button.type = 'button';
    button.textContent = options.language === 'pt-BR' ? 'Abrir' : 'Open';
    button.addEventListener('click', options.onOpenHangar);

    header.append(titleWrap, button);
    panel.append(header);
    return panel;
  }

  private createShipFrameList(options: HangarRenderOptions, onSelectLockedShip: (id: ShipFrameId) => void): HTMLElement {
    const list = document.createElement('div');
    list.className = 'ship-frame-list';
    [...SHIP_FRAME_DEFINITIONS]
      .sort((a, b) => this.getShipUnlockOrder(a.id) - this.getShipUnlockOrder(b.id))
      .forEach((frame) => {
        const unlocked = options.state.progression.unlockedShipFrameIds.includes(frame.id);
        const active = options.state.progression.activeShipFrameId === frame.id;
        const run = this.getShipFrameRunSummary(options.state, frame.id);
        const item = document.createElement('button');
        item.className = 'ship-frame-item';
        item.type = 'button';
        item.disabled = active;
        item.addEventListener('click', () => {
          if (unlocked) {
            options.onSwitchShipFrame(frame.id);
            return;
          }

          list.querySelectorAll('.ship-frame-item.is-selected').forEach((selectedItem) => selectedItem.classList.remove('is-selected'));
          item.classList.add('is-selected');
          onSelectLockedShip(frame.id);
        });
        item.classList.toggle('is-locked', !unlocked);
        item.classList.toggle('is-active', active);
        item.classList.toggle('has-run', Boolean(run));
        if (!unlocked) {
          item.setAttribute('aria-label', `${frame.name}: ${this.getShipUnlockDescription(options.language, frame.id)}`);
        }

        const preview = this.createShipFramePreview(frame.id);
        const body = document.createElement('span');
        body.className = 'ship-frame-item__body';

        const header = document.createElement('span');
        header.className = 'ship-frame-item__header';
        const name = document.createElement('strong');
        name.textContent = frame.name;
        const rarity = document.createElement('span');
        rarity.className = `ship-frame-item__rarity ship-frame-item__rarity--${frame.rarity}`;
        rarity.textContent = this.getShipFrameRarityLabel(options.language, frame.rarity);
        header.append(name, rarity);

        const meta = document.createElement('span');
        meta.className = 'ship-frame-item__meta';
        meta.textContent = unlocked
          ? (active
            ? (options.language === 'pt-BR' ? 'Atual' : 'Current')
            : (options.language === 'pt-BR' ? `${this.getShipFrameBonusText(options.language, frame.id)} · Selecionar` : `${this.getShipFrameBonusText(options.language, frame.id)} · Select`))
          : this.getShipUnlockDescription(options.language, frame.id);

        const stats = document.createElement('span');
        stats.className = 'ship-frame-item__stats';
        stats.textContent = run
          ? `${options.formatMoney(run.money)} · ${run.crystals} ${formatCrystalUnit(options.language, run.crystals)} · D${run.damageLevel}/A${run.fireRateLevel}`
          : (unlocked ? (options.language === 'pt-BR' ? 'Slot novo' : 'Fresh slot') : `${getShipUnlockProgressLabel(options.state.progression, frame.id)} · ${this.getShipFrameBonusText(options.language, frame.id)}`);

        body.append(header, meta, stats);
        item.append(preview, body);
        list.append(item);
      });
    return list;
  }

  private createLockedShipDetail(): HTMLElement {
    const detail = document.createElement('section');
    detail.className = 'ship-frame-lock-detail';
    detail.setAttribute('aria-live', 'polite');
    return detail;
  }

  private updateLockedShipDetail(detail: HTMLElement, options: HangarRenderOptions, id: ShipFrameId): void {
    const frame = SHIP_FRAME_BY_ID[id];
    const progress = getShipUnlockProgress(options.state.progression, id);
    const progressRatio = progress.target > 0 ? Math.max(0, Math.min(1, progress.current / progress.target)) : 0;

    const header = document.createElement('div');
    header.className = 'ship-frame-lock-detail__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'ship-frame-lock-detail__kicker';
    kicker.textContent = options.language === 'pt-BR' ? 'Nave bloqueada' : 'Locked ship';
    const title = document.createElement('strong');
    title.textContent = frame.name;
    titleWrap.append(kicker, title);
    const rarity = document.createElement('span');
    rarity.className = `ship-frame-item__rarity ship-frame-item__rarity--${frame.rarity}`;
    rarity.textContent = this.getShipFrameRarityLabel(options.language, frame.rarity);
    header.append(titleWrap, rarity);

    const objective = document.createElement('p');
    objective.className = 'ship-frame-lock-detail__objective';
    objective.textContent = this.getShipUnlockDescription(options.language, id);

    const progressRow = document.createElement('div');
    progressRow.className = 'ship-frame-lock-detail__progress-row';
    const progressLabel = document.createElement('span');
    progressLabel.textContent = options.language === 'pt-BR' ? 'Progresso' : 'Progress';
    const progressValue = document.createElement('strong');
    progressValue.textContent = getShipUnlockProgressLabel(options.state.progression, id);
    progressRow.append(progressLabel, progressValue);

    const progressBar = document.createElement('div');
    progressBar.className = 'ship-frame-lock-detail__bar';
    const progressFill = document.createElement('span');
    progressFill.style.width = `${progressRatio * 100}%`;
    progressBar.append(progressFill);

    detail.classList.add('is-visible');
    detail.replaceChildren(header, objective, progressRow, progressBar);
  }

  private getShipFrameRunSummary(state: GameState, id: ShipFrameId): { money: number; crystals: number; damageLevel: number; fireRateLevel: number } | null {
    if (id === state.progression.activeShipFrameId) {
      return {
        money: state.money,
        crystals: state.crystals,
        damageLevel: state.progression.shipDamageLevel,
        fireRateLevel: state.progression.shipFireRateLevel
      };
    }

    const run = state.progression.shipRuns[id];
    if (!run) {
      return null;
    }

    return {
      money: run.money,
      crystals: run.crystals,
      damageLevel: run.shipDamageLevel,
      fireRateLevel: run.shipFireRateLevel
    };
  }

  private createShipFramePreview(id: ShipFrameId): Element {
    const frame = SHIP_FRAME_BY_ID[id];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ship-frame-preview');
    svg.setAttribute('viewBox', id === 'nivitron' ? NIVITRON_HAND_VIEWBOX : '-26 -24 52 48');
    svg.setAttribute('aria-hidden', 'true');

    if (id === 'nivitron') {
      const handPaths = NIVITRON_HAND_PATHS.map((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'ship-frame-preview__hull ship-frame-preview__hull--nivitron');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        return path;
      });

      const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      diamond.setAttribute(
        'points',
        `${NIVITRON_HAND_DIAMOND_CENTER.x},${NIVITRON_HAND_DIAMOND_CENTER.y - 2.8} ${NIVITRON_HAND_DIAMOND_CENTER.x + 2.8},${NIVITRON_HAND_DIAMOND_CENTER.y} ${NIVITRON_HAND_DIAMOND_CENTER.x},${NIVITRON_HAND_DIAMOND_CENTER.y + 2.8} ${NIVITRON_HAND_DIAMOND_CENTER.x - 2.8},${NIVITRON_HAND_DIAMOND_CENTER.y}`
      );
      diamond.setAttribute('class', 'ship-frame-preview__core');
      svg.append(...handPaths, diamond);
      return svg;
    }

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', frame.shape.map((point) => `${point.x},${point.y}`).join(' '));
    polygon.setAttribute('class', 'ship-frame-preview__hull');

    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('cx', '0');
    core.setAttribute('cy', '0');
    core.setAttribute('r', '4');
    core.setAttribute('class', 'ship-frame-preview__core');

    svg.append(polygon, core);
    return svg;
  }

  private getShipFrameBonusText(language: LanguageCode, id: ShipFrameId): string {
    const frame = SHIP_FRAME_BY_ID[id];
    const bonuses = frame.bonuses;
    const parts: string[] = [this.formatShipWeaponIdentity(language, frame.weaponIdentity)];
    if (bonuses.damageMultiplier) {
      parts.push(language === 'pt-BR' ? 'Dano' : 'Damage');
    }
    if (bonuses.fireRateMultiplier) {
      parts.push(language === 'pt-BR' ? 'Ataque' : 'Attack');
    }
    if (bonuses.speedMultiplier) {
      parts.push(language === 'pt-BR' ? 'Velocidade' : 'Speed');
    }
    if (bonuses.maxHpMultiplier) {
      parts.push(language === 'pt-BR' ? 'Vida' : 'Hull');
    }
    if (bonuses.incomeMultiplier) {
      parts.push(language === 'pt-BR' ? 'Renda' : 'Income');
    }
    return parts.join(' + ');
  }

  private getShipFrameRarityLabel(language: LanguageCode, rarity: ShipFrameRarity): string {
    if (language === 'pt-BR') {
      const labels = {
        common: 'Comum',
        uncommon: 'Incomum',
        rare: 'Rara',
        epic: 'Épica',
        legendary: 'Lendária'
      } satisfies Record<ShipFrameRarity, string>;
      return labels[rarity];
    }

    const labels = {
      common: 'Common',
      uncommon: 'Uncommon',
      rare: 'Rare',
      epic: 'Epic',
      legendary: 'Legendary'
    } satisfies Record<ShipFrameRarity, string>;
    return labels[rarity];
  }

  private getShipUnlockOrder(id: ShipFrameId): number {
    const index = SHIP_UNLOCK_DEFINITIONS.findIndex((definition) => definition.id === id);
    return index >= 0 ? index : SHIP_UNLOCK_DEFINITIONS.length;
  }

  private getShipUnlockDescription(language: LanguageCode, id: ShipFrameId): string {
    return SHIP_UNLOCK_DEFINITIONS.find((definition) => definition.id === id)?.getDescription(language) ?? '';
  }

  private formatShipWeaponIdentity(language: LanguageCode, identity: ShipWeaponIdentity): string {
    if (identity === 'spread') {
      return 'Spread';
    }
    if (identity === 'piercing') {
      return 'Piercing';
    }
    if (identity === 'turret') {
      return 'Turret';
    }
    if (identity === 'aura') {
      return 'Aura';
    }
    if (identity === 'velocity') {
      return language === 'pt-BR' ? 'Velocidade' : 'Velocity';
    }
    if (identity === 'ram') {
      return language === 'pt-BR' ? 'Aríete' : 'Ram';
    }
    if (identity === 'phase') {
      return language === 'pt-BR' ? 'Fase' : 'Phase';
    }
    if (identity === 'ricochet') {
      return language === 'pt-BR' ? 'Ricochete' : 'Ricochet';
    }
    return language === 'pt-BR' ? 'Canhão' : 'Cannon';
  }
}
