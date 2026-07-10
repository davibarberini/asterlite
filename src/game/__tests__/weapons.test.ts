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
  it('applies fire rate levels to player weapon cooldown', () => {
    const state = createGameState(800, 600);

    firePlayerWeapon(state);
    const baseCooldown = state.ship.fireCooldown;

    state.ship.fireCooldown = 0;
    state.progression.shipFireRateLevel = 10;
    firePlayerWeapon(state);

    expect(state.ship.fireCooldown).toBeLessThan(baseCooldown);
    expect(state.ship.fireCooldown).toBeGreaterThanOrEqual(balance.shop.ship.fireRate.minimumInterval);
  });

  it('keeps standard ships on the baseline cannon even with legacy weapon mode state', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'vector';
    state.progression.spreadUnlocked = true;
    state.progression.weaponMode = 'spread';
    state.progression.shipDamageLevel = 10;

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('standard');
    expect(state.bullets).toHaveLength(1);
    expect(state.ship.fireCooldown).toBeCloseTo(balance.weapons.playerFireInterval);
    expect(state.bullets[0]?.damage).toBeCloseTo(
      state.progression.shipDamageLevel *
        balance.weapons.playerDamageMultiplier
    );
  });

  it('keeps standard ship piercing legacy state from changing its shot pattern', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'vector';
    state.progression.piercingUnlocked = true;
    state.progression.weaponMode = 'piercing';

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('standard');
    expect(state.bullets).toHaveLength(1);
    expect(state.bullets[0]?.pierceLeft).toBe(0);
  });

  it('fires prism as a spread ship without the spread technology mode', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'prism';
    state.progression.spreadUnlocked = false;
    state.progression.weaponMode = 'cannon';
    state.progression.shipDamageLevel = 10;

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('spread');
    expect(state.bullets).toHaveLength(balance.weapons.spreadAngleOffsets.length);
    expect(state.ship.fireCooldown).toBeCloseTo(
      getPlayerFireInterval(state.progression, balance.weapons.playerFireInterval * balance.weapons.spreadCooldownMultiplier)
    );
  });

  it('fires needle as a piercing ship without the piercing technology mode', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'needle';
    state.progression.piercingUnlocked = false;
    state.progression.weaponMode = 'cannon';

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

  it('uses Ember as a continuous aura ship instead of firing cannon bullets', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'ember';
    state.progression.unlockedShipFrameIds = ['vector', 'ember'];

    firePlayerWeapon(state);

    expect(getShipFrameWeaponIdentity(state.progression)).toBe('aura');
    expect(state.bullets).toHaveLength(0);
    expect(state.ship.fireCooldown).toBeGreaterThan(0);
  });

  it('damages nearby asteroids with the Ember aura and scales with attack speed', () => {
    const baseState = createGameState(800, 600);
    baseState.progression.activeShipFrameId = 'ember';
    baseState.asteroids = [
      createAsteroid(baseState, 'large', { x: baseState.ship.position.x + 60, y: baseState.ship.position.y }, { x: 0, y: 0 }, 'common')
    ];
    const baseAsteroidId = baseState.asteroids[0].id;
    const baseHp = baseState.asteroids[0].hp;

    updateGame(baseState, neutralInput(), 1);
    const baseDamage = baseHp - (baseState.asteroids.find((asteroid) => asteroid.id === baseAsteroidId)?.hp ?? baseHp);

    const fastState = createGameState(800, 600);
    fastState.progression.activeShipFrameId = 'ember';
    fastState.progression.shipFireRateLevel = 10;
    fastState.asteroids = [
      createAsteroid(fastState, 'large', { x: fastState.ship.position.x + 60, y: fastState.ship.position.y }, { x: 0, y: 0 }, 'common')
    ];
    const fastAsteroidId = fastState.asteroids[0].id;
    const fastHp = fastState.asteroids[0].hp;

    updateGame(fastState, neutralInput(), 1);
    const fastDamage = fastHp - (fastState.asteroids.find((asteroid) => asteroid.id === fastAsteroidId)?.hp ?? fastHp);

    expect(baseDamage).toBeGreaterThan(0);
    expect(fastDamage).toBeGreaterThan(baseDamage);
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

  it('keeps nivitron turret rotation tied to shots while attack speed lowers the next shot delay', () => {
    const baseState = createGameState(800, 600);
    baseState.progression.activeShipFrameId = 'nivitron';
    baseState.ship.turretAngle = 0;

    const fastState = createGameState(800, 600);
    fastState.progression.activeShipFrameId = 'nivitron';
    fastState.ship.turretAngle = 0;
    fastState.progression.shipFireRateLevel = 10;

    updateGame(baseState, neutralInput(), 0.016);
    updateGame(fastState, neutralInput(), 0.016);

    expect(baseState.ship.turretAngle).toBeCloseTo(balance.weapons.nivitronTurretStepAngle);
    expect(fastState.ship.turretAngle).toBeCloseTo(balance.weapons.nivitronTurretStepAngle);
    expect(fastState.ship.fireCooldown).toBeLessThan(baseState.ship.fireCooldown);
  });

  it('auto fires nivitron without movement or fire input', () => {
    const state = createGameState(800, 600);
    state.progression.activeShipFrameId = 'nivitron';
    state.ship.fireCooldown = 0;

    updateGame(state, neutralInput(), 0.016);

    expect(state.bullets).toHaveLength(1);
    expect(state.ship.fireCooldown).toBeGreaterThan(0);
  });

  it('scales drone damage from the current ship damage', () => {
    const state = createGameState(800, 600);
    state.progression.droneCounts.sentry = 1;
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
    state.progression.shipDamageLevel = 5;
    updateDrones(state, 0);

    expect(state.bullets[0]?.damage).toBeGreaterThan(baseDamage);
    expect(state.bullets[0]?.damage).toBeCloseTo(5 * balance.weapons.playerDamageMultiplier);
  });
});
