import { GALAXY_AGE, GALAXY_AREA_LY } from './constants';
import { SimulationParams, SimulationResults, StrategicMetrics } from './types';

export const calculateResults = (params: SimulationParams): SimulationResults => {
  // L_eff = L / (1 + L * C_f)
  const effectiveL = Math.floor(params.L / (1 + (params.L * params.C_f * 10))); 

  // Added params.f_c to the calculation
  const R_civ = params.R_star * params.f_p * params.n_e * params.f_l * params.f_i * params.f_c;
  
  const N_active = Math.floor(R_civ * effectiveL);
  const N_total_history = Math.floor(R_civ * GALAXY_AGE);

  let N_ruins = N_total_history - N_active;
  if (N_ruins < 0) N_ruins = 0;

  let avgDistance = 0;
  if (N_active > 0) {
    avgDistance = Math.sqrt(GALAXY_AREA_LY / N_active);
  }

  return {
    N_active,
    N_ruins,
    avgDistance,
    R_civ,
    effectiveL
  };
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000000) return (num / 1000000000).toFixed(2) + "B";
  if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "k";
  return Math.floor(num).toString();
};

export const calculateStrategicMetrics = (results: SimulationResults, params: SimulationParams): StrategicMetrics => {
    // 1. Effective L (Formatted)
    const effLFormatted = formatNumber(results.effectiveL) + " YRS";

    // 2. Radio Horizon (How much of the galaxy have we covered?)
    const signalArea = Math.PI * Math.pow(results.effectiveL, 2);
    const coverageRatio = (signalArea / GALAXY_AREA_LY) * 100;
    let coverageStr = coverageRatio < 0.0001 ? "< 0.0001%" : coverageRatio.toFixed(4) + "%";
    if (coverageRatio > 100) coverageStr = "100% (SATURATION)";

    // 3. Contact Probability in next 100 years
    let prob = (results.N_active / 50000) * 100; 
    if (prob > 99.9) prob = 99.9;
    if (prob < 0.0001) prob = 0.0001;

    // 4. Signal Strength
    let sig = "WEAK / BACKGROUND NOISE";
    if (results.N_active > 10000) sig = "DETECTABLE";
    if (results.N_active > 1000000) sig = "OMNIPRESENT";

    return {
        effectiveL: effLFormatted,
        contactProbability: `${prob.toFixed(3)}%`,
        radioHorizon: coverageStr,
        signalStrength: sig
    };
}


export interface Scenario {
  title: string;
  description: string;
  color: string;
}

export const analyzeScenario = (params: SimulationParams, results: SimulationResults): Scenario => {
  return {
    title: "STATUS: UNCERTAIN",
    description: "Calculating projections...",
    color: "#00FF00"
  };
};