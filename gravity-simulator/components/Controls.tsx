import React from 'react';

interface ControlsProps {
  mass: number;
  setMass: (m: number) => void;
  gConstant: number;
  setGConstant: (g: number) => void;
  gridSpacing: number;
  setGridSpacing: (r: number) => void;
  timeScale: number;
  setTimeScale: (t: number) => void;
}

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  unit?: string;
}> = ({ label, value, min, max, step, onChange, unit = '' }) => (
  <div className="mb-5 relative group">
    <div className="flex justify-between text-[10px] uppercase tracking-widest mb-2 text-cyan-400 font-mono">
      <span>{label}</span>
      <span className="text-cyan-200">{value.toFixed(1)}{unit}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 slider-thumb"
    />
  </div>
);

const Controls: React.FC<ControlsProps> = ({ 
  mass, setMass, 
  gConstant, setGConstant,
  gridSpacing, setGridSpacing,
  timeScale, setTimeScale
}) => {
  return (
    <>
      <style>{`
        .slider-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%; 
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #000;
          box-shadow: 0 0 10px rgba(34, 211, 238, 0.5);
          transition: transform 0.1s;
        }
        .slider-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          background: #67e8f9;
        }
        .slider-thumb::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #22d3ee;
          cursor: pointer;
          border: 2px solid #000;
        }
      `}</style>
      <div className="absolute top-6 left-6 pointer-events-none z-10 w-72">
        <div className="pointer-events-auto bg-black/80 backdrop-blur-md border border-cyan-900/50 p-5 rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] text-cyan-50">
          <h1 className="text-xl font-bold mb-6 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-white border-b border-cyan-900/50 pb-2">
            GRAVITY LENS
          </h1>
          
          <div className="space-y-2 mb-4">
            <Slider 
              label="Black Hole Mass (M)" 
              value={mass} 
              min={1.0} 
              max={20.0} 
              step={0.5} 
              onChange={setMass} 
              unit=" M☉"
            />
            <Slider 
              label="Gravity Constant (G)" 
              value={gConstant} 
              min={0.1} 
              max={3.0} 
              step={0.1} 
              onChange={setGConstant} 
              unit=""
            />
            <Slider 
              label="Grid Density" 
              value={gridSpacing} 
              min={15} 
              max={80} 
              step={5} 
              onChange={setGridSpacing} 
              unit="px"
            />
            <Slider 
              label="Time Dilation" 
              value={timeScale} 
              min={0.0} 
              max={3.0} 
              step={0.1} 
              onChange={setTimeScale} 
              unit="x"
            />
          </div>

          <div className="space-y-2 text-[10px] font-mono text-cyan-500/60 pt-2 border-t border-dashed border-cyan-900/50">
            <p className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-cyan-400 animate-pulse"></span>
              <span>LENSING PROPORTIONAL TO MASS</span>
            </p>
            <p className="flex items-center gap-2">
               <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
               <span>CLICK TO SPAWN ORBITAL MATTER</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default Controls;