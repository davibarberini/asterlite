export const refineryMilestoneStep = 5;
export const refineryMilestoneBonus = 0.22;
export const droneWingMilestoneStep = 3;

export const getRefineryMilestoneMultiplier = (level: number): number =>
  1 + Math.floor(level / refineryMilestoneStep) * refineryMilestoneBonus;

export const getRefineryNextMilestoneLevel = (level: number): number =>
  Math.floor(level / refineryMilestoneStep) * refineryMilestoneStep + refineryMilestoneStep;

export const getDroneWingTier = (count: number): number =>
  Math.floor(count / droneWingMilestoneStep);
