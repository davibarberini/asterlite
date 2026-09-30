import { getAchievementMultiplier } from '../../progression/achievements';
import { consumeRunCardShield } from '../../progression/runCards';
import { resetNoDamageShipUnlockProgress } from '../../progression/shipUnlocks';
import { getShipFrameWeaponIdentity } from '../../progression/shipFrames';
import { balance } from '../../balance';
import { emitAudio } from '../events';
import type { GameState } from '../types';
import { burstParticles } from './particles';

export const damageShip = (state: GameState, amount: number): void => {
  if (!state.ship.alive || state.phase === 'ended') return;
  const effectiveArmor = state.ship.armor * getAchievementMultiplier(state.progression, 'armor');
  const damage = Math.max(
    0,
    amount - effectiveArmor
  );
  if (damage <= 0) {
    state.ship.invulnerableFor = 0.35;
    emitAudio(state, { type: 'shipHit' });
    burstParticles(state, state.ship.position, 6, 120);
    return;
  }

  if (consumeRunCardShield(state)) {
    state.ship.invulnerableFor = 0.35;
    emitAudio(state, { type: 'shipHit' });
    burstParticles(state, state.ship.position, 14, 160);
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
  state.droneRebootFor = 0;
  state.ship.alive = false;
  state.pendingBoss = null;
  state.bossMinions = [];
  state.asteroids = state.asteroids.filter((asteroid) => !asteroid.bossType);
  state.bullets = state.bullets.filter((bullet) => bullet.owner !== 'boss');
  state.phase = 'ended';
  state.runCards.pendingChoiceIds = [];
  state.runCards.queuedChoiceCount = 0;
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
