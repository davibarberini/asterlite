import Phaser from 'phaser';
import { neutralInput, type InputActions } from '../../game/input/actions';
import { getCrystalBalance as getStateCrystalBalance } from '../../game/progression/currency';
import { clearAllAsterliteData, loadGameState, saveGameState } from '../../game/progression/saveData';
import { emitReward } from '../../game/simulation/events';
import { createGameState, syncShieldBubbleState } from '../../game/simulation/state';
import { createAsteroidField, createPendingBoss, createPendingZoneBoss, hasActiveZoneBoss } from '../../game/simulation/systems/asteroids';
import type { AsteroidState, BossType, GameRewardEvent, GameState, RunCardId, RunCardRarity, ShipFrameId, Vec2, WarpUnlockId } from '../../game/simulation/types';
import { getMaxShipLevel, getShipXpForNextLevel, grantShipXp } from '../../game/progression/shipLevel';
import { formatCompactNumber, formatMoney as formatCompactMoney } from '../../game/numberFormat';
import { updateGame } from '../../game/simulation/systems/gameLoop';
import { isSurvivalZone } from '../../game/simulation/systems/survival';
import { getExplorationZone, getNextZone, getZoneByIndex, isZoneUnlocked, maxTravelLevel, zones } from '../../game/simulation/zones';
import {
  getNovaCrownBestSeconds,
  getNovaCrownDifficultyConfig,
  novaCrownClearThreatLevel,
  normalizeNovaCrownDifficulty
} from '../../game/progression/novaCrownDifficulty';
import { getActiveGuidedMissionProgress, type GuidedMissionProgress } from '../../game/progression/guidedMissions';
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
import { HangarController } from '../ui/HangarController';
import { RewardFeedController } from '../ui/RewardFeedController';
import { TutorialGuideController, type TutorialFlow, type TutorialTargetId } from '../ui/TutorialGuideController';
import { WarpCoreTreeController } from '../ui/WarpCoreTreeController';
import { ZoneMapController } from '../ui/ZoneMapController';
import { Starfield } from '../view/Starfield';
import { VectorRenderer } from '../view/VectorRenderer';
import { balance } from '../../game/balance';
import { WARP_UNLOCK_BY_ID, getAvailableWarpCores, getOwnedWarpUnlockCount, hasWarpUnlock, purchaseWarpUnlock } from '../../game/progression/warpUnlocks';
import { getActiveShipFrame, SHIP_FRAME_DEFINITIONS } from '../../game/progression/shipFrames';
import { startNewRun } from '../../game/progression/runLifecycle';
import { renderRunMenu } from '../ui/RunMenuController';
import { createRunCardIcon } from '../ui/runCardIcons';
import { createDockIcon } from '../ui/uiIcons';
import { updateParticles } from '../../game/simulation/systems/particles';
import { damageShip } from '../../game/simulation/systems/playerDamage';
import { RUN_CARD_BY_ID, applyRunCardChoice } from '../../game/progression/runCards';
import { formatCrystalUnit, getBrowserLanguage, getSavedLanguage, saveLanguage, translate, type LanguageCode } from '../../game/i18n';

type ShopTab = 'warp' | 'hangar' | 'achievements';
type DockTab = ShopTab | 'map';
type SwipeDirectionMode = 'direct' | 'inverted';

type ShopAction = {
  label: string;
  disabled: boolean;
  onClick: () => boolean | void;
  icon?: string;
  iconNode?: () => Element;
  title?: string;
  meta?: string;
  repeatable?: boolean;
  info?: () => ModalContent;
  className?: string;
  controlNode?: () => Element;
  tutorialTarget?: TutorialTargetId;
};

type PriorityPopupContent = {
  key: string;
  kicker: string;
  title: string;
  copy: string;
  okLabel: string;
};

type MenuBackdropAsteroid = {
  x: number;
  y: number;
  radius: number;
  rotation: number;
  spin: number;
  velocity: Vec2;
  sides: number;
  seed: number;
};

