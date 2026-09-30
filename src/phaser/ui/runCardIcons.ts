import { Crosshair, Timer, Heart, Copy, MoveRight, Expand, TriangleAlert, Zap, Anchor, Shield, Shuffle, Flame, GitFork, Sparkles, Radar, Orbit, Shell, Rocket, createElement, type IconNode } from 'lucide';
import type { RunCardId } from '../../game/simulation/types';

export const RUN_CARD_ICONS: Record<RunCardId, IconNode> = {
  kineticAmplifier: Crosshair,
  rapidCycler: Timer,
  reinforcedHull: Heart,
  splitChamber: Copy,
  piercingCore: MoveRight,
  expandedCaliber: Expand,
  thorns: TriangleAlert,
  impulseVector: Zap,
  inertialArmor: Anchor,
  emergencyBarrier: Shield,
  unstableRicochet: Shuffle,
  incendiaryCharge: Flame,
  fragmentationChamber: GitFork,
  criticalReactor: Sparkles,
  huntingRadar: Radar,
  sentryWing: Orbit,
  rangerWing: Shell,
  breakerWing: Rocket
};

export const createRunCardIcon = (id: RunCardId): SVGElement =>
  createElement(RUN_CARD_ICONS[id], { width: 28, height: 28, 'stroke-width': 1.7, 'aria-hidden': 'true' });
