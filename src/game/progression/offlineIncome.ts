import { balance } from '../balance';
import type { ProgressionState } from '../simulation/types';
import { getAchievementMultiplier } from './achievements';
import { getFireRateMultiplier, getPlayerFireInterval } from './idleBonuses';
import { getPrestigeMoneyMultiplier } from './prestige';
import { getShipFrameBonusMultiplier } from './shipFrames';
import { getOfflineIncomeTalentMultiplier } from './talentTree';

const asteroidChainReward =
  balance.asteroids.baseMoney.large +
  balance.asteroids.baseMoney.medium * 2 +
  balance.asteroids.baseMoney.small * 4;

const asteroidChainHp =
  balance.asteroids.hp.large +
  balance.asteroids.hp.medium * 2 +
  balance.asteroids.hp.small * 4;

const rewardPerAsteroidHp = asteroidChainReward / asteroidChainHp;

export const getOfflineIncomeRate = (progression: ProgressionState): number => {
  const offlineLevel = Math.max(0, progression.passiveIncomeLevel);
  if (offlineLevel <= 0) {
    return 0;
  }

  const playerDamagePerShot =
    progression.shipDamageLevel *
    balance.weapons.playerDamageMultiplier *
    getShipFrameBonusMultiplier(progression, 'damageMultiplier') *
    getAchievementMultiplier(progression, 'damage');
  const playerDamagePerSecond = playerDamagePerShot / getPlayerFireInterval(progression);
  const droneDamagePerSecond = getEstimatedDroneDamagePerSecond(progression);
  const buildCreditRate = (playerDamagePerSecond + droneDamagePerSecond) *
    rewardPerAsteroidHp *
    balance.economy.offlineIncome.buildEfficiency;
  const offlineLevelMultiplier = 1 + (offlineLevel - 1) * balance.economy.offlineIncome.levelBonus;

  return buildCreditRate *
    offlineLevelMultiplier *
    getOfflineIncomeTalentMultiplier(progression) *
    getPrestigeMoneyMultiplier(progression) *
    getShipFrameBonusMultiplier(progression, 'incomeMultiplier') *
    getAchievementMultiplier(progression, 'passive') *
    getAchievementMultiplier(progression, 'money');
};

const getEstimatedDroneDamagePerSecond = (progression: ProgressionState): number => {
  const sentryCount = progression.activeDroneCounts.sentry;
  const rangerCount = progression.activeDroneCounts.ranger;
  const breakerCount = progression.activeDroneCounts.breaker;
  const droneDamage = progression.droneDamageLevel * balance.weapons.playerDamageMultiplier * getAchievementMultiplier(progression, 'droneDamage');
  const droneFireRateMultiplier = 1 + progression.droneFireRateLevel * 0.08;

  return (
    sentryCount * droneDamage / balance.drones.fireInterval.sentry +
    rangerCount * droneDamage * 3 / balance.drones.fireInterval.ranger +
    breakerCount * droneDamage * 1.35 / balance.drones.fireInterval.breaker
  ) * droneFireRateMultiplier * getFireRateMultiplier(progression) ** 0.18;
};
