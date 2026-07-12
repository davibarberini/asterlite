import { fireBullet } from './weapons';
import { balance } from '../../balance';
import type { AsteroidState, BossAttackKind, GameState } from '../types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

/**
 * Mothership phase from its remaining HP ratio. Higher phases fire denser,
 * faster patterns. Kept as a pure function so tests and the renderer can share it.
 */
export const getMothershipPhase = (hpRatio: number): number => {
  if (hpRatio > 0.66) {
    return 1;
  }
  if (hpRatio > 0.33) {
    return 2;
  }
  return 3;
};

const getPhaseValue = (values: readonly number[], phase: number): number =>
  values[clamp(phase - 1, 0, values.length - 1)];

/**
 * Camera-anchored bullet-hell boss. Instead of chasing the ship like the other
 * bosses, the mothership hovers in the upper part of the screen (tracking the
 * ship horizontally) and cycles telegraphed attack patterns that escalate as its
 * HP drops. All state lives on the serializable `AsteroidState` boss entity.
 */
export const updateMothership = (state: GameState, boss: AsteroidState, dt: number): void => {
  const cfg = balance.bosses.mothership;

  anchorToCamera(state, boss, cfg, dt);

  const phase = getMothershipPhase(boss.hp / Math.max(1, boss.maxHp));
  boss.bossPhase = phase;

  if ((boss.bossTelegraphFor ?? 0) > 0) {
    const next = (boss.bossTelegraphFor ?? 0) - dt;
    if (next > 0) {
      boss.bossTelegraphFor = next;
      return;
    }
    boss.bossTelegraphFor = 0;
    fireMothershipAttack(state, boss, phase);
    boss.bossFireCooldown = getPhaseValue(cfg.recoverSecondsByPhase, phase);
    boss.bossTelegraphKind = undefined;
    return;
  }

  if ((boss.bossFireCooldown ?? 0) > 0) {
    boss.bossFireCooldown = Math.max(0, (boss.bossFireCooldown ?? 0) - dt);
    return;
  }

  beginNextAttack(state, boss, cfg);
};

const anchorToCamera = (
  state: GameState,
  boss: AsteroidState,
  cfg: typeof balance.bosses.mothership,
  _dt: number
): void => {
  const trackBand = state.width * cfg.anchorHorizontalTrack;
  const targetX = state.camera.x + clamp(state.ship.position.x - state.camera.x, -trackBand, trackBand);
  const targetY = state.camera.y + state.height * cfg.anchorScreenOffsetY;

  boss.velocity.x = (targetX - boss.position.x) * cfg.anchorGlideSpeed;
  boss.velocity.y = (targetY - boss.position.y) * cfg.anchorGlideSpeed;
};

const beginNextAttack = (
  state: GameState,
  boss: AsteroidState,
  cfg: typeof balance.bosses.mothership
): void => {
  const cursor = boss.bossPatternCursor ?? 0;
  const kind: BossAttackKind = cursor % 2 === 0 ? 'ring' : 'aimedFan';
  boss.bossPatternCursor = cursor + 1;
  boss.bossTelegraphKind = kind;
  boss.bossTelegraphFor = cfg.telegraphSeconds;
  boss.bossAimAngle = Math.atan2(
    state.ship.position.y - boss.position.y,
    state.ship.position.x - boss.position.x
  );
};

const fireMothershipAttack = (state: GameState, boss: AsteroidState, phase: number): void => {
  if (boss.bossTelegraphKind === 'aimedFan') {
    fireAimedFan(state, boss, phase);
    return;
  }
  fireRing(state, boss, phase);
};

const fireRing = (state: GameState, boss: AsteroidState, phase: number): void => {
  const cfg = balance.bosses.mothership;
  const count = getPhaseValue(cfg.ringBulletsByPhase, phase);
  const damage = getPhaseValue(cfg.bulletDamageByPhase, phase);
  const cursor = boss.bossPatternCursor ?? 0;
  const spin = cursor * cfg.ringSpinPerCast;
  const gapStart = cursor % count;

  for (let i = 0; i < count; i += 1) {
    const withinGap = (i - gapStart + count) % count < cfg.ringGapSlots;
    if (withinGap) {
      continue;
    }
    const angle = spin + (i / count) * Math.PI * 2;
    fireBullet(state, 'boss', boss.position, angle, cfg.ringBulletSpeed, damage);
  }
};

const fireAimedFan = (state: GameState, boss: AsteroidState, phase: number): void => {
  const cfg = balance.bosses.mothership;
  const count = getPhaseValue(cfg.fanBulletsByPhase, phase);
  const damage = getPhaseValue(cfg.bulletDamageByPhase, phase);
  const base = boss.bossAimAngle ?? Math.atan2(
    state.ship.position.y - boss.position.y,
    state.ship.position.x - boss.position.x
  );
  const step = count > 1 ? cfg.fanSpreadRadians / (count - 1) : 0;

  for (let i = 0; i < count; i += 1) {
    const angle = base - cfg.fanSpreadRadians / 2 + step * i;
    fireBullet(state, 'boss', boss.position, angle, cfg.fanBulletSpeed, damage);
  }
};
