// Hand outline adapted from Tabler Icons "hand-stop" (MIT License).
// Source: https://github.com/tabler/tabler-icons/blob/main/icons/outline/hand-stop.svg
// Copyright (c) 2020-2024 Paweł Kuna

export const NIVITRON_HAND_TEXTURE_KEY = 'nivitron-hand-tabler';
export const NIVITRON_HAND_VIEWBOX = '0 0 24 24';
export const NIVITRON_HAND_GAME_SIZE = 42;
export const NIVITRON_HAND_DIAMOND_RADIUS = 6.4;
export const NIVITRON_HAND_ORIGIN = { x: 0.5, y: 0.6 };
export const NIVITRON_HAND_DIAMOND_CENTER = { x: 12, y: 14.4 };
export const NIVITRON_HAND_STROKE_WIDTH = 1.15;

export const NIVITRON_HAND_PATHS = [
  'M8 13v-7.5a1.5 1.5 0 0 1 3 0v6.5',
  'M11 5.5v-2a1.5 1.5 0 1 1 3 0v8.5',
  'M14 5.5a1.5 1.5 0 0 1 3 0v6.5',
  'M17 7.5a1.5 1.5 0 0 1 3 0v8.5a6 6 0 0 1 -6 6h-2h.208a6 6 0 0 1 -5.012 -2.7a69.74 69.74 0 0 1 -.196 -.3c-.312 -.479 -1.407 -2.388 -3.286 -5.728a1.5 1.5 0 0 1 .536 -2.022a1.867 1.867 0 0 1 2.28 .28l1.47 1.47'
];

export const createNivitronHandSvg = (strokeColor = '#9af5e3'): string => `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="${NIVITRON_HAND_VIEWBOX}" fill="none" stroke="${strokeColor}" stroke-width="${NIVITRON_HAND_STROKE_WIDTH}" stroke-linecap="round" stroke-linejoin="round">
  ${NIVITRON_HAND_PATHS.map((path) => `<path d="${path}" />`).join('')}
</svg>`;

export const createNivitronHandDataUri = (strokeColor = '#9af5e3'): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(createNivitronHandSvg(strokeColor))}`;
