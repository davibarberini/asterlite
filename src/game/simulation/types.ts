export type Vec2 = {
  x: number;
  y: number;
};

export type AsteroidSize = 'large' | 'medium' | 'small';
export type AsteroidVariant = 'common' | 'metallic' | 'crystal' | 'dense';
export type BossType = 'sentinel' | 'crusher' | 'prism' | 'mothership';

export type BossAttackKind = 'ring' | 'aimedFan' | 'beam' | 'summon' | 'sentinelVolley' | 'crusherShockwave';
export type DroneType = 'sentry' | 'ranger' | 'breaker';
export type ShipFrameId =
  | 'vector'
  | 'kestrel'
  | 'bulwark'
  | 'prism'
  | 'voidRunner'
  | 'needle'
  | 'atlas'
  | 'ember'
  | 'wraith'
  | 'aurora'
  | 'nivitron'
  | 'hisoka';
export type WarpUnlockId =
  | 'launchLoadout'
  | 'expandedDraft'
  | 'droneSystems'
  | 'deflectorFrame'
  | 'shieldBubble'
  | 'bossBeacon'
  | 'bossSuppression'
  | 'rangerHangar'
  | 'missileFoundry';
export type BulletKind = 'standard' | 'rail' | 'flak' | 'missile' | 'pellet' | 'ricochet' | 'playerRicochet';
export type RunCardId =
  | 'kineticAmplifier'
  | 'rapidCycler'
  | 'reinforcedHull'
  | 'splitChamber'
  | 'piercingCore'
  | 'expandedCaliber'
  | 'thorns'
  | 'impulseVector'
  | 'inertialArmor'
  | 'emergencyBarrier'
  | 'criticalReactor'
  | 'unstableRicochet'
  | 'incendiaryCharge'
  | 'fragmentationChamber'
  | 'huntingRadar'
  | 'sentryWing'
  | 'rangerWing'
  | 'breakerWing';
export type RunCardRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type RunCardTag = 'offense' | 'defense' | 'mobility' | 'drone';

export type RunCardState = {
  selectedStacks: Record<RunCardId, number>;
  shieldCharges: number;
  pendingChoiceIds: RunCardId[];
  queuedChoiceCount: number;
};

export type ShipState = {
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  radius: number;
  hp: number;
  maxHp: number;
  armor: number;
  alive: boolean;
  invulnerableFor: number;
  fireCooldown: number;
  turretAngle: number;
  phaseShieldCooldown: number;
  phaseShieldFlashFor: number;
};

export type ShieldBubbleState = {
  active: boolean;
  broken: boolean;
  rechargeFor: number;
  hitFlashFor: number;
};

export type DroneState = {
  id: number;
  type: DroneType;
  position: Vec2;
  angle: number;
  orbitRadius: number;
  fireCooldown: number;
};

export type AsteroidState = {
  burn?: { seconds: number; damagePerSecond: number };
  id: number;
  position: Vec2;
  velocity: Vec2;
  rotation: number;
  rotationSpeed: number;
  radius: number;
  size: AsteroidSize;
  variant: AsteroidVariant;
  hp: number;
  maxHp: number;
  shape: number[];
  bossType?: BossType;
  bossZoneIndex?: number;
  bossFireCooldown?: number;
  bossPhase?: number;
  bossTelegraphFor?: number;
  bossTelegraphKind?: BossAttackKind;
  bossAimAngle?: number;
  bossPatternCursor?: number;
  bossBeamFor?: number;
  bossBeamAngle?: number;
  bossBeamSweepDirection?: number;
  bossBeamHitCooldown?: number;
  bossEdgeAngle?: number;
  bossNextEdgeAngle?: number;
  bossRetreatFor?: number;
  bossLastPhase?: number;
};

export type PendingBossState = {
  bossType: BossType;
  bossZoneIndex: number;
  spawnIn: number;
  position: Vec2;
  velocity: Vec2;
};

export type BulletState = {
  burnDamagePerSecond?: number;
  fragmentCount?: number;
  hitTargetIds?: number[];
  id: number;
  owner: 'player' | 'drone' | 'saucer' | 'boss';
  position: Vec2;
  velocity: Vec2;
  age: number;
  radius: number;
  damage: number;
  pierceLeft: number;
  ricochetLeft: number;
  kind: BulletKind;
  homingTargetId: number | null;
  homingTurnRate?: number;
  critical?: boolean;
};

export type SaucerState = {
  id: number;
  kind: 'normal' | 'elite' | 'skirmisher' | 'sniper';
  position: Vec2;
  velocity: Vec2;
  radius: number;
  fireCooldown: number;
  alive: boolean;
  telegraphFor?: number;
  aimAngle?: number;
  shotFlashFor?: number;
};

