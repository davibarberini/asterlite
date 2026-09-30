import { ArrowRight, Check, LockKeyhole, Rocket, Cpu, createElement } from 'lucide';
import type { GameState, ShipFrameId } from '../../game/simulation/types';
import { SHIP_FRAME_BY_ID, SHIP_FRAME_DEFINITIONS } from '../../game/progression/shipFrames';
import { SHIP_UNLOCK_DEFINITIONS, getShipUnlockProgressLabel } from '../../game/progression/shipUnlocks';
import { zones } from '../../game/simulation/zones';
import type { LanguageCode } from '../../game/i18n';
import { getAvailableWarpCores } from '../../game/progression/warpUnlocks';
import { createShipFramePreview } from './shipPreview';

const traits: Record<ShipFrameId, [string, string]> = {
  vector: ['Impulso extra depois do dash', 'Extra boost after dashing'],
  kestrel: ['Dispara durante o dash', 'Fires while dashing'],
  bulwark: ['Impactos que destroem asteroides', 'Asteroid-smashing impacts'],
  needle: ['Tiros perfurantes', 'Piercing shots'],
  prism: ['Disparos em leque', 'Spread shots'],
  atlas: ['Casco reforçado', 'Reinforced hull'],
  ember: ['Ondas de chamas', 'Waves of fire'],
  voidRunner: ['Mobilidade elevada', 'High mobility'],
  wraith: ['Anula um impacto e recarrega', 'Negates a hit, then recharges'],
  aurora: ['Dano e mobilidade', 'Damage and mobility'],
  nivitron: ['Disparos em rotação', 'Rotating fire'],
  hisoka: ['Tiros que ricocheteiam', 'Ricocheting shots']
};

export const renderRunMenu = (options: {
  state: GameState;
  language: LanguageCode;
  selected: ShipFrameId;
  showSummary: boolean;
  onContinue: () => void;
  onSelect: (id: ShipFrameId) => void;
  onStart: () => void;
  onTechnologies: () => void;
}): HTMLElement => {
  const { state, language } = options;
  const pt = language === 'pt-BR';
  const content = document.createElement('div');
  content.className = 'run-menu';
  const button = (label: string, action: () => void, primary = false): HTMLButtonElement => {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `run-menu__button${primary ? ' run-menu__button--primary' : ''}`;
    el.textContent = label;
    el.addEventListener('click', action);
    return el;
  };
  const icon = (node: typeof Rocket): SVGElement => createElement(node, { width: 20, height: 20, 'aria-hidden': 'true' });

  if (options.showSummary) {
    const heading = document.createElement('div');
    heading.className = 'run-result__hero';
    heading.append(createShipFramePreview(state.progression.activeShipFrameId));
    const time = document.createElement('strong');
    const seconds = Math.floor(state.run.elapsedSeconds);
    time.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    const location = document.createElement('span');
    location.textContent = `${SHIP_FRAME_BY_ID[state.progression.activeShipFrameId].name} · ${zones[state.progression.currentZoneIndex].name}`;
    heading.append(time, location);
    const facts = document.createElement('dl');
    facts.className = 'run-result__facts';
    for (const [label, value] of [
      [pt ? 'Nível' : 'Level', state.progression.shipLevel],
      [pt ? 'Asteroides' : 'Asteroids', state.run.asteroidsDestroyed],
      ...(state.survival.active ? [['Threat', state.survival.threatLevel]] : []),
      [pt ? 'Núcleos ganhos' : 'Cores earned', `+${state.run.coresEarned}`]
    ]) {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = String(label);
      detail.textContent = String(value);
      row.append(term, detail);
      facts.append(row);
    }
    const next = button(pt ? 'Continuar' : 'Continue', options.onContinue, true);
    next.append(icon(ArrowRight));
    content.append(heading, facts, next);
    return content;
  }

  const detail = document.createElement('div');
  detail.className = 'run-menu__ship-detail';
  detail.setAttribute('aria-live', 'polite');
  const grid = document.createElement('div');
  grid.className = 'run-menu__ships';
  grid.setAttribute('role', 'group');
  grid.setAttribute('aria-label', pt ? 'Naves' : 'Ships');
  const start = button('', options.onStart, true);
  const updateDetail = (id: ShipFrameId): void => {
    const unlocked = state.progression.unlockedShipFrameIds.includes(id);
    grid.querySelectorAll<HTMLButtonElement>('button').forEach((tile) => {
      tile.setAttribute('aria-pressed', String(tile.dataset.ship === id));
    });
    const title = document.createElement('strong');
    title.textContent = SHIP_FRAME_BY_ID[id].name;
    const description = document.createElement('span');
    description.textContent = unlocked ? traits[id][pt ? 0 : 1]
      : `${SHIP_UNLOCK_DEFINITIONS.find((item) => item.id === id)?.getDescription(language) ?? ''} · ${getShipUnlockProgressLabel(state.progression, id)}`;
    detail.replaceChildren(title, description);
    start.disabled = !unlocked;
    start.textContent = unlocked ? `${pt ? 'Jogar com' : 'Launch'} ${SHIP_FRAME_BY_ID[id].name}` : (pt ? 'Nave bloqueada' : 'Ship locked');
    start.append(icon(unlocked ? Rocket : LockKeyhole));
    if (unlocked) options.onSelect(id);
  };
  const frames = [...SHIP_FRAME_DEFINITIONS].sort((a, b) => Number(state.progression.unlockedShipFrameIds.includes(b.id)) - Number(state.progression.unlockedShipFrameIds.includes(a.id)));
  for (const frame of frames) {
    const unlocked = state.progression.unlockedShipFrameIds.includes(frame.id);
    const tile = button('', () => updateDetail(frame.id));
    tile.className = `run-menu__ship${unlocked ? '' : ' is-locked'}`;
    tile.dataset.ship = frame.id;
    tile.setAttribute('aria-label', `${frame.name}${unlocked ? '' : (pt ? ', bloqueada' : ', locked')}`);
    const name = document.createElement('span');
    name.textContent = frame.name;
    const badge = icon(unlocked ? Check : LockKeyhole);
    badge.classList.add('run-menu__ship-badge');
    tile.append(createShipFramePreview(frame.id), name, badge);
    grid.append(tile);
  }
  updateDetail(options.selected);
  const footer = document.createElement('div');
  footer.className = 'run-menu__footer';
  const tech = button(pt ? 'Tecnologias' : 'Technologies', options.onTechnologies);
  tech.prepend(icon(Cpu));
  const cores = document.createElement('span');
  cores.className = 'run-menu__cores';
  cores.textContent = `${getAvailableWarpCores(state.progression)} ${pt ? 'núcleos' : 'cores'}`;
  footer.append(start, tech, cores);
  content.append(detail, grid, footer);
  return content;
};
