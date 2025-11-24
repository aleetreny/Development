export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  acc: Vector2; // Stored acceleration for Velocity Verlet integrator
  history: Vector2[];
  color: string;
}

export interface SimulationConfig {
  gridSpacing: number;
  baseMass: number;
  lensingRadius: number;
  trailLength: number;
}