import type { GameState, ShipFrameId } from '../simulation/types';
import { createGameState, createProgression } from '../simulation/state';
import { applyOwnedWarpUnlockEffects } from './warpUnlocks';
import { queueRunCardChoices } from './runCards';

export const startNewRun = (previous: GameState, frame: ShipFrameId = previous.progression.activeShipFrameId): GameState => {
  if (!previous.progression.unlockedShipFrameIds.includes(frame)) return previous;
  const meta = previous.progression;
  const progression = createProgression();
  progression.activeShipFrameId = frame;
  progression.unlockedShipFrameIds = [...meta.unlockedShipFrameIds];
  progression.shipUnlockProgress = {
    ...meta.shipUnlockProgress,
    novaCrownShipFrameIds: [...meta.shipUnlockProgress.novaCrownShipFrameIds],
    wraithNoDamageSeconds: 0
  };
  progression.prestigeCores = meta.prestigeCores;
  progression.ownedWarpUnlockIds = [...meta.ownedWarpUnlockIds];
  progression.announcedAffordableWarpUnlockIds = [...meta.announcedAffordableWarpUnlockIds];
  progression.achievementStats = { ...meta.achievementStats };
  progression.unlockedAchievements = { ...meta.unlockedAchievements };
  progression.survivalBestSeconds = meta.survivalBestSeconds;
  progression.survivalBestThreatLevel = meta.survivalBestThreatLevel;
  progression.novaCrownHighestDifficulty = meta.novaCrownHighestDifficulty;
  progression.novaCrownSelectedDifficulty = meta.novaCrownSelectedDifficulty;
  progression.novaCrownBestSecondsByDifficulty = { ...meta.novaCrownBestSecondsByDifficulty };
  progression.novaCrownCoreRewardedDifficultyKeys = [...meta.novaCrownCoreRewardedDifficultyKeys];
  applyOwnedWarpUnlockEffects(progression);
  const next = createGameState(previous.width, previous.height, progression);
  if (progression.ownedWarpUnlockIds.includes('launchLoadout')) {
    queueRunCardChoices(next, 1);
  }
  return next;
};
