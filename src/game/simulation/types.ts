export type Vec2 = {
  x: number;
  y: number;
};

export type AsteroidSize = 'large' | 'medium' | 'small';
export type AsteroidVariant = 'common' | 'metallic' | 'crystal' | 'dense';
export type BossType = 'sentinel' | 'crusher' | 'prism';
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
  | 'nivitron';
export type TalentId =
  | 'refineryYield'
  | 'combatBounty'
  | 'crystalSeam'
  | 'propulsionTuning'
  | 'vectorNozzles'
  | 'salvageLoop'
  | 'semiAutoOptics'
  | 'semiAutoRange'
  | 'semiAutoPierce'
  | 'semiAutoCadence'
  | 'semiAutoOverdrive'
  | 'shotgunLoad'
  | 'shotgunChoke'
  | 'shotgunSpread'
  | 'shotgunBarrage'
  | 'shotgunSlag'
  | 'missileGuidance'
  | 'missileYield'
  | 'missileReload'
  | 'missileWarhead'
  | 'missileShrapnel'
  | 'missileChain';
export type TalentRanks = Record<TalentId, number>;
export type WarpUnlockId =
  | 'droneSystems'
  | 'deflectorFrame'
  | 'shieldBubble'
  | 'bossBeacon'
  | 'spreadBattery'
  | 'rangerHangar'
  | 'missileFoundry'
  | 'piercingRail';
export type WeaponMode = 'cannon' | 'spread' | 'piercing';
export type BulletKind = 'standard' | 'rail' | 'flak' | 'missile' | 'pellet' | 'ricochet';

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
  respawnFor: number;
  fireCooldown: number;
  hyperspaceCooldown: number;
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
};

export type PendingBossState = {
  bossType: BossType;
  bossZoneIndex: number;
  spawnIn: number;
  position: Vec2;
  velocity: Vec2;
};

export type BulletState = {
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
};

export type SaucerState = {
  id: number;
  kind: 'normal' | 'elite';
  position: Vec2;
  velocity: Vec2;
  radius: number;
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


export type GamePhase = 'playing' | 'respawning';

export type GameAudioEvent =
  | { type: 'playerShoot' }
  | { type: 'droneShoot' }
  | { type: 'saucerShoot' }
  | { type: 'bossShoot' }
  | { type: 'asteroidHit' }
  | { type: 'asteroidDestroyed'; size: AsteroidSize }
  | { type: 'saucerDestroyed' }
  | { type: 'shipHit' }
  | { type: 'shipDestroyed' }
  | { type: 'shipRespawned' }
  | { type: 'hyperspace' }
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

export type BossRewardId =
  | 'rapidFire'
  | 'droneOverdrive'
  | 'salvageSurge';

export type BossRewardState = {
  pendingChoiceIds: BossRewardId[];
  activeIds: BossRewardId[];
};

export type RareSpawnKind = 'proximityMine';

export type RareSpawnState = {
  cooldowns: Record<RareSpawnKind, number>;
};

export type SurvivalState = {
  active: boolean;
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
  asteroidsDestroyed: number;
  moneyEarned: number;
  crystalsCollected: number;
  saucersDestroyed: number;
  deaths: number;
  prestigeWarps: number;
  hyperspaceUses: number;
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
  | 'refineryBoot'
  | 'oreFlow'
  | 'megaFoundry'
  | 'titanSmelter'
  | 'hullPatch'
  | 'reinforcedFrame'
  | 'dreadnought'
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
  | 'collectWarpCrystals'
  | 'warpForFirstCore'
  | 'installDroneSystems'
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

export type ShipRunState = {
  money: number;
  crystals: number;
  passiveIncomeLevel: number;
  shipDamageLevel: number;
  shipFireRateLevel: number;
  shipSpeedLevel: number;
  deflectorLevel: number;
  droneDamageLevel: number;
  droneFireRateLevel: number;
  droneCounts: Record<DroneType, number>;
  activeDroneCounts: Record<DroneType, number>;
  talentRanks: TalentRanks;
  weaponMode: WeaponMode;
  mapUnlocked: boolean;
  travelLevel: number;
  currentZoneIndex: number;
  unlockedZoneIndex: number;
  firstGateAsteroidsDestroyed: number;
  bossDefeats: number;
  bossDiscovery: BossDiscoveryState;
  maxHp: number;
  armor: number;
  dronesPurchased: number;
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
  passiveIncomeLevel: number;
  shipDamageLevel: number;
  shipFireRateLevel: number;
  shipSpeedLevel: number;
  deflectorLevel: number;
  droneDamageLevel: number;
  droneFireRateLevel: number;
  droneCounts: Record<DroneType, number>;
  activeDroneCounts: Record<DroneType, number>;
  talentRanks: TalentRanks;
  weaponMode: WeaponMode;
  spreadUnlocked: boolean;
  piercingUnlocked: boolean;
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
  activeShipFrameId: ShipFrameId;
  unlockedShipFrameIds: ShipFrameId[];
  shipUnlockProgress: ShipUnlockProgress;
  shipRuns: Partial<Record<ShipFrameId, ShipRunState>>;
  shipExchanges: number;
  prestigeCores: number;
  ownedWarpUnlockIds: WarpUnlockId[];
  announcedAffordableWarpUnlockIds: WarpUnlockId[];
  maxHp: number;
  armor: number;
  dronesPurchased: number;
  achievementStats: AchievementStats;
  unlockedAchievements: Record<AchievementId, boolean>;
};

export type GameState = {
  width: number;
  height: number;
  camera: Vec2;
  money: number;
  crystals: number;
  lastRepairCost: number;
  lastOfflineEarnings: number;
  deathPenaltyFor: number;
  droneRebootFor: number;
  bossRewards: BossRewardState;
  rareSpawns: RareSpawnState;
  phase: GamePhase;
  ship: ShipState;
  shieldBubble: ShieldBubbleState;
  survival: SurvivalState;
  drones: DroneState[];
  progression: ProgressionState;
  asteroids: AsteroidState[];
  hazards: SurvivalHazardState[];
  survivalEvents: SurvivalTimedEventState[];
  bullets: BulletState[];
  particles: ParticleState[];
  audioEvents: GameAudioEvent[];
  rewardEvents: GameRewardEvent[];
  pendingBoss: PendingBossState | null;
  saucer: SaucerState | null;
  saucerTimer: number;
  nextId: number;
};
