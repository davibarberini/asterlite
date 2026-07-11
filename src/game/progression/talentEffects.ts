import type { ProgressionState, TalentId } from '../simulation/types';

const getRank = (progression: ProgressionState, id: TalentId): number =>
  Math.max(0, Math.floor(progression.talentRanks[id] ?? 0));

export const getLevelShockwaveSkillMultiplier = (progression: ProgressionState): number =>
  (getRank(progression, 'crystalSeam') > 0 ? 1.25 : 1) *
  (getRank(progression, 'bulwarkProtocol') > 0 ? 1.35 : 1);
