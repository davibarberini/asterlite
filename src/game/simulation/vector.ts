import type { Vec2 } from './types';

export const length = (v: Vec2): number => Math.hypot(v.x, v.y);

export const normalize = (v: Vec2): Vec2 => {
  const len = length(v);
  return len === 0 ? { x: 0, y: 0 } : { x: v.x / len, y: v.y / len };
};

export const distance = (a: Vec2, b: Vec2): number => Math.hypot(a.x - b.x, a.y - b.y);

export const clampMagnitude = (v: Vec2, max: number): Vec2 => {
  const len = length(v);
  if (len <= max || len === 0) {
    return v;
  }
  const scale = max / len;
  return { x: v.x * scale, y: v.y * scale };
};

export const wrapPosition = (position: Vec2, width: number, height: number, margin = 32): Vec2 => {
  let { x, y } = position;
  if (x < -margin) x = width + margin;
  if (x > width + margin) x = -margin;
  if (y < -margin) y = height + margin;
  if (y > height + margin) y = -margin;
  return { x, y };
};

export const randomRange = (min: number, max: number): number => min + Math.random() * (max - min);
