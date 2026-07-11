export type InputActions = {
  rotateLeft: boolean;
  rotateRight: boolean;
  thrust: boolean;
  brake: boolean;
  fire: boolean;
  aimDirection: { x: number; y: number } | null;
  pointerTarget: { x: number; y: number } | null;
  slingshotVector: { x: number; y: number } | null;
};

export const neutralInput = (): InputActions => ({
  rotateLeft: false,
  rotateRight: false,
  thrust: false,
  brake: false,
  fire: false,
  aimDirection: null,
  pointerTarget: null,
  slingshotVector: null
});
