import React, { useState } from 'react';
import { Controls } from './components/Controls';
import { PlanetPreview } from './components/PlanetPreview';
import { generateRetroPlanetLore } from './services/geminiService';
import { RetroPlanetParams, PlanetLore, DEFAULT_PARAMS } from './types';

export default function App() {
  const [params, setParams] = useState<RetroPlanetParams>(DEFAULT_PARAMS);
  const [lore, setLore] = useState<PlanetLore | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setLore(null); // Clear previous lore while loading
    try {
      // Image is generated locally in PlanetPreview via Canvas
      // We only fetch the Lore from AI
      const loreData = await generateRetroPlanetLore(params);
      setLore(loreData);
    } catch (e) {
      console.error("Failed to generate system:", e);
      alert("CRITICAL FAILURE: AI Core Unresponsive.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020000] p-4 md:p-8 font-mono crt-flicker selection:bg-[#ff3333] selection:text-black">
      <div className="max-w-7xl mx-auto h-[90vh] grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Header (Mobile only) */}
        <div className="lg:hidden col-span-1 mb-4">
           <h1 className="text-2xl font-pixel text-[#ff3333] text-center animate-pulse">RED-SHIFT</h1>
        </div>

        {/* Left Column: Controls */}
        <div className="lg:col-span-3 h-full flex flex-col">
          <div className="hidden lg:block mb-4 border-b-4 border-[#ff3333] pb-2">
             <h1 className="text-2xl font-pixel text-[#ff3333] leading-none tracking-tighter">RED-SHIFT<br/>ARCHITECT</h1>
             <span className="text-[10px] text-[#ff3333] opacity-70">SYS.VER.666</span>
          </div>
          <Controls 
            params={params}
            setParams={setParams}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
          />
        </div>

        {/* Right Column: Output */}
        <div className="lg:col-span-9 h-full">
          <PlanetPreview 
            lore={lore}
            params={params}
            isGenerating={isGenerating}
          />
        </div>

      </div>
    </div>
  );
}