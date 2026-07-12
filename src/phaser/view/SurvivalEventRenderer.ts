import Phaser from 'phaser';
import { balance } from '../../game/balance';
import { getMeteorLaneMeteorPosition, getNormal, isSurvivalTimedEventActive } from '../../game/simulation/systems/survivalEvents';
import type {
  GameState,
  SurvivalHazardState,
  SurvivalMeteorLaneEventState,
  SurvivalMeteorVisualState,
  SurvivalTimedEventState
} from '../../game/simulation/types';

export class SurvivalEventRenderer {
  constructor(private readonly graphics: Phaser.GameObjects.Graphics) {}

  renderTimedEvent(state: GameState, event: SurvivalTimedEventState): void {
    if (event.kind === 'gravityPulse') {
      this.drawGravityPulse(state, event);
      return;
    }
    if (event.kind === 'damageField') {
      this.drawDamageField(state, event);
      return;
    }

    const viewScale = this.getViewScale(state);
    const center = {
      x: this.toScreenX(state, event.center.x),
      y: this.toScreenY(state, event.center.y)
    };
    const normal = getNormal(event.direction);
    const halfLength = event.length * viewScale * 0.5;
    const halfWidth = event.width * viewScale * 0.5;
    const along = {
      x: event.direction.x * halfLength,
      y: event.direction.y * halfLength
    };
    const across = {
      x: normal.x * halfWidth,
      y: normal.y * halfWidth
    };
    const corners = [
      { x: center.x - along.x - across.x, y: center.y - along.y - across.y },
      { x: center.x + along.x - across.x, y: center.y + along.y - across.y },
      { x: center.x + along.x + across.x, y: center.y + along.y + across.y },
      { x: center.x - along.x + across.x, y: center.y - along.y + across.y }
    ];
    const active = isSurvivalTimedEventActive(event);
    const pulse = 0.5 + Math.sin((event.age + event.id * 0.13) * (active ? 10 : 7)) * 0.5;
    const color = active ? 0xff4f3f : 0xffd36a;
    const fillAlpha = active ? 0.13 + pulse * 0.08 : 0.04 + pulse * 0.05;
    const lineAlpha = active ? 0.42 + pulse * 0.28 : 0.22 + pulse * 0.26;

    this.graphics.fillStyle(color, fillAlpha);
    this.graphics.beginPath();
    this.graphics.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => this.graphics.lineTo(corner.x, corner.y));
    this.graphics.closePath();
    this.graphics.fillPath();

    this.graphics.lineStyle(active ? 2 : 1, color, lineAlpha);
    this.graphics.beginPath();
    this.graphics.moveTo(corners[0].x, corners[0].y);
    corners.slice(1).forEach((corner) => this.graphics.lineTo(corner.x, corner.y));
    this.graphics.closePath();
    this.graphics.strokePath();

    this.graphics.lineStyle(1, active ? 0xfff1a8 : 0xf2fbff, active ? 0.22 : 0.12 + pulse * 0.16);
    this.graphics.lineBetween(center.x - along.x, center.y - along.y, center.x + along.x, center.y + along.y);

