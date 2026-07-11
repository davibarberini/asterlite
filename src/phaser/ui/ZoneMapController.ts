import { zones } from '../../game/simulation/zones';

type ZoneMapRenderState = {
  currentZoneIndex: number;
  unlockedZoneIndex: number;
  onTravel: (zoneIndex: number) => void;
};

export class ZoneMapController {
  render(state: ZoneMapRenderState): HTMLElement {
    const map = document.createElement('div');
    map.className = 'zone-map';

    const lines = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    lines.setAttribute('class', 'zone-map-lines');
    lines.setAttribute('viewBox', '0 0 100 100');
    lines.setAttribute('preserveAspectRatio', 'none');

    const mapPoints = zones.map((zone, index) => ({
      zone,
      x: [50, 39, 57, 43, 55][index] ?? 50,
      y: zones.length <= 1 ? 50 : 10 + (index / (zones.length - 1)) * 80
    }));

    zones.slice(1).forEach((zone, index) => {
      const previous = mapPoints[index];
      const current = mapPoints[index + 1];
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', previous.x.toString());
      line.setAttribute('y1', previous.y.toString());
      line.setAttribute('x2', current.x.toString());
      line.setAttribute('y2', current.y.toString());
      line.setAttribute('class', zone.index <= state.unlockedZoneIndex ? 'zone-map-line is-unlocked' : 'zone-map-line');
      lines.append(line);
    });

    const nodes = document.createElement('div');
    nodes.className = 'zone-map-nodes';
    const tutorialZoneIndex = state.unlockedZoneIndex > state.currentZoneIndex
      ? state.currentZoneIndex + 1
      : null;
    mapPoints.forEach(({ zone, x, y }) => {
      const unlocked = zone.index <= state.unlockedZoneIndex;
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'zone-node';
      node.classList.toggle('is-current', zone.index === state.currentZoneIndex);
      node.classList.toggle('is-unlocked', unlocked);
      node.classList.toggle('is-locked', !unlocked);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.setProperty('--zone-accent', zone.identity.accent);
      node.disabled = !unlocked;
      let travelRequested = false;
      const requestTravel = (event: Event): void => {
        event.preventDefault();
        event.stopPropagation();
        if (!unlocked || zone.index === state.currentZoneIndex || travelRequested) {
          return;
        }
        travelRequested = true;
        state.onTravel(zone.index);
      };
      node.addEventListener('click', requestTravel);
      node.addEventListener('pointerup', requestTravel);
      node.setAttribute('aria-label', unlocked ? `Travel to ${zone.name}` : `${zone.name} locked`);
      if (zone.index === tutorialZoneIndex) {
        node.dataset.tutorialTarget = 'zone-node-unlocked';
      }

      const icon = document.createElement('span');
      icon.className = 'zone-node__icon';
      icon.textContent = zone.index === state.currentZoneIndex ? '◆' : '➤';
      const label = document.createElement('strong');
      label.textContent = zone.name;
      const text = document.createElement('span');
      text.className = 'zone-node__text';
      const meta = document.createElement('small');
      meta.className = 'zone-node__meta';
      meta.textContent = `${zone.identity.callsign} · ${zone.identity.variantFocus}`;
      text.append(label, meta);
      node.append(icon, text);
      nodes.append(node);
    });

    map.append(lines, nodes);
    return map;
  }
}
