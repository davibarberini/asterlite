export type ProgressionState = {
  minerals: number;
  research: number;
  prestigeCores: number;
  upgrades: Record<string, number>;
};

export const createProgressionState = (): ProgressionState => ({
  minerals: 0,
  research: 0,
  prestigeCores: 0,
  upgrades: {}
});

/*
  Idle systems should subscribe to arcade events later:
  - asteroidDestroyed -> minerals and rare drops
  - sectorReached -> exploration progress and zone unlocks
  - travelUnlocked -> new region and distance systems
  - runReset -> prestige / rebirth calculation
  - offlineElapsed -> background drones mine low-tier asteroids

  Keep this state serializable. Do not store Phaser scenes, graphics, tweens, or input objects here.
*/
