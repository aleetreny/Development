import { SimulationParams } from './types';

// Galaxy Constants
export const GALAXY_AGE = 10_000_000_000; // 10 Billion Years
export const GALAXY_AREA_LY = 7_850_000_000; // Approx Area of Galactic Disc
export const MAX_RENDER_COUNT = 4000; // High density for HD Retro feel
// Theoretical max N based on max slider values for scaling calculations
export const THEORETICAL_MAX_N = 50_000_000; 

export const INITIAL_PARAMS: SimulationParams = {
  R_star: 2,
  f_p: 0.5,
  n_e: 1,
  f_l: 0.1,
  f_i: 0.1,
  f_c: 0.1,
  L: 10000,
  C_f: 0.0001
};

export const PARAM_DEFINITIONS = {
  R_star: {
    label: "STAR FORMATION RATE (R*)",
    min: 1,
    max: 10,
    step: 0.5,
    desc: "New stars born per year. The basic 'fuel' of the universe."
  },
  f_p: {
    label: "FRACTION WITH PLANETS (f_p)",
    min: 0,
    max: 1,
    step: 0.05,
    desc: "Percentage of stars that have planetary systems."
  },
  n_e: {
    label: "HABITABLE PLANETS (n_e)",
    min: 0.1,
    max: 5,
    step: 0.1,
    desc: "Average number of worlds capable of sustaining life (liquid water) per system."
  },
  f_l: {
    label: "ORIGIN OF LIFE (f_l)",
    min: 0,
    max: 1,
    step: 0.01,
    desc: "Probability that simple biology spontaneously emerges on a habitable world."
  },
  f_i: {
    label: "INTELLIGENCE EVOLUTION (f_i)",
    min: 0,
    max: 1,
    step: 0.01,
    desc: "Probability of evolving from simple cells to complex, intelligent tool-users."
  },
  f_c: {
    label: "COMMUNICATION TECH (f_c)",
    min: 0,
    max: 1,
    step: 0.01,
    desc: "Fraction of intelligent species that develop technologies detectable from space (Radio/Lasers)."
  },
  L: {
    label: "CIVILIZATION LIFESPAN (L)",
    min: 100,
    max: 1000000,
    step: 100,
    desc: "Years a civilization remains detectable before extinction or transcendence."
  },
  C_f: {
    label: "EXTINCTION FACTOR",
    min: 0,
    max: 0.01,
    step: 0.0001,
    desc: "Annual risk of total collapse (AI, Nuclear War, Asteroids)."
  }
};