    event.meteors.forEach((meteor) => this.drawMeteorLaneRock(state, event, meteor, active, pulse));
  }

  renderHazard(state: GameState, hazard: SurvivalHazardState): void {
    if (hazard.kind === 'survivalHunter') {
      this.drawSurvivalHunter(state, hazard);
      return;
    }
    this.drawProximityMine(state, hazard);
  }

  private drawGravityPulse(state: GameState, event: Extract<SurvivalTimedEventState, { kind: 'gravityPulse' }>): void {
    if (!this.isCircleOnScreen(state, event.center.x, event.center.y, event.radius + 18)) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, event.center.x);
    const y = this.toScreenY(state, event.center.y);
    const radius = event.radius * viewScale;
    const pulse = 0.5 + Math.sin((event.age + event.id * 0.19) * 5.2) * 0.5;

    this.graphics.fillStyle(0x0b1018, 0.18);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.fillStyle(0x173a52, 0.075 + pulse * 0.03);
    this.graphics.fillCircle(x, y, radius * 0.72);
    this.graphics.lineStyle(2, 0x92dfff, 0.28 + pulse * 0.22);
    this.graphics.strokeCircle(x, y, radius);
    this.graphics.lineStyle(1, 0xd8fff5, 0.14 + pulse * 0.16);
    this.graphics.strokeCircle(x, y, radius * (0.48 + pulse * 0.06));

    const coreRadius = Math.max(7, radius * 0.075);
    this.graphics.fillStyle(0x010308, 0.94);
    this.graphics.fillCircle(x, y, coreRadius * 1.55);
    this.graphics.lineStyle(Math.max(1, radius * 0.012), 0xfff1a8, 0.4 + pulse * 0.22);
    this.drawArcSegments(x, y, coreRadius * 2.25, event.age * 2.4, Math.PI * 1.65, 10);

    this.graphics.lineStyle(1, 0x92dfff, 0.16 + pulse * 0.16);
    for (let index = 0; index < 14; index += 1) {
      const angle = (index / 14) * Math.PI * 2 + event.age * 0.55;
      const outer = radius * (0.84 - (index % 3) * 0.06);
      const inner = radius * (0.18 + pulse * 0.04);
      this.graphics.lineBetween(
        x + Math.cos(angle) * outer,
        y + Math.sin(angle) * outer,
        x + Math.cos(angle) * inner,
        y + Math.sin(angle) * inner
      );
    }
  }

  private drawDamageField(state: GameState, event: Extract<SurvivalTimedEventState, { kind: 'damageField' }>): void {
    if (!this.isCircleOnScreen(state, event.center.x, event.center.y, event.radius + 18)) {
      return;
    }

    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, event.center.x);
    const y = this.toScreenY(state, event.center.y);
    const radius = event.radius * viewScale;
    const pulse = 0.5 + Math.sin((event.age + event.id * 0.23) * 2.8) * 0.5;

    this.graphics.fillStyle(0x5f8f5a, 0.085);
    this.graphics.fillCircle(x, y, radius * 0.96);
    this.graphics.lineStyle(Math.max(2, radius * 0.006), 0xc9ff89, 0.18 + pulse * 0.1);
    this.graphics.strokeCircle(x, y, radius * 0.98);
    this.graphics.lineStyle(Math.max(1, radius * 0.003), 0x9fcf7a, 0.1 + pulse * 0.08);
    for (let index = 0; index < 8; index += 1) {
      const angle = event.age * 0.12 + index * 0.78 + event.id * 0.19;
      const startRadius = radius * (0.16 + (index % 3) * 0.08);
      const endRadius = radius * (0.68 + (index % 4) * 0.06);
      this.graphics.lineBetween(
        x + Math.cos(angle) * startRadius,
        y + Math.sin(angle) * startRadius,
        x + Math.cos(angle + 0.34) * endRadius,
        y + Math.sin(angle + 0.34) * endRadius
      );
    }
    for (let index = 0; index < 24; index += 1) {
      const seed = event.id * 31 + index * 17;
      const angle = seed * 0.73 + Math.sin(event.age * 0.22 + index) * 0.18;
      const distanceFromCenter = radius * (0.06 + ((seed % 100) / 100) * 0.82);
      const puffPulse = 0.5 + Math.sin(event.age * (0.75 + (index % 4) * 0.12) + seed) * 0.5;
      const puffRadius = radius * (0.18 + ((seed % 7) / 7) * 0.18) * (0.94 + puffPulse * 0.24);
      const puffX = x + Math.cos(angle) * distanceFromCenter;
      const puffY = y + Math.sin(angle) * distanceFromCenter;
      const color = index % 3 === 0 ? 0xc9ff89 : index % 3 === 1 ? 0x7fbf6f : 0x55685f;
      this.graphics.fillStyle(color, 0.13 + puffPulse * 0.075 + pulse * 0.04);
      this.graphics.fillCircle(puffX, puffY, puffRadius);
    }

    this.graphics.fillStyle(0xc9ff89, 0.08 + pulse * 0.055);
    this.graphics.fillCircle(x, y, radius * 0.22);
  }

  private drawMeteorLaneRock(
    state: GameState,
    event: SurvivalMeteorLaneEventState,
    meteor: SurvivalMeteorVisualState,
    active: boolean,
    pulse: number
  ): void {
    const viewScale = this.getViewScale(state);
    const worldPosition = getMeteorLaneMeteorPosition(event, meteor);
    if (!worldPosition) {
      return;
    }

    if (!this.isCircleOnScreen(state, worldPosition.x, worldPosition.y, meteor.radius + 54)) {
      return;
    }

    const x = this.toScreenX(state, worldPosition.x);
    const y = this.toScreenY(state, worldPosition.y);
    const radius = meteor.radius * viewScale;
    const alpha = active ? 0.86 : 0.12 + pulse * 0.18;

    if (active) {
      const trailLength = radius * (meteor.size === 'medium' ? 8.8 : 7.2);
      const trailWidth = Math.max(2.4, radius * 0.82);
      const tail = {
        x: x - event.direction.x * trailLength,
        y: y - event.direction.y * trailLength
      };
      const midTail = {
        x: x - event.direction.x * trailLength * 0.52,
        y: y - event.direction.y * trailLength * 0.52
      };

      this.graphics.lineStyle(trailWidth * 2.25, 0xff2a12, 0.16);
      this.graphics.lineBetween(tail.x, tail.y, x, y);
      this.graphics.lineStyle(trailWidth * 1.45, 0xff5f1f, 0.34);
      this.graphics.lineBetween(
        x - event.direction.x * trailLength * 0.8,
        y - event.direction.y * trailLength * 0.8,
        x,
        y
      );
      this.graphics.lineStyle(trailWidth * 0.82, 0xffb13b, 0.54);
      this.graphics.lineBetween(midTail.x, midTail.y, x, y);
      this.graphics.lineStyle(Math.max(1, trailWidth * 0.38), 0xfff1a8, 0.68);
      this.graphics.lineBetween(
        x - event.direction.x * trailLength * 0.32,
        y - event.direction.y * trailLength * 0.32,
        x,
        y
      );
      this.graphics.fillStyle(0xff3f1f, 0.18);
      this.graphics.fillCircle(midTail.x, midTail.y, radius * 0.92);
      this.graphics.fillStyle(0xff8a24, 0.28);
      this.graphics.fillCircle(
        x - event.direction.x * radius * 1.05,
        y - event.direction.y * radius * 1.05,
        radius * 0.72
      );
    }

    const pointCount = meteor.size === 'medium' ? 8 : 6;
    const rotation = meteor.rotation + event.age * meteor.rotationSpeed;
    const fillColor = meteor.size === 'medium' ? 0x7a5648 : 0x9a735a;
    const strokeColor = active ? 0xffc16a : 0xffd36a;
    this.graphics.fillStyle(fillColor, active ? 0.86 : alpha * 0.52);
    this.graphics.beginPath();
    for (let index = 0; index < pointCount; index += 1) {
      const angle = rotation + (index / pointCount) * Math.PI * 2;
      const pointRadius = radius * (0.78 + ((index * 37 + meteor.idSeed) % 5) * 0.08);
      const point = {
        x: x + Math.cos(angle) * pointRadius,
        y: y + Math.sin(angle) * pointRadius
      };
      if (index === 0) {
        this.graphics.moveTo(point.x, point.y);
      } else {
        this.graphics.lineTo(point.x, point.y);
      }
    }
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(active ? 2 : 1, strokeColor, active ? 0.76 : alpha);
    this.graphics.strokePath();

    if (active) {
      this.graphics.fillStyle(0xfff1a8, 0.54);
      this.graphics.fillCircle(
        x + event.direction.x * radius * 0.32,
        y + event.direction.y * radius * 0.32,
        Math.max(1.2, radius * 0.2)
      );
      this.graphics.lineStyle(Math.max(1, radius * 0.22), 0xff8a24, 0.38);
      this.graphics.strokeCircle(x, y, radius * 1.18);
    }
  }

  private drawProximityMine(state: GameState, hazard: SurvivalHazardState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, hazard.position.x);
    const y = this.toScreenY(state, hazard.position.y);
    const radius = balance.survival.mines.visualRadius * viewScale;
    const areaRadius = hazard.radius * viewScale;
    const fuseRatio = hazard.fuseFor > 0
      ? 1 - Math.max(0, Math.min(1, hazard.fuseFor / balance.survival.mines.fuseSeconds))
      : 1;
    const blinkSpeed = 4 + fuseRatio * 16;
    const blinkPhase = 0.5 + Math.sin((hazard.age + hazard.id * 0.17) * blinkSpeed) * 0.5;
    const smoothBlink = blinkPhase * blinkPhase * (3 - 2 * blinkPhase);
    const red = 255;
    const green = Math.round(24 + smoothBlink * 226);
    const blue = Math.round(46 + smoothBlink * 209);
    const color = (red << 16) | (green << 8) | blue;

    this.graphics.fillStyle(0xff1f38, 0.04 + fuseRatio * 0.05);
    this.graphics.fillCircle(x, y, areaRadius);
    this.graphics.lineStyle(1, color, 0.2 + smoothBlink * 0.24);
    this.graphics.strokeCircle(x, y, areaRadius);
    this.graphics.fillStyle(color, 0.64 + smoothBlink * 0.32);
    this.graphics.fillCircle(x, y, radius);
    this.graphics.fillStyle(0xffffff, 0.08 + smoothBlink * 0.68);
    this.graphics.fillCircle(x, y, radius * (0.34 + smoothBlink * 0.3));
  }

  private drawSurvivalHunter(state: GameState, hazard: SurvivalHazardState): void {
    const viewScale = this.getViewScale(state);
    const x = this.toScreenX(state, hazard.position.x);
    const y = this.toScreenY(state, hazard.position.y);
    const radius = hazard.radius * viewScale;
    const angle = Math.atan2(hazard.velocity.y, hazard.velocity.x);
    const nose = {
      x: x + Math.cos(angle) * radius * 1.35,
      y: y + Math.sin(angle) * radius * 1.35
    };
    const left = {
      x: x + Math.cos(angle + 2.42) * radius,
      y: y + Math.sin(angle + 2.42) * radius
    };
    const right = {
      x: x + Math.cos(angle - 2.42) * radius,
      y: y + Math.sin(angle - 2.42) * radius
    };
    const tail = {
      x: x - Math.cos(angle) * radius * 0.25,
      y: y - Math.sin(angle) * radius * 0.25
    };
    const pulse = 0.5 + Math.sin((hazard.age + hazard.id * 0.11) * 8) * 0.5;

    this.drawHunterTrail(state, hazard, viewScale);
    this.graphics.lineStyle(1, 0xffb8b8, 0.12 + pulse * 0.18);
    this.graphics.strokeCircle(x, y, radius * (1.2 + pulse * 0.22));
    this.graphics.fillStyle(0xff1f38, 0.3);
    this.graphics.beginPath();
    this.graphics.moveTo(nose.x, nose.y);
    this.graphics.lineTo(left.x, left.y);
    this.graphics.lineTo(tail.x, tail.y);
    this.graphics.lineTo(right.x, right.y);
    this.graphics.closePath();
    this.graphics.fillPath();
    this.graphics.lineStyle(2, 0xff2446, 0.96);
    this.graphics.strokePath();
    this.graphics.fillStyle(0xfff1f1, 0.92);
    this.graphics.fillCircle(nose.x, nose.y, Math.max(1.5, radius * 0.16));
  }

  private drawHunterTrail(state: GameState, hazard: SurvivalHazardState, viewScale: number): void {
    if (hazard.trail.length < 2) {
      return;
    }

    for (let index = 1; index < hazard.trail.length; index += 1) {
      const previous = hazard.trail[index - 1];
      const current = hazard.trail[index];
      const alpha = index / hazard.trail.length;
      this.graphics.lineStyle(Math.max(1, 4.4 * viewScale * alpha), 0xff2446, 0.05 + alpha * 0.32);
      this.graphics.lineBetween(
        this.toScreenX(state, previous.x),
        this.toScreenY(state, previous.y),
        this.toScreenX(state, current.x),
        this.toScreenY(state, current.y)
      );
    }
  }

  private drawArcSegments(x: number, y: number, radius: number, startAngle: number, arcLength: number, segments: number): void {
    if (arcLength <= 0) {
      return;
    }

    const segmentCount = Math.max(1, Math.ceil(segments * (arcLength / (Math.PI * 2))));
    for (let index = 0; index < segmentCount; index += 1) {
      const segmentStart = startAngle + (index / segmentCount) * arcLength;
      const segmentEnd = startAngle + ((index + 0.58) / segmentCount) * arcLength;
      this.graphics.beginPath();
      this.graphics.arc(x, y, radius, segmentStart, Math.min(startAngle + arcLength, segmentEnd));
      this.graphics.strokePath();
    }
  }

  private toScreenX(state: GameState, worldX: number): number {
    return (worldX - state.camera.x) * this.getViewScale(state) + state.width / 2;
  }

  private toScreenY(state: GameState, worldY: number): number {
    return (worldY - state.camera.y) * this.getViewScale(state) + state.height / 2;
  }

  private getViewScale(state: GameState): number {
    return state.width <= 720 ? 0.78 : 1;
  }

  private isCircleOnScreen(state: GameState, worldX: number, worldY: number, radius: number): boolean {
    const viewScale = this.getViewScale(state);
    const screenX = this.toScreenX(state, worldX);
    const screenY = this.toScreenY(state, worldY);
    const scaledRadius = radius * viewScale;
    return screenX + scaledRadius >= 0 && screenX - scaledRadius <= state.width && screenY + scaledRadius >= 0 && screenY - scaledRadius <= state.height;
  }
}
