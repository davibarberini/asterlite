import { fireBullet } from './weapons';
import { balance } from '../../balance';
import type { AsteroidState, BossAttackKind, BossMinionState, GameState, Vec2 } from '../types';
import { distance, normalize } from '../vector';
import { damageShip } from './playerDamage';

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
  updateMothershipMinions(state, dt);

  const phase = getMothershipPhase(boss.hp / Math.max(1, boss.maxHp));
  boss.bossPhase = phase;
  if ((boss.bossBeamFor ?? 0) > 0) {
    updateMothershipBeam(state, boss, dt);
    return;
  }

  if ((boss.bossTelegraphFor ?? 0) > 0) {
    const next = (boss.bossTelegraphFor ?? 0) - dt;
    if (next > 0) {
      boss.bossTelegraphFor = next;
      return;
    }
    boss.bossTelegraphFor = 0;
    fireMothershipAttack(state, boss, phase);
    boss.bossFireCooldown = boss.bossTelegraphKind === 'summon'
      ? cfg.summonCooldownSeconds
      : getPhaseValue(cfg.recoverSecondsByPhase, phase);
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
  const sequence: BossAttackKind[] = boss.bossPhase && boss.bossPhase >= 2
    ? ['ring', 'beam', 'aimedFan', 'summon']
    : ['ring', 'aimedFan'];
  const kind = sequence[cursor % sequence.length];
  boss.bossPatternCursor = cursor + 1;
  boss.bossTelegraphKind = kind;
  boss.bossTelegraphFor = kind === 'beam' ? cfg.beamTelegraphSeconds : cfg.telegraphSeconds;
  boss.bossAimAngle = Math.atan2(
    state.ship.position.y - boss.position.y,
    state.ship.position.x - boss.position.x
  );
};

