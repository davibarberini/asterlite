import Phaser from 'phaser';
import { neutralInput, type InputActions } from '../../game/input/actions';
import { getCrystalBalance as getStateCrystalBalance, purchaseTalentRank } from '../../game/progression/currency';
import { clearAllAsteridleData, loadGameState, saveGameState } from '../../game/progression/saveData';
import { emitReward } from '../../game/simulation/events';
import { createDrone, createGameState, syncShieldBubbleState } from '../../game/simulation/state';
import { createAsteroidField, createPendingZoneBoss, hasActiveZoneBoss } from '../../game/simulation/systems/asteroids';
import type { BossType, DroneType, GameState, TalentId, Vec2, WarpUnlockId, WeaponMode } from '../../game/simulation/types';
import { getCoreUpgradeCap, getFireRateMultiplier, getPlayerFireInterval, getRefineryMilestoneMultiplier } from '../../game/progression/idleBonuses';
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
import { createWarpResetState, crystalsPerPrestigeCore, getPrestigeCoreGain, minimumPrestigeTravelLevel } from '../../game/progression/prestige';
import { getFirstWarpGoal } from '../../game/progression/firstWarpGoal';
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
import { WarpCoreTreeController } from '../ui/WarpCoreTreeController';
import { ZoneMapController } from '../ui/ZoneMapController';
import { Starfield } from '../view/Starfield';
import { VectorRenderer } from '../view/VectorRenderer';
import { balance } from '../../game/balance';
import { WARP_UNLOCK_BY_ID, WARP_UNLOCK_DEFINITIONS, getAvailableWarpCores, getOwnedWarpUnlockCount, hasWarpUnlock, purchaseWarpUnlock } from '../../game/progression/warpUnlocks';
import { formatCoreUnit, formatCrystalUnit, getBrowserLanguage, getSavedLanguage, saveLanguage, translate, type LanguageCode } from '../../game/i18n';

type ShopTab = 'upgrades' | 'warp' | 'drones' | 'skills' | 'weapons' | 'achievements';
type DockTab = ShopTab | 'map';

type ShopAction = {
  label: string;
  disabled: boolean;
  onClick: () => boolean | void;
  icon?: string;
  title?: string;
  meta?: string;
  repeatable?: boolean;
  info?: () => ModalContent;
};

