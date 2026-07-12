import { getAchievementMultiplier } from '../../progression/achievements';
import { getBossRewardIncomingDamageMultiplier } from '../../progression/bossRewards';
import { getSkillIncomingDamageMultiplier } from '../../progression/talentTree';
import { resetNoDamageShipUnlockProgress } from '../../progression/shipUnlocks';
import { getShipFrameWeaponIdentity } from '../../progression/shipFrames';
import { balance } from '../../balance';
import { emitAudio } from '../events';
import type { GameState } from '../types';
import { getExplorationZone } from '../zones';
import { burstParticles } from './particles';

export const damageShip = (state: GameState, amount: number): void => {
  const effectiveArmor = state.ship.armor * getAchievementMultiplier(state.progression, 'armor');
  const damage = Math.max(
    0,
    amount * getBossRewardIncomingDamageMultiplier(state) * getSkillIncomingDamageMultiplier(state.progression) - effectiveArmor
  );
  if (damage <= 0) {
    state.ship.invulnerableFor = 0.35;
    emitAudio(state, { type: 'shipHit' });
    burstParticles(state, state.ship.position, 6, 120);
    return;
  }

  if (absorbWraithPhaseHit(state)) {
    return;
  }

  state.ship.hp = Math.max(0, state.ship.hp - damage);
  resetNoDamageShipUnlockProgress(state);
  state.ship.invulnerableFor = 0.75;
  emitAudio(state, { type: 'shipHit' });
  burstParticles(state, state.ship.position, damage >= state.ship.maxHp * 0.25 ? 18 : 8, 160);

  if (state.ship.hp > 0) {
    return;
  }

  burstParticles(state, state.ship.position, 42, 280);
  emitAudio(state, { type: 'shipDestroyed' });
  state.progression.achievementStats.deaths += 1;
  const zone = getExplorationZone(state);
  const zoneRepairMultiplier = 1 + zone.index * balance.collisions.repairZoneMultiplierPerIndex;
  const repairCost = Math.min(state.money, Math.ceil(state.ship.maxHp * balance.collisions.repairCostPerMaxHp * zoneRepairMultiplier));
  state.money -= repairCost;
  state.lastRepairCost = repairCost;
  state.deathPenaltyFor = balance.collisions.deathPenaltyBaseSeconds + zone.index * balance.collisions.deathPenaltySecondsPerZone;
  state.droneRebootFor = 0;
  state.ship.alive = false;
  state.ship.respawnFor = balance.ship.respawnDelay;
  state.pendingBoss = null;
  state.bossMinions = [];
  state.asteroids = state.asteroids.filter((asteroid) => !asteroid.bossType);
  state.bullets = state.bullets.filter((bullet) => bullet.owner !== 'boss');
  state.phase = 'respawning';
};

const absorbWraithPhaseHit = (state: GameState): boolean => {
  if (getShipFrameWeaponIdentity(state.progression) !== 'phase' || state.ship.phaseShieldCooldown > 0) {
    return false;
  }

  state.ship.phaseShieldCooldown = balance.ship.phaseShieldCooldownSeconds;
  state.ship.phaseShieldFlashFor = balance.ship.phaseShieldFlashSeconds;
  state.ship.invulnerableFor = Math.max(state.ship.invulnerableFor, balance.ship.phaseShieldInvulnerableSeconds);
  emitAudio(state, { type: 'shipHit' });
  burstParticles(state, state.ship.position, 18, balance.ship.phaseShieldParticleSpread);
  return true;
};
