import Phaser from 'phaser';
import type { Vec2 } from '../../game/simulation/types';

type Star = {
  x: number;
  y: number;
  depth: number;
  size: number;
  alpha: number;
  bright: boolean;
};

type CelestialKind = 'planet' | 'moon' | 'sun';

type CelestialBody = {
  x: number;
  y: number;
  depth: number;
  alpha: number;
  glow: number;
  radius: number;
  kind: CelestialKind;
  color: number;
  accent: number;
  ring: boolean;
  phase: number;
  sprites?: CelestialSprites;
};

type CelestialSprites = {
  glow?: Phaser.GameObjects.Image;
  body: Phaser.GameObjects.Arc | Phaser.GameObjects.Container;
};

const randomFieldCoordinate = (max: number): number =>
  Math.random() > 0.5 ? Math.random() * max : Math.random() * max * 0.18 + max * (Math.random() > 0.5 ? 0.82 : 0);

export class Starfield {
  private stars: Star[] = [];
  private bodies: CelestialBody[] = [];
  private readonly graphics: Phaser.GameObjects.Graphics;
  private drift = { x: 0, y: 0 };
  private bodyField = { width: 1, height: 1 };

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(-10);
    this.ensureGlowTextures();
    this.reset(scene.scale.width, scene.scale.height);
  }

  reset(width: number, height: number): void {
    const density = Math.floor((width * height) / 14000);
    this.stars = Array.from({ length: Math.max(60, Math.min(130, density)) }, () => {
      const depth = 0.35 + Math.random() * 1.35;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        size: Math.random() > 0.94 ? 1.15 : 0.65,
        alpha: Phaser.Math.Clamp(0.1 + depth * 0.22, 0.14, 0.42),
        bright: Math.random() > 0.92
      };
    });
    this.bodyField = {
      width: Math.max(width * 4, 3600),
      height: Math.max(height * 4, 2600)
    };
    this.destroyBodySprites();
    this.bodies = this.createBodies(this.bodyField.width, this.bodyField.height);
    this.bodies.forEach((body) => {
      body.sprites = this.createBodySprites(body);
    });
  }

  update(dt: number, shipVelocity: Vec2, travelEffect: { progress: number; direction: Vec2 } | null = null): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;
    const travelBoost = travelEffect ? 5.8 + Math.sin(travelEffect.progress * Math.PI) * 4.6 : 1;
    this.drift.x += shipVelocity.x * dt * 0.072 * travelBoost;
    this.drift.y += shipVelocity.y * dt * 0.072 * travelBoost;

    this.graphics.clear();
    if (travelEffect) {
      this.hideBodies();
      this.drawWormholeLines(width, height, travelEffect);
    } else {
      this.drawTravelDust(width, height, shipVelocity);
      this.updateBodies(width, height);
    }

    for (const star of this.stars) {
      const x = this.wrap(star.x - this.drift.x * star.depth, width);
      const y = this.wrap(star.y - this.drift.y * star.depth, height);

      this.graphics.fillStyle(star.bright ? 0xf4e4c4 : 0xc3d8de, star.alpha);
      this.graphics.fillCircle(x, y, star.size * star.depth);

      if (star.bright) {
        this.graphics.lineStyle(1, 0xdcefff, star.alpha * 0.4);
        this.graphics.lineBetween(x - 2, y, x + 2, y);
        this.graphics.lineBetween(x, y - 2, x, y + 2);
      }
    }
  }

  private drawWormholeLines(width: number, height: number, travelEffect: { progress: number; direction: Vec2 }): void {
    const direction = Math.atan2(travelEffect.direction.y, travelEffect.direction.x);
    const directionX = Math.cos(direction);
    const directionY = Math.sin(direction);
    const pulse = Math.sin(travelEffect.progress * Math.PI);
    const length = Phaser.Math.Linear(58, 210, pulse);
    const alpha = Phaser.Math.Linear(0.18, 0.62, pulse);

    this.graphics.lineStyle(1, 0xd8fff5, alpha);
    for (let i = 0; i < this.stars.length; i += 2) {
      const star = this.stars[i];
      const x = this.wrap(star.x - this.drift.x * star.depth, width);
      const y = this.wrap(star.y - this.drift.y * star.depth, height);
      const starLength = length * star.depth * (star.bright ? 1.3 : 0.8);
      this.graphics.lineBetween(x, y, x - directionX * starLength, y - directionY * starLength);
    }

    this.graphics.lineStyle(2, 0x92dfff, 0.18 * pulse);
    this.graphics.strokeCircle(width / 2, height / 2, Math.max(width, height) * (0.16 + pulse * 0.26));
    this.graphics.strokeCircle(width / 2, height / 2, Math.max(width, height) * (0.28 + pulse * 0.38));
  }

  private wrap(value: number, max: number): number {
    return ((value % max) + max) % max;
  }

  private createBodies(width: number, height: number): CelestialBody[] {
    const colors = [
      { color: 0x8ed7ff, accent: 0xd8f4ff },
      { color: 0xffd18a, accent: 0xfff1a8 },
      { color: 0xb7a6ff, accent: 0xe2dcff },
      { color: 0x83ffdc, accent: 0xd8fff5 }
    ];
    const count = Math.max(10, Math.min(18, Math.floor((width * height) / 620000)));

    const bodies = Array.from({ length: count }, (_, index) => {
      const palette = colors[index % colors.length];
      const kind: CelestialKind = index % 7 === 0 ? 'sun' : index % 3 === 0 ? 'moon' : 'planet';
      const layer = index % 4;
      const depth =
        kind === 'sun'
          ? 0.06 + Math.random() * 0.08
          : layer === 0
            ? 0.08 + Math.random() * 0.08
            : layer === 1
              ? 0.16 + Math.random() * 0.13
              : 0.34 + Math.random() * 0.22;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        depth,
        alpha: kind === 'sun' ? 1 : layer === 2 ? 0.52 : 0.72,
        glow: kind === 'sun' ? 0.82 : layer === 2 ? 0.5 : 0.82,
        radius: kind === 'sun' ? 34 + Math.random() * 32 : kind === 'moon' ? 9 + Math.random() * 10 : 20 + Math.random() * 34,
        kind,
        color: palette.color,
        accent: palette.accent,
        ring: kind === 'planet' && Math.random() > 0.55,
        phase: Math.random() * Math.PI * 2
      };
    });

    bodies.push(
      {
        x: width * 0.28,
        y: height * 0.34,
        depth: 0.11,
        alpha: 1,
        glow: 0.9,
        radius: 62,
        kind: 'sun',
        color: 0xffd18a,
        accent: 0xfff1a8,
        ring: false,
        phase: Math.random() * Math.PI * 2
      },
      {
        x: this.scene.scale.width * 0.78,
        y: this.scene.scale.height * 0.72,
        depth: 0.28,
        alpha: 0.64,
        glow: 0.75,
        radius: 38,
        kind: 'planet',
        color: 0x8ed7ff,
        accent: 0xd8f4ff,
        ring: true,
        phase: Math.random() * Math.PI * 2
      }
    );

    const nearSunCount = Math.max(1, Math.min(3, Math.floor((width * height) / 5200000)));
    for (let i = 0; i < nearSunCount; i += 1) {
      bodies.push({
        x: randomFieldCoordinate(width),
        y: randomFieldCoordinate(height),
        depth: 0.72 + Math.random() * 0.42,
        alpha: 1,
        glow: 0.72,
        radius: 60 + Math.random() * 36,
        kind: 'sun',
        color: 0xffd18a,
        accent: 0xfff1a8,
        ring: false,
        phase: Math.random() * Math.PI * 2
      });
    }

    return bodies;
  }

  private updateBodies(width: number, height: number): void {
    for (const body of this.bodies) {
      const baseX = this.wrap(body.x - this.drift.x * body.depth * 1.45, this.bodyField.width);
      const baseY = this.wrap(body.y - this.drift.y * body.depth * 1.45, this.bodyField.height);
      const radius = body.radius;
      const sprites = body.sprites;
      if (!sprites) {
        continue;
      }

      let visible = false;
      for (const xOffset of [-this.bodyField.width, 0, this.bodyField.width]) {
        for (const yOffset of [-this.bodyField.height, 0, this.bodyField.height]) {
          const x = baseX + xOffset;
          const y = baseY + yOffset;
          if (x < -radius * 5 || x > width + radius * 5 || y < -radius * 5 || y > height + radius * 5) {
            continue;
          }

          this.positionBodySprites(sprites, x, y);
          visible = true;
          break;
        }

        if (visible) {
          break;
        }
      }

      this.setBodySpritesVisible(sprites, visible);
    }
  }

  private createBodySprites(body: CelestialBody): CelestialSprites {
    if (body.kind === 'sun') {
      const glow = this.scene.add.image(0, 0, 'glow-sun');
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(-11);
      const glowScale = 2.8;
      glow.setDisplaySize(body.radius * glowScale, body.radius * glowScale);
      glow.setAlpha(0.09 * body.glow * body.alpha);
      glow.setVisible(false);

      const bodySprite = this.scene.add.circle(0, 0, body.radius, body.color, 0.035);
      bodySprite.setStrokeStyle(1, body.accent, 0.13 * body.alpha);
      bodySprite.setDepth(body.depth > 0.5 ? -8 : -9);
      bodySprite.setVisible(false);
      return { glow, body: bodySprite };
    }

    const container = this.scene.add.container(0, 0);
    container.setDepth(-9);
    container.setVisible(false);

    if (body.kind === 'planet') {
      const glow = this.scene.add.image(0, 0, this.getGlowTextureKey(body.accent));
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(-11);
      glow.setDisplaySize(body.radius * 2.3, body.radius * 2.3);
      glow.setAlpha(0.08 * body.glow * body.alpha);
      glow.setVisible(false);

      this.addRingSprites(container, body);
      const planet = this.scene.add.circle(0, 0, body.radius, 0x090e12, 0.96);
      planet.setStrokeStyle(1, body.accent, 0.24 * body.alpha);
      container.add(planet);
      this.addBodySurfaceLines(container, body);
      return { glow, body: container };
    }

    const moon = this.scene.add.circle(0, 0, body.radius, 0x0c1216, 0.9);
    moon.setStrokeStyle(1, body.accent, 0.32 * body.alpha);
    container.add(moon);
    this.addBodySurfaceLines(container, body);
    return { body: container };
  }

  private drawTravelDust(width: number, height: number, shipVelocity: Vec2): void {
    const speed = Math.hypot(shipVelocity.x, shipVelocity.y);
    if (speed < 180) {
      return;
    }

    const direction = Math.atan2(shipVelocity.y, shipVelocity.x);
    const length = Phaser.Math.Clamp(speed * 0.04, 8, 26);
    const alpha = Phaser.Math.Clamp((speed - 160) / 520, 0.04, 0.18);
    this.graphics.lineStyle(1, 0x9fdcff, alpha);

    const directionX = Math.cos(direction);
    const directionY = Math.sin(direction);

    for (let i = 0; i < this.stars.length; i += 14) {
      const star = this.stars[i];
      const x = this.wrap(star.x - this.drift.x * star.depth, width);
      const y = this.wrap(star.y - this.drift.y * star.depth, height);
      this.graphics.lineBetween(
        x,
        y,
        x - directionX * length * star.depth,
        y - directionY * length * star.depth
      );
    }
  }

  private addRingSprites(container: Phaser.GameObjects.Container, body: CelestialBody): void {
    if (!body.ring) {
      return;
    }

    const ringA = this.scene.add.ellipse(0, 0, body.radius * 3.8, body.radius * 1.08);
    ringA.setStrokeStyle(1, body.accent, 0.22 * body.alpha);
    ringA.setRotation(-0.35);
    const ringB = this.scene.add.ellipse(0, 0, body.radius * 4.25, body.radius * 1.28);
    ringB.setStrokeStyle(1, body.accent, 0.08 * body.alpha);
    ringB.setRotation(-0.35);
    container.add([ringA, ringB]);
  }

  private addBodySurfaceLines(container: Phaser.GameObjects.Container, body: CelestialBody): void {
    // Static geometry is built once per field reset, never in the frame loop.
    const surface = this.scene.add.graphics();
    surface.fillStyle(body.color, 0.08 * body.alpha);
    surface.fillEllipse(-body.radius * 0.25, 0, body.radius * 1.4, body.radius * 1.7);
    surface.lineStyle(1, body.accent, 0.24 * body.alpha);
    surface.beginPath();
    surface.arc(0, 0, body.radius * 0.95, Math.PI * 0.85, Math.PI * 1.55);
    surface.strokePath();
    surface.lineStyle(1, body.accent, 0.1 * body.alpha);
    for (let i = 0; i < 3; i += 1) {
      const angle = body.phase + i * 2.1;
      surface.strokeEllipse(Math.cos(angle) * body.radius * 0.45, Math.sin(angle) * body.radius * 0.45,
        body.radius * 0.26, body.radius * 0.16);
    }
    container.add(surface);
  }

  private positionBodySprites(sprites: CelestialSprites, x: number, y: number): void {
    sprites.body.setPosition(x, y);
    sprites.glow?.setPosition(x, y);
  }

  private setBodySpritesVisible(sprites: CelestialSprites, visible: boolean): void {
    sprites.body.setVisible(visible);
    sprites.glow?.setVisible(visible);
  }

  private hideBodies(): void {
    for (const body of this.bodies) {
      if (body.sprites) {
        this.setBodySpritesVisible(body.sprites, false);
      }
    }
  }

  private destroyBodySprites(): void {
    for (const body of this.bodies) {
      body.sprites?.glow?.destroy();
      body.sprites?.body.destroy();
      body.sprites = undefined;
    }
  }

  private ensureGlowTextures(): void {
    const glowSpecs = [
      {
        key: 'glow-sun',
        size: 256,
        stops: [
          { at: 0, color: '#fff7cf', alpha: 0.72 },
          { at: 0.16, color: '#fff1a8', alpha: 0.5 },
          { at: 0.42, color: '#ffb84d', alpha: 0.2 },
          { at: 0.74, color: '#ff7a1a', alpha: 0.06 },
          { at: 1, color: '#ff7a1a', alpha: 0 }
        ]
      },
      { key: 'glow-cyan', size: 256, stops: this.createGlowStops('#8ed7ff') },
      { key: 'glow-gold', size: 256, stops: this.createGlowStops('#fff1a8') },
      { key: 'glow-violet', size: 256, stops: this.createGlowStops('#b7a6ff') },
      { key: 'glow-green', size: 256, stops: this.createGlowStops('#83ffdc') }
    ];

    for (const spec of glowSpecs) {
      if (this.scene.textures.exists(spec.key)) {
        continue;
      }

      const size = spec.size;
      const texture = this.scene.textures.createCanvas(spec.key, size, size);
      const canvas = texture?.getSourceImage() as HTMLCanvasElement | undefined;
      const context = canvas?.getContext('2d');
      if (!texture || !canvas || !context) {
        continue;
      }

      const center = size / 2;
      const gradient = context.createRadialGradient(center, center, 0, center, center, center);
      for (const stop of spec.stops) {
        gradient.addColorStop(stop.at, this.hexToRgba(stop.color, stop.alpha));
      }
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      texture.refresh();
    }
  }

  private createGlowStops(color: string): Array<{ at: number; color: string; alpha: number }> {
    return [
      { at: 0, color, alpha: 0.95 },
      { at: 0.18, color, alpha: 0.66 },
      { at: 0.42, color, alpha: 0.29 },
      { at: 0.72, color, alpha: 0.08 },
      { at: 1, color, alpha: 0 }
    ];
  }

  private hexToRgba(color: string, alpha: number): string {
    const value = Number.parseInt(color.replace('#', ''), 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }

  private getGlowTextureKey(accent: number): string {
    if (accent === 0xfff1a8) {
      return 'glow-gold';
    }
    if (accent === 0xe2dcff) {
      return 'glow-violet';
    }
    if (accent === 0xd8fff5) {
      return 'glow-green';
    }
    return 'glow-cyan';
  }
}