export type BossMinionState = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hp: number;
  maxHp: number;
  damage: number;
  fireCooldown: number;
  alive: boolean;
};

export type ParticleState = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  age: number;
  ttl: number;
  size: number;
};

export type LevelShockwaveState = {
  id: number;
  center: Vec2;
  radius: number;
  maxRadius: number;
  speed: number;
  age: number;
  ttl: number;
};

export type FlameWaveState = {
  id: number;
  center: Vec2;
  radius: number;
  maxRadius: number;
  speed: number;
  age: number;
  ttl: number;
  damage: number;
  hitAsteroidIds: number[];
  hitHazardIds: number[];
  hitBossMinionIds: number[];
};

export type SurvivalHazardKind = 'proximityMine' | 'survivalHunter';

export type SurvivalHazardState = {
  id: number;
  kind: SurvivalHazardKind;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  trail: Vec2[];
  age: number;
  armFor: number;
  fuseFor: number;
  hp: number;
  maxHp: number;
  damage: number;
};

export type SurvivalTimedEventKind = 'meteorLane' | 'gravityPulse' | 'damageField';

export type SurvivalMeteorVisualState = {
  crossOffset: number;
  radius: number;
  speed: number;
  spawnDelay: number;
  size: Extract<AsteroidSize, 'medium' | 'small'>;
  rotation: number;
  rotationSpeed: number;
  idSeed: number;
};

export type SurvivalTimedEventBaseState = {
  id: number;
  kind: SurvivalTimedEventKind;
  center: Vec2;
  age: number;
  warningFor: number;
  activeFor: number;
};

export type SurvivalMeteorLaneEventState = SurvivalTimedEventBaseState & {
  kind: 'meteorLane';
  anchorCenter: Vec2;
  anchorCamera: Vec2;
  direction: Vec2;
  width: number;
  length: number;
  hitCooldown: number;
  damage: number;
  meteors: SurvivalMeteorVisualState[];
};

export type SurvivalGravityPulseEventState = SurvivalTimedEventBaseState & {
  kind: 'gravityPulse';
  radius: number;
  force: number;
};

export type SurvivalDamageFieldEventState = SurvivalTimedEventBaseState & {
  kind: 'damageField';
  radius: number;
  damage: number;
  hitCooldown: number;
};

export type SurvivalTimedEventState = SurvivalMeteorLaneEventState | SurvivalGravityPulseEventState | SurvivalDamageFieldEventState;


export type GamePhase = 'playing' | 'ended';

export type RunSession = {
  elapsedSeconds: number;
  asteroidsDestroyed: number;
  coresEarned: number;
  survivalMilestones: number;
};

export type GameAudioEvent =
  | { type: 'playerShoot' }
  | { type: 'droneShoot' }
  | { type: 'saucerShoot' }
  | { type: 'bossShoot' }
  | { type: 'bossSentinelVolley' }
  | { type: 'bossCrusherShockwave' }
  | { type: 'bossPrismRicochet' }
  | { type: 'bossMothershipRing' }
  | { type: 'bossMothershipFan' }
  | { type: 'bossMothershipBeam' }
  | { type: 'bossMothershipSummon' }
  | { type: 'bossMothershipPhaseShift' }
  | { type: 'bossSeekerShoot' }
  | { type: 'bossSeekerHum' }
  | { type: 'asteroidHit' }
  | { type: 'asteroidDestroyed'; size: AsteroidSize }
  | { type: 'saucerDestroyed' }
  | { type: 'shipHit' }
  | { type: 'shipDestroyed' }
  | { type: 'shipLevelUp' }
  | { type: 'vectorTapBoost' }
  | { type: 'emberFlameWave' }
  | { type: 'spaceTravel' }
  | { type: 'bossSummoned' }
  | { type: 'bossDefeated' }
  | { type: 'zoneUnlocked' }
  | { type: 'warpReset' }
  | { type: 'purchase' };

export type GameRewardKind = 'payout' | 'achievement' | 'boss' | 'unlock' | 'system';

export type GameRewardEvent = {
  text: string;
  kind?: GameRewardKind;
};

export type RareSpawnKind = 'proximityMine';

export type RareSpawnState = {
  cooldowns: Record<RareSpawnKind, number>;
};

export type SurvivalState = {
  active: boolean;
  difficulty: number;
  currentSeconds: number;
  threatLevel: number;
  lastAnnouncedThreatLevel: number;
  hazardSpawnCooldown: number;
  hunterSpawnCooldown: number;
  timedEventCooldown: number;
  gravityPulseCooldown: number;
  damageFieldCooldown: number;
};

