import React from 'react';

interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (val: number) => void;
  description: string;
  unit?: string;
}

export const BrutalistSlider: React.FC<Props> = ({ label, value, min, max, step, onChange, description, unit }) => {
  return (
    <div className="border border-[#00FF00] p-4 mb-4 bg-black text-[#00FF00] shadow-[4px_4px_0px_0px_rgba(0,50,0,1)]">
      <div className="flex justify-between items-baseline mb-2 border-b border-[#004400] pb-1">
        <label className="font-bold text-lg uppercase tracking-wider text-[#00FF00]">{label}</label>
        <span className="bg-[#00FF00] text-black px-2 py-0.5 font-bold">
          {value} {unit}
        </span>
      </div>
      
      <div className="mb-3">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="w-full h-4 bg-[#002200] border border-[#00FF00] appearance-none cursor-pointer focus:outline-none focus:bg-[#003300] [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-[#00FF00] [&::-webkit-slider-thumb]:border-none"
        />
        <div className="flex justify-between text-xs font-bold mt-1 text-[#008800]">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      </div>
      
      <p className="text-sm font-mono leading-tight text-justify text-[#00BB00]">
        <span className="font-bold mr-1 text-[#00FF00]">&gt;</span>
        {description}
      </p>
    </div>
  );
};