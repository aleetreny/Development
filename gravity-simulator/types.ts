export interface Vector2 {
  x: number;
  y: number;
}

export interface Particle {
  id: number;
  pos: Vector2;
  vel: Vector2;
  history: Vector2[];
  color: string;
}

export interface SimulationConfig {
  gridSpacing: number;
  baseMass: number;
  lensingRadius: number;
  trailLength: number;
}