const SWIPE_DIRECTION_STORAGE_KEY = 'asterlite.settings.swipeDirection';
const DEFAULT_SWIPE_DIRECTION: SwipeDirectionMode = 'direct';
const SWIPE_RELEASE_FIRE_SECONDS = 0.38;
const SWIPE_THRUST_TRAIL_SECONDS = 1.35;
const VECTOR_TAP_BOOST_WINDOW_SECONDS = 0.9;
const VECTOR_TAP_BOOST_POWER_MULTIPLIER = 0.35;
const VECTOR_TAP_BOOST_TRAIL_SECONDS = 0.55;
const INTRO_WARP_DURATION = 2.05;
const SUBMENU_TIME_SCALE = 0.28;
const TIME_SCALE_RECOVERY_SECONDS = 1;
const ZONE_TRAVEL_TUTORIAL: TutorialFlow = {
  id: 'zone-travel',
  steps: [
    { id: 'open-submenu', targetId: 'submenu-toggle', padding: 10, shape: 'circle' },
    { id: 'open-zone-map', targetId: 'nav-map', padding: 9, shape: 'rect' },
    { id: 'choose-zone', targetId: 'zone-node-unlocked', padding: 8, shape: 'rect' }
  ]
};

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
  private hangar!: HangarController;
  private tutorialGuide!: TutorialGuideController;
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
  private shipXpMeterEl!: HTMLElement;
  private shipLevelEl!: HTMLElement;
  private survivalHudEl!: HTMLElement;
  private survivalTimerEl!: HTMLElement;
  private survivalThreatEl!: HTMLElement;
  private survivalThreatFillEl!: HTMLElement;
  private survivalBestEl!: HTMLElement;
  private firstWarpGoalEl!: HTMLElement;
  private firstWarpGoalTitleEl!: HTMLElement;
  private firstWarpGoalProgressEl!: HTMLElement;
  private firstWarpGoalProgressTextEl!: HTMLElement;
  private bossHealthEl!: HTMLElement;
  private bossHealthNameEl!: HTMLElement;
  private bossHealthValueEl!: HTMLElement;
  private bossHealthProgressEl!: HTMLElement;
  private priorityPopupEl!: HTMLElement;
  private priorityPopupKickerEl!: HTMLElement;
  private priorityPopupTitleEl!: HTMLElement;
  private priorityPopupCopyEl!: HTMLElement;
  private priorityPopupOkEl!: HTMLButtonElement;
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
  private routeToggleEl!: HTMLButtonElement;
  private routeTargetEl!: HTMLElement;
  private mapToggleEl!: HTMLButtonElement;
  private menuToggleEl!: HTMLButtonElement;
  private bottomNavEl!: HTMLElement;
  private navButtons!: NodeListOf<HTMLButtonElement>;
  private activeTab: ShopTab = 'hangar';
  private priorityPopupQueue: PriorityPopupContent[] = [];
  private activePriorityPopup: PriorityPopupContent | null = null;
  private activeModal: 'info' | 'warpCores' | 'zones' | 'settings' | 'levelUpCards' | 'novaCrownDifficulty' | 'runMenu' | null = null;
  private betweenRuns = false;
  private deathFeedbackRemaining = 0;
  private runSummaryDismissed = false;
  private nextRunShip: ShipFrameId | null = null;
  private activeModalInfo: ModalContent | null = null;
  private novaCrownDifficultySelection = 1;
  private settingsDevtoolsOpen = false;
  private activeWarpUnlockId: WarpUnlockId | null = null;
  private activeGameplayPointerId: number | null = null;
  private gameplayPointerStartScreen: Vec2 | null = null;
  private gameplayPointerScreen: Vec2 | null = null;
  private pendingSwipeImpulseVector: Vec2 | null = null;
  private swipeImpulseIndicator: { start: Vec2; current: Vec2; power: number; ttl: number } | null = null;
  private swipeThrustTrail: { direction: Vec2; ttl: number } | null = null;
  private vectorTapBoost: { direction: Vec2; power: number; ttl: number } | null = null;
  private swipeFireFor = 0;
  private swipeDirectionMode: SwipeDirectionMode = DEFAULT_SWIPE_DIRECTION;
  private shopSignature = '';
  private saveElapsed = 0;
  private gameplayTimeScale = 1;
  private hasSavedLanguage = getSavedLanguage() !== null;
  private language: LanguageCode = getSavedLanguage() ?? getBrowserLanguage();
  private gameStarted = false;
  private introWarp: { elapsed: number; duration: number; direction: Vec2; impactTriggered: boolean } | null = null;
  private introGraphics!: Phaser.GameObjects.Graphics;
  private menuBackdropAsteroids: MenuBackdropAsteroid[] = [];
  private zoneTravel: { toIndex: number; elapsed: number; duration: number; direction: Vec2; impactTriggered: boolean; destinationApplied: boolean } | null = null;
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

    this.gameplayPointerScreen = this.toGameScreenPoint(event);
  };
  private readonly handleDocumentPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.activeGameplayPointerId) {
      return;
    }

    this.queueSwipeImpulse();
    this.activeGameplayPointerId = null;
    this.gameplayPointerStartScreen = null;
    this.gameplayPointerScreen = null;
  };

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.state = loadGameState(this.scale.width, this.scale.height);
    this.swipeDirectionMode = this.loadSwipeDirectionMode();
    this.retroSound = new RetroSound();
    this.backgroundMusic = new BackgroundMusic(`${import.meta.env.BASE_URL}audio/zone-1.mp3`);
    this.vectorRenderer = new VectorRenderer(this);
    this.starfield = new Starfield(this);
    this.introGraphics = this.add.graphics();
    this.introGraphics.setDepth(4);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D,SPACE,SHIFT,R') as Record<string, Phaser.Input.Keyboard.Key>;

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
    this.shipXpMeterEl = document.getElementById('ship-xp-meter')!;
    this.shipLevelEl = document.getElementById('ship-level')!;
    this.survivalHudEl = document.getElementById('survival-hud')!;
    this.survivalTimerEl = document.getElementById('survival-timer')!;
    this.survivalThreatEl = document.getElementById('survival-threat')!;
    this.survivalThreatFillEl = document.getElementById('survival-threat-fill')!;
    this.survivalBestEl = document.getElementById('survival-best')!;
    this.firstWarpGoalEl = document.getElementById('first-warp-goal')!;
    this.firstWarpGoalTitleEl = document.getElementById('first-warp-goal-title')!;
    this.firstWarpGoalProgressEl = document.getElementById('first-warp-goal-progress')!;
    this.firstWarpGoalProgressTextEl = document.getElementById('first-warp-goal-progress-text')!;
    this.bossHealthEl = document.getElementById('boss-health')!;
    this.bossHealthNameEl = document.getElementById('boss-health-name')!;
    this.bossHealthValueEl = document.getElementById('boss-health-value')!;
    this.bossHealthProgressEl = document.getElementById('boss-health-progress')!;
    this.priorityPopupEl = document.getElementById('priority-popup')!;
    this.priorityPopupKickerEl = document.getElementById('priority-popup-kicker')!;
    this.priorityPopupTitleEl = document.getElementById('priority-popup-title')!;
    this.priorityPopupCopyEl = document.getElementById('priority-popup-copy')!;
    this.priorityPopupOkEl = document.getElementById('priority-popup-ok') as HTMLButtonElement;
    this.rewardFeed = new RewardFeedController(document.getElementById('reward-feed')!);
    this.audioSettings = new AudioSettingsController(document.getElementById('settings-toggle') as HTMLButtonElement, {
      setSfxVolume: (volume) => this.retroSound.setVolume(volume),
      setMusicVolume: (volume) => this.backgroundMusic.setVolume(volume)
    });
    this.infoModal = new InfoModalController();
    this.hangar = new HangarController();
    this.tutorialGuide = new TutorialGuideController(this.appEl);
    this.warpCoreTree = new WarpCoreTreeController();
    this.zoneMap = new ZoneMapController();
    this.routeToggleEl = document.getElementById('route-toggle') as HTMLButtonElement;
    this.routeTargetEl = document.getElementById('route-target')!;
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
    this.modalTitleEl.tabIndex = -1;
    this.modalEl.addEventListener('keydown', (event) => {
      if (event.key !== 'Tab') return;
      const targets = [...this.modalPanelEl.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"], select')]
        .filter((element) => element.getClientRects().length > 0);
      const first = targets[0];
      const last = targets[targets.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === this.modalTitleEl)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
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
    this.bindPriorityPopupUi();
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
      this.tutorialGuide.destroy();
      this.backgroundMusic.destroy();
      this.introGraphics.destroy();
    });
    this.updateHud();
  }

  update(_time: number, deltaMs: number): void {
    const rawDt = Math.min(deltaMs / 1000, 0.033);
    this.updateGameplayTimeScale(rawDt);
    const dt = rawDt * this.gameplayTimeScale;
    this.swipeFireFor = Math.max(0, this.swipeFireFor - rawDt);
    if (this.swipeImpulseIndicator) {
      this.swipeImpulseIndicator.ttl -= rawDt;
      if (this.swipeImpulseIndicator.ttl <= 0) {
        this.swipeImpulseIndicator = null;
      }
    }
    if (this.swipeThrustTrail) {
      this.swipeThrustTrail.ttl -= rawDt;
      if (this.swipeThrustTrail.ttl <= 0) {
        this.swipeThrustTrail = null;
      }
    }
    if (this.vectorTapBoost) {
      this.vectorTapBoost.ttl -= rawDt;
      if (this.vectorTapBoost.ttl <= 0 || this.state.progression.activeShipFrameId !== 'vector') {
        this.vectorTapBoost = null;
      }
    }
    this.readInput();

    this.state.width = this.scale.width;
    this.state.height = this.scale.height;
    if (this.activeModal || !this.gameStarted) this.input.keyboard?.disableGlobalCapture();
    else this.input.keyboard?.enableGlobalCapture();
    for (const id of ['hud', 'idle-dock', 'main-menu']) {
      const element = document.getElementById(id);
      if (element) element.inert = this.activeModal !== null || this.deathFeedbackRemaining > 0;
    }
    if (this.deathFeedbackRemaining > 0) {
      this.deathFeedbackRemaining = Math.max(0, this.deathFeedbackRemaining - rawDt);
      updateParticles(this.state, rawDt);
      this.vectorRenderer.render(this.state, false, null);
      this.deathFadeEl.style.opacity = String(0.48 * (1 - this.deathFeedbackRemaining / 0.9));
      if (this.deathFeedbackRemaining === 0) {
        this.deathFadeEl.style.opacity = '0';
        this.openRunMenu();
      }
      return;
    }
    if (this.betweenRuns && !this.activeModal) this.openRunMenu();
    if (!this.gameStarted) {
      this.updateIntro(rawDt);
      return;
    }

    if (this.zoneTravel) {
      this.updateZoneTravel(rawDt);
      return;
    }

    const tutorialPaused = this.tutorialGuide.isActive();
    if (!tutorialPaused && dt > 0 && !this.betweenRuns) {
      updateGame(this.state, this.inputState, dt);
      this.playAudioEvents();
      if (this.state.phase === 'ended') {
        this.betweenRuns = true;
        this.runSummaryDismissed = false;
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this.deathFeedbackRemaining = reducedMotion ? 0.15 : 0.9;
        if (!reducedMotion) this.cameras.main.shake(180, 0.004);
        this.state.rewardEvents = [];
        this.priorityPopupQueue = [];
        this.activePriorityPopup = null;
        this.closeShopDrawer();
        this.activeModal = null;
        this.closeModal();
        this.inputState = neutralInput();
        this.activeGameplayPointerId = null;
        saveGameState(this.state);
        return;
      }
      this.queuePriorityPopups(this.state.rewardEvents);
      this.rewardFeed.showEvents(this.state.rewardEvents);
      this.syncLevelUpCardChoiceModal();
      this.saveElapsed += dt;
      if (this.saveElapsed >= 1) {
        saveGameState(this.state);
        this.saveElapsed = 0;
      }
    } else {
      this.inputState = neutralInput();
    }
    this.starfield.update(tutorialPaused ? 0 : dt, this.state.ship.velocity);
    const impulsePower = this.inputState.impulseVector ? Math.hypot(this.inputState.impulseVector.x, this.inputState.impulseVector.y) : 0;
    this.vectorRenderer.render(
      this.state,
      (this.inputState.thrust || impulsePower > 0.08 || this.isSwipeThrusting()) && this.state.ship.alive,
      this.getSwipeImpulseIndicator()
    );
    this.updateHud();
    this.maybeStartTutorialGuide();
    this.updateDeathFade();
  }

  private readInput(): void {
    this.inputState.rotateLeft = this.cursors.left.isDown || this.keys.A.isDown;
    this.inputState.rotateRight = this.cursors.right.isDown || this.keys.D.isDown;
    this.inputState.thrust = this.cursors.up.isDown || this.keys.W.isDown;
    this.inputState.brake = this.cursors.down.isDown || this.keys.S.isDown || this.keys.SHIFT.isDown;
    this.inputState.pointerTarget = null;
    this.inputState.impulseVector = this.consumeSwipeImpulseVector();
    this.inputState.aimDirection = this.getPointerAimDirection();
    this.inputState.fire =
      this.cursors.space.isDown ||
      this.keys.SPACE.isDown ||
      this.activeGameplayPointerId !== null ||
      this.swipeFireFor > 0 ||
      this.isKestrelDashFiring();
  }

  private getPointerAimDirection(): Vec2 | null {
    if (!this.gameplayPointerScreen) {
      return null;
    }

    if (this.isPendingVectorTapBoostGesture()) {
      return null;
    }

    if (this.gameplayPointerStartScreen) {
      const directionSign = this.getSwipeDirectionSign();
      const pullDx = (this.gameplayPointerScreen.x - this.gameplayPointerStartScreen.x) * directionSign;
      const pullDy = (this.gameplayPointerScreen.y - this.gameplayPointerStartScreen.y) * directionSign;
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

  private isPendingVectorTapBoostGesture(): boolean {
    if (
      this.state.progression.activeShipFrameId !== 'vector' ||
      !this.vectorTapBoost ||
      !this.gameplayPointerStartScreen ||
      !this.gameplayPointerScreen
    ) {
      return false;
    }

    const dx = this.gameplayPointerScreen.x - this.gameplayPointerStartScreen.x;
    const dy = this.gameplayPointerScreen.y - this.gameplayPointerStartScreen.y;
    return Math.hypot(dx, dy) < balance.ship.swipeImpulseDeadzone;
  }

  private getSwipeImpulseIndicator(): { start: Vec2; current: Vec2; power: number; inverted: boolean } | null {
    if (this.gameplayPointerStartScreen && this.gameplayPointerScreen) {
      const distance = Math.hypot(
        this.gameplayPointerScreen.x - this.gameplayPointerStartScreen.x,
        this.gameplayPointerScreen.y - this.gameplayPointerStartScreen.y
      );
      if (distance >= balance.ship.swipeImpulseDeadzone) {
        return {
          start: this.gameplayPointerStartScreen,
          current: this.gameplayPointerScreen,
          power: this.getSwipeImpulsePower(distance),
          inverted: this.swipeDirectionMode === 'inverted'
        };
      }
    }

    if (!this.swipeImpulseIndicator) {
      return null;
    }

    return {
      start: this.swipeImpulseIndicator.start,
      current: this.swipeImpulseIndicator.current,
      power: this.swipeImpulseIndicator.power * Math.max(0, this.swipeImpulseIndicator.ttl / 0.24),
      inverted: this.swipeDirectionMode === 'inverted'
    };
  }

  private queueSwipeImpulse(): void {
    if (!this.gameplayPointerStartScreen || !this.gameplayPointerScreen) {
      return;
    }

    const dx = this.gameplayPointerScreen.x - this.gameplayPointerStartScreen.x;
    const dy = this.gameplayPointerScreen.y - this.gameplayPointerStartScreen.y;
    const distance = Math.hypot(dx, dy);
    this.swipeFireFor = SWIPE_RELEASE_FIRE_SECONDS;
    if (distance < balance.ship.swipeImpulseDeadzone) {
      this.tryQueueVectorTapBoost();
      return;
    }

    const power = this.getSwipeImpulsePower(distance);
    const directionSign = this.getSwipeDirectionSign();
    const direction = {
      x: (dx / distance) * directionSign,
      y: (dy / distance) * directionSign
    };
    this.pendingSwipeImpulseVector = {
      x: direction.x * power,
      y: direction.y * power
    };
    this.vectorTapBoost = this.state.progression.activeShipFrameId === 'vector'
      ? {
          direction,
          power,
          ttl: VECTOR_TAP_BOOST_WINDOW_SECONDS
        }
      : null;
    this.swipeThrustTrail = {
      direction,
      ttl: SWIPE_THRUST_TRAIL_SECONDS
    };
    this.swipeImpulseIndicator = {
      start: { ...this.gameplayPointerStartScreen },
      current: { ...this.gameplayPointerScreen },
      power,
      ttl: 0.24
    };
  }

  private tryQueueVectorTapBoost(): boolean {
    if (this.state.progression.activeShipFrameId !== 'vector' || !this.vectorTapBoost || this.pendingSwipeImpulseVector) {
      return false;
    }

    const boost = this.vectorTapBoost;
    this.vectorTapBoost = null;
    const power = Math.max(0.08, Math.min(1, boost.power * VECTOR_TAP_BOOST_POWER_MULTIPLIER));
    this.pendingSwipeImpulseVector = {
      x: boost.direction.x * power,
      y: boost.direction.y * power
    };
    this.swipeThrustTrail = {
      direction: boost.direction,
      ttl: VECTOR_TAP_BOOST_TRAIL_SECONDS
    };
    this.swipeImpulseIndicator = {
      start: { ...this.gameplayPointerStartScreen! },
      current: {
        x: this.gameplayPointerStartScreen!.x + boost.direction.x * balance.ship.swipeImpulseDeadzone * 0.8,
        y: this.gameplayPointerStartScreen!.y + boost.direction.y * balance.ship.swipeImpulseDeadzone * 0.8
      },
      power,
      ttl: 0.18
    };
    this.retroSound.play({ type: 'vectorTapBoost' });
    return true;
  }

  private consumeSwipeImpulseVector(): Vec2 | null {
    const impulse = this.pendingSwipeImpulseVector;
    this.pendingSwipeImpulseVector = null;
    return impulse;
  }

  private getSwipeImpulsePower(distance: number): number {
    return Math.min(1, Math.max(0, (distance - balance.ship.swipeImpulseDeadzone) / balance.ship.swipeImpulseMaxDrag));
  }

  private getSwipeDirectionSign(): number {
    return this.swipeDirectionMode === 'inverted' ? -1 : 1;
  }

  private isSwipeThrusting(): boolean {
    if (!this.swipeThrustTrail) {
      return false;
    }

    const speed = Math.hypot(this.state.ship.velocity.x, this.state.ship.velocity.y);
    if (speed < 28) {
      return false;
    }

    const alignment =
      (this.state.ship.velocity.x / speed) * this.swipeThrustTrail.direction.x +
      (this.state.ship.velocity.y / speed) * this.swipeThrustTrail.direction.y;
    return alignment > 0.45;
  }

  private isKestrelDashFiring(): boolean {
    return this.state.progression.activeShipFrameId === 'kestrel' && this.isSwipeThrusting();
  }

  private loadSwipeDirectionMode(): SwipeDirectionMode {
    try {
      const stored = window.localStorage.getItem(SWIPE_DIRECTION_STORAGE_KEY);
      return stored === 'inverted' || stored === 'direct' ? stored : DEFAULT_SWIPE_DIRECTION;
    } catch {
      return DEFAULT_SWIPE_DIRECTION;
    }
  }

  private saveSwipeDirectionMode(mode: SwipeDirectionMode): void {
    this.swipeDirectionMode = mode;
    this.pendingSwipeImpulseVector = null;
    this.vectorTapBoost = null;
    this.swipeImpulseIndicator = null;
    this.swipeThrustTrail = null;
    this.swipeFireFor = 0;
    this.gameplayPointerStartScreen = null;
    this.gameplayPointerScreen = null;
    this.activeGameplayPointerId = null;
    try {
      window.localStorage.setItem(SWIPE_DIRECTION_STORAGE_KEY, mode);
    } catch {
      // Input preferences are best-effort.
    }
    this.applyLanguage();
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
    return target instanceof Element && target.closest('#main-menu, #idle-dock, #ui-modal, #priority-popup, .hud-right-cluster, .tutorial-guide') !== null;
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
        this.mainMenuStartEl.disabled = false;
        this.mainMenuStartEl.focus({ preventScroll: true });
        this.shopSignature = '';
        this.updateHud();
      });
    });

    this.mainMenuStartEl.addEventListener('click', () => this.startIntroWarp());
  }

  private showMainMenu(): void {
    this.appEl.classList.add('is-menu-open');
    this.mainMenuEl.classList.remove('is-hidden', 'is-warping', 'is-impact');
    this.appEl.classList.remove('is-zone-travel', 'is-impact');
    this.setScreenFlash(0);
    this.mainMenuEl.setAttribute('aria-hidden', 'false');
    this.mainMenuStartEl.disabled = !this.hasSavedLanguage;
    this.mainMenuEl.classList.toggle('main-menu--language-saved', this.hasSavedLanguage);
  }

  private startIntroWarp(launch = false): void {
    if (this.gameStarted || this.introWarp || !this.hasSavedLanguage) {
      return;
    }
    if (!launch && (this.state.phase === 'ended' || this.state.run.elapsedSeconds === 0)) {
      this.betweenRuns = true;
      this.mainMenuEl.classList.add('is-hidden');
      this.appEl.classList.remove('is-menu-open');
      this.openRunMenu();
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
      direction: { x: 0, y: -1 },
      impactTriggered: false
    };
  }

  private updateIntro(dt: number): void {
    if (this.introWarp && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.finishIntroWarp();
      return;
    }
    if (!this.introWarp) {
      this.starfield.update(dt, { x: 14, y: -4 });
      this.vectorRenderer.clear();
      this.updateMenuBackdrop(dt);
      this.setScreenFlash(0);
      return;
    }

    this.introWarp.elapsed += dt;
    const progress = Math.min(1, this.introWarp.elapsed / this.introWarp.duration);
    const launchProgress = this.easeInCubic(Math.min(1, progress / 0.72));
    const pulse = Math.sin(progress * Math.PI);
    const velocity = {
      x: this.introWarp.direction.x * (240 + launchProgress * 520),
      y: this.introWarp.direction.y * (700 + launchProgress * 4200 + pulse * 900)
    };
    this.starfield.update(dt, velocity, { progress, direction: this.introWarp.direction });
    this.vectorRenderer.clear();
    this.drawIntroShip(progress);
    const flashProgress = Math.min(1, Math.max(0, (progress - 0.78) / 0.22));
    const flashAlpha = Math.sin(flashProgress * Math.PI) * 0.92;
    this.setScreenFlash(flashAlpha);

    if (!this.introWarp.impactTriggered && progress >= 0.83) {
      this.introWarp.impactTriggered = true;
      this.cameras.main.shake(280, 0.009);
      this.mainMenuEl.classList.add('is-impact');
      window.setTimeout(() => this.mainMenuEl.classList.remove('is-impact'), 300);
    }

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
    this.mainMenuEl.classList.remove('is-warping', 'is-impact');
    this.setScreenFlash(0);
    this.mainMenuEl.setAttribute('aria-hidden', 'true');
    this.mainMenuStartEl.disabled = false;
    this.introGraphics.clear();
    this.syncLevelUpCardChoiceModal();
    this.updateHud();
  }

  private updateMenuBackdrop(dt: number): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const targetCount = Phaser.Math.Clamp(Math.floor((width * height) / 85000), 7, 14);
    while (this.menuBackdropAsteroids.length < targetCount) {
      this.menuBackdropAsteroids.push(this.createMenuBackdropAsteroid(true));
    }
    if (this.menuBackdropAsteroids.length > targetCount) {
      this.menuBackdropAsteroids.length = targetCount;
    }

    this.introGraphics.clear();
    this.menuBackdropAsteroids.forEach((asteroid, index) => {
      asteroid.x += asteroid.velocity.x * dt;
      asteroid.y += asteroid.velocity.y * dt;
      asteroid.rotation += asteroid.spin * dt;
      if (asteroid.x < -asteroid.radius - 80 || asteroid.y > height + asteroid.radius + 80) {
        this.menuBackdropAsteroids[index] = this.createMenuBackdropAsteroid(false);
        return;
      }

      this.drawMenuBackdropAsteroid(asteroid);
    });
  }

  private createMenuBackdropAsteroid(initial: boolean): MenuBackdropAsteroid {
    const width = this.scale.width;
    const height = this.scale.height;
    const radius = Phaser.Math.FloatBetween(18, width <= 720 ? 42 : 58);
    return {
      x: initial ? Phaser.Math.FloatBetween(-radius, width + radius) : width + radius + Phaser.Math.FloatBetween(20, 180),
      y: initial ? Phaser.Math.FloatBetween(-radius, height + radius) : Phaser.Math.FloatBetween(-radius, height * 0.72),
      radius,
      rotation: Phaser.Math.FloatBetween(0, Math.PI * 2),
      spin: Phaser.Math.FloatBetween(-0.55, 0.55),
      velocity: {
        x: -Phaser.Math.FloatBetween(28, 72),
        y: Phaser.Math.FloatBetween(12, 42)
      },
      sides: Phaser.Math.Between(7, 11),
      seed: Phaser.Math.FloatBetween(0, Math.PI * 2)
    };
  }

  private drawMenuBackdropAsteroid(asteroid: MenuBackdropAsteroid): void {
    const points = Array.from({ length: asteroid.sides }, (_, index) => {
      const angle = asteroid.rotation + (index / asteroid.sides) * Math.PI * 2;
      const radius = asteroid.radius * (0.76 + Math.sin(asteroid.seed + index * 1.73) * 0.16);
      return {
        x: asteroid.x + Math.cos(angle) * radius,
        y: asteroid.y + Math.sin(angle) * radius
      };
    });

    this.introGraphics.fillStyle(0x9fb4ba, 0.045);
    this.introGraphics.beginPath();
    this.introGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.introGraphics.lineTo(point.x, point.y));
    this.introGraphics.closePath();
    this.introGraphics.fillPath();

    this.introGraphics.lineStyle(2, 0xb9d0d8, 0.32);
    this.introGraphics.beginPath();
    this.introGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.introGraphics.lineTo(point.x, point.y));
    this.introGraphics.closePath();
    this.introGraphics.strokePath();

    this.introGraphics.lineStyle(1, 0xd8e8ee, 0.12);
    for (let index = 0; index < points.length; index += 3) {
      const point = points[index];
      this.introGraphics.lineBetween(
        asteroid.x + (point.x - asteroid.x) * 0.35,
        asteroid.y + (point.y - asteroid.y) * 0.35,
        point.x,
        point.y
      );
    }
  }

  private drawIntroShip(progress: number): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const launchProgress = Math.min(1, progress / 0.72);
    const settleProgress = Math.min(1, Math.max(0, (progress - 0.72) / 0.18));
    const launchY = this.lerp(height + 80, height * 0.32, this.easeInCubic(launchProgress));
    const y = progress < 0.72
      ? launchY
      : this.lerp(height * 0.32, height * 0.5, this.easeOutCubic(settleProgress));
    const drift = Math.sin(progress * Math.PI * 3) * 14 * Math.max(0, 1 - progress);
    const x = width * 0.5 + drift;
    const shipScale = this.getViewScale();
    const rotation = this.lerp(-Math.PI / 2, this.state.ship.rotation, this.easeOutCubic(settleProgress));
    const points = getActiveShipFrame(this.state.progression).shape.map((point) =>
      this.rotateScreenPoint(point.x * shipScale, point.y * shipScale, rotation, x, y)
    );
    const thrust = Math.min(1, Math.max(0, (progress - 0.06) / 0.58));
    const trailFade = progress < 0.7 ? 1 : 1 - this.easeOutCubic(Math.min(1, Math.max(0, (progress - 0.7) / 0.26)));
    const trailPower = thrust * trailFade;
    const trailLength = this.lerp(10, Math.min(height * 0.72, 340), trailPower);
    const trailAlpha = (0.18 + thrust * 0.56) * trailPower;

    this.introGraphics.clear();
    if (trailPower > 0.03) {
      for (let index = 0; index < 5; index += 1) {
        const offset = (index - 2) * 8 * shipScale;
        const jitter = Math.sin((progress * 28) + index) * 5 * trailPower;
        this.introGraphics.lineStyle(Math.max(1, (3 - Math.abs(index - 2)) * 1.4), index === 2 ? 0xffffff : 0x9fdcff, trailAlpha * (index === 2 ? 0.9 : 0.52));
        this.introGraphics.beginPath();
        this.introGraphics.moveTo(x + offset * 0.28, y + 14 * shipScale);
        this.introGraphics.lineTo(x + offset + jitter, y + 14 * shipScale + trailLength);
        this.introGraphics.strokePath();
      }
    }

    this.introGraphics.lineStyle(8, 0x83ffdc, 0.12 + trailPower * 0.16);
    this.introGraphics.beginPath();
    this.introGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.introGraphics.lineTo(point.x, point.y));
    this.introGraphics.closePath();
    this.introGraphics.strokePath();

    this.introGraphics.lineStyle(2, 0xf2fbff, 0.96);
    this.introGraphics.beginPath();
    this.introGraphics.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => this.introGraphics.lineTo(point.x, point.y));
    this.introGraphics.closePath();
    this.introGraphics.strokePath();
  }

  private rotateScreenPoint(x: number, y: number, rotation: number, originX: number, originY: number): Vec2 {
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    return {
      x: originX + x * cos - y * sin,
      y: originY + x * sin + y * cos
    };
  }

  private lerp(from: number, to: number, progress: number): number {
    return from + (to - from) * progress;
  }

  private easeInCubic(progress: number): number {
    return progress * progress * progress;
  }

  private easeOutCubic(progress: number): number {
    return 1 - Math.pow(1 - progress, 3);
  }

  private setScreenFlash(alpha: number): void {
    this.appEl.style.setProperty('--screen-flash-opacity', Phaser.Math.Clamp(alpha, 0, 1).toFixed(3));
  }

  private applyLanguage(): void {
    document.documentElement.lang = this.language;
    this.mainMenuSubtitleEl.textContent = translate(this.language, this.hasSavedLanguage ? 'menu.subtitleSaved' : 'menu.subtitle');
    this.mainMenuLanguageLabelEl.textContent = translate(this.language, 'menu.language');
    this.mainMenuStartEl.textContent = translate(this.language, 'menu.start');
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
    this.bossHealthEl.setAttribute('aria-label', this.language === 'pt-BR' ? 'Vida do boss' : 'Boss health');
    this.priorityPopupOkEl.textContent = this.language === 'pt-BR' ? 'OK' : 'OK';
    const kicker = this.firstWarpGoalEl.querySelector<HTMLElement>('.first-warp-goal__kicker');
    if (kicker) {
      kicker.textContent = this.language === 'pt-BR' ? 'Missão' : 'Mission';
    }
    this.hpMeterEl.setAttribute('aria-label', translate(this.language, 'hud.shipHull'));
    this.routeToggleEl.setAttribute('aria-label', this.language === 'pt-BR' ? 'Viajar para próxima zona' : 'Travel to next zone');
    this.routeToggleEl.title = this.language === 'pt-BR' ? 'Viajar para próxima zona' : 'Travel to next zone';
    this.mapToggleEl.setAttribute('aria-label', translate(this.language, 'hud.openZoneMap'));
    this.mapToggleEl.title = translate(this.language, 'hud.openZoneMap');
    this.menuToggleEl.setAttribute('aria-label', translate(this.language, 'hud.openMenu'));
    this.menuToggleEl.title = translate(this.language, 'hud.openMenu');
    this.menuToggleEl.dataset.tutorialTarget = 'submenu-toggle';
    this.bottomNavEl.setAttribute('aria-label', translate(this.language, 'hud.shopTabs'));
    this.navButtons.forEach((button) => {
      if (button.dataset.tab === 'map') {
        button.dataset.tutorialTarget = 'nav-map';
      }
    });
    document.getElementById('idle-dock')?.setAttribute('aria-label', translate(this.language, 'hud.idleSystems'));
    this.shopDrawerBackdropEl.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    this.shopDrawerHandleEl.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    document.getElementById('shop-close')?.setAttribute('aria-label', translate(this.language, 'hud.closeShop'));
    document.getElementById('settings-toggle')?.setAttribute('aria-label', translate(this.language, 'hud.openSettings'));
    document.getElementById('settings-toggle')?.setAttribute('title', translate(this.language, 'hud.openSettings'));
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
    if (this.tutorialGuide.isActive()) {
      return 0;
    }

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
      !this.modalEl.classList.contains('is-hidden') ||
      this.activePriorityPopup !== null
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
    const tabs: ShopTab[] = ['hangar'];

    if (this.shouldShowTechnologiesTab()) {
      tabs.push('warp');
    }
    if (this.shouldShowAchievementsTab()) {
      tabs.push('achievements');
    }

    return tabs;
  }

  private getVisibleDockTabs(): DockTab[] {
    const tabs: DockTab[] = [];
    if (this.state.progression.mapUnlocked) {
      tabs.push('map');
    }
    tabs.push(...this.getVisibleShopTabs());
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
      (getNextZone(this.state) !== null && !hasActiveZoneBoss(this.state))
    );
  }

  private shouldShowHangarTab(): boolean {
    return (
      this.shouldShowTechnologiesTab() ||
      this.getCrystalBalance() > 0 ||
      this.state.progression.unlockedShipFrameIds.length > 1
    );
  }

  private shouldShowAchievementsTab(): boolean {
    return countUnlockedAchievements(this.state.progression) > 0;
  }

  private syncVisibleShopTabs(): void {
    const visibleTabs = new Set(this.getVisibleShopTabs());
    const visibleDockTabs = new Set(this.getVisibleDockTabs());
    if (!visibleTabs.has(this.activeTab)) {
      if (this.activeModal === 'warpCores') {
        this.closeModal();
      }
      this.activeTab = 'hangar';
      this.activeWarpUnlockId = null;
    }

    this.navButtons.forEach((button) => {
      const tab = button.dataset.tab as DockTab;
      const visible = visibleDockTabs.has(tab);
      button.hidden = !visible;
      button.setAttribute('aria-hidden', visible ? 'false' : 'true');
      button.classList.toggle('is-active', visible && tab !== 'map' && tab === this.activeTab && !this.shopPanelEl.classList.contains('is-hidden'));
      const label = this.getDockTabLabel(tab);
      button.setAttribute('aria-label', label);
      button.title = label;
      if (button.dataset.renderedTab !== tab || button.dataset.renderedLabel !== label) {
        button.replaceChildren(this.createShopTabIcon(tab), this.createNavButtonLabel(tab));
        button.dataset.renderedTab = tab;
        button.dataset.renderedLabel = label;
      }
    });
  }

  private createNavButtonLabel(tab: DockTab): HTMLElement {
    const label = document.createElement('span');
    label.className = 'nav-button__label';
    label.textContent = this.getDockTabLabel(tab);
    return label;
  }

  private createShopTabIcon(tab: DockTab): SVGSVGElement {
    return createDockIcon(tab);
  }

  private getShopTabLabel(tab: ShopTab): string {
    if (tab === 'warp') {
      return translate(this.language, 'nav.technologies');
    }
    if (tab === 'hangar') {
      return translate(this.language, 'nav.hangar');
    }
    if (tab === 'achievements') {
      return translate(this.language, 'nav.achievements');
    }
    return translate(this.language, 'nav.hangar');
  }

  private getDockTabLabel(tab: DockTab): string {
    if (tab === 'map') {
      return translate(this.language, 'hud.openZoneMap');
    }
    return this.getShopTabLabel(tab);
  }

  private updateHud(): void {
    const survivalHudActive = isSurvivalZone(this.state) && this.state.ship.alive;
    this.appEl.classList.toggle('is-survival-hud', survivalHudActive);
    this.survivalHudEl.classList.toggle('is-hidden', !survivalHudActive);
    if (survivalHudActive) {
      this.setText(this.survivalTimerEl, this.formatDuration(this.state.survival.currentSeconds));
      const threatLevel = Math.max(1, this.state.survival.threatLevel);
      this.setText(this.survivalThreatEl, threatLevel.toString());
      this.survivalThreatFillEl.style.setProperty('--threat-fill', `${Math.min(100, Math.round((threatLevel / 12) * 100))}%`);
      const difficultyBest = getNovaCrownBestSeconds(
        this.state.progression.novaCrownBestSecondsByDifficulty,
        this.state.survival.difficulty
      );
      this.setText(this.survivalBestEl, `D${this.state.survival.difficulty} · ${this.formatDuration(difficultyBest)}`);
    }
    const crystals = this.getCrystalBalance();
    this.setText(this.moneyEl, this.formatMoney(this.state.money));
    this.setText(this.crystalsEl, formatCompactNumber(crystals));
    this.crystalsEl.setAttribute('aria-label', `${formatCompactNumber(crystals)} ${formatCrystalUnit(this.language, crystals)}`);
    this.setText(this.sectorEl, this.formatSector());
    this.updateRouteToggle();
    this.mapToggleEl.disabled = !this.state.progression.mapUnlocked;
    this.mapToggleEl.classList.toggle('is-locked', !this.state.progression.mapUnlocked);
    const hpPercent = Math.max(0, Math.min(1, this.state.ship.hp / Math.max(1, this.state.ship.maxHp)));
    this.hpMeterEl.style.setProperty('--hp-fill', `${Math.round(hpPercent * 100)}%`);
    this.hpMeterEl.dataset.condition = hpPercent <= 0.25 ? 'critical' : hpPercent <= 0.5 ? 'damaged' : 'healthy';
    this.hpMeterEl.setAttribute('aria-valuenow', String(Math.max(0, Math.ceil(this.state.ship.hp))));
    this.hpMeterEl.setAttribute('aria-valuemax', String(this.state.ship.maxHp));
    this.updateLowHpVeil(hpPercent);
    this.setText(this.hpEl, `${formatCompactNumber(Math.ceil(this.state.ship.hp))} / ${formatCompactNumber(this.state.ship.maxHp)}`);
    const shipLevel = Math.max(1, Math.floor(this.state.progression.shipLevel));
    const shipXpProgress = shipLevel >= getMaxShipLevel(this.state.progression)
      ? 1
      : Math.max(0, Math.min(1, this.state.progression.shipXp / Math.max(1, getShipXpForNextLevel(shipLevel))));
    this.setText(this.shipLevelEl, `${this.language === 'pt-BR' ? 'Nv' : 'Lv'} ${shipLevel}`);
    this.shipXpMeterEl.style.setProperty('--ship-xp-fill', `${Math.round(shipXpProgress * 100)}%`);

    this.syncVisibleShopTabs();
    this.updateFirstWarpGoal();
    this.updateBossHealth();
    this.updateShop();
  }

  private updateRouteToggle(): void {
    const nextRouteIndex = this.getNextUnlockedTravelZoneIndex();
    const visible = nextRouteIndex !== null && this.zoneTravel === null;
    this.routeToggleEl.classList.toggle('is-hidden', !visible);
    this.routeToggleEl.disabled = !visible;
    if (nextRouteIndex === null) {
      this.setText(this.routeTargetEl, this.language === 'pt-BR' ? 'Rota' : 'Route');
      return;
    }

    const zone = getZoneByIndex(nextRouteIndex);
    this.setText(this.routeTargetEl, this.language === 'pt-BR' ? `Ir: ${zone.name}` : `Go: ${zone.name}`);
    const label = this.language === 'pt-BR' ? `Viajar para ${zone.name}` : `Travel to ${zone.name}`;
    this.routeToggleEl.setAttribute('aria-label', label);
    this.routeToggleEl.title = label;
  }

  private getNextUnlockedTravelZoneIndex(): number | null {
    const nextIndex = this.state.progression.currentZoneIndex + 1;
    if (!this.state.progression.mapUnlocked || nextIndex > this.state.progression.unlockedZoneIndex || !isZoneUnlocked(this.state, nextIndex)) {
      return null;
    }
    return nextIndex;
  }

  private updateFirstWarpGoal(): void {
    if (isSurvivalZone(this.state)) {
      this.firstWarpGoalEl.classList.add('is-hidden');
      return;
    }

    const goal = getActiveGuidedMissionProgress(this.state);
    const activeBoss = this.getActiveBoss();
    this.firstWarpGoalEl.classList.toggle('is-hidden', goal === null || activeBoss !== null);
    this.firstWarpGoalEl.classList.toggle('is-muted', this.isBlockingDrawerOpen());
    if (!goal || activeBoss) {
      return;
    }

    this.setText(this.firstWarpGoalTitleEl, this.getFirstWarpGoalTitle(goal));
    this.setText(this.firstWarpGoalProgressTextEl, this.getFirstWarpGoalProgressLabel(goal));
    this.firstWarpGoalProgressEl.style.setProperty('--goal-progress', `${Math.round(goal.progress * 100)}%`);
  }

  private getFirstWarpGoalTitle(goal: GuidedMissionProgress): string {
    const titles: Record<GuidedMissionProgress['id'], string> = {
      drawGateBoss: this.language === 'pt-BR' ? 'Atrair o boss do portal' : 'Draw out the gate boss',
      defeatGateBoss: this.language === 'pt-BR' ? 'Derrotar o boss' : 'Defeat the boss',
      travelToOrion: this.language === 'pt-BR' ? 'Viajar para Orion Forge' : 'Travel to Orion Forge',
      collectWarpCrystals: this.language === 'pt-BR' ? 'Coletar cristais' : 'Collect crystals',
      earnFirstCore: this.language === 'pt-BR' ? 'Ganhar primeiro núcleo' : 'Earn first core',
      installDroneSystems: this.language === 'pt-BR' ? 'Instalar sistemas de drones' : 'Install Drone Systems',
      openVegaRoute: this.language === 'pt-BR' ? 'Abrir rota para Vega Drift' : 'Open route to Vega Drift',
      travelToVega: this.language === 'pt-BR' ? 'Viajar para Vega Drift' : 'Travel to Vega Drift',
      openCygnusRoute: this.language === 'pt-BR' ? 'Abrir rota para Cygnus Reef' : 'Open route to Cygnus Reef',
      travelToCygnus: this.language === 'pt-BR' ? 'Viajar para Cygnus Reef' : 'Travel to Cygnus Reef',
      openNovaRoute: this.language === 'pt-BR' ? 'Abrir rota para Nova Crown' : 'Open route to Nova Crown',
      travelToNovaCrown: this.language === 'pt-BR' ? 'Viajar para Nova Crown' : 'Travel to Nova Crown',
      clearAsteroids: this.language === 'pt-BR' ? 'Limpar asteroides' : 'Clear asteroids',
      surviveAsteroids: this.language === 'pt-BR' ? 'Limpar sem morrer' : 'Clear without dying',
      collectCredits: this.language === 'pt-BR' ? 'Coletar créditos' : 'Collect credits',
      collectCrystals: this.language === 'pt-BR' ? 'Coletar cristais' : 'Collect crystals',
      defeatZoneBoss: this.language === 'pt-BR' ? 'Derrotar boss de zona' : 'Defeat zone boss'
    };
    return titles[goal.id];
  }

  private getFirstWarpGoalProgressLabel(goal: GuidedMissionProgress): string {
    if (goal.id === 'defeatGateBoss' || goal.id === 'defeatZoneBoss' || goal.id === 'openVegaRoute' || goal.id === 'openCygnusRoute' || goal.id === 'openNovaRoute') {
      const progress = goal.ready
        ? (this.language === 'pt-BR' ? 'Completa' : 'Complete')
        : (this.language === 'pt-BR' ? 'Derrote boss de rota' : 'Defeat route boss');
      return progress;
    }
    if (goal.id === 'travelToOrion' || goal.id === 'travelToVega' || goal.id === 'travelToCygnus' || goal.id === 'travelToNovaCrown') {
      const progress = goal.ready
        ? (this.language === 'pt-BR' ? 'Destino alcançado' : 'Arrived')
        : (this.language === 'pt-BR' ? 'Rota aberta' : 'Route open');
      return progress;
    }
    if (goal.id === 'earnFirstCore') {
      const progress = goal.ready
        ? (this.language === 'pt-BR' ? 'Núcleo obtido' : 'Core earned')
        : `${goal.current}/${goal.target}`;
      return progress;
    }
    return `${formatCompactNumber(goal.current)}/${formatCompactNumber(goal.target)}`;
  }

  private updateBossHealth(): void {
    const boss = this.getActiveBoss();
    this.bossHealthEl.classList.toggle('is-hidden', boss === null);
    if (!boss?.bossType || boss.bossZoneIndex === undefined) {
      return;
    }

    const nextZone = getZoneByIndex(boss.bossZoneIndex);
    const hp = Math.max(0, Math.ceil(boss.hp));
    const maxHp = Math.max(1, Math.ceil(boss.maxHp));
    this.setText(this.bossHealthNameEl, this.formatBossName(boss.bossType));
    this.setText(this.bossHealthValueEl, `${formatCompactNumber(hp)} / ${formatCompactNumber(maxHp)}`);
    this.bossHealthEl.setAttribute('aria-label', this.language === 'pt-BR' ? `Vida do boss ${nextZone.name}` : `${nextZone.name} boss health`);
    this.bossHealthProgressEl.style.setProperty('--boss-health-progress', `${Math.round(Math.max(0, Math.min(1, boss.hp / Math.max(1, boss.maxHp))) * 100)}%`);
  }

  private getActiveBoss(): AsteroidState | null {
    return this.state.asteroids.find((asteroid) => asteroid.bossType) ?? null;
  }

  private updateDeathFade(): void {
    this.deathFadeEl.style.opacity = '0';
  }

  private updateLowHpVeil(hpPercent: number): void {
    if (this.state.phase === 'ended') {
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
    this.menuBackdropAsteroids = [];
  }

  private bindShopUi(): void {
    this.menuToggleEl.addEventListener('click', () => {
      const expanded = !this.bottomNavEl.classList.toggle('is-collapsed');
      this.menuToggleEl.setAttribute('aria-expanded', expanded.toString());
      this.menuToggleEl.classList.toggle('is-active', expanded);
    });

    this.routeToggleEl.addEventListener('click', () => {
      const nextRouteIndex = this.getNextUnlockedTravelZoneIndex();
      if (nextRouteIndex === null) {
        return;
      }
      this.travelToZone(nextRouteIndex);
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
        this.openShopDrawer();
        this.closeModal();
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

  private bindPriorityPopupUi(): void {
    this.priorityPopupOkEl.addEventListener('click', () => this.closePriorityPopup());
  }

  private queuePriorityPopups(events: GameRewardEvent[]): void {
    events.forEach((event) => {
      const popup = this.createPriorityPopupForReward(event);
      if (!popup || this.isPriorityPopupQueued(popup.key)) {
        return;
      }
      this.priorityPopupQueue.push(popup);
    });

    this.showNextPriorityPopup();
  }

  private createPriorityPopupForReward(event: GameRewardEvent): PriorityPopupContent | null {
    if (event.kind !== 'unlock') {
      return null;
    }

    if (event.text.startsWith('Mission complete:')) {
      const reward = event.text.replace('Mission complete:', '').trim();
      return {
        key: `mission-${reward}-${this.state.progression.guidedMissions.completedMissionIds.length}`,
        kicker: this.language === 'pt-BR' ? 'Missão completa' : 'Mission complete',
        title: this.language === 'pt-BR' ? 'Recompensa permanente' : 'Permanent reward',
        copy: this.language === 'pt-BR'
          ? `Você recebeu ${reward}.`
          : `You received ${reward}.`,
        okLabel: 'OK'
      };
    }

    const unlockedZone = zones.find((zone) => event.text === `${zone.name} unlocked on map`);
    if (!unlockedZone) {
      return null;
    }

    return {
      key: `zone-${unlockedZone.index}`,
      kicker: this.language === 'pt-BR' ? 'Nova zona' : 'New zone',
      title: this.language === 'pt-BR' ? `${unlockedZone.name} liberada` : `${unlockedZone.name} unlocked`,
      copy: this.language === 'pt-BR'
        ? 'Uma nova rota está disponível no mapa.'
        : 'A new route is available on the map.',
      okLabel: 'OK'
    };
  }

  private isPriorityPopupQueued(key: string): boolean {
    return this.activePriorityPopup?.key === key || this.priorityPopupQueue.some((popup) => popup.key === key);
  }

  private showNextPriorityPopup(): void {
    if (this.activePriorityPopup || this.priorityPopupQueue.length <= 0) {
      return;
    }

    const popup = this.priorityPopupQueue.shift();
    if (!popup) {
      return;
    }

    this.activePriorityPopup = popup;
    this.priorityPopupKickerEl.textContent = popup.kicker;
    this.priorityPopupTitleEl.textContent = popup.title;
    this.priorityPopupCopyEl.textContent = popup.copy;
    this.priorityPopupOkEl.textContent = popup.okLabel;
    this.priorityPopupEl.classList.remove('is-hidden');
    this.priorityPopupEl.setAttribute('aria-hidden', 'false');
    window.setTimeout(() => this.priorityPopupOkEl.focus({ preventScroll: true }), 0);
  }

  private closePriorityPopup(): void {
    this.activePriorityPopup = null;
    this.priorityPopupEl.classList.add('is-hidden');
    this.priorityPopupEl.setAttribute('aria-hidden', 'true');
    this.showNextPriorityPopup();
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
      if (panel === this.modalPanelEl && (this.activeModal === 'runMenu' || this.activeModal === 'levelUpCards')) return;
      if (event.pointerType === 'mouse' && event.button !== 0) {
        return;
      }

      if (!(event.target instanceof Element)) {
        return;
      }

      const target = event.target;
      const interactive = target.closest('button, input, select, textarea, a');
      if (interactive && !handles.includes(interactive as HTMLElement)) return;
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
      this.state.progression.shipSpeedLevel,
      this.state.progression.deflectorLevel,
      this.state.progression.activeShipFrameId,
      this.state.progression.unlockedShipFrameIds.join(','),
      this.state.progression.mapUnlocked,
      this.state.progression.travelLevel,
      this.state.progression.currentZoneIndex,
      this.state.progression.unlockedZoneIndex,
      this.state.progression.bossDefeats,
      this.state.progression.ownedWarpUnlockIds.join(','),
      hasActiveZoneBoss(this.state),
      this.state.pendingBoss?.spawnIn.toFixed(1) ?? 'none',
      this.state.progression.prestigeCores,
      this.state.survival.active ? this.state.survival.threatLevel : 0,
      this.getCrystalBalance(),
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
      warp: () => this.renderWarpTab(),
      hangar: () => this.renderHangarTab(),
      achievements: () => this.renderAchievementsTab()
    };

    renderers[this.activeTab]();

    if (this.activeModal === 'info' && this.activeModalInfo) {
      this.renderInfoModal();
    } else if (this.activeModal === 'warpCores') {
      this.renderWarpCoreTreeModal();
    } else if (this.activeModal === 'zones') {
      this.renderZoneMapModal();
    } else if (this.activeModal === 'settings') {
      this.renderSettingsModal();
    } else if (this.activeModal === 'levelUpCards') {
      this.renderLevelUpCardChoiceModal();
    } else if (this.activeModal === 'novaCrownDifficulty') {
      this.renderNovaCrownDifficultyModal();
    }
  }

  private getAffordabilitySignature(): string {
    if (this.activeTab === 'warp') {
      return `cores:${getAvailableWarpCores(this.state.progression)}:${this.state.progression.prestigeCores}`;
    }

    if (this.activeTab === 'hangar') {
      return [
        `active:${this.state.progression.activeShipFrameId}`,
        `ships:${this.state.progression.unlockedShipFrameIds.join(',')}`,
        `money:${Math.floor(this.state.money)}`,
        `crystals:${this.state.crystals}`
      ].join(',');
    }


    return '';
  }

  private maybeStartTutorialGuide(): void {
    if (this.shouldDeferTutorialGuide()) {
      return;
    }

    if (!this.tutorialGuide.hasCompleted('zone-travel') && this.hasUnlockedZoneToTravel()) {
      this.startTutorialGuide(ZONE_TRAVEL_TUTORIAL);
    }
  }

  private shouldDeferTutorialGuide(): boolean {
    return this.tutorialGuide.isActive() ||
      !this.gameStarted ||
      this.zoneTravel !== null ||
      this.introWarp !== null ||
      !this.isQuickMenuCollapsed() ||
      this.isBlockingDrawerOpen();
  }

  private startTutorialGuide(flow: TutorialFlow): void {
    this.activeGameplayPointerId = null;
    this.gameplayPointerStartScreen = null;
    this.gameplayPointerScreen = null;
    this.tutorialGuide.start(flow);
  }

  private hasUnlockedZoneToTravel(): boolean {
    return this.state.progression.mapUnlocked &&
      this.state.progression.unlockedZoneIndex > this.state.progression.currentZoneIndex;
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
    const panels: HTMLElement[] = [];
    if (this.shouldShowHangarTab()) {
      panels.push(this.createHangarShortcutPanel());
    }
    if (hasWarpUnlock(this.state.progression, 'bossBeacon') || (getNextZone(this.state) !== null && !hasActiveZoneBoss(this.state))) {
      panels.push(this.createBossBeaconPanel());
    }
    this.shopActionsEl.replaceChildren(...panels, coreTree);
  }

  private createHangarShortcutPanel(): HTMLElement {
    return this.hangar.renderShortcut({
      state: this.state,
      language: this.language,
      onOpenHangar: () => {
        this.activeTab = 'hangar';
        this.shopSignature = '';
        this.updateShop();
      }
    });
  }

  private renderHangarTab(): void {
    this.setShopContent('', '', '', [], [], true);
    this.shopActionsEl.replaceChildren(this.hangar.renderPanel({
      state: this.state,
      language: this.language,
      formatMoney: (value) => this.formatMoney(value),
      onSwitchShipFrame: (id) => this.switchShipFrame(id)
    }));
  }

  private createCompactPanelStat(label: string, value: string): HTMLElement {
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
    panel.className = 'action-panel';

    const header = document.createElement('div');
    header.className = 'action-panel__header';
    const titleWrap = document.createElement('div');
    const kicker = document.createElement('span');
    kicker.className = 'action-panel__kicker';
    kicker.textContent = this.language === 'pt-BR' ? 'Sinalizador de Boss' : 'Boss Beacon';
    const title = document.createElement('strong');
    title.textContent = nextZone
      ? (this.language === 'pt-BR' ? `Sinal de ${this.formatBossName(nextZone.bossType)}` : `${this.formatBossName(nextZone.bossType)} signal`)
      : (this.language === 'pt-BR' ? 'Rota limpa' : 'Route cleared');
    titleWrap.append(kicker, title);

    const summonButton = document.createElement('button');
    summonButton.className = 'shop-buy action-panel__button';
    summonButton.type = 'button';
    summonButton.disabled = blocked;
    summonButton.textContent = blocked ? (this.language === 'pt-BR' ? 'Bloqueado' : 'Blocked') : (this.language === 'pt-BR' ? 'Invocar' : 'Summon');
    summonButton.addEventListener('click', () => this.summonZoneBoss());
    header.append(titleWrap, summonButton);

    const stats = document.createElement('div');
    stats.className = 'action-panel__stats';
    if (nextZone) {
      const bossStats = balance.bosses.stats[nextZone.bossType];
      const bossHp = bossStats.hpBase + nextZone.index * bossStats.hpPerZone;
      const bossMoney = balance.bosses.reward.baseMoney + nextZone.index * balance.bosses.reward.moneyPerZone;
      const bossCrystals = balance.bosses.reward.baseCrystals + nextZone.index * balance.bosses.reward.crystalsPerZone;
      stats.replaceChildren(
        this.createCompactPanelStat('HP', bossHp.toString()),
        this.createCompactPanelStat(this.language === 'pt-BR' ? 'Base' : 'Base', `${this.formatMoney(bossMoney)} + ${bossCrystals} ${formatCrystalUnit(this.language, bossCrystals)}`)
      );
    }

    const preview = document.createElement('p');
    preview.className = 'action-panel__preview';
    preview.textContent = nextZone
      ? (this.language === 'pt-BR' ? 'Invoca um desafio de rota.' : 'Summon a route challenge.')
      : (this.language === 'pt-BR' ? 'Não há mais sinais de boss de portal disponíveis nesta rota.' : 'No further gate boss signals are available on this route.');

    panel.append(header);
    if (nextZone) {
      panel.append(stats);
    }
    panel.append(preview);
    return panel;
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
    if (action.className) {
      button.className = `${button.className} ${action.className}`;
    }
    button.type = 'button';
    button.disabled = action.disabled;
    if (action.tutorialTarget) {
      button.dataset.tutorialTarget = action.tutorialTarget;
    }

    if (action.title) {
      const icon = document.createElement('span');
      icon.className = 'shop-action-icon';
      if (action.iconNode) {
        icon.append(action.iconNode());
      } else {
        icon.textContent = action.icon ?? '+';
      }
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

    if (action.controlNode) {
      row.classList.add('shop-action-row--with-control');
      row.append(action.controlNode());
    }

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
    this.activeWarpUnlockId = null;
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown', 'ui-modal__panel--cards');
    this.renderInfoModal();
  }

  private openWarpCoreTreeModal(): void {
    this.activeModal = 'warpCores';
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.renderWarpCoreTreeModal();
  }

  private openZoneMapModal(): void {
    this.activeModal = 'zones';
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.renderZoneMapModal();
  }

  private openNovaCrownDifficultyModal(): void {
    this.activeModal = 'novaCrownDifficulty';
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.novaCrownDifficultySelection = Math.min(
      normalizeNovaCrownDifficulty(this.state.progression.novaCrownSelectedDifficulty),
      normalizeNovaCrownDifficulty(this.state.progression.novaCrownHighestDifficulty)
    );
    this.renderNovaCrownDifficultyModal();
  }

  private openSettingsModal(): void {
    this.activeModal = 'settings';
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.audioSettings.setExpanded(true);
    this.renderSettingsModal();
  }

  private syncLevelUpCardChoiceModal(): void {
    if (
      this.state.runCards.pendingChoiceIds.length <= 0 ||
      this.activeModal ||
      this.activePriorityPopup ||
      this.priorityPopupQueue.length > 0
    ) {
      return;
    }

    this.activeModal = 'levelUpCards';
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.renderLevelUpCardChoiceModal();
  }

  private closeModal(): void {
    if (this.activeModal === 'levelUpCards' || this.activeModal === 'runMenu') {
      return;
    }
    this.activeModal = null;
    this.activeModalInfo = null;
    this.activeWarpUnlockId = null;
    this.audioSettings.setExpanded(false);
    this.modalEl.classList.add('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'true');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown', 'ui-modal__panel--cards');
    this.modalBodyEl.replaceChildren();
  }

  private renderLevelUpCardChoiceModal(): void {
    const choices = this.state.runCards.pendingChoiceIds;
    if (choices.length <= 0) {
      this.activeModal = null;
      this.closeModal();
      return;
    }

    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown', 'ui-modal__panel--cards');
    this.modalPanelEl.classList.add('ui-modal__panel--cards');
    this.modalKickerEl.textContent = this.language === 'pt-BR' ? `Nível ${this.state.progression.shipLevel}` : `Level ${this.state.progression.shipLevel}`;
    this.modalTitleEl.textContent = this.language === 'pt-BR' ? 'Escolha uma melhoria' : 'Choose an upgrade';
    this.modalCopyEl.textContent = this.state.runCards.queuedChoiceCount > 1
      ? (this.language === 'pt-BR' ? `${this.state.runCards.queuedChoiceCount} escolhas aguardando` : `${this.state.runCards.queuedChoiceCount} choices waiting`)
      : (this.language === 'pt-BR' ? 'Sua build dura até o fim desta run.' : 'Your build lasts for this run.');
    this.modalCopyEl.classList.remove('is-hidden');

    const actions = document.createElement('div');
    actions.className = 'run-card-actions';
    choices.forEach((id) => {
      const definition = RUN_CARD_BY_ID[id];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `run-card-choice run-card-choice--${definition.rarity}`;

      const header = document.createElement('span');
      header.className = 'run-card-choice__header';
      const rarity = document.createElement('small');
      rarity.textContent = this.getRunCardRarityLabel(definition.rarity);
      const title = document.createElement('strong');
      title.textContent = this.getRunCardTitle(id);
      header.append(rarity, title);

      const summary = document.createElement('span');
      summary.className = 'run-card-choice__summary';
      summary.textContent = this.getRunCardSummary(id);
      const stacks = document.createElement('span');
      stacks.className = 'run-card-choice__stacks';
      stacks.textContent = this.language === 'pt-BR'
        ? `${this.state.runCards.selectedStacks[id]} acúmulos`
        : `${this.state.runCards.selectedStacks[id]} stacks`;
      button.append(header, summary, stacks);
      const icon = createRunCardIcon(id);
      icon.classList.add('run-card-choice__icon');
      button.prepend(icon);
      button.addEventListener('click', () => this.chooseLevelUpCard(id));
      actions.append(button);
    });
    this.modalBodyEl.replaceChildren(actions);
    this.modalTitleEl.focus({ preventScroll: true });
  }

  private getRunCardRarityLabel(rarity: RunCardRarity): string {
    if (this.language !== 'pt-BR') {
      return { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }[rarity];
    }
    return { common: 'Comum', rare: 'Raro', epic: 'Épico', legendary: 'Lendário' }[rarity];
  }

  private chooseLevelUpCard(id: RunCardId): void {
    if (!applyRunCardChoice(this.state, id)) {
      return;
    }
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.shopSignature = '';
    if (this.state.runCards.pendingChoiceIds.length > 0) {
      this.renderLevelUpCardChoiceModal();
    } else {
      this.activeModal = null;
      this.closeModal();
    }
    this.updateHud();
  }

  private getRunCardTitle(id: RunCardId): string {
    if (this.language !== 'pt-BR') {
      return RUN_CARD_BY_ID[id].title;
    }
    return {
      kineticAmplifier: 'Amplificador Cinético', rapidCycler: 'Ciclo Rápido', reinforcedHull: 'Casco Reforçado',
      splitChamber: 'Câmara Dupla', piercingCore: 'Núcleo Perfurante', expandedCaliber: 'Calibre Expandido',
      thorns: 'Espinhos', impulseVector: 'Vetor de Impulso', inertialArmor: 'Blindagem Inercial',
      emergencyBarrier: 'Barreira de Emergência', criticalReactor: 'Reator Crítico',
      huntingRadar: 'Radar de Caça', sentryWing: 'Sentry Wing', rangerWing: 'Ranger Wing', breakerWing: 'Breaker Wing',
      unstableRicochet: 'Ricochete Instável', incendiaryCharge: 'Carga Incendiária',
      fragmentationChamber: 'Câmara de Fragmentação'
    }[id];
  }

  private getRunCardSummary(id: RunCardId): string {
    if (this.language !== 'pt-BR') {
      return RUN_CARD_BY_ID[id].summary;
    }
    return {
      kineticAmplifier: '+20% de dano das armas.', rapidCycler: '+15% de velocidade de ataque.', reinforcedHull: '+20 de casco máximo.',
      splitChamber: '+1 projétil por tiro.', piercingCore: '+1 perfuração de projéteis.', expandedCaliber: '+15% de tamanho de projéteis e ondas.',
      thorns: '+18 de dano de impacto em dash.', impulseVector: '+15% de impulso no dash.', inertialArmor: '-15% de knockback por colisão.',
      emergencyBarrier: 'Absorve +1 próximo impacto.',
      criticalReactor: '15% de chance de dano dobrado nos tiros. Cada acúmulo adiciona outra chance.',
      huntingRadar: 'Tiros seguem levemente inimigos próximos. Acúmulos melhoram as curvas.',
      sentryWing: '+1 drone sentinela temporário.',
      rangerWing: '+1 drone shotgun temporário.',
      breakerWing: '+1 drone de mísseis temporário.',
      unstableRicochet: '+1 ricochete em asteroides por projétil.',
      incendiaryCharge: 'Queima asteroides por 3s: 25% do dano do tiro por segundo por acúmulo.',
      fragmentationChamber: 'Destruições diretas liberam 2 fragmentos por acúmulo com 35% do dano. Fragmentos não se dividem.'
    }[id];
  }

  private renderSettingsModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--nova-crown');
    this.modalPanelEl.classList.add('ui-modal__panel--settings');
    this.modalKickerEl.textContent = translate(this.language, 'settings.audio');
    this.modalTitleEl.textContent = translate(this.language, 'settings.sound');
    this.modalCopyEl.textContent = '';
    this.modalCopyEl.classList.add('is-hidden');
    this.modalBodyEl.replaceChildren(
      ...this.audioSettings.render(),
      this.createSwipeDirectionControl(),
      this.createDevtoolsControl(),
      this.createResetDataControl()
    );
  }

  private createSwipeDirectionControl(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-modal-control input-mode-control';

    const heading = document.createElement('div');
    heading.className = 'settings-control';
    const title = document.createElement('span');
    title.textContent = this.language === 'pt-BR' ? 'Direção do swipe' : 'Swipe direction';
    const status = document.createElement('strong');
    status.textContent = this.getSwipeDirectionLabel(this.swipeDirectionMode);
    heading.append(title, status);

    const options = document.createElement('div');
    options.className = 'input-mode-options';
    (['direct', 'inverted'] as SwipeDirectionMode[]).forEach((mode) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'input-mode-option';
      button.classList.toggle('is-active', this.swipeDirectionMode === mode);
      button.textContent = this.getSwipeDirectionLabel(mode);
      button.addEventListener('click', () => {
        this.saveSwipeDirectionMode(mode);
        this.renderSettingsModal();
      });
      options.append(button);
    });

    const copy = document.createElement('p');
    copy.className = 'settings-danger-copy input-mode-copy';
    copy.textContent = this.swipeDirectionMode === 'direct'
      ? (this.language === 'pt-BR'
        ? 'Arraste para o lado que quer impulsionar.'
        : 'Drag toward the direction you want to boost.')
      : (this.language === 'pt-BR'
        ? 'Puxe contra a direção que quer impulsionar.'
        : 'Pull against the direction you want to boost.');

    wrapper.append(heading, options, copy);
    return wrapper;
  }

  private getSwipeDirectionLabel(mode: SwipeDirectionMode): string {
    if (mode === 'direct') {
      return this.language === 'pt-BR' ? 'Direto' : 'Direct';
    }
    return this.language === 'pt-BR' ? 'Invertido' : 'Inverted';
  }

  private createDevtoolsControl(): HTMLElement {
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-modal-control settings-devtools-control';

    const heading = document.createElement('div');
    heading.className = 'settings-control';
    const title = document.createElement('span');
    title.textContent = 'Devtools';
    const status = document.createElement('strong');
    status.textContent = this.settingsDevtoolsOpen
      ? (this.language === 'pt-BR' ? 'Aberto' : 'Open')
      : (this.language === 'pt-BR' ? 'Oculto' : 'Hidden');
    heading.append(title, status);

    const copy = document.createElement('p');
    copy.className = 'settings-danger-copy input-mode-copy';
    copy.textContent = this.language === 'pt-BR'
      ? 'Ferramentas locais para testar encontros, economia e progressão rapidamente.'
      : 'Local tools for quickly testing encounters, economy, and progression.';

    const button = document.createElement('button');
    button.className = 'input-mode-option';
    button.type = 'button';
    button.textContent = this.settingsDevtoolsOpen
      ? (this.language === 'pt-BR' ? 'Fechar devtools' : 'Close devtools')
      : (this.language === 'pt-BR' ? 'Abrir devtools' : 'Open devtools');
    button.addEventListener('click', () => {
      this.settingsDevtoolsOpen = !this.settingsDevtoolsOpen;
      this.renderSettingsModal();
    });

    wrapper.append(heading, copy, button);
    if (this.settingsDevtoolsOpen) {
      const actions = document.createElement('div');
      actions.className = 'input-mode-options settings-devtools-actions';
      actions.append(
        this.createDevtoolsActionButton(
          this.language === 'pt-BR' ? 'Invocar Mothership' : 'Summon Mothership',
          () => this.runSettingsTestAction()
        ),
        this.createDevtoolsActionButton(
          this.language === 'pt-BR' ? 'Liberar naves' : 'Unlock ships',
          () => this.unlockAllShipsDevtool()
        ),
        this.createDevtoolsActionButton(
          this.language === 'pt-BR' ? 'Ganhar dinheiro' : 'Gain money',
          () => this.gainMoneyDevtool()
        ),
        this.createDevtoolsActionButton(
          this.language === 'pt-BR' ? 'Ganhar level' : 'Gain level',
          () => this.gainLevelDevtool()
        ),
        this.createDevtoolsActionButton(
          this.language === 'pt-BR' ? 'Testar morte' : 'Test death',
          () => {
            this.closeModal();
            this.state.runCards.shieldCharges = 0;
            this.state.ship.phaseShieldCooldown = 999;
            damageShip(this.state, this.state.ship.maxHp + this.state.ship.armor + 10000);
          }
        )
      );
      wrapper.append(actions);
    }
    return wrapper;
  }

  private createDevtoolsActionButton(label: string, onClick: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.className = 'input-mode-option';
    button.type = 'button';
    button.textContent = label;
    button.addEventListener('click', () => {
      onClick();
      if (this.activeModal === 'settings') this.renderSettingsModal();
    });
    return button;
  }

  private runSettingsTestAction(): void {
    this.summonTestMothership();
  }

  private unlockAllShipsDevtool(): void {
    const before = this.state.progression.unlockedShipFrameIds.length;
    this.state.progression.unlockedShipFrameIds = SHIP_FRAME_DEFINITIONS.map((frame) => frame.id);
    const unlocked = this.state.progression.unlockedShipFrameIds.length - before;
    emitReward(
      this.state,
      this.language === 'pt-BR'
        ? `Devtools: ${Math.max(0, unlocked)} naves liberadas.`
        : `Devtools: ${Math.max(0, unlocked)} ships unlocked.`,
      'system'
    );
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private gainMoneyDevtool(): void {
    const amount = 1_000_000;
    this.state.money += amount;
    emitReward(
      this.state,
      this.language === 'pt-BR'
        ? `Devtools: +${this.formatMoney(amount)}.`
        : `Devtools: +${this.formatMoney(amount)}.`,
      'payout'
    );
    this.retroSound.play({ type: 'purchase' });
    saveGameState(this.state);
    this.updateHud();
  }

  private gainLevelDevtool(): void {
    const maxLevel = getMaxShipLevel(this.state.progression);
    if (this.state.progression.shipLevel >= maxLevel) {
      emitReward(
        this.state,
        this.language === 'pt-BR' ? 'Devtools: nível máximo atingido.' : 'Devtools: max level reached.',
        'system'
      );
      saveGameState(this.state);
      this.updateHud();
      return;
    }

    grantShipXp(this.state, getShipXpForNextLevel(this.state.progression.shipLevel));
    saveGameState(this.state);
    this.updateHud();
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

    clearAllAsterliteData();
    this.state = createGameState(this.scale.width, this.scale.height);
    this.saveElapsed = 0;
    this.shopSignature = '';
    this.activeTab = 'hangar';
    this.activeWarpUnlockId = null;
    this.zoneTravel = null;
    this.appEl.classList.remove('is-zone-travel', 'is-impact');
    this.setScreenFlash(0);
    this.audioSettings.resetToDefaults();
    this.swipeDirectionMode = DEFAULT_SWIPE_DIRECTION;
    this.pendingSwipeImpulseVector = null;
    this.vectorTapBoost = null;
    this.swipeImpulseIndicator = null;
    this.swipeThrustTrail = null;
    this.swipeFireFor = 0;
    saveGameState(this.state);
    this.closeModal();
    this.closeShopDrawer();
    emitReward(this.state, translate(this.language, 'settings.resetDone'), 'system');
    this.updateHud();
  }

  private renderZoneMapModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--settings', 'ui-modal__panel--warp', 'ui-modal__panel--nova-crown');
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

  private renderNovaCrownDifficultyModal(): void {
    const highestDifficulty = normalizeNovaCrownDifficulty(this.state.progression.novaCrownHighestDifficulty);
    this.novaCrownDifficultySelection = Math.max(1, Math.min(this.novaCrownDifficultySelection, highestDifficulty));
    const selectedDifficulty = this.novaCrownDifficultySelection;
    const config = getNovaCrownDifficultyConfig(selectedDifficulty);
    const bestSeconds = getNovaCrownBestSeconds(this.state.progression.novaCrownBestSecondsByDifficulty, selectedDifficulty);
    const nextLocked = selectedDifficulty >= highestDifficulty;

    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown');
    this.modalPanelEl.classList.add('ui-modal__panel--nova-crown');
    this.modalKickerEl.textContent = 'Nova Crown';
    this.modalTitleEl.textContent = this.language === 'pt-BR' ? 'Escolha a dificuldade' : 'Choose difficulty';
    this.modalCopyEl.textContent = this.language === 'pt-BR'
      ? `Alcance threat ${novaCrownClearThreatLevel} para liberar a próxima dificuldade.`
      : `Reach threat ${novaCrownClearThreatLevel} to unlock the next difficulty.`;
    this.modalCopyEl.classList.remove('is-hidden');

    const shell = document.createElement('div');
    shell.className = 'nova-difficulty';

    const selector = document.createElement('div');
    selector.className = 'nova-difficulty__selector';

    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'nova-difficulty__step';
    previous.textContent = '‹';
    previous.disabled = selectedDifficulty <= 1;
    previous.setAttribute('aria-label', this.language === 'pt-BR' ? 'Dificuldade anterior' : 'Previous difficulty');
    previous.addEventListener('click', () => {
      this.novaCrownDifficultySelection = Math.max(1, this.novaCrownDifficultySelection - 1);
      this.renderNovaCrownDifficultyModal();
    });

    const level = document.createElement('div');
    level.className = 'nova-difficulty__level';
    const levelLabel = document.createElement('span');
    levelLabel.textContent = this.language === 'pt-BR' ? 'Dificuldade' : 'Difficulty';
    const levelValue = document.createElement('strong');
    levelValue.textContent = selectedDifficulty.toString();
    level.append(levelLabel, levelValue);

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'nova-difficulty__step';
    next.textContent = '›';
    next.disabled = nextLocked;
    next.setAttribute('aria-label', this.language === 'pt-BR' ? 'Próxima dificuldade' : 'Next difficulty');
    next.addEventListener('click', () => {
      this.novaCrownDifficultySelection = Math.min(highestDifficulty, this.novaCrownDifficultySelection + 1);
      this.renderNovaCrownDifficultyModal();
    });
    selector.append(previous, level, next);

    const stats = document.createElement('div');
    stats.className = 'nova-difficulty__stats';
    stats.append(
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Maior' : 'Highest', highestDifficulty.toString()),
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Recorde' : 'Best', this.formatDuration(bestSeconds)),
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Threat inicial' : 'Start threat', config.startingThreatLevel.toString()),
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Recompensa' : 'Reward', `x${this.formatStatNumber(config.rewardMultiplier)}`),
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Asteroides' : 'Asteroids', `x${this.formatStatNumber(config.asteroidHpMultiplier)}`),
      this.createNovaDifficultyStat(this.language === 'pt-BR' ? 'Dano' : 'Damage', `x${this.formatStatNumber(config.asteroidDamageMultiplier)}`)
    );

    const actions = document.createElement('div');
    actions.className = 'nova-difficulty__actions';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'nova-difficulty__secondary';
    back.textContent = this.language === 'pt-BR' ? 'Voltar' : 'Back';
    back.addEventListener('click', () => this.openZoneMapModal());

    const enter = document.createElement('button');
    enter.type = 'button';
    enter.className = 'nova-difficulty__primary';
    enter.textContent = this.language === 'pt-BR' ? 'Entrar' : 'Enter';
    enter.addEventListener('click', () => this.confirmNovaCrownDifficultyTravel(selectedDifficulty));
    actions.append(back, enter);

    shell.append(selector, stats, actions);
    this.modalBodyEl.replaceChildren(shell);
  }

  private createNovaDifficultyStat(label: string, value: string): HTMLElement {
    const stat = document.createElement('span');
    stat.className = 'nova-difficulty__stat';
    const labelEl = document.createElement('small');
    labelEl.textContent = label;
    const valueEl = document.createElement('strong');
    valueEl.textContent = value;
    stat.append(labelEl, valueEl);
    return stat;
  }

  private confirmNovaCrownDifficultyTravel(difficulty: number): void {
    const highestDifficulty = normalizeNovaCrownDifficulty(this.state.progression.novaCrownHighestDifficulty);
    const selectedDifficulty = Math.max(1, Math.min(normalizeNovaCrownDifficulty(difficulty), highestDifficulty));
    this.state.progression.novaCrownSelectedDifficulty = selectedDifficulty;
    this.state.survival.difficulty = selectedDifficulty;
    this.startZoneTravel(maxTravelLevel);
  }

  private renderInfoModal(): void {
    const info = this.activeModalInfo;
    if (!info) {
      this.closeModal();
      return;
    }

    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown');
    this.modalKickerEl.textContent = info.kicker;
    this.modalTitleEl.textContent = info.title;
    this.modalCopyEl.textContent = info.copy;
    this.modalCopyEl.classList.toggle('is-hidden', info.copy.trim().length === 0);

    this.modalBodyEl.replaceChildren(...this.infoModal.renderBody(info));
  }

  private renderWarpCoreTreeModal(): void {
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--skills', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown');
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
    this.modalTitleEl.focus({ preventScroll: true });
  }

  private selectWarpUnlock(id: WarpUnlockId | null): void {
    this.activeWarpUnlockId = id;
    if (this.activeModal === 'warpCores') {
      this.renderWarpCoreTreeModal();
    } else if (this.activeTab === 'warp') {
      this.renderWarpTab();
    }
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
    if (index === maxTravelLevel) {
      this.openNovaCrownDifficultyModal();
      return;
    }

    this.startZoneTravel(index);
  }

  private startZoneTravel(index: number): void {
    this.closeModal();
    this.closeShopDrawer();
    this.state.asteroids = [];
    this.state.hazards = [];
    this.state.bullets = [];
    this.state.particles = [];
    this.state.levelShockwaves = [];
    this.state.saucer = null;
    this.state.pendingBoss = null;
    this.appEl.classList.add('is-zone-travel');
    this.zoneTravel = {
      toIndex: index,
      elapsed: 0,
      duration: INTRO_WARP_DURATION,
      direction: this.getZoneTravelDirection(index),
      impactTriggered: false,
      destinationApplied: false
    };
    this.retroSound.play({ type: 'spaceTravel' });
  }

  private finishZoneTravel(index: number): void {
    this.applyZoneTravelDestination(index);
    this.retroSound.play({ type: 'zoneUnlocked' });
    this.appEl.classList.remove('is-zone-travel', 'is-impact');
    this.setScreenFlash(0);
    this.introGraphics.clear();
    saveGameState(this.state);
    this.updateHud();
  }

  private applyZoneTravelDestination(index: number): void {
    if (this.state.progression.currentZoneIndex === index) {
      return;
    }

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
    this.state.hazards = [];
    this.state.bullets = [];
    this.state.particles = [];
    this.state.levelShockwaves = [];
    this.state.saucer = null;
  }

  private updateZoneTravel(dt: number): void {
    const travel = this.zoneTravel;
    if (!travel) {
      return;
    }

    travel.elapsed += dt;
    const progress = Math.min(1, travel.elapsed / travel.duration);
    const launchProgress = this.easeInCubic(Math.min(1, progress / 0.72));
    const pulse = Math.sin(progress * Math.PI);
    const travelVelocity = {
      x: travel.direction.x * (700 + launchProgress * 4200 + pulse * 900),
      y: travel.direction.y * (700 + launchProgress * 4200 + pulse * 900)
    };

    this.state.width = this.scale.width;
    this.state.height = this.scale.height;
    this.starfield.update(dt, travelVelocity, { progress, direction: travel.direction });
    this.vectorRenderer.clear();
    this.drawIntroShip(progress);
    const flashProgress = Math.min(1, Math.max(0, (progress - 0.78) / 0.22));
    const flashAlpha = Math.sin(flashProgress * Math.PI) * 0.92;
    this.setScreenFlash(flashAlpha);
    if (!travel.destinationApplied && progress >= 0.86) {
      travel.destinationApplied = true;
      this.applyZoneTravelDestination(travel.toIndex);
      saveGameState(this.state);
    }
    if (!travel.impactTriggered && progress >= 0.83) {
      travel.impactTriggered = true;
      this.cameras.main.shake(280, 0.009);
      this.appEl.classList.add('is-impact');
      window.setTimeout(() => this.appEl.classList.remove('is-impact'), 300);
    }
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
    if (!pendingBoss) {
      return;
    }

    this.state.asteroids = this.state.asteroids.filter((asteroid) => !asteroid.bossType);
    this.state.pendingBoss = pendingBoss;
    this.state.progression.bossDiscovery.rareBossProgress = 0;
    this.closeShopDrawer();
    emitReward(
      this.state,
      this.language === 'pt-BR'
        ? `${this.formatBossName(pendingBoss.bossType)} chegando`
        : `${this.formatBossName(pendingBoss.bossType)} incoming`,
      'boss'
    );
    this.retroSound.play({ type: 'bossSummoned' });
    saveGameState(this.state);
    this.updateHud();
  }

  private summonTestMothership(): void {
    const novaCrown = zones.find((zone) => zone.bossType === 'mothership') ?? getZoneByIndex(maxTravelLevel);

    this.state.asteroids = this.state.asteroids.filter((asteroid) => !asteroid.bossType);
    this.state.bossMinions = [];
    this.state.pendingBoss = null;
    const pendingBoss = createPendingBoss(this.state, 'mothership', novaCrown.index);
    if (!pendingBoss) {
      return;
    }

    this.state.pendingBoss = pendingBoss;
    this.state.progression.bossDiscovery.rareBossProgress = 0;
    this.closeModal();
    emitReward(
      this.state,
      this.language === 'pt-BR'
        ? `${this.formatBossName(pendingBoss.bossType)} chegando`
        : `${this.formatBossName(pendingBoss.bossType)} incoming`,
      'boss'
    );
    this.retroSound.play({ type: 'bossSummoned' });
    saveGameState(this.state);
    this.updateHud();
  }

  private switchShipFrame(id: ShipFrameId): void {
    if (!this.betweenRuns) return;
    if (id === this.state.progression.activeShipFrameId || !this.state.progression.unlockedShipFrameIds.includes(id)) {
      return;
    }

    this.nextRunShip = id;
    this.openRunMenu();
  }

  private openRunMenu(): void {
    const showSummary = this.state.phase === 'ended' && !this.runSummaryDismissed;
    this.activeModal = 'runMenu';
    this.modalEl.classList.remove('is-hidden');
    this.modalEl.setAttribute('aria-hidden', 'false');
    this.modalPanelEl.classList.remove('ui-modal__panel--cards', 'ui-modal__panel--skills', 'ui-modal__panel--warp', 'ui-modal__panel--map', 'ui-modal__panel--settings', 'ui-modal__panel--nova-crown');
    this.modalKickerEl.textContent = 'Asterlite';
    this.modalTitleEl.textContent = this.language === 'pt-BR'
      ? (showSummary ? 'Fim da run' : 'Escolha sua nave')
      : (showSummary ? 'Run complete' : 'Choose your ship');
    this.modalCopyEl.textContent = '';
    this.modalCopyEl.classList.add('is-hidden');
    this.modalBodyEl.replaceChildren(renderRunMenu({
      state: this.state, language: this.language,
      showSummary,
      onContinue: () => { this.runSummaryDismissed = true; this.openRunMenu(); },
      selected: this.nextRunShip ?? this.state.progression.activeShipFrameId,
      onSelect: (id) => { this.nextRunShip = id; },
      onTechnologies: () => this.openWarpCoreTreeModal(),
      onStart: () => {
        this.state = startNewRun(this.state, this.nextRunShip ?? this.state.progression.activeShipFrameId);
        this.betweenRuns = false;
        this.runSummaryDismissed = false;
        this.nextRunShip = null;
        this.activeModal = null;
        this.closeModal();
        this.closeShopDrawer();
        this.pendingSwipeImpulseVector = null;
        this.vectorTapBoost = null;
        this.swipeThrustTrail = null;
        this.inputState = neutralInput();
        this.shopSignature = '';
        this.gameStarted = false;
        saveGameState(this.state);
        this.showMainMenu();
        this.startIntroWarp(true);
      }
    }));
    this.modalTitleEl.focus({ preventScroll: true });
  }

  private spend(cost: number): boolean {
    if (this.state.money < cost) {
      return false;
    }
    this.state.money -= cost;
    return true;
  }

  private getWarpUnlockTitle(id: WarpUnlockId): string {
    if (this.language !== 'pt-BR') {
      return WARP_UNLOCK_BY_ID[id].title;
    }

    const titles: Record<WarpUnlockId, string> = {
      launchLoadout: 'Preparação de Lançamento',
      expandedDraft: 'Escolha Ampliada',
      droneSystems: 'Sistemas de Drones',
      deflectorFrame: 'Estrutura Defletora',
      shieldBubble: 'Bolha de Escudo',
      bossBeacon: 'Sinalizador de Boss',
      bossSuppression: 'Supressão de Boss',
      rangerHangar: 'Hangar Ranger',
      missileFoundry: 'Fundição de Mísseis'
    };
    return titles[id];
  }

  private formatBossName(type: BossType): string {
    if (type === 'sentinel') {
      return translate(this.language, 'boss.sentinel');
    }
    if (type === 'prism') {
      return translate(this.language, 'boss.prism');
    }
    if (type === 'mothership') {
      return translate(this.language, 'boss.mothership');
    }
    return translate(this.language, 'boss.crusher');
  }

  private formatMoney(value: number): string {
    return formatCompactMoney(value);
  }

  private formatDuration(seconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  private formatStatNumber(value: number): string {
    return Number.isInteger(value) ? value.toString() : value.toFixed(1);
  }

  private formatSector(): string {
    const zone = getExplorationZone(this.state);
    const sectorSize = 2200;
    const sectorX = Math.floor(this.state.ship.position.x / sectorSize);
    const sectorY = Math.floor(this.state.ship.position.y / sectorSize);
    return `${zone.identity.callsign} ${sectorX},${sectorY}`;
  }
}
