import { createZoneBossFromPending } from './asteroids';
import { updateMothership } from './bossMothership';
import { fireBullet } from './weapons';
import { emitAudio, emitReward } from '../events';
import type { AsteroidState, GameState, SaucerState, Vec2 } from '../types';
import { distance, normalize, randomRange } from '../vector';
import { balance } from '../../balance';
import { isSurvivalZone } from './survival';
import { getWorldViewScale } from '../view';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export const getChaseBossPhase = (hpRatio: number): number => {
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

export const updatePendingBoss = (state: GameState, dt: number): void => {
  const pendingBoss = state.pendingBoss;
  if (!pendingBoss || !state.ship.alive) {
    return;
  }

  pendingBoss.spawnIn = Math.max(0, pendingBoss.spawnIn - dt);
  if (pendingBoss.spawnIn > 0) {
    return;
  }

  state.asteroids.push(createZoneBossFromPending(state, pendingBoss));
  state.pendingBoss = null;
  emitReward(state, 'Gate boss entering field', 'boss');
};

export const updateBosses = (state: GameState, dt: number): void => {
  if (!state.ship.alive) {
    return;
  }

  state.asteroids.forEach((boss) => {
    if (!boss.bossType) {
      return;
    }

    if (boss.bossType === 'mothership') {
      updateMothership(state, boss, dt);
      return;
    }

    const toShip = {
      x: state.ship.position.x - boss.position.x,
      y: state.ship.position.y - boss.position.y
    };
    const shipAngle = Math.atan2(toShip.y, toShip.x);
    const distanceToShip = Math.max(1, distance(boss.position, state.ship.position));
    const desiredVelocity = getBossDesiredVelocity(boss, toShip, distanceToShip);
    const bossStats = balance.bosses.stats[boss.bossType];
    const phase = getChaseBossPhase(boss.hp / Math.max(1, boss.maxHp));
    boss.bossPhase = phase;
    const bossSpeed = bossStats.chaseSpeedBase + (boss.bossZoneIndex ?? 0) * bossStats.chaseSpeedPerZone;
    const steer = Math.min(1, dt * getBossSteerMultiplier(boss));
    const speedMultiplier = getBossSpeedMultiplier(boss, distanceToShip);
    boss.velocity.x += (desiredVelocity.x * bossSpeed * speedMultiplier - boss.velocity.x) * steer;
    boss.velocity.y += (desiredVelocity.y * bossSpeed * speedMultiplier - boss.velocity.y) * steer;
    boss.rotation += (shipAngle - boss.rotation) * Math.min(1, dt * 2.4);
    if (boss.bossType === 'sentinel' && (boss.bossTelegraphFor ?? 0) > 0) {
      const next = (boss.bossTelegraphFor ?? 0) - dt;
      if (next > 0) {
        boss.bossTelegraphFor = next;
        return;
      }

      boss.bossTelegraphFor = 0;
      fireSentinelVolley(state, boss, phase);
      boss.bossTelegraphKind = undefined;
      boss.bossFireCooldown = getSentinelCooldown(boss, phase);
      return;
    }
    if (boss.bossType === 'crusher' && (boss.bossTelegraphFor ?? 0) > 0) {
      const next = (boss.bossTelegraphFor ?? 0) - dt;
      if (next > 0) {
        boss.bossTelegraphFor = next;
        return;
      }

      boss.bossTelegraphFor = 0;
      fireCrusherShockwave(state, boss, phase);
      boss.bossTelegraphKind = undefined;
      boss.bossFireCooldown = getCrusherCooldown(boss, phase);
      return;
    }

    boss.bossFireCooldown = Math.max(0, (boss.bossFireCooldown ?? 0) - dt);
    if (boss.bossFireCooldown > 0) {
      return;
    }

    if (boss.bossType === 'sentinel') {
      const sentinelStats = balance.bosses.stats.sentinel;
      boss.bossTelegraphKind = 'sentinelVolley';
      boss.bossTelegraphFor = sentinelStats.signatureTelegraphSeconds;
      boss.bossAimAngle = shipAngle;
      return;
    }
    if (boss.bossType === 'crusher') {
      const crusherStats = balance.bosses.stats.crusher;
      boss.bossTelegraphKind = 'crusherShockwave';
      boss.bossTelegraphFor = crusherStats.signatureTelegraphSeconds;
      boss.bossAimAngle = shipAngle;
      return;
    }

    emitAudio(state, { type: boss.bossType === 'prism' ? 'bossPrismRicochet' : 'bossShoot' });
    bossStats.bulletAngleOffsets.forEach((offset) => {
      fireBullet(
        state,
        'boss',
        boss.position,
        shipAngle + offset,
        bossStats.bulletSpeed,
        bossStats.bulletDamage,
        { x: 0, y: 0 },
        0,
        boss.bossType === 'prism' ? 'ricochet' : 'standard',
        null,
        boss.bossType === 'prism' ? balance.bosses.ricochetBounces : 0,
        'silent'
      );
    });
    boss.bossFireCooldown = Math.max(bossStats.fireCooldownMin, bossStats.fireCooldownBase - (boss.bossZoneIndex ?? 0) * bossStats.fireCooldownPerZone);
  });
};

const getCrusherCooldown = (boss: AsteroidState, phase: number): number => {
  const stats = balance.bosses.stats.crusher;
  const base = Math.max(stats.fireCooldownMin, stats.fireCooldownBase - (boss.bossZoneIndex ?? 0) * stats.fireCooldownPerZone);
  return base * getPhaseValue(stats.signatureCooldownMultiplierByPhase, phase);
};

const fireCrusherShockwave = (state: GameState, boss: AsteroidState, phase: number): void => {
  const stats = balance.bosses.stats.crusher;
  const count = getPhaseValue(stats.signatureBulletCountByPhase, phase);
  const speed = getPhaseValue(stats.signatureBulletSpeedByPhase, phase);
  const damage = stats.bulletDamage * stats.signatureDamageMultiplier;
  const spin = (boss.bossPatternCursor ?? 0) * 0.18;
  boss.bossPatternCursor = (boss.bossPatternCursor ?? 0) + 1;
  emitAudio(state, { type: 'bossCrusherShockwave' });

  for (let index = 0; index < count; index += 1) {
    fireBullet(
      state,
      'boss',
      boss.position,
      spin + (index / count) * Math.PI * 2,
      speed,
      damage,
      { x: 0, y: 0 },
      0,
      'standard',
      null,
      0,
      'silent'
    );
  }
};

const getSentinelCooldown = (boss: AsteroidState, phase: number): number => {
  const stats = balance.bosses.stats.sentinel;
  const base = Math.max(stats.fireCooldownMin, stats.fireCooldownBase - (boss.bossZoneIndex ?? 0) * stats.fireCooldownPerZone);
  return base * getPhaseValue(stats.signatureCooldownMultiplierByPhase, phase);
};

const fireSentinelVolley = (state: GameState, boss: AsteroidState, phase: number): void => {
  const stats = balance.bosses.stats.sentinel;
  const count = getPhaseValue(stats.signatureBulletCountByPhase, phase);
  const spread = getPhaseValue(stats.signatureSpreadByPhase, phase);
  const base = boss.bossAimAngle ?? Math.atan2(
    state.ship.position.y - boss.position.y,
    state.ship.position.x - boss.position.x
  );
  const step = count > 1 ? spread / (count - 1) : 0;
  emitAudio(state, { type: 'bossSentinelVolley' });

  for (let index = 0; index < count; index += 1) {
    fireBullet(
      state,
      'boss',
      boss.position,
      base - spread / 2 + step * index,
      stats.bulletSpeed * stats.signatureBulletSpeedMultiplier,
      stats.bulletDamage * stats.signatureDamageMultiplier,
      { x: 0, y: 0 },
      0,
      'standard',
      null,
      0,
      'silent'
    );
  }
};

const getBossDesiredVelocity = (boss: AsteroidState, toShip: Vec2, distanceToShip: number): Vec2 => {
  const direct = normalize(toShip);
  if (boss.bossType === 'sentinel') {
    const orbitDirection = boss.id % 2 === 0 ? 1 : -1;
    const tangent = { x: -direct.y * orbitDirection, y: direct.x * orbitDirection };
    const orbitDistance = 260 + (boss.bossZoneIndex ?? 0) * 18;
    const radialWeight = distanceToShip < orbitDistance
      ? -0.85
      : distanceToShip > orbitDistance + 80
        ? 0.72
        : 0.08;
    return normalize({
      x: direct.x * radialWeight + tangent.x * 0.95,
      y: direct.y * radialWeight + tangent.y * 0.95
    });
  }

  if (boss.bossType === 'prism') {
    const orbitDirection = boss.id % 2 === 0 ? -1 : 1;
    const tangent = { x: -direct.y * orbitDirection, y: direct.x * orbitDirection };
    return normalize({
      x: direct.x * 0.76 + tangent.x * 0.36,
      y: direct.y * 0.76 + tangent.y * 0.36
    });
  }

  return direct;
};

const getBossSteerMultiplier = (boss: AsteroidState): number => {
  if (boss.bossType === 'crusher') {
    return 1.15;
  }
  if (boss.bossType === 'sentinel') {
    return 0.88;
  }
  return 0.7;
};

const getBossSpeedMultiplier = (boss: AsteroidState, distanceToShip: number): number => {
  if (boss.bossType === 'crusher') {
    return distanceToShip > 180 ? 1.012 : 1.002;
  }
  return 1;
};

export const updateSaucer = (state: GameState, dt: number): void => {
  state.saucerTimer -= dt;

  if (!state.saucer && state.saucerTimer <= 0) {
    const fromLeft = Math.random() > 0.5;
    const kind = chooseSaucerKind(state);
    state.saucer = {
      id: state.nextId++,
      kind,
      position: {
        x: state.camera.x + (fromLeft ? -state.width * balance.saucer.spawnOffsetX : state.width * balance.saucer.spawnOffsetX),
        y: state.camera.y + randomRange(state.height * balance.saucer.spawnMinY, state.height * balance.saucer.spawnMaxY)
      },
      velocity: {
        x: fromLeft ? randomRange(balance.saucer.speedX[0], balance.saucer.speedX[1]) : randomRange(-balance.saucer.speedX[1], -balance.saucer.speedX[0]),
        y: randomRange(balance.saucer.speedY[0], balance.saucer.speedY[1])
      },
      radius: kind === 'normal' ? balance.saucer.radius : balance.saucer[kind].radius,
      fireCooldown: balance.saucer.initialFireCooldown,
      alive: true
    };
  }

  const saucer = state.saucer;
  if (!saucer) {
    return;
  }
  if (!saucer.alive) {
    state.saucer = null;
    state.saucerTimer = randomRange(...balance.saucer.respawnTimer);
    return;
  }

  const charging = (saucer.telegraphFor ?? 0) > 0;
  const movement = saucer.kind === 'sniper' && charging ? 0 : saucer.kind === 'sniper' ? 0.6 : 1;
  saucer.position.x += saucer.velocity.x * dt * movement;
  saucer.position.y += (saucer.velocity.y + (saucer.kind === 'skirmisher'
    ? Math.sin(state.run.elapsedSeconds * 2.4 + saucer.id) * balance.saucer.skirmisher.weaveSpeed : 0)) * dt * movement;
  saucer.shotFlashFor = Math.max(0, (saucer.shotFlashFor ?? 0) - dt);
  saucer.fireCooldown -= dt;

  const scale = getWorldViewScale(state.width);
  const screenX = (saucer.position.x - state.camera.x) * scale + state.width / 2;
  const screenY = (saucer.position.y - state.camera.y) * scale + state.height / 2;
  const margin = (saucer.radius + 8) * scale;
  // Keep the entire charge cue away from the HUD and viewport edges.
  const visible = screenX > margin && screenX < state.width - margin &&
    screenY > Math.min(220, state.height * 0.33) + margin && screenY < state.height - margin;
  if (!visible || !state.ship.alive) {
    saucer.telegraphFor = 0;
  } else if (charging) {
    saucer.telegraphFor = Math.max(0, (saucer.telegraphFor ?? 0) - dt);
    if (saucer.telegraphFor === 0) {
      fireSaucerPattern(state);
      saucer.shotFlashFor = 0.18;
      const config = saucer.kind === 'normal' ? balance.saucer : balance.saucer[saucer.kind];
      saucer.fireCooldown = randomRange(config.fireCooldown[0], config.fireCooldown[1]);
    }
  } else if (saucer.fireCooldown <= 0) {
    saucer.aimAngle = Math.atan2(state.ship.position.y - saucer.position.y, state.ship.position.x - saucer.position.x);
    saucer.telegraphFor = getSaucerTelegraphSeconds(saucer.kind);
  }

  if (distance(saucer.position, state.camera) > Math.max(state.width, state.height) * balance.saucer.despawnDistanceMultiplier || !saucer.alive) {
    state.saucer = null;
    state.saucerTimer = randomRange(balance.saucer.respawnTimer[0], balance.saucer.respawnTimer[1]);
  }
};

export const chooseSaucerKind = (state: GameState, roll = Math.random()): SaucerState['kind'] => {
  if (shouldSpawnEliteSaucer(state)) return 'elite';
  if (state.progression.currentZoneIndex >= 2 && roll >= 0.65) return 'sniper';
  if (state.progression.currentZoneIndex >= 1 && roll >= 0.3) return 'skirmisher';
  return 'normal';
};

export const getSaucerTelegraphSeconds = (kind: SaucerState['kind']): number =>
  kind === 'sniper' || kind === 'skirmisher' ? balance.saucer[kind].telegraphSeconds : balance.saucer.telegraphSeconds;

const shouldSpawnEliteSaucer = (state: GameState): boolean =>
  isSurvivalZone(state) &&
  state.survival.active &&
  state.survival.threatLevel >= balance.saucer.elite.startsAtSurvivalThreatLevel;

const fireSaucerPattern = (state: GameState): void => {
  const saucer = state.saucer;
  if (!saucer) {
    return;
  }

  const aimAngle = saucer.aimAngle ?? 0;
  const config = saucer.kind === 'normal' ? balance.saucer : balance.saucer[saucer.kind];
  const offsets = saucer.kind === 'elite' || saucer.kind === 'skirmisher' ? balance.saucer[saucer.kind].bulletAngleOffsets : [0];
  offsets.forEach((offset) => {
    fireBullet(
      state,
      'saucer',
      saucer.position,
      aimAngle + offset,
      config.bulletSpeed,
      config.bulletDamage
    );
  });
};
