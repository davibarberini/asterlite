import type { GameState, ParticleState, Vec2 } from '../types';
import { randomRange } from '../vector';

const MAX_PARTICLES = 150;

export const updateParticles = (state: GameState, dt: number): void => {
  state.particles = state.particles
    .map((particle) => ({
      ...particle,
      age: particle.age + dt,
      position: {
        x: particle.position.x + particle.velocity.x * dt,
        y: particle.position.y + particle.velocity.y * dt
      }
    }))
    .filter((particle) => particle.age < particle.ttl);
};

export const burstParticles = (state: GameState, position: Vec2, count: number, speed: number): void => {
  const availableSlots = Math.max(0, MAX_PARTICLES - state.particles.length);
  const particleCount = Math.min(count, availableSlots);
  for (let i = 0; i < particleCount; i += 1) {
    const angle = randomRange(0, Math.PI * 2);
    const particle: ParticleState = {
      id: state.nextId++,
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * randomRange(speed * 0.2, speed),
        y: Math.sin(angle) * randomRange(speed * 0.2, speed)
      },
      age: 0,
      ttl: randomRange(0.35, 0.85),
      size: randomRange(1, 2.7)
    };
    state.particles.push(particle);
  }
};
