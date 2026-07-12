/**
 * Shared primitives for reading untrusted saved-game JSON.
 *
 * These helpers are intentionally tiny and dependency-free so domain-specific
 * save readers can share the same defensive parsing rules without importing
 * the large `saveData` module (which would create import cycles).
 */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export const readNumber = (value: unknown, fallback: number): number =>
  isFiniteNumber(value) ? value : fallback;

export const readNonNegativeNumber = (value: unknown, fallback: number): number =>
  Math.max(0, readNumber(value, fallback));
