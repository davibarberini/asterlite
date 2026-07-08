import { crystalsPerPrestigeCore, minimumPrestigeTravelLevel } from '../../game/progression/prestige';
import { getShipExchangeRequirement, type ShipExchangeRequirement } from '../../game/progression/shipExchange';
import {
  SHIP_FRAME_BY_ID,
  SHIP_FRAME_DEFINITIONS,
  getActiveShipFrame,
  type ShipFrameRarity,
  type ShipWeaponIdentity
} from '../../game/progression/shipFrames';
import { SHIP_UNLOCK_DEFINITIONS, getShipUnlockProgressLabel } from '../../game/progression/shipUnlocks';
import { getAvailableWarpCores, hasWarpUnlock, WARP_UNLOCK_DEFINITIONS } from '../../game/progression/warpUnlocks';
import type { GameState, ShipFrameId } from '../../game/simulation/types';
import { zones } from '../../game/simulation/zones';
import { formatCoreUnit, formatCrystalUnit, translate, type LanguageCode } from '../../game/i18n';
import { NIVITRON_HAND_DIAMOND_CENTER, NIVITRON_HAND_PATHS, NIVITRON_HAND_VIEWBOX } from '../view/nivitronHandShape';

type HangarRenderOptions = {
  state: GameState;
  language: LanguageCode;
  formatMoney: (value: number) => string;
  getWarpUnlockTitle: (id: string) => string;
  onUnlockShip: (coreGain: number) => void;
  onSwitchShipFrame: (id: ShipFrameId) => void;
};

type HangarShortcutOptions = {
  state: GameState;
  language: LanguageCode;
  onOpenHangar: () => void;
};

export class HangarController {
  renderPanel(options: HangarRenderOptions): HTMLElement {
    const exchangeRequirement = getShipExchangeRequirement(options.state);
    const coreGain = exchangeRequirement.coreGain;
    const crystals = exchangeRequirement.crystals;
    const availableAfterReset = getAvailableWarpCores(options.state.progression) + coreGain;
    const resetReady = exchangeRequirement.ready;
    const activeFrame = getActiveShipFrame(options.state.progression);
    const panel = document.createElement('section');
    panel.className = 'warp-reset-panel';

    const header = document.createElement('div');
    header.className = 'warp-reset-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'warp-reset-panel__kicker';
    kicker.textContent = options.language === 'pt-BR' ? 'Hangar de Naves' : 'Ship Hangar';
    const title = document.createElement('strong');
    title.textContent = resetReady
      ? (options.language === 'pt-BR'
        ? `Reset warp pronto · +${coreGain} ${formatCoreUnit(options.language, coreGain)}`
        : `Warp reset ready · +${coreGain} ${formatCoreUnit(options.language, coreGain)}`)
      : this.getWarpResetBlockedTitle(options, exchangeRequirement);
    titleWrap.append(kicker, title);

    const resetButton = document.createElement('button');
    resetButton.className = 'shop-buy warp-reset-panel__button';
    resetButton.type = 'button';
    resetButton.disabled = !resetReady;
    resetButton.textContent = resetReady
      ? (options.language === 'pt-BR' ? 'Reset warp' : 'Warp reset')
      : translate(options.language, 'shop.notReady');
    resetButton.addEventListener('click', () => options.onUnlockShip(coreGain));
    header.append(titleWrap, resetButton);

    const stats = document.createElement('div');
    stats.className = 'warp-reset-panel__stats';
    stats.replaceChildren(
      this.createStat(translate(options.language, 'shop.crystals'), `${crystals} / ${crystalsPerPrestigeCore}`),
      this.createStat(options.language === 'pt-BR' ? 'Nave atual' : 'Current ship', activeFrame.name),
      this.createStat(options.language === 'pt-BR' ? 'Missões' : 'Missions', `${exchangeRequirement.missionCompletions} / ${exchangeRequirement.requiredMissionCompletions}`),
      this.createStat(translate(options.language, 'shop.availableAfter'), `${availableAfterReset} ${formatCoreUnit(options.language, availableAfterReset)}`)
    );

    const preview = document.createElement('p');
    preview.className = 'warp-reset-panel__preview';
    preview.textContent = this.getWarpResetPreviewText(options, availableAfterReset, exchangeRequirement);

    panel.append(header, stats, this.createShipFrameList(options), preview);
    return panel;
  }