export type AchievementStats = {
  dronesRecruited: number;
  asteroidsDestroyed: number;
  moneyEarned: number;
  crystalsCollected: number;
  saucersDestroyed: number;
  deaths: number;
  prestigeWarps: number;
};

export type AchievementId =
  | 'firstBlood'
  | 'rockBreaker'
  | 'beltPatrol'
  | 'fieldSweeper'
  | 'annihilator'
  | 'pocketChange'
  | 'steadyIncome'
  | 'creditBaron'
  | 'sectorTycoon'
  | 'galacticMint'
  | 'crystalTouch'
  | 'seamProspector'
  | 'crystalRunner'
  | 'shardMagnate'
  | 'lightPlating'
  | 'ablativeShell'
  | 'hotRod'
  | 'afterburner'
  | 'wingLead'
  | 'swarmOps'
  | 'droneArmada'
  | 'deepScan'
  | 'warpVeteran';

export type BossDiscoveryState = {
  rareBossProgress: number;
  rareBossesFound: number;
};

export type GuidedMissionId =
  | 'drawGateBoss'
  | 'defeatGateBoss'
  | 'travelToOrion'
  | 'collectWarpCrystals'
  | 'openVegaRoute'
  | 'travelToVega'
  | 'earnFirstCore'
  | 'installDroneSystems'
  | 'openCygnusRoute'
  | 'travelToCygnus'
  | 'openNovaRoute'
  | 'travelToNovaCrown'
  | 'clearAsteroids'
  | 'surviveAsteroids'
  | 'collectCredits'
  | 'collectCrystals'
  | 'defeatZoneBoss';

export type GuidedMissionSnapshot = {
  firstGateAsteroidsDestroyed: number;
  asteroidsDestroyed: number;
  moneyEarned: number;
  crystalsCollected: number;
  deaths: number;
  bossDefeats: number;
  crystals: number;
  prestigeCores: number;
};

export type GuidedMissionState = {
  activeMissionId: GuidedMissionId | null;
  completedMissionIds: GuidedMissionId[];
  repeatCompletions: number;
  startedAt: GuidedMissionSnapshot;
};

export type ShipUnlockProgress = {
  asteroidCollisions: number;
  asteroidBurstBest: number;
  prismBossDefeatsSinceDrop: number;
  novaCrownShipFrameIds: ShipFrameId[];
  meteorImpactsSurvived: number;
  wraithNoDamageSeconds: number;
};

export type ProgressionState = {
  shipSpeedLevel: number;
  deflectorLevel: number;
  shipXp: number;
  shipLevel: number;
  mapUnlocked: boolean;
  travelLevel: number;
  currentZoneIndex: number;
  unlockedZoneIndex: number;
  firstGateAsteroidsDestroyed: number;
  bossDefeats: number;
  bossDiscovery: BossDiscoveryState;
  guidedMissions: GuidedMissionState;
  survivalBestSeconds: number;
  survivalBestThreatLevel: number;
  novaCrownHighestDifficulty: number;
  novaCrownSelectedDifficulty: number;
  novaCrownBestSecondsByDifficulty: Record<string, number>;
  novaCrownCoreRewardedDifficultyKeys: string[];
  activeShipFrameId: ShipFrameId;
  unlockedShipFrameIds: ShipFrameId[];
  shipUnlockProgress: ShipUnlockProgress;
  prestigeCores: number;
  ownedWarpUnlockIds: WarpUnlockId[];
  announcedAffordableWarpUnlockIds: WarpUnlockId[];
  armor: number;
  achievementStats: AchievementStats;
  unlockedAchievements: Record<AchievementId, boolean>;
};

export type GameState = {
  run: RunSession;
  width: number;
  height: number;
  camera: Vec2;
  money: number;
  crystals: number;
  droneRebootFor: number;
  runCards: RunCardState;
  rareSpawns: RareSpawnState;
  phase: GamePhase;
  ship: ShipState;
  shieldBubble: ShieldBubbleState;
  survival: SurvivalState;
  drones: DroneState[];
  progression: ProgressionState;
  asteroids: AsteroidState[];
  asteroidDestructionEvents: Pick<AsteroidState, 'id' | 'position' | 'radius' | 'variant' | 'bossType' | 'hp' | 'maxHp'>[];
  hazards: SurvivalHazardState[];
  survivalEvents: SurvivalTimedEventState[];
  bullets: BulletState[];
  particles: ParticleState[];
  levelShockwaves: LevelShockwaveState[];
  flameWaves: FlameWaveState[];
  audioEvents: GameAudioEvent[];
  rewardEvents: GameRewardEvent[];
  pendingBoss: PendingBossState | null;
  bossMinions: BossMinionState[];
  saucer: SaucerState | null;
  saucerTimer: number;
  nextId: number;
};
