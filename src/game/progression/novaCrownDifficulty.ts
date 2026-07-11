export const novaCrownClearThreatLevel = 11;

export type NovaCrownDifficultyConfig = {
  difficulty: number;
  startingThreatLevel: number;
  threatLevelSeconds: number;
  rewardMultiplier: number;
  asteroidHpMultiplier: number;
  asteroidDamageMultiplier: number;
};

export const normalizeNovaCrownDifficulty = (difficulty: number): number =>
  Math.max(1, Math.floor(Number.isFinite(difficulty) ? difficulty : 1));

export const getNovaCrownDifficultyKey = (difficulty: number): string =>
  normalizeNovaCrownDifficulty(difficulty).toString();

export const getNovaCrownDifficultyConfig = (difficulty: number): NovaCrownDifficultyConfig => {
  const normalizedDifficulty = normalizeNovaCrownDifficulty(difficulty);
  const difficultyIndex = normalizedDifficulty - 1;
  return {
    difficulty: normalizedDifficulty,
    startingThreatLevel: 1 + Math.floor(difficultyIndex * 1.25),
    threatLevelSeconds: Math.max(12, 30 * Math.pow(0.94, difficultyIndex)),
    rewardMultiplier: 1 + difficultyIndex * 0.18,
    asteroidHpMultiplier: 1 + difficultyIndex * 0.16,
    asteroidDamageMultiplier: 1 + difficultyIndex * 0.1
  };
};

export const getNovaCrownBestSeconds = (bests: Record<string, number>, difficulty: number): number =>
  Math.max(0, bests[getNovaCrownDifficultyKey(difficulty)] ?? 0);

export const setNovaCrownBestSeconds = (
  bests: Record<string, number>,
  difficulty: number,
  seconds: number
): Record<string, number> => ({
  ...bests,
  [getNovaCrownDifficultyKey(difficulty)]: Math.max(getNovaCrownBestSeconds(bests, difficulty), seconds)
});
