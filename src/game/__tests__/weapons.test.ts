import { describe, expect, it } from 'vitest';
import { neutralInput } from '../input/actions';
import { getPlayerFireInterval } from '../progression/idleBonuses';
import { getShipFrameWeaponIdentity } from '../progression/shipFrames';
import { createGameState } from '../simulation/state';
import { createAsteroid } from '../simulation/systems/asteroids';
import { resolveCollisions } from '../simulation/systems/collisions';
import { updateDrones } from '../simulation/systems/drones';
import { updateGame } from '../simulation/systems/gameLoop';
import { firePlayerWeapon } from '../simulation/systems/weapons';
import { balance } from '../balance';

describe('ship weapons and drone damage', () => {
  it('uses ship-frame fire-rate identity instead of purchased fire-rate levels', () => {
    const progression = createGameState(800, 600).progression;
    const baseInterval = getPlayerFireInterval(progression);
    progression.activeShipFrameId = 'prism';

    expect(getPlayerFireInterval(progression)).toBeLessThan(baseInterval);
    expect(getPlayerFireInterval(progression)).toBeCloseTo(balance.weapons.playerFireInterval / 1.08);
    expect(getPlayerFireInterval(progression)).toBeGreaterThanOrEqual(balance.weapons.minimumPlayerFireInterval);
  });

  it('keeps the standard ship on a single baseline cannon shot', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'vector';

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('standard');
    expect(state.bullets).toHaveLength(1);
    expect(state.bullets[0]?.pierceLeft).toBe(0);
    expect(state.ship.fireCooldown).toBeCloseTo(balance.weapons.playerFireInterval);
    expect(state.bullets[0]?.damage).toBeCloseTo(balance.weapons.playerDamageMultiplier);
  });

  it('fires prism as a spread ship from its frame identity', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'prism';

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('spread');
    expect(state.bullets).toHaveLength(balance.weapons.spreadAngleOffsets.length);
    expect(state.ship.fireCooldown).toBeCloseTo(
      getPlayerFireInterval(state.progression, balance.weapons.playerFireInterval * balance.weapons.spreadCooldownMultiplier)
    );
  });

  it('fires needle as a piercing ship from its frame identity', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'needle';

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('piercing');
    expect(state.bullets).toHaveLength(1);
    expect(state.bullets[0]?.pierceLeft).toBe(balance.weapons.piercingCount);
    expect(state.ship.fireCooldown).toBeCloseTo(
      getPlayerFireInterval(state.progression, balance.weapons.playerFireInterval * balance.weapons.piercingCooldownMultiplier)
    );
  });

  it('scales Kestrel shot damage and cooldown from movement speed', () => {
    const slowState = createGameState(800, 600);
    slowState.progression.activeShipFrameId = 'kestrel';
    slowState.ship.velocity = { x: 0, y: 0 };

    firePlayerWeapon(slowState);

    const fastState = createGameState(800, 600);
    fastState.progression.activeShipFrameId = 'kestrel';
    fastState.ship.velocity = { x: balance.ship.maxSpeed, y: 0 };

    firePlayerWeapon(fastState);

    expect(getShipFrameWeaponIdentity(fastState.progression)).toBe('velocity');
    expect(fastState.bullets[0]?.damage).toBeGreaterThan(slowState.bullets[0]?.damage ?? 0);
    expect(fastState.ship.fireCooldown).toBeLessThan(slowState.ship.fireCooldown);
  });

  it('lets Bulwark ram weak asteroids without taking contact damage', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'bulwark';
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.asteroids = [
      createAsteroid(state, 'small', { ...state.ship.position }, { x: 0, y: 0 }, 'common')
    ];

    resolveCollisions(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('ram');
    expect(state.asteroids).toHaveLength(0);
    expect(state.ship.hp).toBe(state.ship.maxHp);
  });

  it('lets Wraith phase shield absorb the first real hit before entering cooldown', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'wraith';
    state.progression.shipUnlockProgress.wraithNoDamageSeconds = 42;
    state.ship.invulnerableFor = 0;
    state.shieldBubble.active = false;
    state.shieldBubble.broken = false;
    state.asteroids = [
      createAsteroid(state, 'small', { ...state.ship.position }, { x: 0, y: 0 }, 'common')
    ];

    resolveCollisions(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('phase');
    expect(state.ship.hp).toBe(state.ship.maxHp);
    expect(state.ship.phaseShieldCooldown).toBeCloseTo(balance.ship.phaseShieldCooldownSeconds);
    expect(state.ship.phaseShieldFlashFor).toBeCloseTo(balance.ship.phaseShieldFlashSeconds);
    expect(state.ship.invulnerableFor).toBeCloseTo(balance.ship.phaseShieldInvulnerableSeconds);
    expect(state.progression.shipUnlockProgress.wraithNoDamageSeconds).toBe(42);

    state.ship.invulnerableFor = 0;
    state.asteroids = [
      createAsteroid(state, 'small', { ...state.ship.position }, { x: 0, y: 0 }, 'common')
    ];

    resolveCollisions(state);

    expect(state.ship.hp).toBeLessThan(state.ship.maxHp);
    expect(state.progression.shipUnlockProgress.wraithNoDamageSeconds).toBe(0);
  });

  it('uses Ember as flame waves instead of firing cannon bullets', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';
    state.progression.unlockedShipFrameIds = ['vector', 'ember'];

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('aura');
    expect(state.bullets).toHaveLength(0);
    expect(state.flameWaves).toHaveLength(1);
    expect(state.ship.fireCooldown).toBeGreaterThan(0);
  });

  it('damages asteroids only when Ember flame waves reach them', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';
    state.asteroids = [
      createAsteroid(state, 'large', { x: state.ship.position.x + 80, y: state.ship.position.y }, { x: 0, y: 0 }, 'common')
    ];
    const asteroidId = state.asteroids[0].id;
    const hp = state.asteroids[0].hp;

    firePlayerWeapon(state);
    resolveCollisions(state, 0);
    expect(state.asteroids.find((asteroid) => asteroid.id === asteroidId)?.hp).toBe(hp);

    updateGame(state, neutralInput(), 0.2);

    expect(state.asteroids.find((asteroid) => asteroid.id === asteroidId)?.hp).toBeLessThan(hp);
  });

  it('uses the base Ember flame wave interval without purchased attack-speed levels', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';
    firePlayerWeapon(state);

    expect(state.ship.fireCooldown).toBeCloseTo(getPlayerFireInterval(state.progression));
  });

  it('auto emits Ember flame waves as circular defense pulses', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';
    state.ship.fireCooldown = 0;

    updateGame(state, neutralInput(), 0.016);

    expect(state.flameWaves.length).toBeGreaterThan(0);
  });

  it('keeps Ember waves and player projectile radius at their base values before cards', () => {
    const baseState = createGameState(800, 600);
    baseState.progression.activeShipFrameId = 'ember';
    firePlayerWeapon(baseState);

    const secondState = createGameState(800, 600);
    secondState.progression.activeShipFrameId = 'ember';
    firePlayerWeapon(secondState);

    expect(secondState.flameWaves[0].maxRadius).toBe(baseState.flameWaves[0].maxRadius);

    const projectileState = createGameState(800, 600);
    firePlayerWeapon(projectileState);
    const baseRadius = projectileState.bullets[0].radius;
    expect(projectileState.bullets[0].radius).toBe(baseRadius);
  });

  it('fires the legendary nivitron from its rotating turret angle', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'nivitron';
    state.progression.unlockedShipFrameIds = ['vector', 'nivitron'];
    state.ship.rotation = 0;
    state.ship.turretAngle = 0;

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('turret');
    expect(state.bullets).toHaveLength(1);
    expect(state.ship.turretAngle).toBeCloseTo(balance.weapons.nivitronTurretStepAngle);
    expect(state.bullets[0]?.velocity.x).toBeCloseTo(Math.cos(balance.weapons.nivitronTurretStepAngle) * balance.weapons.bulletSpeed);
    expect(state.bullets[0]?.velocity.y).toBeCloseTo(Math.sin(balance.weapons.nivitronTurretStepAngle) * balance.weapons.bulletSpeed);
    expect(state.ship.fireCooldown).toBeCloseTo(
      getPlayerFireInterval(state.progression, balance.weapons.playerFireInterval * balance.weapons.nivitronTurretCooldownMultiplier)
    );
  });

  it('keeps nivitron turret rotation tied to shots', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'nivitron';
    state.ship.turretAngle = 0;

    updateGame(state, neutralInput(), 0.016);

    expect(state.ship.turretAngle).toBeCloseTo(balance.weapons.nivitronTurretStepAngle);
    expect(state.ship.fireCooldown).toBeGreaterThan(0);
  });

  it('auto fires nivitron without movement or fire input', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'nivitron';
    state.ship.fireCooldown = 0;

    updateGame(state, neutralInput(), 0.016);

    expect(state.bullets).toHaveLength(1);
    expect(state.ship.fireCooldown).toBeGreaterThan(0);
  });

  it('fires Hi-soka as a pink ricochet weapon from its frame identity', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'hisoka';
    state.progression.unlockedShipFrameIds = ['vector', 'hisoka'];

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('ricochet');
    expect(state.bullets).toHaveLength(1);
    expect(state.bullets[0]?.kind).toBe('playerRicochet');
    expect(state.bullets[0]?.radius).toBe(balance.weapons.radius.playerRicochet);
    expect(state.bullets[0]?.damage).toBeCloseTo(
      balance.weapons.playerDamageMultiplier *
        1.08 *
        balance.weapons.hisokaRicochetDamageMultiplier
    );
    expect(state.ship.fireCooldown).toBeCloseTo(
      getPlayerFireInterval(state.progression, balance.weapons.playerFireInterval * balance.weapons.hisokaRicochetCooldownMultiplier)
    );
  });

  it('keeps Hi-soka ricochet bullets alive while they have damage remaining', () => {
    const state = createGameState(800, 600);
    const asteroid = createAsteroid(state, 'small', { x: 100, y: 100 }, { x: 0, y: 0 }, 'common');
    asteroid.hp = 4;
    asteroid.maxHp = 4;
    state.asteroids = [asteroid];
    state.bullets = [
      {
        id: 999,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
        age: 0,
        radius: balance.weapons.radius.playerRicochet,
        damage: 10,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'playerRicochet',
        homingTargetId: null
      }
    ];

    resolveCollisions(state);

    expect(state.asteroids).toHaveLength(0);
    expect(state.bullets).toHaveLength(1);
    expect(state.bullets[0]?.damage).toBeCloseTo(6);
    expect(state.bullets[0]?.velocity.x).toBeLessThan(0);
  });

  it('removes Hi-soka ricochet bullets when an asteroid consumes their remaining damage', () => {
    const state = createGameState(800, 600);
    const asteroid = createAsteroid(state, 'small', { x: 100, y: 100 }, { x: 0, y: 0 }, 'common');
    asteroid.hp = 10;
    asteroid.maxHp = 10;
    state.asteroids = [asteroid];
    state.bullets = [
      {
        id: 999,
        owner: 'player',
        position: { x: 100, y: 100 },
        velocity: { x: 100, y: 0 },
        age: 0,
        radius: balance.weapons.radius.playerRicochet,
        damage: 6,
        pierceLeft: 0,
        ricochetLeft: 0,
        kind: 'playerRicochet',
        homingTargetId: null
      }
    ];

    resolveCollisions(state);

    expect(state.asteroids).toHaveLength(1);
    expect(state.asteroids[0]?.hp).toBeCloseTo(4);
    expect(state.bullets).toHaveLength(0);
  });

  it('scales drone damage from the current ship damage', () => {
    const state = createGameState(800, 600);
    state.drones = [
      {
        id: 10,
        type: 'sentry',
        position: { ...state.ship.position },
        angle: 0,
        orbitRadius: 42,
        fireCooldown: 0
      }
    ];
    state.asteroids = [
      createAsteroid(state, 'large', { x: state.ship.position.x + 80, y: state.ship.position.y }, { x: 0, y: 0 }, 'common')
    ];

    updateDrones(state, 0);
    const baseDamage = state.bullets[0]?.damage ?? 0;

    state.bullets = [];
    state.drones[0].fireCooldown = 0;
    state.progression.activeShipFrameId = 'voidRunner';
    updateDrones(state, 0);

    expect(state.bullets[0]?.damage).toBeGreaterThan(baseDamage);
    expect(state.bullets[0]?.damage).toBeCloseTo(1.08 * balance.weapons.playerDamageMultiplier);
  });
});
