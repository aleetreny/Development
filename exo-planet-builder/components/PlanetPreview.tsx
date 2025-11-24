import React, { useEffect, useRef } from 'react';
import { GeneratedPlanet, RetroPlanetParams } from '../types';
import { drawPlanet } from '../services/planetGenerator';
import { Download } from 'lucide-react';

interface PlanetPreviewProps {
  lore: GeneratedPlanet['lore'] | null;
  params: RetroPlanetParams;
  isGenerating: boolean;
}

export const PlanetPreview: React.FC<PlanetPreviewProps> = ({ lore, params, isGenerating }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Effect to draw the planet whenever params change
  useEffect(() => {
    if (canvasRef.current) {
        drawPlanet(canvasRef.current, params);
    }
  }, [params]); // Redraw when params change
  
  const handleDownload = () => {
      if (!canvasRef.current) return;
      const link = document.createElement('a');
      link.download = `redshift-planet-${Date.now()}.png`;
      link.href = canvasRef.current.toDataURL();
      link.click();
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Visual Monitor - Fixed height now, smaller */}
      <div className="relative h-[300px] md:h-[350px] shrink-0 bg-[#050000] border-4 border-[#330000] rounded-lg p-1 shadow-2xl">
         <div className="absolute top-0 left-0 w-full h-full border-[1px] border-[#ff3333] opacity-20 pointer-events-none z-20"></div>
         
         {/* Screen Content */}
         <div className="w-full h-full bg-[#0a0202] relative overflow-hidden flex items-center justify-center crt">
            
            {/* The Procedural Canvas */}
            <canvas 
                ref={canvasRef}
                width={300}
                height={300}
                className="w-full h-full object-contain image-pixelated"
                style={{ 
                    imageRendering: 'pixelated',
                    filter: isGenerating ? 'blur(4px) brightness(1.5)' : 'none',
                    transition: 'filter 0.5s'
                }}
            />

            {/* Overlay text during generation */}
            {isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30">
                    <div className="w-16 h-16 border-4 border-[#ff3333] border-t-transparent rounded-full animate-spin mb-4"></div>
                    <p className="text-[#ff3333] font-pixel text-xs animate-pulse">DECODING SIGNAL...</p>
                </div>
            )}

            <button 
                onClick={handleDownload}
                className="absolute top-4 right-4 bg-black/50 border border-[#ff3333] text-[#ff3333] p-2 hover:bg-[#ff3333] hover:text-black transition-colors z-30"
            >
                <Download size={16} />
            </button>

            {/* Decorative UI elements */}
            <div className="absolute bottom-4 left-4 text-[#ff3333] text-[10px] font-mono opacity-50">
                COORD: {Math.floor(Math.random()*999)}:{Math.floor(Math.random()*999)}<br/>
                SPEC: {params.planetType.toUpperCase()}
            </div>
         </div>
      </div>

      {/* Lore Terminal - Fills remaining space */}
      <div className="flex-1 bg-[#050000] border-2 border-[#ff3333] p-4 overflow-y-auto crt relative shadow-[inset_0_0_20px_rgba(255,51,51,0.1)]">
        {lore ? (
            <div className="space-y-3 font-mono text-[#ff3333]">
                <div className="border-b border-[#ff3333] border-dashed pb-2 flex justify-between items-end">
                    <div>
                        <h1 className="text-xl font-bold uppercase tracking-widest">{lore.name}</h1>
                        <span className="text-xs opacity-70">DESIGNATION: {lore.designation}</span>
                    </div>
                    <div className="text-right text-xs">
                        {lore.resources.map(r => (
                            <span key={r} className="inline-block border border-[#ff3333] bg-[#220505] px-1 mr-1 mb-1">{r}</span>
                        ))}
                    </div>
                </div>
                
                <p className="text-lg leading-tight text-[#ffaaaa]">{lore.description}</p>
                
                <div className="bg-[#ff3333]/10 p-2 border-l-4 border-[#ff3333]">
                    <span className="text-xs uppercase font-bold block mb-1 text-[#ff3333]">CLASSIFIED HISTORY:</span>
                    <p className="text-sm italic text-[#ffcccc]">{lore.history}</p>
                </div>

                <div className="text-sm border border-[#ff3333] p-2 bg-[#110000]">
                    <span className="text-xs uppercase font-bold opacity-80 block mb-1">DOMINANT LIFE FORM:</span> 
                    {lore.inhabitants}
                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-[#ff3333] opacity-30 font-pixel text-xs">
                <span className="animate-pulse">AWAITING SIMULATION DATA...</span>
                <span className="mt-2 text-[10px]">READY TO GENERATE LORE</span>
            </div>
        )}
      </div>
    </div>
  );
};