  renderShortcut(options: HangarShortcutOptions): HTMLElement {
    const exchangeRequirement = getShipExchangeRequirement(options.state);
    const panel = document.createElement('section');
    panel.className = 'warp-reset-panel warp-reset-panel--shortcut';

    const header = document.createElement('div');
    header.className = 'warp-reset-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'warp-reset-panel__kicker';
    kicker.textContent = 'Hangar';
    const title = document.createElement('strong');
    title.textContent = exchangeRequirement.ready
      ? (options.language === 'pt-BR' ? 'Troca de nave disponível' : 'Ship exchange available')
      : (options.language === 'pt-BR' ? 'Naves e progresso individual' : 'Ships and individual progress');
    titleWrap.append(kicker, title);

    const button = document.createElement('button');
    button.className = 'shop-buy warp-reset-panel__button';
    button.type = 'button';
    button.textContent = options.language === 'pt-BR' ? 'Abrir' : 'Open';
    button.addEventListener('click', options.onOpenHangar);

    header.append(titleWrap, button);
    panel.append(header);
    return panel;
  }

  private createShipFrameList(options: HangarRenderOptions): HTMLElement {
    const list = document.createElement('div');
    list.className = 'ship-frame-list';
    [...SHIP_FRAME_DEFINITIONS]
      .sort((a, b) => this.getShipUnlockOrder(a.id) - this.getShipUnlockOrder(b.id))
      .forEach((frame) => {
        const unlocked = options.state.progression.unlockedShipFrameIds.includes(frame.id);
        const active = options.state.progression.activeShipFrameId === frame.id;
        const run = this.getShipFrameRunSummary(options.state, frame.id);
        const item = unlocked ? document.createElement('button') : document.createElement('div');
        item.className = 'ship-frame-item';
        if (item instanceof HTMLButtonElement) {
          item.type = 'button';
          item.disabled = active;
          item.addEventListener('click', () => options.onSwitchShipFrame(frame.id));
        }
        item.classList.toggle('is-locked', !unlocked);
        item.classList.toggle('is-active', active);
        item.classList.toggle('has-run', Boolean(run));

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

  private createStat(label: string, value: string): HTMLElement {
    const stat = document.createElement('span');
    const labelEl = document.createElement('small');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    stat.append(labelEl, valueEl);
    return stat;
  }

  private getWarpResetBlockedTitle(options: HangarRenderOptions, exchangeRequirement: ShipExchangeRequirement): string {
    if (exchangeRequirement.needsRoute) {
      return translate(options.language, 'shop.reachZone', { zone: zones[minimumPrestigeTravelLevel]?.name ?? 'a deeper zone' });
    }

    if (exchangeRequirement.needsMissions) {
      const count = exchangeRequirement.missingMissionCompletions;
      return options.language === 'pt-BR'
        ? `Complete mais ${count} ${count === 1 ? 'missão' : 'missões'}`
        : `Complete ${count} more ${count === 1 ? 'mission' : 'missions'}`;
    }

    return translate(options.language, 'shop.nextCore', {
      count: exchangeRequirement.missingCrystalsForCore,
      unit: formatCrystalUnit(options.language, exchangeRequirement.missingCrystalsForCore)
    });
  }

  private getWarpResetPreviewText(options: HangarRenderOptions, availableAfterReset: number, exchangeRequirement: ShipExchangeRequirement): string {
    const affordableUnlocks = WARP_UNLOCK_DEFINITIONS.filter((unlock) => {
      if (hasWarpUnlock(options.state.progression, unlock.id)) {
        return false;
      }
      if (unlock.cost > availableAfterReset) {
        return false;
      }
      return unlock.requires.every((requiredId) => hasWarpUnlock(options.state.progression, requiredId));
    }).slice(0, 3);

    if (affordableUnlocks.length > 0) {
      return translate(options.language, 'shop.unlockNext', { items: affordableUnlocks.map((unlock) => options.getWarpUnlockTitle(unlock.id)).join(', ') });
    }

    if (exchangeRequirement.needsMissions) {
      return options.language === 'pt-BR'
        ? 'Conclua missões para preparar a próxima troca de nave.'
        : 'Complete missions to prepare the next ship exchange.';
    }

    if (exchangeRequirement.coreGain > 0) {
      return translate(options.language, 'shop.bankCores');
    }

    if (exchangeRequirement.needsRoute) {
      return translate(options.language, 'shop.defeatBosses');
    }

    return translate(options.language, 'shop.collectCrystals');
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
    return language === 'pt-BR' ? 'Canhão' : 'Cannon';
  }
}
