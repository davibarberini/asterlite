import { Coins, Gem, Heart, Settings2, Menu, X, Navigation, Map, Orbit, Rocket, Trophy, createElement, type IconNode } from 'lucide';

const icons: Record<string, IconNode> = { coins: Coins, gem: Gem, heart: Heart, settings: Settings2, menu: Menu, close: X, route: Navigation, map: Map };

export const createDockIcon = (tab: string): SVGSVGElement => {
  const dockIcons: Record<string, IconNode> = { map: Map, warp: Orbit, hangar: Rocket, achievements: Trophy };
  return createElement(dockIcons[tab] ?? Rocket, { class: 'nav-button__icon', width: 24, height: 24, 'stroke-width': 1.7, 'aria-hidden': 'true', focusable: 'false' }) as SVGSVGElement;
};

export const mountUiIcons = (): void => {
  document.querySelectorAll<HTMLElement>('[data-ui-icon]').forEach((element) => {
    const icon = icons[element.dataset.uiIcon ?? ''];
    if (!icon) return;
    element.replaceChildren(createElement(icon, { width: 20, height: 20, 'stroke-width': 1.7, 'aria-hidden': 'true', focusable: 'false' }));
  });
};
