export interface RetroPlanetParams {
  planetType: string;
  atmosphereColor: string;
  surfaceFeature: string;
  liquidType: string;
  civilizationLevel: string;
  dominantLifeForm: string;
  skyFeature: string;
  weatherCondition: string;
  dangerLevel: string;
  weirdFeature: string;
}

export interface GeneratedPlanet {
  imageUrl: string;
  lore: PlanetLore;
}

export interface PlanetLore {
  name: string;
  designation: string;
  description: string;
  history: string;
  inhabitants: string;
  resources: string[];
}

export const DEFAULT_PARAMS: RetroPlanetParams = {
  planetType: "Gas Giant",
  atmosphereColor: "Toxic Green",
  surfaceFeature: "Floating Islands",
  liquidType: "Acid Oceans",
  civilizationLevel: "Fallen Empire",
  dominantLifeForm: "Cybernetic Insects",
  skyFeature: "Binary Sun",
  weatherCondition: "Perpetual Storm",
  dangerLevel: "Nightmare",
  weirdFeature: "Giant Floating Skulls"
};
