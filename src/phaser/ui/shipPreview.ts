import type { ShipFrameId } from '../../game/simulation/types';
import { SHIP_FRAME_BY_ID } from '../../game/progression/shipFrames';
import { NIVITRON_HAND_DIAMOND_CENTER, NIVITRON_HAND_PATHS, NIVITRON_HAND_VIEWBOX } from '../view/nivitronHandShape';

export const createShipFramePreview =(id: ShipFrameId): Element => {
    const frame = SHIP_FRAME_BY_ID[id];
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('ship-frame-preview');
    svg.setAttribute('viewBox', id === 'nivitron' ? NIVITRON_HAND_VIEWBOX : '-26 -24 52 48');
    svg.setAttribute('aria-hidden', 'true');

    if (id === 'nivitron') {
      const handPaths = NIVITRON_HAND_PATHS.map((pathData) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathData);
        path.setAttribute('class', 'ship-frame-preview__hull ship-frame-preview__hull--nivitron');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        return path;
      });

      const diamond = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      diamond.setAttribute(
        'points',
        `${NIVITRON_HAND_DIAMOND_CENTER.x},${NIVITRON_HAND_DIAMOND_CENTER.y - 2.8} ${NIVITRON_HAND_DIAMOND_CENTER.x + 2.8},${NIVITRON_HAND_DIAMOND_CENTER.y} ${NIVITRON_HAND_DIAMOND_CENTER.x},${NIVITRON_HAND_DIAMOND_CENTER.y + 2.8} ${NIVITRON_HAND_DIAMOND_CENTER.x - 2.8},${NIVITRON_HAND_DIAMOND_CENTER.y}`
      );
      diamond.setAttribute('class', 'ship-frame-preview__core');
      svg.append(...handPaths, diamond);
      return svg;
    }

    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', frame.shape.map((point) => `${point.x},${point.y}`).join(' '));
    polygon.setAttribute('class', 'ship-frame-preview__hull');

    const core = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    core.setAttribute('cx', '0');
    core.setAttribute('cy', '0');
    core.setAttribute('r', '4');
    core.setAttribute('class', 'ship-frame-preview__core');

    svg.append(polygon, core);
    return svg;
  };

