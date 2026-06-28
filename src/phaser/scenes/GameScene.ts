import Phaser from 'phaser';
import { neutralInput, type InputActions } from '../../game/input/actions';
import { getCrystalBalance as getStateCrystalBalance, purchaseTalentRank, spendCrystals as spendStateCrystals } from '../../game/progression/currency';
import { loadGameState, saveGameState } from '../../game/progression/saveData';
import { emitReward } from '../../game/simulation/events';
import { createDrone } from '../../game/simulation/state';
import { createAsteroidField, createPendingZoneBoss, hasActiveZoneBoss } from '../../game/simulation/systems/asteroids';
import type { BossType, DroneType, GameState, TalentId, Vec2, WeaponMode } from '../../game/simulation/types';
import { getRefineryMilestoneMultiplier, getRefineryNextMilestoneLevel } from '../../game/progression/idleBonuses';
import {
  TALENT_DEFINITIONS,
  canBuyTalentRank,
  countUnlockedTalentRanks,
  getRefineryIncomeMultiplier,
  getSemiAutoPierceLeft,
  getTalentRank,
} from '../../game/progression/talentTree';
import { updateGame } from '../../game/simulation/systems/gameLoop';
import { getExplorationZone, getNextZone, isZoneUnlocked, zones } from '../../game/simulation/zones';
import { createWarpResetState, getPrestigeCoreGain, getPrestigeMoneyMultiplier } from '../../game/progression/prestige';
import {
  ACHIEVEMENT_BONUS_LABELS,
  ACHIEVEMENT_DEFINITIONS,
  countUnlockedAchievements,
  formatAchievementProgress,
  getAchievementBonusPercent,
  getAchievementProgressRatio,
  getEffectiveMaxHp,
  getTotalAchievementBonusSummary,
  isAchievementUnlocked
} from '../../game/progression/achievements';
import { BackgroundMusic } from '../audio/BackgroundMusic';
import { RetroSound } from '../audio/RetroSound';
import { AudioSettingsController } from '../ui/AudioSettingsController';
import { InfoModalController, type ModalContent } from '../ui/InfoModalController';
import { RewardFeedController } from '../ui/RewardFeedController';
import { SkillTreeModalController } from '../ui/SkillTreeModalController';
import { ZoneMapController } from '../ui/ZoneMapController';
import { Starfield } from '../view/Starfield';
import { VectorRenderer } from '../view/VectorRenderer';
import { balance } from '../../game/balance';

type ShopTab = 'upgrades' | 'drones' | 'skills' | 'weapons' | 'achievements';

type ShopAction = {
  label: string;
  disabled: boolean;
  onClick: () => void;
  icon?: string;
  title?: string;
  meta?: string;
  info?: () => ModalContent;
};

const SLINGSHOT_MAX_DRAG_MOBILE = 150;
const SLINGSHOT_MAX_DRAG_DESKTOP = 172;
const SLINGSHOT_DEADZONE_MOBILE = 58;
const SLINGSHOT_DEADZONE_DESKTOP = 24;
const ZONE_TRAVEL_DURATION = 1.6;
const SUBMENU_TIME_SCALE = 0.28;
const TIME_SCALE_RECOVERY_SECONDS = 1;

export class GameScene extends Phaser.Scene {
  private state!: GameState;
  private inputState: InputActions = neutralInput();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private vectorRenderer!: VectorRenderer;
  private starfield!: Starfield;
  private retroSound!: RetroSound;
  private backgroundMusic!: BackgroundMusic;
  private audioSettings!: AudioSettingsController;
  private infoModal!: InfoModalController;
  private skillTreeModal!: SkillTreeModalController;
  private zoneMap!: ZoneMapController;
  private moneyEl!: HTMLElement;
  private deathFadeEl!: HTMLElement;
  private lowHpVeilEl!: HTMLElement;
  private sectorEl!: HTMLElement;
  private hpMeterEl!: HTMLElement;
  private hpEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private rewardFeed!: RewardFeedController;
  private shopPanelEl!: HTMLElement;
  private shopDrawerBackdropEl!: HTMLElement;
  private shopDrawerHandleEl!: HTMLButtonElement;
  private shopKickerEl!: HTMLElement;
  private shopTitleEl!: HTMLElement;
  private shopCopyEl!: HTMLElement;
  private shopStatsEl!: HTMLElement;
  private shopActionsEl!: HTMLElement;
  private modalEl!: HTMLElement;
  private modalBackdropEl!: HTMLElement;
  private modalPanelEl!: HTMLElement;
  private modalKickerEl!: HTMLElement;
  private modalTitleEl!: HTMLElement;
  private modalCopyEl!: HTMLElement;
  private modalBodyEl!: HTMLElement;
  private modalCloseEl!: HTMLButtonElement;
  private modalHandleEl!: HTMLButtonElement;
  private mapToggleEl!: HTMLButtonElement;
  private menuToggleEl!: HTMLButtonElement;
  private bottomNavEl!: HTMLElement;
  private navButtons!: NodeListOf<HTMLButtonElement>;
  private activeTab: ShopTab = 'upgrades';
  private activeModal: 'info' | 'skills' | 'zones' | 'settings' | null = null;
  private activeModalInfo: ModalContent | null = null;
  private activeTalentTooltipId: TalentId | null = null;
  private activeGameplayPointerId: number | null = null;
  private gameplayPointerStartScreen: Vec2 | null = null;
  private gameplayPointerScreen: Vec2 | null = null;
  private shopSignature = '';
  private saveElapsed = 0;
  private offlineStatusFor = 0;
  private gameplayTimeScale = 1;
  private zoneTravel: { toIndex: number; elapsed: number; duration: number; direction: Vec2 } | null = null;
  private readonly saveBeforeUnload = (): void => {
    saveGameState(this.state);
  };
  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    this.retroSound.unlock();
    this.backgroundMusic.unlock();
    this.closeSubmenuFromOutsidePointer(event);
    if (this.isUiPointerEvent(event)) {
      this.activeGameplayPointerId = null;
      this.gameplayPointerStartScreen = null;
      this.gameplayPointerScreen = null;
      return;
    }

