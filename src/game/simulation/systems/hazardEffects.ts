import type { GameState } from '../types';
import { balance } from '../../balance';

export const getHazardParticleSpread = (hazard: GameState['hazards'][number]): number =>
  hazard.kind === 'proximityMine' ? balance.survival.mines.explosionParticleSpread * 0.52 : hazard.radius * 6;

export const getHazardExplosionSpread = (hazard: GameState['hazards'][number]): number =>
  hazard.kind === 'proximityMine' ? balance.survival.mines.explosionParticleSpread : hazard.radius * 9;
