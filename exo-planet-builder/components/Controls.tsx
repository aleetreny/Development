import React from 'react';
import { RetroPlanetParams } from '../types';
import { Terminal, Cpu, Dna } from 'lucide-react';

interface ControlsProps {
  params: RetroPlanetParams;
  setParams: React.Dispatch<React.SetStateAction<RetroPlanetParams>>;
  onGenerate: () => void;
  isGenerating: boolean;
}

const PARAM_OPTIONS: Record<keyof RetroPlanetParams, string[]> = {
  planetType: ["Terrestrial", "Gas Giant", "Ice World", "Lava World", "Artificial Construct", "Shattered World", "Living Organism"],
  atmosphereColor: ["Toxic Green", "Deep Blue", "Plasma Red", "Void Black", "Neon Pink", "Sulfur Yellow", "No Atmosphere"],
  surfaceFeature: ["Jagged Mountains", "Endless Deserts", "Fungal Forests", "Crystal Spires", "Bio-Mechanical Flesh", "Metallic Cities", "Obsidian Plains"],
  liquidType: ["Water", "Molten Lava", "Liquid Methane", "Acid", "Mercury", "Blood", "None"],
  civilizationLevel: ["Stone Age", "Industrial", "Cyberpunk", "Post-Singularity", "Extinct", "Hive Mind", "Cosmic Horror"],
  dominantLifeForm: ["Humans", "Robots", "Insects", "Energy Beings", "Undead", "Plants", "Unknown"],
  skyFeature: ["Binary Sun", "Broken Moon", "Nebula", "Black Hole", "Space Station Ring", "Aurora", "Asteroid Field"],
  weatherCondition: ["Clear", "Acid Rain", "Solar Storms", "Ash Fall", "Blizzard", "Time Distortion", "Nanite Swarm"],
  dangerLevel: ["Safe", "Moderate", "Hazardous", "Deadly", "Nightmare", "Existential Threat"],
  weirdFeature: ["Giant Skeletons", "Floating Islands", "Glitch Effects", "Ancient Monoliths", "Eye of God", "Underwater Cities"]
};

export const Controls: React.FC<ControlsProps> = ({ 
  params, 
  setParams, 
  onGenerate, 
  isGenerating 
}) => {
  
  const handleChange = (key: keyof RetroPlanetParams, value: string) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  const randomize = () => {
    const newParams = { ...params };
    (Object.keys(PARAM_OPTIONS) as Array<keyof RetroPlanetParams>).forEach(key => {
        const options = PARAM_OPTIONS[key];
        newParams[key] = options[Math.floor(Math.random() * options.length)];
    });
    setParams(newParams);
  };

  return (
    <div className="bg-[#050000] border-2 border-[#ff3333] p-4 h-full overflow-y-auto flex flex-col shadow-[0_0_20px_rgba(255,51,51,0.2)]">
      <div className="flex items-center gap-2 mb-6 border-b-2 border-[#ff3333] pb-2">
        <Terminal size={24} className="text-[#ff3333]" />
        <h2 className="text-xl font-pixel text-[#ff3333]">PARAM_INPUT</h2>
      </div>

      <div className="space-y-4 font-mono text-sm">
        {Object.entries(PARAM_OPTIONS).map(([key, options]) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-[#ff3333] uppercase opacity-80 text-xs tracking-wider">
              {key.replace(/([A-Z])/g, ' $1').trim()}
            </label>
            <select
              value={params[key as keyof RetroPlanetParams]}
              onChange={(e) => handleChange(key as keyof RetroPlanetParams, e.target.value)}
              className="bg-[#1a0505] border border-[#ff3333] text-[#ff3333] p-2 focus:outline-none focus:ring-2 focus:ring-[#ff3333] hover:bg-[#2a0a0a]"
            >
              {options.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={randomize}
          className="w-full py-2 border border-[#ff3333] text-[#ff3333] hover:bg-[#ff3333] hover:text-black transition-colors font-pixel text-xs uppercase flex items-center justify-center gap-2"
        >
          <Dna size={14} />
          [ RND ] Mutation
        </button>
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="w-full py-4 bg-[#ff3333] text-black font-pixel text-sm uppercase hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-wait relative overflow-hidden group"
        >
            {isGenerating ? (
                <span className="animate-pulse">ANALYZING DATA...</span>
            ) : (
                <div className="flex items-center justify-center gap-2">
                    <Cpu size={16} />
                    <span>EXECUTE SIMULATION</span>
                </div>
            )}
        </button>
      </div>
    </div>
  );
};