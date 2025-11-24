import React, { useState, useEffect } from 'react';
import SimulationCanvas from './components/SimulationCanvas';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [mass, setMass] = useState<number>(4.0);
  const [gConstant, setGConstant] = useState<number>(0.8);
  const [gridSpacing, setGridSpacing] = useState<number>(30); // Default tighter grid
  const [timeScale, setTimeScale] = useState<number>(1.0);

  // Handle Wheel event globally
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      setMass((prevMass) => {
        const delta = e.deltaY * -0.01;
        // Limit max mass to 12.0 to prevent visual overcrowding
        const newMass = Math.max(1.0, Math.min(prevMass + delta, 12.0)); 
        return newMass;
      });
    };

    window.addEventListener('wheel', handleWheel);
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans">
      <SimulationCanvas 
        massMultiplier={mass} 
        gConstant={gConstant}
        gridSpacing={gridSpacing}
        timeScale={timeScale}
      />
      <Controls 
        mass={mass} 
        setMass={setMass} 
        gConstant={gConstant}
        setGConstant={setGConstant}
        gridSpacing={gridSpacing}
        setGridSpacing={setGridSpacing}
        timeScale={timeScale}
        setTimeScale={setTimeScale}
      />
      
      {/* Decorative footer */}
      <div className="absolute bottom-4 right-6 text-cyan-900 text-xs tracking-widest pointer-events-none opacity-50">
        CANVAS API // PHYSICS ENGINE // REACT 19
      </div>
    </div>
  );
};

export default App;