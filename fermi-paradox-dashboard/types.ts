export interface SimulationParams {
  // Astrophysical
  R_star: number; // Star formation rate
  f_p: number;    // Fraction of stars with planets
  n_e: number;    // Planets capable of sustaining life

  // Biological
  f_l: number;    // Fraction where life actually evolves
  f_i: number;    // Fraction where intelligence evolves
  f_c: number;    // Fraction that develops communication (Restored)

  // Sociological
  L: number;      // Longevity (Base)
  C_f: number;    // Catastrophe Factor
}

export interface SimulationResults {
  N_active: number;
  N_ruins: number;
  avgDistance: number;
  R_civ: number; // Civilizations born per year
  effectiveL: number;
}

export interface StrategicMetrics {
  effectiveL: string; // Replaced Kardashev
  contactProbability: string; // Percentage
  radioHorizon: string; // % of Galaxy Covered
  signalStrength: string;
}