const SLINGSHOT_MAX_DRAG_MOBILE = 150;
const SLINGSHOT_MAX_DRAG_DESKTOP = 172;
const SLINGSHOT_DEADZONE_MOBILE = 58;
const SLINGSHOT_DEADZONE_DESKTOP = 24;
const ZONE_TRAVEL_DURATION = 1.6;
const INTRO_WARP_DURATION = 1.45;
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
  private warpCoreTree!: WarpCoreTreeController;
  private zoneMap!: ZoneMapController;
  private appEl!: HTMLElement;
  private mainMenuEl!: HTMLElement;
  private mainMenuSubtitleEl!: HTMLElement;
  private mainMenuLanguageLabelEl!: HTMLElement;
  private mainMenuStartEl!: HTMLButtonElement;
  private languageButtons!: NodeListOf<HTMLButtonElement>;
  private moneyKickerEl!: HTMLElement;
  private moneyEl!: HTMLElement;
  private crystalsEl!: HTMLElement;
  private deathFadeEl!: HTMLElement;
  private lowHpVeilEl!: HTMLElement;
  private sectorEl!: HTMLElement;
  private hpMeterEl!: HTMLElement;
  private hpEl!: HTMLElement;
  private statusEl!: HTMLElement;
  private firstWarpGoalEl!: HTMLElement;
  private firstWarpGoalTitleEl!: HTMLElement;
  private firstWarpGoalProgressEl!: HTMLElement;
  private firstWarpGoalProgressTextEl!: HTMLElement;
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
  private activeModal: 'info' | 'skills' | 'warpCores' | 'zones' | 'settings' | null = null;
  private activeModalInfo: ModalContent | null = null;
  private activeTalentTooltipId: TalentId | null = null;
  private activeWarpUnlockId: WarpUnlockId | null = null;
  private activeGameplayPointerId: number | null = null;
  private gameplayPointerStartScreen: Vec2 | null = null;
  private gameplayPointerScreen: Vec2 | null = null;
  private shopSignature = '';
  private saveElapsed = 0;
  private offlineStatusFor = 0;
  private gameplayTimeScale = 1;
  private hasSavedLanguage = getSavedLanguage() !== null;
  private language: LanguageCode = getSavedLanguage() ?? getBrowserLanguage();
  private gameStarted = false;
  private introWarp: { elapsed: number; duration: number; direction: Vec2 } | null = null;
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

    this.appEl = document.getElementById('app')!;
    this.mainMenuEl = document.getElementById('main-menu')!;
    this.mainMenuSubtitleEl = document.getElementById('main-menu-subtitle')!;
    this.mainMenuLanguageLabelEl = document.getElementById('main-menu-language-label')!;
    this.mainMenuStartEl = document.getElementById('main-menu-start') as HTMLButtonElement;
    this.languageButtons = document.querySelectorAll<HTMLButtonElement>('.main-menu__language');
    this.moneyKickerEl = document.getElementById('money-kicker')!;
    this.moneyEl = document.getElementById('money')!;
    this.crystalsEl = document.getElementById('crystals')!;
    this.deathFadeEl = document.getElementById('death-fade')!;
    this.lowHpVeilEl = document.getElementById('low-hp-veil')!;
    this.sectorEl = document.getElementById('sector')!;
    this.hpMeterEl = document.getElementById('hp-meter')!;
    this.hpEl = document.getElementById('hp')!;
    this.statusEl = document.getElementById('status')!;
    this.firstWarpGoalEl = document.getElementById('first-warp-goal')!;
    this.firstWarpGoalTitleEl = document.getElementById('first-warp-goal-title')!;
    this.firstWarpGoalProgressEl = document.getElementById('first-warp-goal-progress')!;
    this.firstWarpGoalProgressTextEl = document.getElementById('first-warp-goal-progress-text')!;
    this.rewardFeed = new RewardFeedController(document.getElementById('reward-feed')!);
    this.audioSettings = new AudioSettingsController(document.getElementById('settings-toggle') as HTMLButtonElement, {
      setSfxVolume: (volume) => this.retroSound.setVolume(volume),
      setMusicVolume: (volume) => this.backgroundMusic.setVolume(volume)
    });
    this.infoModal = new InfoModalController();
    this.skillTreeModal = new SkillTreeModalController();
    this.warpCoreTree = new WarpCoreTreeController();
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
    this.bindMainMenuUi();
    this.applyLanguage();
    this.showMainMenu();

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
    if (!this.gameStarted) {
      this.updateIntro(rawDt);
      return;
    }

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
    return target instanceof Element && target.closest('#main-menu, #idle-dock, #ui-modal, .hud-right-cluster') !== null;
  }

  private bindMainMenuUi(): void {
    this.languageButtons.forEach((button) => {
      button.addEventListener('click', () => {
        const nextLanguage = button.dataset.language as LanguageCode | undefined;
        if (nextLanguage !== 'pt-BR' && nextLanguage !== 'en-US') {
          return;
        }
        this.language = nextLanguage;
        this.hasSavedLanguage = true;
        saveLanguage(this.language);
        this.applyLanguage();
        this.shopSignature = '';
        this.updateHud();
      });
    });

    this.mainMenuStartEl.addEventListener('click', () => this.startIntroWarp());
  }

  private showMainMenu(): void {
    this.appEl.classList.add('is-menu-open');
    this.mainMenuEl.classList.remove('is-hidden', 'is-warping');
    this.mainMenuEl.setAttribute('aria-hidden', 'false');
    this.mainMenuStartEl.disabled = false;
    this.mainMenuEl.classList.toggle('main-menu--language-saved', this.hasSavedLanguage);
  }

  private startIntroWarp(): void {
    if (this.gameStarted || this.introWarp) {
      return;
    }

    saveLanguage(this.language);
    this.hasSavedLanguage = true;
    this.applyLanguage();
    this.retroSound.unlock();
    this.backgroundMusic.unlock();
    this.retroSound.play({ type: 'spaceTravel' });
    this.mainMenuEl.classList.add('is-warping');
    this.mainMenuStartEl.disabled = true;
    this.mainMenuStartEl.textContent = translate(this.language, 'menu.warping');
    this.introWarp = {
      elapsed: 0,
      duration: INTRO_WARP_DURATION,
      direction: { x: 1, y: -0.18 }
    };
  }

  private updateIntro(dt: number): void {
    if (!this.introWarp) {
      this.starfield.update(dt, { x: 14, y: -4 });
      this.vectorRenderer.clear();
      return;
    }

    this.introWarp.elapsed += dt;
    const progress = Math.min(1, this.introWarp.elapsed / this.introWarp.duration);
    const pulse = Math.sin(progress * Math.PI);
    const velocity = {
      x: this.introWarp.direction.x * (1200 + pulse * 2600),
      y: this.introWarp.direction.y * (1200 + pulse * 2600)
    };
    this.starfield.update(dt, velocity, { progress, direction: this.introWarp.direction });
    this.vectorRenderer.clear();

    if (progress < 1) {
      return;
    }

    this.finishIntroWarp();
  }

  private finishIntroWarp(): void {
    this.introWarp = null;
    this.gameStarted = true;
    this.appEl.classList.remove('is-menu-open');
    this.mainMenuEl.classList.add('is-hidden');
    this.mainMenuEl.setAttribute('aria-hidden', 'true');
    this.mainMenuStartEl.disabled = false;
    this.updateHud();
  }

  private applyLanguage(): void {
    document.documentElement.lang = this.language;
    this.mainMenuSubtitleEl.textContent = translate(this.language, this.hasSavedLanguage ? 'menu.subtitleSaved' : 'menu.subtitle');
    this.mainMenuLanguageLabelEl.textContent = translate(this.language, 'menu.language');
    this.mainMenuStartEl.textContent = translate(this.language, this.hasExistingSave() ? 'menu.continue' : 'menu.start');
    this.mainMenuEl.classList.toggle('main-menu--language-saved', this.hasSavedLanguage);
    this.languageButtons.forEach((button) => {
      const buttonLanguage = button.dataset.language as LanguageCode | undefined;
      const active = buttonLanguage === this.language;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
      if (buttonLanguage === 'pt-BR') {
        button.textContent = translate(this.language, 'menu.portuguese');
      } else if (buttonLanguage === 'en-US') {
        button.textContent = translate(this.language, 'menu.english');
      }
    });
    this.moneyKickerEl.textContent = translate(this.language, 'hud.money');
    this.firstWarpGoalEl.setAttribute('aria-label', translate(this.language, 'hud.currentObjective'));
    const kicker = this.firstWarpGoalEl.querySelector<HTMLElement>('.first-warp-goal__kicker');
    if (kicker) {
      kicker.textContent = translate(this.language, 'hud.next');
    }
    this.hpMeterEl.setAttribute('aria-label', translate(this.language, 'hud.shipHull'));
    this.mapToggleEl.setAttribute('aria-label', translate(this.language, 'hud.openZoneMap'));
    this.mapToggleEl.title = translate(this.language, 'hud.openZoneMap');
    this.menuToggleEl.setAttribute('aria-label', translate(this.language, 'hud.openUpgrades'));
    this.bottomNavEl.setAttribute('aria-label', translate(this.language, 'hud.shopTabs'));
    document.getElementById('idle-dock')?.setAttribute('aria-label', translate(this.language, 'hud.idleSystems'));
    this.shopDrawerBackdropEl.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    this.shopDrawerHandleEl.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    document.getElementById('shop-close')?.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    document.getElementById('settings-toggle')?.setAttribute('aria-label', translate(this.language, 'hud.openSettings'));
  }

  private hasExistingSave(): boolean {
    return (
      this.state.money > 0 ||
      this.state.crystals > 0 ||
      this.state.progression.achievementStats.asteroidsDestroyed > 0 ||
      this.state.progression.prestigeCores > 0 ||
      this.state.progression.ownedWarpUnlockIds.length > 0
    );
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

  private getVisibleShopTabs(): ShopTab[] {
    const tabs: ShopTab[] = ['upgrades'];

    if (this.shouldShowTechnologiesTab()) {
      tabs.push('warp');
    }
    if (this.shouldShowDronesTab()) {
      tabs.push('drones');
    }
    if (this.shouldShowSkillsTab()) {
      tabs.push('skills');
    }
    if (this.shouldShowWeaponsTab()) {
      tabs.push('weapons');
    }
    if (this.shouldShowAchievementsTab()) {
      tabs.push('achievements');
    }

    return tabs;
  }

  private getVisibleDockTabs(): DockTab[] {
    const tabs: DockTab[] = ['upgrades'];
    if (this.state.progression.mapUnlocked) {
      tabs.push('map');
    }
    this.getVisibleShopTabs().forEach((tab) => {
      if (tab !== 'upgrades') {
        tabs.push(tab);
      }
    });
    return tabs;
  }

  private isShopTabVisible(tab: ShopTab): boolean {
    return this.getVisibleShopTabs().includes(tab);
  }

  private shouldShowTechnologiesTab(): boolean {
    return (
      this.state.progression.prestigeCores > 0 ||
      getOwnedWarpUnlockCount(this.state.progression) > 0 ||
      getAvailableWarpCores(this.state.progression) > 0 ||
      this.getPrestigeGain() > 0
    );
  }

  private shouldShowDronesTab(): boolean {
    return hasWarpUnlock(this.state.progression, 'droneSystems') || this.state.progression.dronesPurchased > 0;
  }

  private shouldShowSkillsTab(): boolean {
    return (
      this.state.progression.achievementStats.crystalsCollected > 0 ||
      this.getCrystalBalance() > 0 ||
      countUnlockedTalentRanks(this.state.progression) > 0
    );
  }

  private shouldShowWeaponsTab(): boolean {
    return this.state.progression.spreadUnlocked || this.state.progression.piercingUnlocked || this.state.progression.weaponMode !== 'cannon';
  }

  private shouldShowAchievementsTab(): boolean {
    return countUnlockedAchievements(this.state.progression) > 0;
  }

  private syncVisibleShopTabs(): void {
    const visibleTabs = new Set(this.getVisibleShopTabs());
    const visibleDockTabs = new Set(this.getVisibleDockTabs());
    if (!visibleTabs.has(this.activeTab)) {
      if (this.activeModal === 'skills' || this.activeModal === 'warpCores') {
        this.closeModal();
      }
      this.activeTab = 'upgrades';
      this.activeTalentTooltipId = null;
      this.activeWarpUnlockId = null;
    }

    this.navButtons.forEach((button) => {
      const tab = button.dataset.tab as DockTab;
      const visible = visibleDockTabs.has(tab);
      button.hidden = !visible;
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
      button.classList.toggle('is-active', visible && tab !== 'map' && tab === this.activeTab && !this.shopPanelEl.classList.contains('is-hidden'));
      button.setAttribute('aria-label', this.getDockTabLabel(tab));
      button.title = this.getDockTabLabel(tab);
      button.replaceChildren(this.createShopTabIcon(tab), this.createNavButtonLabel(tab));
    });
  }

  private createNavButtonLabel(tab: DockTab): HTMLElement {
    const label = document.createElement('span');
    label.className = 'nav-button__label';
    label.textContent = this.getDockTabLabel(tab);
    return label;
  }

  private createShopTabIcon(tab: DockTab): SVGSVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', `nav-button__icon nav-button__icon--${tab}`);
    svg.setAttribute('viewBox', '0 0 32 32');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');

    const append = (node: SVGElement): void => {
      svg.append(node);
    };
    const path = (d: string): SVGPathElement => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      node.setAttribute('d', d);
      return node;
    };
    const line = (x1: number, y1: number, x2: number, y2: number): SVGLineElement => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      node.setAttribute('x1', x1.toString());
      node.setAttribute('y1', y1.toString());
      node.setAttribute('x2', x2.toString());
      node.setAttribute('y2', y2.toString());
      return node;
    };
    const circle = (cx: number, cy: number, r: number): SVGCircleElement => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      node.setAttribute('cx', cx.toString());
      node.setAttribute('cy', cy.toString());
      node.setAttribute('r', r.toString());
      return node;
    };
    const rect = (x: number, y: number, width: number, height: number): SVGRectElement => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      node.setAttribute('x', x.toString());
      node.setAttribute('y', y.toString());
      node.setAttribute('width', width.toString());
      node.setAttribute('height', height.toString());
      node.setAttribute('rx', '2');
      return node;
    };

    if (tab === 'upgrades') {
      append(path('M16 3 23 25 16 20 9 25 16 3Z'));
      append(path('M12 18 7 21 9 26'));
      append(path('M20 18 25 21 23 26'));
      append(circle(16, 13, 2.4));
      append(line(16, 20, 16, 28));
      append(path('M12 27 C14 25 18 25 20 27'));
      return svg;
    }
    if (tab === 'map') {
      append(path('M6 8 13 5 20 8 26 5 V24 L20 27 13 24 6 27 V8Z'));
      append(path('M13 5 V24'));
      append(path('M20 8 V27'));
      append(path('M8 12 C10 10 12 11 13 13'));
      append(path('M15 19 C17 16 19 17 22 14'));
      append(circle(22, 14, 1.7));
      append(circle(9, 12, 1.2));
      return svg;
    }
    if (tab === 'warp') {
      append(path('M16 3 24 24 16 18 8 24 16 3Z'));
      append(circle(16, 14.5, 4.2));
      append(circle(16, 14.5, 1.2));
      append(path('M11 24 8 29'));
      append(path('M21 24 24 29'));
      append(path('M12 27 C14 25 18 25 20 27'));
      append(path('M7 9 C10 6 13 5 16 5'));
      append(path('M25 9 C22 6 19 5 16 5'));
      return svg;
    }
    if (tab === 'drones') {
      append(path('M12 12 H20 V20 H12 V12Z'));
      append(circle(16, 16, 2));
      append(circle(7, 16, 3.2));
      append(circle(25, 16, 3.2));
      append(circle(16, 7, 3.2));
      append(circle(16, 25, 3.2));
      append(line(12, 16, 10.2, 16));
      append(line(20, 16, 21.8, 16));
      append(line(16, 12, 16, 10.2));
      append(line(16, 20, 16, 21.8));
      append(path('M5 13 3 11'));
      append(path('M27 13 29 11'));
      append(path('M13 5 11 3'));
      append(path('M19 27 21 29'));
      return svg;
    }
    if (tab === 'skills') {
      append(path('M10 25 C12 20 12 13 9 6'));
      append(path('M22 25 C20 20 20 13 23 6'));
      append(path('M12 21 H20'));
      append(path('M13 15 H19'));
      append(path('M14 9 H18'));
      append(path('M9 25 6 29'));
      append(path('M23 25 26 29'));
      append(path('M13 25 C14 27 18 27 19 25'));
      append(circle(16, 15, 1.4));
      return svg;
    }
    if (tab === 'weapons') {
      append(path('M7 23 21 8 25 12 11 27 7 23Z'));
      append(path('M18 9 24 15'));
      append(path('M6 19 13 26'));
      append(path('M21 7 25 3'));
      append(path('M24 10 29 8'));
      append(circle(26, 6, 1.4));
      return svg;
    }

    append(path('M10 6 H22 V11 C22 16.5 19 20 16 21.5 C13 20 10 16.5 10 11 V6Z'));
    append(path('M13 10 H19'));
    append(path('M16 8 V18'));
    append(path('M12 22 H20'));
    append(path('M14 26 H18'));
    append(path('M8 9 H5 C5 14 8 16.5 10 16.5'));
    append(path('M24 9 H27 C27 14 24 16.5 22 16.5'));
    append(path('M11 29 H21'));
    return svg;
  }

  private getShopTabLabel(tab: ShopTab): string {
    if (tab === 'warp') {
      return translate(this.language, 'nav.technologies');
    }
    if (tab === 'drones') {
      return translate(this.language, 'nav.drones');
    }
    if (tab === 'skills') {
      return translate(this.language, 'nav.skills');
    }
    if (tab === 'weapons') {
      return translate(this.language, 'nav.weapons');
    }
    if (tab === 'achievements') {
      return translate(this.language, 'nav.achievements');
    }
    return translate(this.language, 'nav.upgrades');
  }

  private getDockTabLabel(tab: DockTab): string {
    if (tab === 'map') {
      return translate(this.language, 'hud.openZoneMap');
    }
    return this.getShopTabLabel(tab);
  }

  private updateHud(): void {
    const crystals = this.getCrystalBalance();
    this.setText(this.moneyEl, this.formatMoney(this.state.money));
    this.setText(this.crystalsEl, `${crystals} ${formatCrystalUnit(this.language, crystals)}`);
    this.setText(this.sectorEl, this.formatSector());
    this.mapToggleEl.disabled = !this.state.progression.mapUnlocked;
    this.mapToggleEl.classList.toggle('is-locked', !this.state.progression.mapUnlocked);
    const hpPercent = Math.max(0, Math.min(1, this.state.ship.hp / Math.max(1, this.state.ship.maxHp)));
    this.hpMeterEl.style.setProperty('--hp-fill', `${Math.round(hpPercent * 100)}%`);
    this.updateLowHpVeil(hpPercent);
    this.setText(this.hpEl, `${Math.ceil(this.state.ship.hp)} / ${this.state.ship.maxHp}`);

    if (this.offlineStatusFor > 0) {
      this.setText(this.statusEl, translate(this.language, 'status.offline', { amount: this.formatMoney(this.state.lastOfflineEarnings) }));
    } else if (this.state.phase === 'respawning') {
      this.setText(this.statusEl, translate(this.language, 'status.destroyed', { amount: this.formatMoney(this.state.lastRepairCost), seconds: Math.ceil(this.state.ship.respawnFor) }));
    } else if (this.state.droneRebootFor > 0) {
      this.setText(this.statusEl, translate(this.language, 'status.droneReboot', { seconds: Math.ceil(this.state.droneRebootFor) }));
    } else if (this.state.deathPenaltyFor > 0) {
      this.setText(this.statusEl, translate(this.language, 'status.refineryReduced', { seconds: Math.ceil(this.state.deathPenaltyFor) }));
    } else if (this.state.ship.invulnerableFor > 0) {
      this.setText(this.statusEl, translate(this.language, 'status.shieldActive'));
    } else if (hasWarpUnlock(this.state.progression, 'shieldBubble') && this.state.shieldBubble.broken) {
      this.setText(this.statusEl, translate(this.language, 'status.shieldRecharge', { seconds: Math.ceil(this.state.shieldBubble.rechargeFor) }));
    } else if (hasWarpUnlock(this.state.progression, 'shieldBubble') && this.state.shieldBubble.active) {
      this.setText(this.statusEl, translate(this.language, 'status.shieldReady'));
    } else if (this.state.progression.unlockedZoneIndex === 0 && !hasActiveZoneBoss(this.state)) {
      const remaining = Math.max(0, balance.bosses.firstGateAsteroids - this.state.progression.achievementStats.asteroidsDestroyed);
      this.setText(this.statusEl, remaining > 0 ? translate(this.language, 'status.firstBossCountdown', { remaining }) : translate(this.language, 'status.firstBossDetected'));
    } else {
      this.setText(this.statusEl, translate(this.language, 'status.default'));
    }

    this.syncVisibleShopTabs();
    this.updateFirstWarpGoal();
    this.updateShop();
  }

  private updateFirstWarpGoal(): void {
    const goal = getFirstWarpGoal(this.state);
    this.firstWarpGoalEl.classList.toggle('is-hidden', goal === null);
    this.firstWarpGoalEl.classList.toggle('is-muted', this.isBlockingDrawerOpen());
    if (!goal) {
      return;
    }

    this.setText(this.firstWarpGoalTitleEl, this.getFirstWarpGoalTitle(goal));
    this.setText(this.firstWarpGoalProgressTextEl, this.getFirstWarpGoalProgressLabel(goal));
    this.firstWarpGoalProgressEl.style.setProperty('--goal-progress', `${Math.round(goal.progress * 100)}%`);
  }

  private getFirstWarpGoalTitle(goal: NonNullable<ReturnType<typeof getFirstWarpGoal>>): string {
    return translate(this.language, `goal.${goal.type}`);
  }

  private getFirstWarpGoalProgressLabel(goal: NonNullable<ReturnType<typeof getFirstWarpGoal>>): string {
    if (goal.type === 'installDroneSystems') {
      return translate(this.language, 'goal.cores', {
        current: goal.availableCores ?? 0,
        target: goal.firstTechnologyCost ?? 1
      });
    }
    if (goal.type === 'warpForFirstCore') {
      const count = goal.coreGain ?? 0;
      return translate(this.language, 'goal.coreReady', { count, unit: formatCoreUnit(this.language, count) });
    }
    if (goal.type === 'defeatGateBoss') {
      return translate(this.language, 'goal.bossActive');
    }
    if (goal.type === 'drawGateBoss') {
      return translate(this.language, 'goal.asteroids', {
        current: goal.destroyed ?? 0,
        target: goal.asteroidTarget ?? 1
      });
    }
    return translate(this.language, 'goal.crystals', {
      current: goal.crystals ?? 0,
      target: goal.crystalTarget ?? crystalsPerPrestigeCore
    });
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
        const nextTab = button.dataset.tab as DockTab;
        if (nextTab === 'map') {
          if (!this.state.progression.mapUnlocked) {
            return;
          }
          this.openZoneMapModal();
          this.collapseQuickMenu();
          return;
        }
        if (!this.isShopTabVisible(nextTab)) {
          return;
        }
        this.activeTab = nextTab;
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
      this.state.progression.shipFireRateLevel,
      this.state.progression.shipSpeedLevel,
      this.state.progression.deflectorLevel,
      this.state.progression.mapUnlocked,
      this.state.progression.travelLevel,
      this.state.progression.currentZoneIndex,
      this.state.progression.unlockedZoneIndex,
      this.state.progression.bossDefeats,
      this.state.progression.ownedWarpUnlockIds.join(','),
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
      this.getVisibleShopTabs().join(','),
      ...ACHIEVEMENT_DEFINITIONS.map((def) => (isAchievementUnlocked(this.state.progression, def.id) ? 1 : 0))
    ].join(':');

    if (nextSignature === this.shopSignature) {
      return;
    }

    this.shopSignature = nextSignature;

    const renderers: Record<ShopTab, () => void> = {
      upgrades: () => this.renderUpgradesTab(),
      warp: () => this.renderWarpTab(),
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
    } else if (this.activeModal === 'warpCores') {
      this.renderWarpCoreTreeModal();
    } else if (this.activeModal === 'zones') {
      this.renderZoneMapModal();
    } else if (this.activeModal === 'settings') {
      this.renderSettingsModal();
    }
  }

  private getAffordabilitySignature(): string {
    if (this.activeTab === 'upgrades') {
      const cap = this.getCoreUpgradeCap();
      const hpLevel = this.getHpUpgradeLevel();
      const damageLevel = this.getDamageUpgradeLevel();
      return [
        `passive:${this.state.progression.passiveIncomeLevel < cap}:${this.state.money >= this.getPassiveIncomeCost()}`,
        `damage:${damageLevel < cap}:${this.state.money >= this.getDamageCost()}`,
        `fire:${this.state.progression.shipFireRateLevel < cap}:${this.state.money >= this.getFireRateCost()}`,
        `hp:${hpLevel < cap}:${this.state.money >= this.getHpCost()}`
      ].join(',');
    }

    if (this.activeTab === 'warp') {
      return `cores:${getAvailableWarpCores(this.state.progression)},warp:${this.getPrestigeGain() > 0}`;
    }

    if (this.activeTab === 'drones') {
      return this.getDroneTypes()
        .map((type) => `${type}:${this.canBuyDroneType(type)}:${this.state.money >= this.getDroneTypeCost(type)}`)
        .join(',');
    }

    if (this.activeTab === 'skills') {
      return TALENT_DEFINITIONS.map((talent) => {
        const rank = getTalentRank(this.state.progression, talent.id);
        return `${talent.id}:${rank}:${canBuyTalentRank(this.state.progression, this.getCrystalBalance(), talent.id)}`;
      }).join(',');
    }

    return [
      `cannon:${this.state.progression.weaponMode === 'cannon'}`,
      `spread:${this.state.progression.spreadUnlocked}`,
      `piercing:${this.state.progression.piercingUnlocked}`
    ].join(',');
  }

  private renderUpgradesTab(): void {
    const cap = this.getCoreUpgradeCap();
    const damageLevel = this.getDamageUpgradeLevel();
    const hpLevel = this.getHpUpgradeLevel();
    const incomeLevel = this.state.progression.passiveIncomeLevel;
    const fireRateLevel = this.state.progression.shipFireRateLevel;
    this.setShopContent(
      translate(this.language, 'shop.upgradesKicker'),
      translate(this.language, 'shop.shipCore'),
      '',
      [],
      [
        {
          icon: 'DMG',
          title: translate(this.language, 'shop.shotDamage'),
          meta: `${translate(this.language, 'shop.level', { level: damageLevel, cap })} · ${translate(this.language, 'shop.damage', { value: this.formatStatNumber(this.getPlayerShotDamage()) })}`,
          label: damageLevel >= cap ? translate(this.language, 'shop.max') : this.formatMoney(this.getDamageCost()),
          disabled: damageLevel >= cap || this.state.money < this.getDamageCost(),
          onClick: () => this.buyDamage(this.getDamageCost()),
          repeatable: true
        },
        {
          icon: 'FR',
          title: translate(this.language, 'shop.fireRate'),
          meta: `${translate(this.language, 'shop.level', { level: fireRateLevel, cap })} · x${getFireRateMultiplier(this.state.progression).toFixed(2)}`,
          label: fireRateLevel >= cap ? translate(this.language, 'shop.max') : this.formatMoney(this.getFireRateCost()),
          disabled: fireRateLevel >= cap || this.state.money < this.getFireRateCost(),
          onClick: () => this.buyFireRate(this.getFireRateCost()),
          repeatable: true
        },
        {
          icon: 'HP',
          title: translate(this.language, 'shop.hull'),
          meta: `${translate(this.language, 'shop.level', { level: hpLevel, cap })} · ${this.state.ship.maxHp} HP`,
          label: hpLevel >= cap ? translate(this.language, 'shop.max') : this.formatMoney(this.getHpCost()),
          disabled: hpLevel >= cap || this.state.money < this.getHpCost(),
          onClick: () => this.buyHp(this.getHpCost()),
          repeatable: true
        },
        {
          icon: '$/s',
          title: translate(this.language, 'shop.income'),
          meta: `${translate(this.language, 'shop.level', { level: incomeLevel, cap })} · ${translate(this.language, 'shop.perSecond', { value: this.getPassiveIncomeRate().toFixed(1) })}`,
          label: incomeLevel >= cap ? translate(this.language, 'shop.max') : this.formatMoney(this.getPassiveIncomeCost()),
          disabled: incomeLevel >= cap || this.state.money < this.getPassiveIncomeCost(),
          onClick: () => this.buyPassiveIncome(this.getPassiveIncomeCost()),
          repeatable: true
        }
      ]
    );
  }

  private renderWarpTab(): void {
    this.setShopContent('', '', '', [], [], true);
    const coreTree = this.warpCoreTree.render({
      progression: this.state.progression,
      language: this.language,
      selectedUnlockId: this.activeWarpUnlockId,
      onSelectUnlock: (id) => this.selectWarpUnlock(id),
      onBuyUnlock: (id) => this.buyWarpUnlock(id)
    });
    coreTree.classList.add('warp-tree-board--inline');
    const panels = [this.createWarpResetPanel()];
    if (hasWarpUnlock(this.state.progression, 'bossBeacon')) {
      panels.push(this.createBossBeaconPanel());
    }
    this.shopActionsEl.replaceChildren(...panels, coreTree);
  }

  private createWarpResetPanel(): HTMLElement {
    const coreGain = this.getPrestigeGain();
    const crystals = this.getCrystalBalance();
    const availableAfterReset = getAvailableWarpCores(this.state.progression) + coreGain;
    const resetReady = coreGain > 0;
    const panel = document.createElement('section');
    panel.className = 'warp-reset-panel';

    const header = document.createElement('div');
    header.className = 'warp-reset-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'warp-reset-panel__kicker';
    kicker.textContent = translate(this.language, 'shop.warpReset');
    const title = document.createElement('strong');
    title.textContent = resetReady
      ? translate(this.language, 'shop.gainCores', { count: coreGain, unit: formatCoreUnit(this.language, coreGain) })
      : this.getWarpResetBlockedTitle();
    titleWrap.append(kicker, title);

    const resetButton = document.createElement('button');
    resetButton.className = 'shop-buy warp-reset-panel__button';
    resetButton.type = 'button';
    resetButton.disabled = !resetReady;
    resetButton.textContent = resetReady ? translate(this.language, 'shop.resetRun') : translate(this.language, 'shop.notReady');
    resetButton.addEventListener('click', () => this.warpReset(coreGain));
    header.append(titleWrap, resetButton);

    const stats = document.createElement('div');
    stats.className = 'warp-reset-panel__stats';
    stats.replaceChildren(
      this.createWarpResetStat(translate(this.language, 'shop.crystals'), `${crystals} / ${crystalsPerPrestigeCore}`),
      this.createWarpResetStat(translate(this.language, 'shop.availableAfter'), `${availableAfterReset} ${formatCoreUnit(this.language, availableAfterReset)}`),
      this.createWarpResetStat(translate(this.language, 'shop.route'), translate(this.language, 'shop.owned', { count: getOwnedWarpUnlockCount(this.state.progression) }))
    );

    const preview = document.createElement('p');
    preview.className = 'warp-reset-panel__preview';
    preview.textContent = this.getWarpResetPreviewText(availableAfterReset, coreGain);

    panel.append(header, stats, preview);
    return panel;
  }

  private createWarpResetStat(label: string, value: string): HTMLElement {
    const stat = document.createElement('span');
    const labelEl = document.createElement('small');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    stat.append(labelEl, valueEl);
    return stat;
  }

  private createBossBeaconPanel(): HTMLElement {
    const nextZone = getNextZone(this.state);
    const blocked = !nextZone || hasActiveZoneBoss(this.state);
    const panel = document.createElement('section');
    panel.className = 'warp-reset-panel';

    const header = document.createElement('div');
    header.className = 'warp-reset-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'warp-reset-panel__kicker';
    kicker.textContent = this.language === 'pt-BR' ? 'Sinalizador de Boss' : 'Boss Beacon';
    const title = document.createElement('strong');
    title.textContent = nextZone
      ? (this.language === 'pt-BR' ? `Sinal de ${this.formatBossName(nextZone.bossType)}` : `${this.formatBossName(nextZone.bossType)} signal`)
      : (this.language === 'pt-BR' ? 'Rota limpa' : 'Route cleared');
    titleWrap.append(kicker, title);

    const summonButton = document.createElement('button');
    summonButton.className = 'shop-buy warp-reset-panel__button';
    summonButton.type = 'button';
    summonButton.disabled = blocked;
    summonButton.textContent = blocked ? (this.language === 'pt-BR' ? 'Bloqueado' : 'Blocked') : (this.language === 'pt-BR' ? 'Invocar' : 'Summon');
    summonButton.addEventListener('click', () => this.summonZoneBoss());
    header.append(titleWrap, summonButton);

    const preview = document.createElement('p');
    preview.className = 'warp-reset-panel__preview';
    preview.textContent = nextZone
      ? (this.language === 'pt-BR' ? 'Chama o próximo boss de portal imediatamente, sem esperar por um sinal raro no campo.' : 'Call the next gate boss immediately instead of waiting for a rare field signal.')
      : (this.language === 'pt-BR' ? 'Não há mais sinais de boss de portal disponíveis nesta rota.' : 'No further gate boss signals are available on this route.');

    panel.append(header, preview);
    return panel;
  }

  private getWarpResetBlockedTitle(): string {
    if (this.state.progression.travelLevel < minimumPrestigeTravelLevel) {
      return translate(this.language, 'shop.reachZone', { zone: zones[minimumPrestigeTravelLevel]?.name ?? 'a deeper zone' });
    }

    const crystals = this.getCrystalBalance();
    const remainder = crystals % crystalsPerPrestigeCore;
    const missing = remainder === 0 ? crystalsPerPrestigeCore : crystalsPerPrestigeCore - remainder;
    return translate(this.language, 'shop.nextCore', { count: missing, unit: formatCrystalUnit(this.language, missing) });
  }

  private getWarpResetPreviewText(availableAfterReset: number, coreGain: number): string {
    const affordableUnlocks = WARP_UNLOCK_DEFINITIONS.filter((unlock) => {
      if (hasWarpUnlock(this.state.progression, unlock.id)) {
        return false;
      }
      if (unlock.cost > availableAfterReset) {
        return false;
      }
      return unlock.requires.every((requiredId) => hasWarpUnlock(this.state.progression, requiredId));
    }).slice(0, 3);

    if (affordableUnlocks.length > 0) {
      return translate(this.language, 'shop.unlockNext', { items: affordableUnlocks.map((unlock) => this.getWarpUnlockTitle(unlock.id)).join(', ') });
    }

    if (coreGain > 0) {
      return translate(this.language, 'shop.bankCores');
    }

    if (this.state.progression.travelLevel < minimumPrestigeTravelLevel) {
      return translate(this.language, 'shop.defeatBosses');
    }

    return translate(this.language, 'shop.collectCrystals');
  }

  private renderSkillsTab(): void {
    const talentCount = countUnlockedTalentRanks(this.state.progression);
    this.setShopContent(
      translate(this.language, 'nav.skills'),
      translate(this.language, 'shop.skillsTitle'),
      translate(this.language, 'shop.skillsCopy'),
      [
        [translate(this.language, 'shop.skillsStatCrystals'), this.getCrystalBalance().toString()],
        [translate(this.language, 'shop.skillsStatTalents'), talentCount.toString()],
        [translate(this.language, 'shop.skillsStatSemiPierce'), getSemiAutoPierceLeft(this.state.progression).toString()],
        [translate(this.language, 'shop.skillsStatRefinery'), `x${getRefineryIncomeMultiplier(this.state.progression).toFixed(2)}`]
      ],
      [
        {
          icon: 'TREE',
          title: translate(this.language, 'shop.skillsActionTitle'),
          meta: translate(this.language, 'shop.skillsActionMeta', { count: talentCount }),
          label: translate(this.language, 'shop.skillsActionLabel'),
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
    const droneSystemsOnline = hasWarpUnlock(this.state.progression, 'droneSystems');
    this.setShopContent(
      translate(this.language, 'nav.drones'),
      droneSystemsOnline ? (this.language === 'pt-BR' ? 'Baía de Drones' : 'Drone Bay') : (this.language === 'pt-BR' ? 'Baía de Drones Bloqueada' : 'Drone Bay Locked'),
      droneSystemsOnline
        ? (this.language === 'pt-BR' ? 'Tecnologias autorizam cada família de drones. Créditos ainda constroem os drones.' : 'Technologies authorize each drone family. Credits still build the actual drones.')
        : (this.language === 'pt-BR' ? 'Instale Sistemas de Drones em Tecnologias antes de comprar drones.' : 'Install Drone Systems in Technologies before buying drones.'),
      [
        ['Semi-Auto', this.state.progression.droneCounts.sentry.toString()],
        ['Shotgun', this.state.progression.droneCounts.ranger.toString()],
        ['Missile', this.state.progression.droneCounts.breaker.toString()],
        [this.language === 'pt-BR' ? 'Sistemas' : 'Systems', droneSystemsOnline ? 'Online' : (this.language === 'pt-BR' ? 'Bloqueado' : 'Locked')]
      ],
      this.getDroneTypes().map((type) => {
        const config = balance.shop.drones[type];
        const cost = this.getDroneTypeCost(type);
        const unlocked = this.canBuyDroneType(type);
        const requiredUnlock = this.getDroneTypeWarpUnlock(type);
        const requiredTitle = this.getWarpUnlockTitle(requiredUnlock);
        const count = this.state.progression.droneCounts[type];
        const status = unlocked
          ? (this.language === 'pt-BR' ? `${count} comprados · ${requiredTitle} online` : `${count} owned · ${requiredTitle} online`)
          : (this.language === 'pt-BR' ? `Requer ${requiredTitle}` : `Requires ${requiredTitle}`);
        return {
          icon: this.getDroneTypeIcon(type),
          title: `${config.label} Drone`,
          meta: status,
          label: unlocked ? this.formatMoney(cost) : (this.language === 'pt-BR' ? 'Bloqueado' : 'Warp locked'),
          disabled: !unlocked || this.state.money < cost,
          onClick: () => this.buyDrone(type, cost),
          info: () => this.getDroneTypeInfo(type)
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
      ['Atributos ganhos', getTotalAchievementBonusSummary(this.state.progression)]
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
    this.setShopContent(
      translate(this.language, 'nav.weapons'),
      this.language === 'pt-BR' ? 'Modos de Arma' : 'Weapon Modes',
      '',
      [
        [this.language === 'pt-BR' ? 'Arma' : 'Weapon', this.formatWeaponMode(this.state.progression.weaponMode)]
      ],
      [
        { label: this.language === 'pt-BR' ? 'Canhão' : 'Cannon', disabled: this.state.progression.weaponMode === 'cannon', onClick: () => this.setWeaponMode('cannon'), info: () => this.getWeaponModeInfo('cannon') },
        {
          label: this.state.progression.spreadUnlocked ? 'Spread Shot' : (this.language === 'pt-BR' ? 'Spread Shot Bloqueado' : 'Spread Shot Locked'),
          disabled: !this.state.progression.spreadUnlocked || this.state.progression.weaponMode === 'spread',
          onClick: () => this.setWeaponMode('spread'),
          info: () => this.getWeaponModeInfo('spread')
        },
        {
          label: this.state.progression.piercingUnlocked ? (this.language === 'pt-BR' ? 'Tiros Perfurantes' : 'Piercing Rounds') : (this.language === 'pt-BR' ? 'Tiros Perfurantes Bloqueados' : 'Piercing Rounds Locked'),
          disabled: !this.state.progression.piercingUnlocked || this.state.progression.weaponMode === 'piercing',
          onClick: () => this.setWeaponMode('piercing'),
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

    if (action.repeatable) {
      this.bindRepeatableShopAction(button, action.onClick);
    } else {
      button.addEventListener('click', action.onClick);
    }
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

  private bindRepeatableShopAction(button: HTMLButtonElement, action: () => boolean | void): void {
    let repeatTimer: number | null = null;
    let repeatStart = 0;
    let pointerHandledPurchase = false;
    let activePointerId: number | null = null;

    const removeGlobalStopListeners = (): void => {
      window.removeEventListener('pointerup', stopRepeating);
      window.removeEventListener('pointercancel', stopRepeating);
      window.removeEventListener('blur', stopRepeating);
    };

    const stopRepeating = (): void => {
      if (repeatTimer !== null) {
        window.clearTimeout(repeatTimer);
        repeatTimer = null;
      }
      repeatStart = 0;
      activePointerId = null;
      removeGlobalStopListeners();
    };

    const getNextDelay = (): number => {
      const heldFor = Math.max(0, performance.now() - repeatStart);
      const acceleration = Math.min(1, heldFor / 2600);
      return Math.round(260 - acceleration * 200);
    };

    const runPurchase = (): void => {
      if (button.disabled || repeatStart <= 0) {
        stopRepeating();
        return;
      }

      const purchased = action();
      if (purchased === false) {
        stopRepeating();
        return;
      }
      repeatTimer = window.setTimeout(runPurchase, getNextDelay());
    };

    button.addEventListener('pointerdown', (event) => {
      if (button.disabled || (event.pointerType === 'mouse' && event.button !== 0)) {
        return;
      }

      event.preventDefault();
      pointerHandledPurchase = true;
      repeatStart = performance.now();
      activePointerId = event.pointerId;
      window.addEventListener('pointerup', stopRepeating, { once: true });
      window.addEventListener('pointercancel', stopRepeating, { once: true });
      window.addEventListener('blur', stopRepeating, { once: true });
      if (button.isConnected) {
        button.setPointerCapture(event.pointerId);
      }
      const purchased = action();
      if (purchased === false) {
        stopRepeating();
        return;
      }
      repeatTimer = window.setTimeout(runPurchase, 420);
    });
    button.addEventListener('pointerup', (event) => {
      if (activePointerId === null || event.pointerId === activePointerId) {
        stopRepeating();
      }
    });
    button.addEventListener('pointercancel', stopRepeating);
    button.addEventListener('lostpointercapture', () => {
      if (!repeatTimer) {
        stopRepeating();
      }
    });
    button.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'mouse') {
        stopRepeating();
      }
    });
    button.addEventListener('click', (event) => {
      if (pointerHandledPurchase) {
        event.preventDefault();
        pointerHandledPurchase = false;
        return;
      }
      action();
    });
  }

  private openInfoModal(info: ModalContent): void {
    this.activeModal = 'info';
    this.activeModalInfo = info;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.renderInfoModal();
  }

  private openSkillTreeModal(): void {
    this.activeModal = 'skills';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.renderSkillTreeModal();
  }

  private openWarpCoreTreeModal(): void {
    this.activeModal = 'warpCores';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.renderWarpCoreTreeModal();
  }

  private openZoneMapModal(): void {
    this.activeModal = 'zones';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.renderZoneMapModal();
  }

  private openSettingsModal(): void {
    this.activeModal = 'settings';
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.audioSettings.setExpanded(true);
    this.renderSettingsModal();
  }

  private closeModal(): void {
    const wasSkillTree = this.activeModal === 'skills';
    this.activeModal = null;
    this.activeModalInfo = null;
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.audioSettings.setExpanded(false);
    this.modalEl.classList.add('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalBodyEl.replaceChildren();
    if (wasSkillTree && this.activeTab === 'skills') {
      this.navButtons.forEach((button) => button.classList.remove('is-active'));
    }
  }

  private renderSettingsModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map');
    this.modalPanelEl.classList.add('ui-modal__panel--settings');
    this.modalKickerEl.textContent = translate(this.language, 'settings.audio');
    this.modalTitleEl.textContent = translate(this.language, 'settings.sound');
    this.modalCopyEl.textContent = '';
    this.modalCopyEl.classList.add('is-hidden');
    this.modalBodyEl.replaceChildren(...this.audioSettings.render(), this.createResetDataControl());
  }

  private createResetDataControl(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-modal-control settings-modal-control--danger';

    const heading = document.createElement('div');
    heading.className = 'settings-control';
    const title = document.createElement('span');
    title.textContent = translate(this.language, 'settings.saveData');
    const status = document.createElement('strong');
    status.textContent = translate(this.language, 'settings.reset');
    heading.append(title, status);

    const copy = document.createElement('p');
    copy.className = 'settings-danger-copy';
    copy.textContent = translate(this.language, 'settings.resetCopy');

    const button = document.createElement('button');
    button.className = 'settings-danger-button';
    button.type = 'button';
    button.textContent = translate(this.language, 'settings.resetAll');
    button.addEventListener('click', () => this.confirmResetAllData());

    wrapper.append(heading, copy, button);
    return wrapper;
  }

  private confirmResetAllData(): void {
    const confirmed = window.confirm(translate(this.language, 'settings.confirmReset'));
    if (!confirmed) {
      return;
    }

    clearAllAsteridleData();
    this.state = createGameState(this.scale.width, this.scale.height);
    this.offlineStatusFor = 0;
    this.saveElapsed = 0;
    this.shopSignature = '';
    this.activeTab = 'upgrades';
    this.activeTalentTooltipId = null;
    this.activeWarpUnlockId = null;
    this.zoneTravel = null;
    this.audioSettings.resetToDefaults();
    saveGameState(this.state);
    this.closeModal();
    this.closeShopDrawer();
    emitReward(this.state, translate(this.language, 'settings.resetDone'), 'system');
    this.updateHud();
  }

  private renderZoneMapModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--settings', 'ui-modal__panel--warp');
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
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalKickerEl.textContent = info.kicker;
    this.modalTitleEl.textContent = info.title;
    this.modalCopyEl.textContent = info.copy;
    this.modalCopyEl.classList.toggle('is-hidden', info.copy.trim().length === 0);

    this.modalBodyEl.replaceChildren(...this.infoModal.renderBody(info));
  }

  private renderSkillTreeModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalPanelEl.classList.add('ui-modal__panel--skills');
    this.modalKickerEl.textContent = translate(this.language, 'nav.skills');
    this.modalTitleEl.textContent = translate(this.language, 'shop.skillsActionTitle');
    this.modalCopyEl.textContent = `${this.getCrystalBalance()} ${translate(this.language, 'unit.crystals')} · ${countUnlockedTalentRanks(this.state.progression)} ${translate(this.language, 'unit.ranks')} · ${getSemiAutoPierceLeft(this.state.progression)} ${translate(this.language, 'unit.semiPierce')}`;
    this.modalCopyEl.classList.remove('is-hidden');

    this.modalBodyEl.replaceChildren(this.skillTreeModal.render({
      progression: this.state.progression,
      crystals: this.getCrystalBalance(),
      language: this.language,
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
      language: this.language,
      selectedTalentId: this.activeTalentTooltipId,
      onSelectTalent: (nextId) => this.selectSkillTreeTalent(nextId),
      onBuyTalent: (talentId) => this.buyTalent(talentId)
    });

    if (!updated && this.activeModal === 'skills') {
      this.renderSkillTreeModal();
    }
  }

  private renderWarpCoreTreeModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map', 'ui-modal__panel--settings');
    this.modalPanelEl.classList.add('ui-modal__panel--skills', 'ui-modal__panel--warp');
    this.modalKickerEl.textContent = translate(this.language, 'nav.technologies');
    this.modalTitleEl.textContent = this.language === 'pt-BR' ? 'Árvore de Tecnologias' : 'Technology Tree';
    this.modalCopyEl.textContent = this.language === 'pt-BR'
      ? `${getAvailableWarpCores(this.state.progression)} núcleos disponíveis · ${this.state.progression.prestigeCores} guardados · ${getOwnedWarpUnlockCount(this.state.progression)} instaladas`
      : `${getAvailableWarpCores(this.state.progression)} cores available · ${this.state.progression.prestigeCores} banked · ${getOwnedWarpUnlockCount(this.state.progression)} owned`;
    this.modalCopyEl.classList.remove('is-hidden');

    this.modalBodyEl.replaceChildren(this.warpCoreTree.render({
      progression: this.state.progression,
      language: this.language,
      selectedUnlockId: this.activeWarpUnlockId,
      onSelectUnlock: (id) => this.selectWarpUnlock(id),
      onBuyUnlock: (id) => this.buyWarpUnlock(id)
    }));
  }

  private selectWarpUnlock(id: WarpUnlockId | null): void {
    this.activeWarpUnlockId = id;
    if (this.activeModal === 'warpCores') {
      this.renderWarpCoreTreeModal();
    } else if (this.activeTab === 'warp') {
      this.renderWarpTab();
    }
  }

  private getCoreUpgradeCap(): number {
    return getCoreUpgradeCap(this.state.progression);
  }

  private getDamageUpgradeLevel(): number {
    return Math.max(0, this.state.progression.shipDamageLevel - 1);
  }

  private getHpUpgradeLevel(): number {
    return Math.max(0, Math.floor((this.state.progression.maxHp - 100) / balance.shop.ship.hp.gain));
  }

  private getPassiveIncomeRate(): number {
    const level = this.state.progression.passiveIncomeLevel;
    return level * balance.economy.passiveIncomePerLevel * getRefineryMilestoneMultiplier(level);
  }

  private getPlayerShotDamage(): number {
    return this.state.progression.shipDamageLevel * balance.weapons.playerDamageMultiplier;
  }

  private getPassiveIncomeCost(): number {
    return this.scaledCost(balance.economy.passiveCost.base, this.state.progression.passiveIncomeLevel, balance.economy.passiveCost.scale);
  }

  private getDamageCost(): number {
    return this.scaledCost(balance.shop.ship.damage.baseCost, this.getDamageUpgradeLevel(), balance.shop.ship.damage.scale);
  }

  private getFireRateCost(): number {
    return this.scaledCost(balance.shop.ship.fireRate.baseCost, this.state.progression.shipFireRateLevel, balance.shop.ship.fireRate.scale);
  }

  private getHpCost(): number {
    return this.scaledCost(balance.shop.ship.hp.baseCost, this.getHpUpgradeLevel(), balance.shop.ship.hp.scale);
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
        ['Shot damage', this.formatStatNumber(this.getPlayerShotDamage())],
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
          ['Status', this.state.progression.spreadUnlocked ? 'Installed' : 'Requires Spread Battery'],
          ['Pattern', 'Three shots'],
          ['Cooldown', `${getPlayerFireInterval(this.state.progression, balance.weapons.playerFireInterval * balance.weapons.spreadCooldownMultiplier).toFixed(2)} sec`]
        ]
      };
    }

    if (mode === 'piercing') {
      return {
        kicker: 'Weapon mode',
        title: 'Piercing Rounds',
        copy: 'Faster single shots that punch through one target and make long lanes easier to clear.',
        facts: [
          ['Status', this.state.progression.piercingUnlocked ? 'Installed' : 'Requires Piercing Rail'],
          ['Pierce', `${balance.weapons.piercingCount} asteroid`],
          ['Cooldown', `${getPlayerFireInterval(this.state.progression, balance.weapons.playerFireInterval * balance.weapons.piercingCooldownMultiplier).toFixed(2)} sec`]
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
        ['Cooldown', `${getPlayerFireInterval(this.state.progression).toFixed(2)} sec`]
      ]
    };
  }

  private getDroneTypeInfo(type: DroneType): ModalContent {
    const config = balance.shop.drones[type];
    const requiredUnlock = this.getDroneTypeWarpUnlock(type);
    const requiredTitle = WARP_UNLOCK_BY_ID[requiredUnlock].title;
    const unlocked = this.canBuyDroneType(type);
    return {
      kicker: 'Drone Bay',
      title: `${config.label} Drone`,
      copy: unlocked
        ? 'Credits build this drone family for the current permanent loadout.'
        : `Install ${requiredTitle} in Technologies before this drone family can be purchased.`,
      facts: [
        ['Status', unlocked ? 'Available' : `Requires ${requiredTitle}`],
        ['Owned', this.state.progression.droneCounts[type].toString()],
        ['Next cost', this.formatMoney(this.getDroneTypeCost(type))]
      ]
    };
  }

  private buyWarpUnlock(id: WarpUnlockId): void {
    const previousMaxHp = this.state.ship.maxHp;
    if (!purchaseWarpUnlock(this.state.progression, id)) {
      return;
    }

    const effectiveMaxHp = getEffectiveMaxHp(this.state.progression);
    const hpGain = Math.max(0, effectiveMaxHp - previousMaxHp);
    this.state.ship.maxHp = effectiveMaxHp;
    this.state.ship.hp = Math.min(effectiveMaxHp, this.state.ship.hp + hpGain);
    this.state.ship.armor = this.state.progression.armor;
    syncShieldBubbleState(this.state);
    this.shopSignature = '';
    this.retroSound.play({ type: 'purchase' });
    emitReward(this.state, 'Technology installed', 'unlock');
    saveGameState(this.state);
    this.updateHud();
  }

  private buyPassiveIncome(cost: number): boolean {
    if (this.state.progression.passiveIncomeLevel >= this.getCoreUpgradeCap() || !this.spend(cost)) {
      return false;
    }
    this.state.progression.passiveIncomeLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
    return true;
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
    const pendingBoss = createPendingZoneBoss(this.state);
    if (!hasWarpUnlock(this.state.progression, 'bossBeacon') || !pendingBoss) {
      return;
    }

    this.state.asteroids = this.state.asteroids.filter((asteroid) => !asteroid.bossType);
    this.state.pendingBoss = pendingBoss;
    this.state.progression.bossDiscovery.rareBossProgress = 0;
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
    if (!this.canBuyDroneType(type) || !this.spend(cost)) {
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

  private buyHp(cost: number): boolean {
    if (this.getHpUpgradeLevel() >= this.getCoreUpgradeCap() || !this.spend(cost)) {
      return false;
    }
    this.state.progression.maxHp += balance.shop.ship.hp.gain;
    const effectiveMaxHp = getEffectiveMaxHp(this.state.progression);
    const hpGain = effectiveMaxHp - this.state.ship.maxHp;
    this.state.ship.maxHp = effectiveMaxHp;
    this.state.ship.hp += hpGain;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
    return true;
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

  private buyDamage(cost: number): boolean {
    if (this.getDamageUpgradeLevel() >= this.getCoreUpgradeCap() || !this.spend(cost)) {
      return false;
    }
    this.state.progression.shipDamageLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
    return true;
  }

  private buyFireRate(cost: number): boolean {
    if (this.state.progression.shipFireRateLevel >= this.getCoreUpgradeCap() || !this.spend(cost)) {
      return false;
    }
    this.state.progression.shipFireRateLevel += 1;
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
    return true;
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

  private scaledCost(baseCost: number, level: number, scale: number): number {
    return Math.round(baseCost * scale ** level);
  }

  private getDroneTypes(): DroneType[] {
    return ['sentry', 'ranger', 'breaker'];
  }

  private getDroneTypeWarpUnlock(type: DroneType): WarpUnlockId {
    if (type === 'sentry') {
      return 'droneSystems';
    }

    if (type === 'ranger') {
      return 'rangerHangar';
    }

    return 'missileFoundry';
  }

  private getWarpUnlockTitle(id: WarpUnlockId): string {
    if (this.language !== 'pt-BR') {
      return WARP_UNLOCK_BY_ID[id].title;
    }

    const titles: Record<WarpUnlockId, string> = {
      droneSystems: 'Sistemas de Drones',
      deflectorFrame: 'Estrutura Defletora',
      shieldBubble: 'Bolha de Escudo',
      bossBeacon: 'Sinalizador de Boss',
      spreadBattery: 'Bateria Spread',
      rangerHangar: 'Hangar Ranger',
      missileFoundry: 'Fundição de Mísseis',
      piercingRail: 'Trilho Perfurante'
    };
    return titles[id];
  }

  private getDroneTypeIcon(type: DroneType): string {
    if (type === 'sentry') {
      return 'SA';
    }

    if (type === 'ranger') {
      return 'SG';
    }

    return 'MS';
  }

  private canBuyDroneType(type: DroneType): boolean {
    return hasWarpUnlock(this.state.progression, this.getDroneTypeWarpUnlock(type));
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
    if (type === 'sentinel') {
      return 'Star Sentinel';
    }
    if (type === 'prism') {
      return 'Prism Warden';
    }
    return 'Gravity Crusher';
  }

  private getPrestigeGain(): number {
    return getPrestigeCoreGain(this.state);
  }

  private formatMoney(value: number): string {
    return `$${Math.floor(value).toLocaleString('en-US')}`;
  }

  private formatStatNumber(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  private formatSector(): string {
    const zone = getExplorationZone(this.state);
    const sectorSize = 2200;
    const sectorX = Math.floor(this.state.ship.position.x / sectorSize);
    const sectorY = Math.floor(this.state.ship.position.y / sectorSize);
    return `${zone.name} ${sectorX},${sectorY}`;
  }
}