const fireMothershipAttack = (state: GameState, boss: AsteroidState, phase: number): void => {
  if (boss.bossTelegraphKind === 'beam') {
    beginBeam(state, boss);
    return;
  }
  if (boss.bossTelegraphKind === 'summon') {
    summonMinions(state, boss, phase);
    return;
  }
  if (boss.bossTelegraphKind === 'aimedFan') {
    fireAimedFan(state, boss, phase);
    return;
  }
  fireRing(state, boss, phase);
  if (phase >= 3) {
    fireAimedFan(state, boss, phase);
    summonMinions(state, boss, phase);
  }
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

const beginBeam = (state: GameState, boss: AsteroidState): void => {
  const cfg = balance.bosses.mothership;
  const base = boss.bossAimAngle ?? Math.atan2(
    state.ship.position.y - boss.position.y,
    state.ship.position.x - boss.position.x
  );
  const direction = ((boss.bossPatternCursor ?? 0) % 2 === 0) ? 1 : -1;
  boss.bossBeamFor = cfg.beamActiveSeconds;
  boss.bossBeamSweepDirection = direction;
  boss.bossBeamAngle = base - direction * cfg.beamSweepRadians / 2;
  boss.bossBeamHitCooldown = 0;
};

const updateMothershipBeam = (state: GameState, boss: AsteroidState, dt: number): void => {
  const cfg = balance.bosses.mothership;
  boss.bossBeamFor = Math.max(0, (boss.bossBeamFor ?? 0) - dt);
  boss.bossBeamHitCooldown = Math.max(0, (boss.bossBeamHitCooldown ?? 0) - dt);
  boss.bossBeamAngle = (boss.bossBeamAngle ?? 0) + (boss.bossBeamSweepDirection ?? 1) * cfg.beamSweepSpeed * dt;

  if (!state.ship.alive || state.ship.invulnerableFor > 0 || (boss.bossBeamHitCooldown ?? 0) > 0) {
    return;
  }
  if (!isShipInsideBeam(state, boss)) {
    return;
  }

  damageShip(state, cfg.beamDamage);
  boss.bossBeamHitCooldown = cfg.beamHitCooldown;
};

const isShipInsideBeam = (state: GameState, boss: AsteroidState): boolean => {
  const cfg = balance.bosses.mothership;
  const angle = boss.bossBeamAngle ?? 0;
  const dir = { x: Math.cos(angle), y: Math.sin(angle) };
  const toShip = {
    x: state.ship.position.x - boss.position.x,
    y: state.ship.position.y - boss.position.y
  };
  const projection = toShip.x * dir.x + toShip.y * dir.y;
  const length = Math.max(state.width, state.height) * cfg.beamLengthMultiplier;
  if (projection < 0 || projection > length) {
    return false;
  }

  const closest = {
    x: boss.position.x + dir.x * projection,
    y: boss.position.y + dir.y * projection
  };
  return distance(closest, state.ship.position) <= cfg.beamWidth / 2 + state.ship.radius;
};

const summonMinions = (state: GameState, boss: AsteroidState, phase: number): void => {
  const cfg = balance.bosses.mothership;
  const count = getPhaseValue(cfg.summonCountByPhase, phase);
  for (let index = 0; index < count; index += 1) {
    const side = index % 2 === 0 ? -1 : 1;
    const lane = Math.floor(index / 2);
    const offset = {
      x: -boss.radius * 0.35 - lane * 14,
      y: side * (boss.radius * 0.62 + lane * 9)
    };
    const position = {
      x: boss.position.x + offset.x,
      y: boss.position.y + offset.y
    };
    const towardShip = normalize({
      x: state.ship.position.x - position.x,
      y: state.ship.position.y - position.y
    });
    state.bossMinions.push({
      id: state.nextId++,
      position,
      velocity: {
        x: towardShip.x * cfg.summonMinionSpeed,
        y: towardShip.y * cfg.summonMinionSpeed
      },
      radius: cfg.summonMinionRadius,
      hp: cfg.summonMinionHp,
      maxHp: cfg.summonMinionHp,
      damage: cfg.summonMinionDamage,
      fireCooldown: cfg.summonMinionFireCooldown[0] + (index % 3) * 0.12,
      alive: true
    });
  }
};

const updateMothershipMinions = (state: GameState, dt: number): void => {
  const cfg = balance.bosses.mothership;
  const maxDistance = Math.max(state.width, state.height) * cfg.summonMinionDespawnDistanceMultiplier;
  state.bossMinions.forEach((minion) => {
    if (!minion.alive) {
      return;
    }

    const toShip = normalize({
      x: state.ship.position.x - minion.position.x,
      y: state.ship.position.y - minion.position.y
    });
    const tangentSign = minion.id % 2 === 0 ? 1 : -1;
    const desired = normalize({
      x: toShip.x * 0.86 + -toShip.y * 0.42 * tangentSign,
      y: toShip.y * 0.86 + toShip.x * 0.42 * tangentSign
    });
    minion.velocity.x += (desired.x * cfg.summonMinionSpeed - minion.velocity.x) * Math.min(1, dt * 3.2);
    minion.velocity.y += (desired.y * cfg.summonMinionSpeed - minion.velocity.y) * Math.min(1, dt * 3.2);
    minion.position.x += minion.velocity.x * dt;
    minion.position.y += minion.velocity.y * dt;
    minion.fireCooldown = Math.max(0, minion.fireCooldown - dt);

    if (minion.fireCooldown <= 0 && state.ship.alive) {
      const aim = Math.atan2(state.ship.position.y - minion.position.y, state.ship.position.x - minion.position.x);
      fireBullet(state, 'saucer', minion.position, aim, cfg.summonMinionBulletSpeed, cfg.summonMinionBulletDamage);
      minion.fireCooldown = cfg.summonMinionFireCooldown[0] +
        ((minion.id % 5) / 4) * (cfg.summonMinionFireCooldown[1] - cfg.summonMinionFireCooldown[0]);
    }
  });

  state.bossMinions = state.bossMinions.filter((minion) =>
    minion.alive && distance(minion.position, state.camera) <= maxDistance
  );
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
