import React, { useRef, useEffect, useMemo } from 'react';
import { SimulationResults } from '../types';
import { MAX_RENDER_COUNT, THEORETICAL_MAX_N } from '../constants';

interface Props {
  results: SimulationResults;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseColor: string;
}

export const CanvasVisualizer: React.FC<Props> = ({ results }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate Fixed Map
  const starMap = useMemo(() => {
    const stars: Star[] = [];
    const width = 600;
    const height = 600;

    for (let i = 0; i < MAX_RENDER_COUNT; i++) {
      stars.push({
        x: Math.floor(Math.random() * width),
        y: Math.floor(Math.random() * height),
        size: Math.random() > 0.9 ? 2 : 1,
        baseColor: Math.random() > 0.7 ? '#113311' : '#001100' // Dark green background noise
      });
    }
    return stars;
  }, []);

  const starIndices = useMemo(() => {
    const indices = Array.from({ length: MAX_RENDER_COUNT }, (_, i) => i);
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear with Deep Black
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- LOGARITHMIC SCALING ---
    const maxLog = Math.log10(THEORETICAL_MAX_N);
    
    // Active Stars Log Calculation
    const activeLog = Math.log10(results.N_active + 1);
    const activeRatio = Math.min(activeLog / maxLog, 1);
    const boostedActiveRatio = Math.min(activeRatio * 1.2, 1);
    const activeDotsToRender = Math.floor(boostedActiveRatio * MAX_RENDER_COUNT);

    // Ruins Log Calculation
    const ruinsLog = Math.log10(results.N_ruins + 1);
    const ruinsRatio = Math.min(ruinsLog / maxLog, 1);
    const ruinsDotsToRender = Math.min(
      Math.floor(ruinsRatio * MAX_RENDER_COUNT), 
      MAX_RENDER_COUNT - activeDotsToRender
    );

    const activeSet = new Set(starIndices.slice(0, activeDotsToRender));
    const ruinSet = new Set(starIndices.slice(activeDotsToRender, activeDotsToRender + ruinsDotsToRender));

    starMap.forEach((star, index) => {
      let color = star.baseColor;
      let size = star.size;

      if (activeSet.has(index)) {
        color = '#00FF00'; // Pure Terminal Green
        size = 2; 
      } else if (ruinSet.has(index)) {
        color = '#FF0000'; // Danger Red
        size = 2;
      }

      ctx.fillStyle = color;
      
      if (color === '#FF0000') {
         ctx.fillRect(star.x, star.y, size, size); 
      } else {
         if (color === '#00FF00' && Math.random() > 0.8) {
             ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
             ctx.fillRect(star.x - 1, star.y - 1, size + 2, size + 2);
             ctx.fillStyle = color;
         }
         ctx.fillRect(star.x, star.y, size, size);
      }
    });

    // CRT Scanlines
    ctx.fillStyle = 'rgba(0, 255, 0, 0.03)';
    for(let y=0; y<canvas.height; y+=3) {
        ctx.fillRect(0, y, canvas.width, 1);
    }
    
    // Vignette
    const gradient = ctx.createRadialGradient(300, 300, 300, 300, 300, 450);
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.8)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0,0,600,600);

  }, [results, starMap, starIndices]);

  return (
    <div className="relative border-2 border-[#00FF00] w-full aspect-square bg-black shadow-[0px_0px_20px_rgba(0,255,0,0.2)]">
      <canvas 
        ref={canvasRef} 
        width={600} 
        height={600} 
        className="w-full h-full block rendering-pixelated"
      />
      <div className="absolute top-2 right-2 text-[#00FF00] text-xs font-mono bg-black/80 px-2 border border-[#00FF00]">
        VISUAL MODE: LOGARITHMIC SCALE (X1.2)
      </div>
      <div className="absolute bottom-2 left-2 text-[#00FF00] text-xs font-mono bg-black px-1 border border-[#00FF00] animate-pulse">
        SECTOR 7G UPLINK [ONLINE]
      </div>
    </div>
  );
};