    this.activeGameplayPointerId = event.pointerId;
    this.gameplayPointerStartScreen = this.toGameScreenPoint(event);
    this.gameplayPointerScreen = { ...this.gameplayPointerStartScreen };
  };
  private readonly handleDocumentPointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.activeGameplayPointerId) {
      return;
    }

    if (this.isUiPointerEvent(event)) {
      this.activeGameplayPointerId = null;
      this.gameplayPointerStartScreen = null;
      this.gameplayPointerScreen = null;
      return;
    }

    this.gameplayPointerScreen = this.toGameScreenPoint(event);
  };
  private readonly handleDocumentPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activeGameplayPointerId) {
      return;
    }

    this.activeGameplayPointerId = null;
    this.gameplayPointerStartScreen = null;
    this.gameplayPointerScreen = null;
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.state = loadGameState(this.scale.width, this.scale.height);
    this.offlineStatusFor = this.state.lastOfflineEarnings > 0 ? 8 : 0;
    this.retroSound = new RetroSound();
    this.backgroundMusic = new BackgroundMusic(`${import.meta.env.BASE_URL}audio/zone-1.mp3`);
    this.vectorRenderer = new VectorRenderer(this);
    this.starfield = new Starfield(this);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,SHIFT,H,R') as Record<string, Phaser.Input.Keyboard.Key>;

    this.moneyEl = document.getElementById('money')!;
    this.deathFadeEl = document.getElementById('death-fade')!;
    this.lowHpVeilEl = document.getElementById('low-hp-veil')!;
    this.sectorEl = document.getElementById('sector')!;
    this.hpMeterEl = document.getElementById('hp-meter')!;
    this.hpEl = document.getElementById('hp')!;
    this.statusEl = document.getElementById('status')!;
    this.rewardFeed = new RewardFeedController(document.getElementById('reward-feed')!);
    this.audioSettings = new AudioSettingsController(document.getElementById('settings-toggle') as HTMLButtonElement, {
      setSfxVolume: (volume) => this.retroSound.setVolume(volume),
      setMusicVolume: (volume) => this.backgroundMusic.setVolume(volume)
    });
    this.infoModal = new InfoModalController();
    this.skillTreeModal = new SkillTreeModalController();
    this.zoneMap = new ZoneMapController();
    this.mapToggleEl = document.getElementById('map-toggle') as HTMLButtonElement;
    this.menuToggleEl = document.getElementById('menu-toggle') as HTMLButtonElement;
    this.bottomNavEl = document.querySelector<HTMLElement>('.bottom-nav')!;
    this.shopPanelEl = document.getElementById('shop-panel')!;
    this.shopDrawerBackdropEl = document.getElementById('shop-drawer-backdrop')!;
    this.shopDrawerHandleEl = document.getElementById('shop-drawer-handle') as HTMLButtonElement;
    this.shopKickerEl = document.getElementById('shop-kicker')!;
    this.shopTitleEl = document.getElementById('shop-title')!;
    this.shopCopyEl = document.getElementById('shop-copy')!;
    this.shopStatsEl = document.getElementById('shop-stats')!;
    this.shopActionsEl = document.getElementById('shop-actions')!;
    this.modalEl = document.getElementById('ui-modal')!;
    this.modalBackdropEl = document.getElementById('ui-modal-backdrop')!;
    this.modalPanelEl = document.getElementById('ui-modal-panel')!;
    this.modalKickerEl = document.getElementById('ui-modal-kicker')!;
    this.modalTitleEl = document.getElementById('ui-modal-title')!;
    this.modalCopyEl = document.getElementById('ui-modal-copy')!;
    this.modalBodyEl = document.getElementById('ui-modal-body')!;
    this.modalCloseEl = document.getElementById('ui-modal-close') as HTMLButtonElement;
    this.modalHandleEl = document.querySelector<HTMLButtonElement>('.ui-modal__handle')!;
    this.navButtons = document.querySelectorAll<HTMLButtonElement>('.nav-button');
    this.input.keyboard!.on('keydown', () => {
      this.retroSound.unlock();
      this.backgroundMusic.unlock();
    });
    this.input.keyboard!.on('keydown-ESC', () => this.closeModal());
    document.addEventListener('pointerdown', this.handleDocumentPointerDown);
    document.addEventListener('pointermove', this.handleDocumentPointerMove);
    document.addEventListener('pointerup', this.handleDocumentPointerUp);
    document.addEventListener('pointercancel', this.handleDocumentPointerUp);
    this.bindSettingsUi();
    this.bindShopUi();
    this.bindModalUi();

    this.scale.on('resize', this.handleResize, this);
    window.addEventListener('beforeunload', this.saveBeforeUnload);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('pointerdown', this.handleDocumentPointerDown);
      document.removeEventListener('pointermove', this.handleDocumentPointerMove);
      document.removeEventListener('pointerup', this.handleDocumentPointerUp);
      document.removeEventListener('pointercancel', this.handleDocumentPointerUp);
      window.removeEventListener('beforeunload', this.saveBeforeUnload);
      this.audioSettings.destroy();
      this.backgroundMusic.destroy();
    });
    this.updateHud();
  }

  update(_time: number, deltaMs: number): void {
    const rawDt = Math.min(deltaMs / 1000, 0.033);
    this.updateGameplayTimeScale(rawDt);
    const dt = rawDt * this.gameplayTimeScale;
    this.readInput();

    this.state.width = this.scale.width;
    this.state.height = this.scale.height;
    if (this.zoneTravel) {
      this.updateZoneTravel(rawDt);
      return;
    }

    updateGame(this.state, this.inputState, dt);
    this.playAudioEvents();
    this.rewardFeed.showEvents(this.state.rewardEvents);
    this.offlineStatusFor = Math.max(0, this.offlineStatusFor - dt);
    this.saveElapsed += dt;
    if (this.saveElapsed >= 1) {
      saveGameState(this.state);
      this.saveElapsed = 0;
    }
    this.starfield.update(dt, this.state.ship.velocity);
    const slingPower = this.inputState.slingshotVector ? Math.hypot(this.inputState.slingshotVector.x, this.inputState.slingshotVector.y) : 0;
    this.vectorRenderer.render(this.state, (this.inputState.thrust || slingPower > 0.08) && this.state.ship.alive, this.getSlingshotIndicator());
    this.updateHud();
    this.updateDeathFade();
  }

  private readInput(): void {
    this.inputState.rotateLeft = this.cursors.left.isDown || this.keys.A.isDown;
    this.inputState.rotateRight = this.cursors.right.isDown || this.keys.D.isDown;
    this.inputState.thrust = this.cursors.up.isDown || this.keys.W.isDown;
    this.inputState.brake = this.cursors.down.isDown || this.keys.S.isDown || this.keys.SHIFT.isDown;
    this.inputState.pointerTarget = null;
    this.inputState.slingshotVector = this.getSlingshotVector();
    this.inputState.aimDirection = this.getPointerAimDirection();
    const slingPower = this.inputState.slingshotVector ? Math.hypot(this.inputState.slingshotVector.x, this.inputState.slingshotVector.y) : 0;
    this.inputState.fire = this.cursors.space.isDown || this.keys.SPACE.isDown || this.activeGameplayPointerId !== null || slingPower > 0.08;
    this.inputState.hyperspace = Phaser.Input.Keyboard.JustDown(this.keys.H);
  }

  private getPointerAimDirection(): Vec2 | null {
    if (!this.gameplayPointerScreen) {
      return null;
    }

    if (this.gameplayPointerStartScreen) {
      const pullDx = this.gameplayPointerStartScreen.x - this.gameplayPointerScreen.x;
      const pullDy = this.gameplayPointerStartScreen.y - this.gameplayPointerScreen.y;
      const pullDistance = Math.hypot(pullDx, pullDy);
      if (pullDistance >= 8) {
        return {
          x: pullDx / pullDistance,
          y: pullDy / pullDistance
        };
      }
    }

    const dx = this.gameplayPointerScreen.x - this.state.width / 2;
    const dy = this.gameplayPointerScreen.y - this.state.height / 2;
    const distance = Math.hypot(dx, dy);
    if (distance < 8) {
      return null;
    }
    return {
      x: dx / distance,
      y: dy / distance
    };
  }

  private getSlingshotVector(): Vec2 | null {
    if (!this.gameplayPointerStartScreen || !this.gameplayPointerScreen) {
      return null;
    }

    const maxDrag = this.getSlingshotMaxDrag();
    const deadzone = this.getSlingshotDeadzone();
    const dx = this.gameplayPointerStartScreen.x - this.gameplayPointerScreen.x;
    const dy = this.gameplayPointerStartScreen.y - this.gameplayPointerScreen.y;
    const distance = Math.hypot(dx, dy);
    if (distance < deadzone) {
      return null;
    }

    const adjustedDistance = distance - deadzone;
    const scale = Math.min(1, adjustedDistance / maxDrag) / distance;
    return {
      x: dx * scale,
      y: dy * scale
    };
  }

  private getSlingshotIndicator(): { start: Vec2; current: Vec2; power: number } | null {
    if (!this.gameplayPointerStartScreen || !this.gameplayPointerScreen) {
      return null;
    }

    const maxDrag = this.getSlingshotMaxDrag();
    const deadzone = this.getSlingshotDeadzone();
    const distance = Math.hypot(
      this.gameplayPointerStartScreen.x - this.gameplayPointerScreen.x,
      this.gameplayPointerStartScreen.y - this.gameplayPointerScreen.y
    );
    if (distance < deadzone) {
      return null;
    }

    return {
      start: this.gameplayPointerStartScreen,
      current: this.gameplayPointerScreen,
      power: Math.min(1, (distance - deadzone) / maxDrag)
    };
  }

  private getSlingshotMaxDrag(): number {
    return this.state.width <= 720 ? SLINGSHOT_MAX_DRAG_MOBILE : SLINGSHOT_MAX_DRAG_DESKTOP;
  }

  private getSlingshotDeadzone(): number {
    return this.state.width <= 720 ? SLINGSHOT_DEADZONE_MOBILE : SLINGSHOT_DEADZONE_DESKTOP;
  }

  private toGameScreenPoint(event: PointerEvent): Vec2 {
    const bounds = this.game.canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * this.scale.width,
      y: ((event.clientY - bounds.top) / Math.max(1, bounds.height)) * this.scale.height
    };
  }

  private isUiPointerEvent(event: PointerEvent): boolean {
    const target = event.target;
    return target instanceof Element && target.closest('#idle-dock, #ui-modal, .hud-right-cluster') !== null;
  }

  private closeSubmenuFromOutsidePointer(event: PointerEvent): void {
    if (this.isQuickMenuCollapsed()) {
      return;
    }

    const target = event.target;
    if (target instanceof Element && target.closest('.bottom-nav, #menu-toggle')) {
      return;
    }

    this.collapseQuickMenu();
  }

  private updateGameplayTimeScale(dt: number): void {
    const targetScale = this.getUiTimeScaleTarget();
    if (targetScale <= 0) {
      this.gameplayTimeScale = 0;
      return;
    }

    if (targetScale < 1) {
      this.gameplayTimeScale = targetScale;
      return;
    }

    this.gameplayTimeScale = Math.min(1, this.gameplayTimeScale + dt / TIME_SCALE_RECOVERY_SECONDS);
  }

  private getUiTimeScaleTarget(): number {
    if (this.isBlockingDrawerOpen()) {
      return 0;
    }

    if (!this.isQuickMenuCollapsed()) {
      return SUBMENU_TIME_SCALE;
    }

    return 1;
  }

  private isBlockingDrawerOpen(): boolean {
    return (
      !this.shopPanelEl.classList.contains('is-hidden') ||
      !this.modalEl.classList.contains('is-hidden')
    );
  }

  private isQuickMenuCollapsed(): boolean {
    return this.bottomNavEl.classList.contains('is-collapsed');
  }

  private getViewScale(): number {
    return this.state.width <= 720 ? 0.78 : 1;
  }

  private getCrystalBalance(): number {
    return getStateCrystalBalance(this.state);
  }

  private updateHud(): void {
    const crystals = this.getCrystalBalance();
    this.setText(this.moneyEl, this.formatMoney(this.state.money));
    this.moneyEl.dataset.crystals = `${crystals} crystal${crystals === 1 ? '' : 's'}`;
    this.setText(this.sectorEl, this.formatSector());
    this.mapToggleEl.disabled = !this.state.progression.mapUnlocked;
    this.mapToggleEl.classList.toggle('is-locked', !this.state.progression.mapUnlocked);
    const hpPercent = Math.max(0, Math.min(1, this.state.ship.hp / Math.max(1, this.state.ship.maxHp)));
    this.hpMeterEl.style.setProperty('--hp-fill', `${Math.round(hpPercent * 100)}%`);
    this.updateLowHpVeil(hpPercent);
    this.setText(this.hpEl, `${Math.ceil(this.state.ship.hp)} / ${this.state.ship.maxHp}`);

    if (this.offlineStatusFor > 0) {
      this.setText(this.statusEl, `Offline refinery payout: ${this.formatMoney(this.state.lastOfflineEarnings)}.`);
    } else if (this.state.phase === 'respawning') {
      this.setText(this.statusEl, `Ship destroyed. Repair ${this.formatMoney(this.state.lastRepairCost)}. Respawning in ${Math.ceil(this.state.ship.respawnFor)}.`);
    } else if (this.state.droneRebootFor > 0) {
      this.setText(this.statusEl, `Drone wing rebooting: ${Math.ceil(this.state.droneRebootFor)} sec.`);
    } else if (this.state.deathPenaltyFor > 0) {
      this.setText(this.statusEl, `Refinery output reduced: ${Math.ceil(this.state.deathPenaltyFor)} sec.`);
    } else if (this.state.ship.invulnerableFor > 0) {
      this.setText(this.statusEl, 'Temporary shield active.');
    } else {
      this.setText(this.statusEl, 'Drag away from the ship path to slingshot. WASD / arrows also fly. H for hyperspace.');
    }

    this.updateShop();
  }

  private updateDeathFade(): void {
    if (this.state.phase !== 'respawning') {
      this.deathFadeEl.style.opacity = '0';
      return;
    }

    const respawnFor = Math.max(0, this.state.ship.respawnFor);
    const fadeIn = Math.min(1, (2.2 - respawnFor) / 0.7);
    const fadeOut = Math.min(1, respawnFor / 0.6);
    this.deathFadeEl.style.opacity = Math.max(0, Math.min(1, fadeIn, fadeOut)).toFixed(2);
  }

  private updateLowHpVeil(hpPercent: number): void {
    if (this.state.phase === 'respawning') {
      this.lowHpVeilEl.style.opacity = '0';
      return;
    }

    const severity = Math.max(0, Math.min(1, (0.58 - hpPercent) / 0.58));
    this.lowHpVeilEl.style.opacity = (severity ** 1.35 * 0.82).toFixed(2);
  }

  private setText(element: HTMLElement, text: string): void {
    if (element.textContent !== text) {
      element.textContent = text;
    }
  }

  private playAudioEvents(): void {
    this.state.audioEvents.forEach((event) => this.retroSound.play(event));
    this.state.audioEvents.length = 0;
  }

  private handleResize(gameSize: Phaser.Structs.Size): void {
    this.state.width = gameSize.width;
    this.state.height = gameSize.height;
    this.starfield.reset(gameSize.width, gameSize.height);
  }

  private bindShopUi(): void {
    this.menuToggleEl.addEventListener('click', () => {
      const expanded = !this.bottomNavEl.classList.toggle('is-collapsed');
      this.menuToggleEl.setAttribute('aria-expanded', expanded.toString());
      this.menuToggleEl.classList.toggle('is-active', expanded);
    });

    this.mapToggleEl.addEventListener('click', () => {
      if (!this.state.progression.mapUnlocked) {
        return;
      }
      this.openZoneMapModal();
      this.collapseQuickMenu();
    });

    this.bottomNavEl.classList.add('is-collapsed');

    document.getElementById('shop-close')!.addEventListener('click', () => this.closeShopDrawer());
    this.shopDrawerBackdropEl.addEventListener('click', () => this.closeShopDrawer());
    this.shopDrawerHandleEl.addEventListener('click', () => this.closeShopDrawer());
    this.bindDrawerDrag(this.shopPanelEl, () => this.closeShopDrawer(), [
      this.shopDrawerHandleEl,
      this.shopPanelEl.querySelector<HTMLElement>('.shop-heading')!
    ]);

    this.navButtons.forEach((button) => {
      button.addEventListener('click', () => {
        this.activeTab = button.dataset.tab as ShopTab;
        this.navButtons.forEach((navButton) => navButton.classList.toggle('is-active', navButton === button));
        this.collapseQuickMenu();
        if (this.activeTab === 'skills') {
          this.closeShopDrawer({ closeModal: false, clearActiveTabs: false });
          this.openSkillTreeModal();
        } else {
          this.openShopDrawer();
          this.closeModal();
        }
        this.updateShop();
      });
    });
  }

  private openShopDrawer(): void {
    this.shopPanelEl.classList.remove('is-hidden');
    this.shopDrawerBackdropEl.classList.remove('is-hidden');
  }

  private closeShopDrawer(options: { closeModal?: boolean; clearActiveTabs?: boolean } = {}): void {
    const { closeModal = true, clearActiveTabs = true } = options;
    this.shopPanelEl.classList.add('is-hidden');
    this.shopDrawerBackdropEl.classList.add('is-hidden');
    if (closeModal) {
      this.closeModal();
    }
    if (clearActiveTabs) {
      this.navButtons.forEach((button) => button.classList.remove('is-active'));
    }
    this.collapseQuickMenu();
  }

  private collapseQuickMenu(): void {
    this.bottomNavEl.classList.add('is-collapsed');
    this.menuToggleEl.classList.remove('is-active');
    this.menuToggleEl.setAttribute('aria-expanded', 'false');
  }

  private bindModalUi(): void {
    this.modalBackdropEl.addEventListener('click', () => this.closeModal());
    this.modalCloseEl.addEventListener('click', () => this.closeModal());
    this.modalHandleEl.addEventListener('click', () => this.closeModal());
    this.bindDrawerDrag(this.modalPanelEl, () => this.closeModal(), [
      this.modalHandleEl,
      this.modalPanelEl.querySelector<HTMLElement>('.ui-modal__header')!
    ]);
  }

  private bindDrawerDrag(panel: HTMLElement, close: () => void, handles: HTMLElement[]): void {
    let startY = 0;
    let startX = 0;
    let latestY = 0;
    let startTime = 0;
    let dragging = false;
    let tracking = false;
    let pointerId: number | null = null;
    let startedOnGrip = false;

    const clearDrag = (): void => {
      panel.classList.remove('is-dragging');
      panel.style.transform = '';
      if (pointerId !== null && panel.hasPointerCapture(pointerId)) {
        panel.releasePointerCapture(pointerId);
      }
      pointerId = null;
      tracking = false;
      startedOnGrip = false;
    };

    const onMove = (event: PointerEvent): void => {
      if (!tracking || event.pointerId !== pointerId) {
        return;
      }

      latestY = event.clientY;
      const pull = Math.max(0, latestY - startY);
      const horizontalDrift = Math.abs(event.clientX - startX);

      if (!dragging) {
        if (event.clientY < startY - 4) {
          clearDrag();
          return;
        }

        if (!startedOnGrip && panel.scrollTop > 0) {
          clearDrag();
          return;
        }

        if (pull < 10 || horizontalDrift > pull * 1.4) {
          return;
        }

        dragging = true;
        panel.classList.add('is-dragging');
      }

      panel.style.transform = `translateY(${pull}px)`;
      event.preventDefault();
    };

    const onEnd = (event: PointerEvent): void => {
      if (!tracking || event.pointerId !== pointerId) {
        return;
      }

      const pull = Math.max(0, latestY - startY);
      const elapsed = Math.max(1, performance.now() - startTime);
      const velocity = pull / elapsed;
      const shouldClose = dragging && (pull > 64 || velocity > 0.42);
      clearDrag();
      dragging = false;
      if (shouldClose) {
        close();
      }
    };

    const onStart = (event: PointerEvent): void => {
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;
      startedOnGrip = handles.some((handle) => handle.contains(target));
      if (!startedOnGrip && target.closest('button, input, select, textarea, a')) {
        return;
      }

      if (!startedOnGrip && panel.scrollTop > 0) {
        return;
      }

      pointerId = event.pointerId;
      tracking = true;
      dragging = false;
      startX = event.clientX;
      startY = event.clientY;
      latestY = event.clientY;
      startTime = performance.now();
      panel.setPointerCapture(event.pointerId);
    };

    panel.addEventListener('pointerdown', onStart);
    panel.addEventListener('pointermove', onMove);
    panel.addEventListener('pointerup', onEnd);
    panel.addEventListener('pointercancel', onEnd);
  }

  private bindSettingsUi(): void {
    this.audioSettings.bind(() => this.openSettingsModal());
  }

  private updateShop(): void {
    const nextSignature = [
      this.activeTab,
      Math.ceil(this.state.ship.hp),
      this.state.ship.maxHp,
      this.state.ship.armor,
      this.state.progression.passiveIncomeLevel,
      this.state.progression.shipDamageLevel,
      this.state.progression.shipSpeedLevel,
      this.state.progression.deflectorLevel,
      this.state.progression.mapUnlocked,
      this.state.progression.travelLevel,
      this.state.progression.currentZoneIndex,
      this.state.progression.unlockedZoneIndex,
      this.state.progression.bossDefeats,
      hasActiveZoneBoss(this.state),
      this.state.pendingBoss?.spawnIn.toFixed(1) ?? 'none',
      this.state.progression.prestigeCores,
      this.getCrystalBalance(),
      this.state.progression.dronesPurchased,
      this.state.progression.droneCounts.sentry,
      this.state.progression.droneCounts.ranger,
      this.state.progression.droneCounts.breaker,
      ...TALENT_DEFINITIONS.map((talent) => getTalentRank(this.state.progression, talent.id)),
      this.state.progression.weaponMode,
      this.state.progression.spreadUnlocked,
      this.state.progression.piercingUnlocked,
      this.getAffordabilitySignature(),
      countUnlockedAchievements(this.state.progression),
      ...ACHIEVEMENT_DEFINITIONS.map((def) => (isAchievementUnlocked(this.state.progression, def.id) ? 1 : 0))
    ].join(':');

    if (nextSignature === this.shopSignature) {
      return;
    }

    this.shopSignature = nextSignature;

    const renderers: Record<ShopTab, () => void> = {
      upgrades: () => this.renderUpgradesTab(),
      drones: () => this.renderDronesTab(),
      skills: () => this.renderSkillsTab(),
      weapons: () => this.renderWeaponsTab(),
      achievements: () => this.renderAchievementsTab()
    };

    renderers[this.activeTab]();

    if (this.activeModal === 'info' && this.activeModalInfo) {
      this.renderInfoModal();
    } else if (this.activeModal === 'skills') {
      this.renderSkillTreeModal();
    } else if (this.activeModal === 'zones') {
      this.renderZoneMapModal();
    } else if (this.activeModal === 'settings') {
      this.renderSettingsModal();
    }
  }

  private getAffordabilitySignature(): string {
    if (this.activeTab === 'upgrades') {
      const cost = this.scaledCost(balance.economy.passiveCost.base, this.state.progression.passiveIncomeLevel, balance.economy.passiveCost.scale);
      return `passive:${this.state.money >= cost},map:${this.state.progression.mapUnlocked || this.state.money >= balance.economy.mapUnlockCost},boss:${hasActiveZoneBoss(this.state)},warp:${this.getPrestigeGain() > 0}`;
    }

    if (this.activeTab === 'drones') {
      return this.getDroneTypes()
        .map((type) => `${type}:${this.state.money >= this.getDroneTypeCost(type)}`)
        .join(',');
    }

    if (this.activeTab === 'skills') {
      return TALENT_DEFINITIONS.map((talent) => {
        const rank = getTalentRank(this.state.progression, talent.id);
        return `${talent.id}:${rank}:${canBuyTalentRank(this.state.progression, this.getCrystalBalance(), talent.id)}`;
      }).join(',');
    }

    const hpCost = this.scaledCost(balance.shop.ship.hp.baseCost, Math.max(0, (this.state.progression.maxHp - 100) / balance.shop.ship.hp.gain), balance.shop.ship.hp.scale);
    const armorCost = this.scaledCost(balance.shop.ship.armor.baseCost, this.state.progression.armor / balance.shop.ship.armor.gain, balance.shop.ship.armor.scale);
    const damageCost = this.scaledCost(balance.shop.ship.damage.baseCost, this.state.progression.shipDamageLevel - 1, balance.shop.ship.damage.scale);
    const speedCost = this.scaledCost(balance.shop.ship.speed.baseCost, this.state.progression.shipSpeedLevel, balance.shop.ship.speed.scale);
    const deflectorCost = this.scaledCost(balance.shop.ship.deflector.baseCost, this.state.progression.deflectorLevel, balance.shop.ship.deflector.scale);
    return [
      `hp:${this.state.money >= hpCost}`,
      `armor:${this.state.money >= armorCost}`,
      `damage:${this.state.money >= damageCost}`,
      `speed:${this.state.money >= speedCost}`,
      `deflector:${this.state.money >= deflectorCost}`,
      `spread:${this.state.progression.spreadUnlocked || this.state.money >= balance.shop.ship.spreadShotCost}`,
      `piercing:${this.state.progression.piercingUnlocked || this.state.money >= balance.shop.ship.piercingRoundsCost}`
    ].join(',');
  }

  private renderUpgradesTab(): void {
    const level = this.state.progression.passiveIncomeLevel;
    const cost = this.scaledCost(balance.economy.passiveCost.base, level, balance.economy.passiveCost.scale);
    const prestigeGain = this.getPrestigeGain();
    const refineryMultiplier = getRefineryMilestoneMultiplier(level);
    const currentRate = level * balance.economy.passiveIncomePerLevel * refineryMultiplier;
    const nextLevel = level + 1;
    const nextRate = nextLevel * balance.economy.passiveIncomePerLevel * getRefineryMilestoneMultiplier(nextLevel);
    const currentZone = getExplorationZone(this.state);
    const nextZone = getNextZone(this.state);
    const bossActive = hasActiveZoneBoss(this.state);
    const bossCost = this.getBossCrystalCost();
    const crystals = this.getCrystalBalance();
    this.setShopContent(
      'Upgrades',
      'Constellation Route',
      '',
      [
        ['Level', level.toString()],
        ['Income', `${currentRate.toFixed(1)} / sec`],
        ['Overclock', `x${refineryMultiplier.toFixed(2)}`],
        ['Next burst', `lvl ${getRefineryNextMilestoneLevel(level)}`],
        ['Zone', currentZone.name],
        ['Map', this.state.progression.mapUnlocked ? 'Online' : 'Locked'],
        ['Unlocked', `${this.state.progression.unlockedZoneIndex + 1} / ${zones.length}`],
        ['Boss wins', this.state.progression.bossDefeats.toString()],
        ['Warp cores', this.state.progression.prestigeCores.toString()],
        ['Permanent', `x${getPrestigeMoneyMultiplier(this.state.progression).toFixed(2)}`]
      ],
      [
        {
          icon: 'MAP',
          title: 'Star Map',
          meta: this.state.progression.mapUnlocked ? 'Top route button online' : 'Unlocks route controls',
          label: this.state.progression.mapUnlocked ? 'Map Online' : `Unlock ${this.formatMoney(balance.economy.mapUnlockCost)}`,
          disabled: this.state.progression.mapUnlocked || this.state.money < balance.economy.mapUnlockCost,
          onClick: () => this.buyMapUnlock(),
          info: () => ({
            kicker: 'Navigation',
            title: 'Star Map',
            copy: 'Adds the compact top map control and exposes the constellation route without keeping a sector panel on screen.',
            facts: [
              ['Status', this.state.progression.mapUnlocked ? 'Online' : 'Locked'],
              ['Cost', this.formatMoney(balance.economy.mapUnlockCost)],
              ['Route', `${this.state.progression.unlockedZoneIndex + 1} / ${zones.length} nodes`]
            ]
          })
        },
        {
          icon: 'MAP',
          title: 'Zone Map',
          meta: `${currentZone.name} · x${currentZone.rewardMultiplier.toFixed(2)} credits`,
          label: 'Open Route',
          disabled: !this.state.progression.mapUnlocked,
          onClick: () => this.openZoneMapModal(),
          info: () => ({
            kicker: 'Route',
            title: 'Linear Constellation',
            copy: 'Previously unlocked nodes can be revisited at any time. Defeating the gate boss unlocks the next node.',
            facts: [
              ['Current zone', currentZone.name],
              ['Asteroid hulls', `x${currentZone.asteroidHpMultiplier.toFixed(2)}`],
              ['Next gate', nextZone ? nextZone.name : 'Route complete']
            ]
          })
        },
        {
          icon: 'BOSS',
          title: nextZone ? `Gate Boss: ${this.formatBossName(nextZone.bossType)}` : 'Route Complete',
          meta: nextZone ? `Unlocks ${nextZone.name}` : 'All known zones unlocked',
          label: bossActive ? 'Boss Active' : nextZone ? `Summon ${bossCost} crystals` : 'Complete',
          disabled: !nextZone || bossActive || crystals < bossCost,
          onClick: () => this.summonZoneBoss(),
          info: () => ({
            kicker: 'Gate',
            title: nextZone ? this.formatBossName(nextZone.bossType) : 'No Gate Remaining',
            copy: nextZone
              ? 'A boss encounter appears in the current playfield. Destroy it to open the next constellation node.'
              : 'The current route has no additional prepared nodes yet.',
            facts: [
              ['Next zone', nextZone ? nextZone.name : 'None'],
              ['Boss cycle', nextZone ? this.formatBossName(nextZone.bossType) : 'Complete'],
              ['Summon cost', nextZone ? `${bossCost} crystals` : 'None'],
              ['Reward', nextZone ? 'Credits, crystals, unlock' : 'None']
            ]
          })
        },
        {
          icon: '$',
          title: 'Ore Refinery',
          meta: `Current ${(level * balance.economy.passiveIncomePerLevel).toFixed(1)} / sec`,
          label: `Buy ${this.formatMoney(cost)}`,
          disabled: this.state.money < cost,
          onClick: () => this.buyPassiveIncome(cost),
          info: () => ({
            kicker: 'Upgrade',
            title: 'Ore Refinery',
            copy: 'Raises the passive credit stream and keeps the run moving while you work the combat side.',
            facts: [
              ['Current rate', `${currentRate.toFixed(1)} / sec`],
              ['Next rate', `${nextRate.toFixed(1)} / sec`],
              ['Milestone', `x${getRefineryMilestoneMultiplier(level).toFixed(2)}`]
            ]
          })
        },
        {
          icon: 'W',
          title: 'Warp Reset',
          meta: `${crystals} crystals banked`,
          label: `Warp Reset +${prestigeGain} Core${prestigeGain === 1 ? '' : 's'}`,
          disabled: prestigeGain <= 0,
          onClick: () => this.warpReset(prestigeGain),
          info: () => ({
            kicker: 'Prestige',
            title: 'Warp Reset',
            copy: 'Cashes in crystals for permanent warp cores and restarts the run with a stronger economy.',
            facts: [
              ['Core gain', prestigeGain.toString()],
              ['Permanent bonus', `x${getPrestigeMoneyMultiplier(this.state.progression).toFixed(2)}`],
              ['Reset scope', 'Money, crystals, upgrades, drones, route unlocks']
            ]
          })
        }
      ]
    );
  }

  private renderSkillsTab(): void {
    this.setShopContent(
      'Skills',
      'Talent Tree',
      'Spend crystals on connected nodes. Branches unlock after buying the matching drone type.',
      [
        ['Crystals', this.getCrystalBalance().toString()],
        ['Talents', countUnlockedTalentRanks(this.state.progression).toString()],
        ['Semi pierce', getSemiAutoPierceLeft(this.state.progression).toString()],
        ['Refinery', `x${getRefineryIncomeMultiplier(this.state.progression).toFixed(2)}`]
      ],
      [
        {
          icon: 'TREE',
          title: 'Talent Constellation',
          meta: `${countUnlockedTalentRanks(this.state.progression)} ranks unlocked`,
          label: 'Open Talent Tree',
          disabled: false,
          onClick: () => this.openSkillTreeModal()
        }
      ]
    );

    if (this.activeModal === 'skills') {
      this.renderSkillTreeModal();
    }
  }

  private renderDronesTab(): void {
    this.setShopContent(
      '',
      '',
      '',
      [
        ['Semi-Auto', this.state.progression.droneCounts.sentry.toString()],
        ['Shotgun', this.state.progression.droneCounts.ranger.toString()],
        ['Missile', this.state.progression.droneCounts.breaker.toString()]
      ],
      this.getDroneTypes().map((type) => {
        const config = balance.shop.drones[type];
        const cost = this.getDroneTypeCost(type);
        return {
          label: `${config.label} Drone ${this.formatMoney(cost)}`,
          disabled: this.state.money < cost,
          onClick: () => this.buyDrone(type, cost)
        };
      }),
      true
    );
  }

  private renderAchievementsTab(): void {
    const unlocked = countUnlockedAchievements(this.state.progression);
    this.shopPanelEl.classList.add('shop-panel--achievements');
    this.shopKickerEl.textContent = 'Conquistas';
    this.shopTitleEl.textContent = 'Registro de Feitos';
    this.shopCopyEl.textContent = 'Metas incrementais que concedem bônus globais permanentes.';
    this.shopCopyEl.classList.remove('is-hidden');
    this.shopStatsEl.replaceChildren(...[
      ['Desbloqueadas', `${unlocked} / ${ACHIEVEMENT_DEFINITIONS.length}`],
      ['Bônus ativos', getTotalAchievementBonusSummary(this.state.progression)],
      ['Créditos', `+${getAchievementBonusPercent(this.state.progression, 'money').toFixed(1)}%`],
      ['Combate', `+${getAchievementBonusPercent(this.state.progression, 'damage').toFixed(1)}%`]
    ].map(([label, value]) => {
      const stat = document.createElement('div');
      stat.className = 'shop-stat';
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      const valueEl = document.createElement('strong');
      valueEl.textContent = value;
      stat.append(labelEl, valueEl);
      return stat;
    }));

    const list = document.createElement('div');
    list.className = 'achievement-list';
    list.replaceChildren(
      ...ACHIEVEMENT_DEFINITIONS.map((def) => {
        const unlockedAchievement = isAchievementUnlocked(this.state.progression, def.id);
        const ratio = getAchievementProgressRatio(def, this.state.progression);
        const row = document.createElement('article');
        row.className = 'achievement-row';
        row.classList.toggle('achievement-row--unlocked', unlockedAchievement);

        const icon = document.createElement('span');
        icon.className = 'achievement-row__icon';
        icon.textContent = def.icon;

        const body = document.createElement('div');
        body.className = 'achievement-row__body';

        const header = document.createElement('div');
        header.className = 'achievement-row__header';
        const title = document.createElement('strong');
        title.textContent = def.name;
        const bonus = document.createElement('span');
        bonus.className = 'achievement-row__bonus';
        bonus.textContent = `+${def.bonusPercent}% ${ACHIEVEMENT_BONUS_LABELS[def.bonusCategory]}`;
        header.append(title, bonus);

        const description = document.createElement('p');
        description.className = 'achievement-row__copy';
        description.textContent = def.description;

        const progressTrack = document.createElement('div');
        progressTrack.className = 'achievement-row__progress';
        const progressFill = document.createElement('span');
        progressFill.style.width = `${Math.round(ratio * 100)}%`;
        progressTrack.append(progressFill);

        const progressLabel = document.createElement('span');
        progressLabel.className = 'achievement-row__progress-label';
        progressLabel.textContent = unlockedAchievement ? 'Completa' : formatAchievementProgress(def, this.state.progression);

        body.append(header, description, progressTrack, progressLabel);
        row.append(icon, body);
        return row;
      })
    );

    this.shopActionsEl.replaceChildren(list);
  }

  private renderWeaponsTab(): void {
    const hpCost = this.scaledCost(balance.shop.ship.hp.baseCost, Math.max(0, (this.state.progression.maxHp - 100) / balance.shop.ship.hp.gain), balance.shop.ship.hp.scale);
    const armorCost = this.scaledCost(balance.shop.ship.armor.baseCost, this.state.progression.armor / balance.shop.ship.armor.gain, balance.shop.ship.armor.scale);
    const damageCost = this.scaledCost(balance.shop.ship.damage.baseCost, this.state.progression.shipDamageLevel - 1, balance.shop.ship.damage.scale);
    const speedCost = this.scaledCost(balance.shop.ship.speed.baseCost, this.state.progression.shipSpeedLevel, balance.shop.ship.speed.scale);
    const deflectorCost = this.scaledCost(balance.shop.ship.deflector.baseCost, this.state.progression.deflectorLevel, balance.shop.ship.deflector.scale);
    this.setShopContent(
      'Weapons',
      'Ship Retrofit',
      '',
      [
        ['HP', `${Math.ceil(this.state.ship.hp)} / ${this.state.ship.maxHp}`],
        ['Armor', this.state.ship.armor.toString()],
        ['Damage', this.state.progression.shipDamageLevel.toString()],
        ['Speed', `+${this.state.progression.shipSpeedLevel * balance.shop.ship.speed.bonusPercentPerLevel}%`],
        ['Prow', this.state.progression.deflectorLevel.toString()],
        ['Weapon', this.formatWeaponMode(this.state.progression.weaponMode)]
      ],
      [
        { label: `HP +${balance.shop.ship.hp.gain} ${this.formatMoney(hpCost)}`, disabled: this.state.money < hpCost, onClick: () => this.buyHp(hpCost), info: () => this.getHpInfo() },
        { label: `Armor +${balance.shop.ship.armor.gain} ${this.formatMoney(armorCost)}`, disabled: this.state.money < armorCost, onClick: () => this.buyArmor(armorCost), info: () => this.getArmorInfo() },
        { label: `Damage ${this.formatMoney(damageCost)}`, disabled: this.state.money < damageCost, onClick: () => this.buyDamage(damageCost), info: () => this.getDamageInfo() },
        { label: `Speed ${this.formatMoney(speedCost)}`, disabled: this.state.money < speedCost, onClick: () => this.buySpeed(speedCost), info: () => this.getSpeedInfo() },
        { label: `Deflector ${this.formatMoney(deflectorCost)}`, disabled: this.state.money < deflectorCost, onClick: () => this.buyDeflector(deflectorCost), info: () => this.getDeflectorInfo() },
        { label: 'Cannon', disabled: this.state.progression.weaponMode === 'cannon', onClick: () => this.setWeaponMode('cannon'), info: () => this.getWeaponModeInfo('cannon') },
        {
          label: this.state.progression.spreadUnlocked ? 'Spread Shot' : `Spread Shot ${this.formatMoney(balance.shop.ship.spreadShotCost)}`,
          disabled: !this.state.progression.spreadUnlocked && this.state.money < balance.shop.ship.spreadShotCost,
          onClick: () => this.buyOrSetWeaponMode('spread', balance.shop.ship.spreadShotCost),
          info: () => this.getWeaponModeInfo('spread')
        },
        {
          label: this.state.progression.piercingUnlocked ? 'Piercing Rounds' : `Piercing Rounds ${this.formatMoney(balance.shop.ship.piercingRoundsCost)}`,
          disabled: !this.state.progression.piercingUnlocked && this.state.money < balance.shop.ship.piercingRoundsCost,
          onClick: () => this.buyOrSetWeaponMode('piercing', balance.shop.ship.piercingRoundsCost),
          info: () => this.getWeaponModeInfo('piercing')
        }
      ]
    );
  }

  private setShopContent(
    kicker: string,
    title: string,
    copy: string,
    stats: [string, string][],
    actions: ShopAction[],
    compact = false
  ): void {
    this.shopPanelEl.classList.toggle('shop-panel--compact', compact);
    this.shopPanelEl.classList.remove('shop-panel--achievements');
    this.shopKickerEl.textContent = kicker;
    this.shopTitleEl.textContent = title;
    this.shopCopyEl.textContent = copy;
    this.shopCopyEl.classList.toggle('is-hidden', copy.trim().length === 0);
    this.shopStatsEl.replaceChildren(...stats.map(([label, value]) => {
      const stat = document.createElement('div');
      stat.className = 'shop-stat';
      const labelEl = document.createElement('span');
      labelEl.textContent = label;
      const valueEl = document.createElement('strong');
      valueEl.textContent = value;
      stat.append(labelEl, valueEl);
      return stat;
    }));
    this.shopActionsEl.replaceChildren(...actions.map((action) => this.createShopActionNode(action)));
  }

  private createShopActionNode(action: ShopAction): HTMLElement {
    const row = document.createElement('div');
    row.className = 'shop-action-row';
    row.classList.toggle('shop-action-row--with-info', Boolean(action.info));

    const button = document.createElement('button');
    button.className = action.title ? 'shop-buy shop-buy--row' : 'shop-buy';
    button.type = 'button';
    button.disabled = action.disabled;

    if (action.title) {
      const icon = document.createElement('span');
      icon.className = 'shop-action-icon';
      icon.textContent = action.icon ?? '+';
      const body = document.createElement('span');
      body.className = 'shop-action-body';
      const title = document.createElement('strong');
      title.textContent = action.title;
      const meta = document.createElement('span');
      meta.className = 'shop-action-meta';
      meta.textContent = action.meta ?? '';
      body.append(title, meta);
      const cost = document.createElement('span');
      cost.className = 'shop-action-cost';
      cost.textContent = action.label;
      button.append(icon, body, cost);
    } else {
      button.textContent = action.label;
    }

    button.addEventListener('click', action.onClick);
    row.append(button);

    if (action.info) {
      const infoButton = document.createElement('button');
      infoButton.className = 'shop-info-button';
      infoButton.type = 'button';
      infoButton.setAttribute('aria-label', `Open ${action.title ?? action.label} details`);
      infoButton.textContent = 'i';
      infoButton.addEventListener('click', (event) => {
        event.stopPropagation();
        this.openInfoModal(action.info!());
      });
      row.append(infoButton);
    }

    return row;
  }

  private openInfoModal(info: ModalContent): void {
    this.activeModal = 'info';
    this.activeModalInfo = info;
    this.activeTalentTooltipId = null;
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.renderInfoModal();
  }

  private openSkillTreeModal(): void {
    this.activeModal = 'skills';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.renderSkillTreeModal();
  }

  private openZoneMapModal(): void {
    this.activeModal = 'zones';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.renderZoneMapModal();
  }

  private openSettingsModal(): void {
    this.activeModal = 'settings';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.audioSettings.setExpanded(true);
    this.renderSettingsModal();
  }

  private closeModal(): void {
    const wasSkillTree = this.activeModal === 'skills';
    this.activeModal = null;
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.audioSettings.setExpanded(false);
    this.modalEl.classList.add('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalBodyEl.replaceChildren();
    if (wasSkillTree && this.activeTab === 'skills') {
      this.navButtons.forEach((button) => button.classList.remove('is-active'));
    }
  }

  private renderSettingsModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map');
    this.modalPanelEl.classList.add('ui-modal__panel--settings');
    this.modalKickerEl.textContent = 'Audio';
    this.modalTitleEl.textContent = 'Sound Settings';
    this.modalCopyEl.textContent = '';
    this.modalCopyEl.classList.add('is-hidden');
    this.modalBodyEl.replaceChildren(...this.audioSettings.render());
  }

  private renderZoneMapModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--settings');
    this.modalPanelEl.classList.add('ui-modal__panel--skills', 'ui-modal__panel--map');
    this.modalKickerEl.textContent = '';
    this.modalTitleEl.textContent = '';
    this.modalCopyEl.textContent = '';
    this.modalCopyEl.classList.add('is-hidden');

    this.modalBodyEl.replaceChildren(this.zoneMap.render({
      currentZoneIndex: this.state.progression.currentZoneIndex,
      unlockedZoneIndex: this.state.progression.unlockedZoneIndex,
      onTravel: (zoneIndex) => this.travelToZone(zoneIndex)
    }));
  }

  private renderInfoModal(): void {
    const info = this.activeModalInfo;
    if (!info) {
      this.closeModal();
      return;
    }

    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalKickerEl.textContent = info.kicker;
    this.modalTitleEl.textContent = info.title;
    this.modalCopyEl.textContent = info.copy;
    this.modalCopyEl.classList.toggle('is-hidden', info.copy.trim().length === 0);

    this.modalBodyEl.replaceChildren(...this.infoModal.renderBody(info));
  }

  private renderSkillTreeModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalPanelEl.classList.add('ui-modal__panel--skills');
    this.modalKickerEl.textContent = 'Skills';
    this.modalTitleEl.textContent = 'Talent Constellation';
    this.modalCopyEl.textContent = `${this.getCrystalBalance()} crystals · ${countUnlockedTalentRanks(this.state.progression)} ranks · ${getSemiAutoPierceLeft(this.state.progression)} semi pierce`;
    this.modalCopyEl.classList.remove('is-hidden');

    this.modalBodyEl.replaceChildren(this.skillTreeModal.render({
      progression: this.state.progression,
      crystals: this.getCrystalBalance(),
      selectedTalentId: this.activeTalentTooltipId,
      onSelectTalent: (id) => this.selectSkillTreeTalent(id),
      onBuyTalent: (id) => this.buyTalent(id)
    }));
  }

  private selectSkillTreeTalent(id: TalentId | null): void {
    this.activeTalentTooltipId = id;
    const updated = this.skillTreeModal.selectTalent({
      progression: this.state.progression,
      crystals: this.getCrystalBalance(),
      selectedTalentId: this.activeTalentTooltipId,
      onSelectTalent: (nextId) => this.selectSkillTreeTalent(nextId),
      onBuyTalent: (talentId) => this.buyTalent(talentId)
    });

    if (!updated && this.activeModal === 'skills') {
      this.renderSkillTreeModal();
    }
  }

  private getHpInfo(): ModalContent {
    return {
      kicker: 'Retrofit',
      title: 'Hull HP',
      copy: 'Adds more buffer to the ship so a bad pass through a dense pocket does not collapse the run.',
      facts: [
        ['Current HP', `${Math.ceil(this.state.ship.hp)} / ${this.state.ship.maxHp}`],
        ['Next gain', `+${balance.shop.ship.hp.gain} HP`],
        ['Next cost', this.formatMoney(this.scaledCost(balance.shop.ship.hp.baseCost, Math.max(0, (this.state.progression.maxHp - 100) / balance.shop.ship.hp.gain), balance.shop.ship.hp.scale))]
      ]
    };
  }

  private getArmorInfo(): ModalContent {
    return {
      kicker: 'Retrofit',
      title: 'Armor Plating',
      copy: 'Cuts direct hits down before they reach the hull and gives the repair loop more room to breathe.',
      facts: [
        ['Current armor', this.state.ship.armor.toString()],
        ['Next gain', `+${balance.shop.ship.armor.gain} armor`],
        ['Next cost', this.formatMoney(this.scaledCost(balance.shop.ship.armor.baseCost, this.state.progression.armor / balance.shop.ship.armor.gain, balance.shop.ship.armor.scale))]
      ]
    };
  }

  private getDamageInfo(): ModalContent {
    return {
      kicker: 'Retrofit',
      title: 'Cannon Damage',
      copy: 'Improves the main gun so the player ship keeps pace with the thicker asteroid belts.',
      facts: [
        ['Current level', this.state.progression.shipDamageLevel.toString()],
        ['Shot damage', this.state.progression.shipDamageLevel.toString()],
        ['Next cost', this.formatMoney(this.scaledCost(balance.shop.ship.damage.baseCost, this.state.progression.shipDamageLevel - 1, balance.shop.ship.damage.scale))]
      ]
    };
  }

  private getSpeedInfo(): ModalContent {
    return {
      kicker: 'Retrofit',
      title: 'Flight Thrusters',
      copy: 'Raises drift control and repositioning speed, which matters more once the field becomes a resource grid.',
      facts: [
        ['Current bonus', `+${this.state.progression.shipSpeedLevel * balance.shop.ship.speed.bonusPercentPerLevel}%`],
        ['Next gain', `+${balance.shop.ship.speed.bonusPercentPerLevel}%`],
        ['Next cost', this.formatMoney(this.scaledCost(balance.shop.ship.speed.baseCost, this.state.progression.shipSpeedLevel, balance.shop.ship.speed.scale))]
      ]
    };
  }

  private getDeflectorInfo(): ModalContent {
    return {
      kicker: 'Retrofit',
      title: 'Deflector Prow',
      copy: 'Adds a forward bumper that helps the ship survive collisions while sweeping through debris lanes.',
      facts: [
        ['Current level', this.state.progression.deflectorLevel.toString()],
        ['Current armor', this.state.ship.armor.toString()],
        ['Next cost', this.formatMoney(this.scaledCost(balance.shop.ship.deflector.baseCost, this.state.progression.deflectorLevel, balance.shop.ship.deflector.scale))]
      ]
    };
  }

  private getWeaponModeInfo(mode: WeaponMode): ModalContent {
    if (mode === 'spread') {
      return {
        kicker: 'Weapon mode',
        title: 'Spread Shot',
        copy: 'Three-shot fan for crowd control when the asteroid density starts to outrun single-shot cleanup.',
        facts: [
          ['Status', this.state.progression.spreadUnlocked ? 'Unlocked' : `Locks at ${this.formatMoney(balance.shop.ship.spreadShotCost)}`],
          ['Pattern', 'Three shots'],
          ['Cooldown', `${balance.weapons.spreadFireInterval.toFixed(2)} sec`]
        ]
      };
    }

    if (mode === 'piercing') {
      return {
        kicker: 'Weapon mode',
        title: 'Piercing Rounds',
        copy: 'Faster single shots that punch through one target and make long lanes easier to clear.',
        facts: [
          ['Status', this.state.progression.piercingUnlocked ? 'Unlocked' : `Locks at ${this.formatMoney(balance.shop.ship.piercingRoundsCost)}`],
          ['Pierce', `${balance.weapons.piercingCount} asteroid`],
          ['Cooldown', `${(balance.weapons.playerFireInterval * balance.weapons.piercingCooldownMultiplier).toFixed(2)} sec`]
        ]
      };
    }

    return {
      kicker: 'Weapon mode',
      title: 'Cannon',
      copy: 'The baseline shot. Reliable, cheap, and still the best default when the run is early.',
      facts: [
        ['Status', 'Default'],
        ['Pattern', 'Single shot'],
        ['Cooldown', `${balance.weapons.playerFireInterval.toFixed(2)} sec`]
      ]
    };
  }

  private buyPassiveIncome(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.passiveIncomeLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyMapUnlock(): void {
    if (this.state.progression.mapUnlocked || !this.spend(balance.economy.mapUnlockCost)) {
      return;
    }

    this.state.progression.mapUnlocked = true;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private travelToZone(index: number): void {
    if (!isZoneUnlocked(this.state, index) || index === this.state.progression.currentZoneIndex || this.zoneTravel) {
      return;
    }

    this.closeModal();
    this.closeShopDrawer();
    this.state.asteroids = [];
    this.state.bullets = [];
    this.state.particles = [];
    this.state.saucer = null;
    this.state.pendingBoss = null;
    this.zoneTravel = {
      toIndex: index,
      elapsed: 0,
      duration: ZONE_TRAVEL_DURATION,
      direction: this.getZoneTravelDirection(index)
    };
    this.retroSound.play({ type: 'spaceTravel' });
  }

  private finishZoneTravel(index: number): void {
    this.state.progression.currentZoneIndex = index;
    this.state.progression.travelLevel = this.state.progression.unlockedZoneIndex;
    this.state.ship.position = { x: this.state.width / 2, y: this.state.height / 2 };
    this.state.ship.velocity = { x: 0, y: 0 };
    this.state.ship.invulnerableFor = Math.max(this.state.ship.invulnerableFor, 1.2);
    this.state.camera = { ...this.state.ship.position };
    this.state.drones.forEach((drone) => {
      drone.position = { ...this.state.ship.position };
    });
    this.state.asteroids = createAsteroidField(this.state);
    this.state.bullets = [];
    this.state.particles = [];
    this.state.saucer = null;
    this.retroSound.play({ type: 'zoneUnlocked' });
    saveGameState(this.state);
    this.updateHud();
  }

  private updateZoneTravel(dt: number): void {
    const travel = this.zoneTravel;
    if (!travel) {
      return;
    }

    travel.elapsed += dt;
    const progress = Math.min(1, travel.elapsed / travel.duration);
    const pulse = Math.sin(progress * Math.PI);
    const travelVelocity = {
      x: travel.direction.x * (1100 + pulse * 2200),
      y: travel.direction.y * (1100 + pulse * 2200)
    };

    this.state.width = this.scale.width;
    this.state.height = this.scale.height;
    this.starfield.update(dt, travelVelocity, { progress, direction: travel.direction });
    this.vectorRenderer.clear();
    this.updateHud();
    this.updateDeathFade();

    if (progress < 1) {
      return;
    }

    const nextIndex = travel.toIndex;
    this.zoneTravel = null;
    this.finishZoneTravel(nextIndex);
  }

  private getZoneTravelDirection(index: number): Vec2 {
    const current = zones[this.state.progression.currentZoneIndex];
    const next = zones[index];
    if (!current || !next) {
      return { x: 1, y: 0 };
    }

    const dx = next.map.x - current.map.x;
    const dy = next.map.y - current.map.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    return { x: dx / length, y: dy / length };
  }

  private summonZoneBoss(): void {
    const cost = this.getBossCrystalCost();
    const pendingBoss = createPendingZoneBoss(this.state);
    if (!pendingBoss || !this.spendCrystals(cost)) {
      return;
    }

    this.state.asteroids = this.state.asteroids.filter((asteroid) => !asteroid.bossType);
    this.state.pendingBoss = pendingBoss;
    this.closeShopDrawer();
    emitReward(this.state, `${this.formatBossName(pendingBoss.bossType)} arriving in 3 sec`, 'boss');
    this.retroSound.play({ type: 'bossSummoned' });
    saveGameState(this.state);
    this.updateHud();
  }

  private warpReset(coreGain: number): void {
    if (coreGain <= 0) {
      return;
    }

    this.state = createWarpResetState(this.state, this.scale.width, this.scale.height, coreGain);
    this.offlineStatusFor = 0;
    this.activeTalentTooltipId = null;
    this.shopSignature = '';
    this.retroSound.play({ type: 'warpReset' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyDrone(type: DroneType, cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.dronesPurchased += 1;
    this.state.progression.droneCounts[type] += 1;
    this.state.drones.push(createDrone(this.state, type));
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyTalent(id: TalentId): void {
    if (!purchaseTalentRank(this.state, id)) {
      return;
    }

    this.shopSignature = '';
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyHp(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.maxHp += balance.shop.ship.hp.gain;
    const effectiveMaxHp = getEffectiveMaxHp(this.state.progression);
    const hpGain = effectiveMaxHp - this.state.ship.maxHp;
    this.state.ship.maxHp = effectiveMaxHp;
    this.state.ship.hp += hpGain;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyArmor(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.armor += balance.shop.ship.armor.gain;
    this.state.ship.armor += balance.shop.ship.armor.gain;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyDamage(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.shipDamageLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buySpeed(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.shipSpeedLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyDeflector(cost: number): void {
    if (!this.spend(cost)) {
      return;
    }
    this.state.progression.deflectorLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private buyOrSetWeaponMode(mode: Exclude<WeaponMode, 'cannon'>, cost: number): void {
    const unlockKey = mode === 'spread' ? 'spreadUnlocked' : 'piercingUnlocked';
    if (!this.state.progression[unlockKey]) {
      if (!this.spend(cost)) {
        return;
      }
      this.state.progression[unlockKey] = true;
      this.retroSound.play({ type: 'purchase' });
    }

    this.setWeaponMode(mode);
  }

  private setWeaponMode(mode: WeaponMode): void {
    if (mode === 'spread' && !this.state.progression.spreadUnlocked) {
      return;
    }
    if (mode === 'piercing' && !this.state.progression.piercingUnlocked) {
      return;
    }

    this.state.progression.weaponMode = mode;
    saveGameState(this.state);
    this.updateHud();
  }

  private spend(cost: number): boolean {
    if (this.state.money < cost) {
      return false;
    }
    this.state.money -= cost;
    return true;
  }

  private spendCrystals(cost: number): boolean {
    const spent = spendStateCrystals(this.state, cost);
    if (spent) {
      this.shopSignature = '';
    }
    return spent;
  }

  private scaledCost(baseCost: number, level: number, scale: number): number {
    return Math.round(baseCost * scale ** level);
  }

  private getDroneTypes(): DroneType[] {
    return ['sentry', 'ranger', 'breaker'];
  }

  private getDroneTypeCost(type: DroneType): number {
    const config = balance.shop.drones[type];
    return this.scaledCost(config.baseCost, this.state.progression.droneCounts[type], config.scale);
  }

  private formatWeaponMode(mode: WeaponMode): string {
    if (mode === 'spread') {
      return 'Spread';
    }
    if (mode === 'piercing') {
      return 'Piercing';
    }
    return 'Cannon';
  }

  private formatBossName(type: BossType): string {
    return type === 'sentinel' ? 'Star Sentinel' : 'Gravity Crusher';
  }

  private getPrestigeGain(): number {
    return getPrestigeCoreGain(this.state);
  }

  private getBossCrystalCost(): number {
    const nextZone = getNextZone(this.state);
    return nextZone ? balance.economy.bossCrystalCost.base + nextZone.index * balance.economy.bossCrystalCost.perZone : 0;
  }

  private formatMoney(value: number): string {
    return `$${Math.floor(value).toLocaleString('en-US')}`;
  }

  private formatSector(): string {
    const zone = getExplorationZone(this.state);
    const sectorSize = 2200;
    const sectorX = Math.floor(this.state.ship.position.x / sectorSize);
    const sectorY = Math.floor(this.state.ship.position.y / sectorSize);
    return `${zone.name} ${sectorX},${sectorY}`;
  }
}
