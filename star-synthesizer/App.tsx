
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Volume2, VolumeX, Activity, Thermometer, Weight, Clock, Zap, Info } from 'lucide-react';

// --- Types ---

interface StarParams {
  temperature: number; // Kelvin (2000 - 30000)
  mass: number;        // Solar Masses (0.1 - 50)
  metallicity: number; // Index (0 - 1)
  age: number;         // Billions of years (0 - 13)
}

interface Particle {
  angle: number;
  radius: number;
  speed: number;
  size: number;
  alpha: number;
  trail: {x: number, y: number}[];
}

// --- Audio Utils ---

// Create Pink Noise buffer (1/f noise) - Represents stellar wind turbulence
const createPinkNoise = (ctx: AudioContext): AudioBuffer => {
    const bufferSize = 4096 * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0, b1, b2, b3, b4, b5, b6;
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
        data[i] *= 0.11; // Compensate for gain
        b6 = white * 0.115926;
    }
    return buffer;
};

// Create Distortion Curve for Mass aggressiveness
const makeDistortionCurve = (amount: number) => {
  const k = typeof amount === 'number' ? amount : 50;
  const n_samples = 44100;
  const curve = new Float32Array(n_samples);
  const deg = Math.PI / 180;
  for (let i = 0; i < n_samples; ++i) {
    const x = (i * 2) / n_samples - 1;
    // Sigmoid function for soft clipping -> hard clipping
    curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
  }
  return curve;
};

const kelvinToRgb = (k: number): string => {
  let temp = k / 100;
  let r, g, b;

  if (temp <= 66) {
    r = 255;
    g = temp;
    g = 99.4708025861 * Math.log(g) - 161.1195681661;
    if (temp <= 19) {
      b = 0;
    } else {
      b = temp - 10;
      b = 138.5177312231 * Math.log(b) - 305.0447927307;
    }
  } else {
    r = temp - 60;
    r = 329.698727446 * Math.pow(r, -0.1332047592);
    g = temp - 60;
    g = 288.1221695283 * Math.pow(g, -0.0755148492);
    b = 255;
  }

  return `rgb(${Math.max(0, Math.min(255, r))}, ${Math.max(0, Math.min(255, g))}, ${Math.max(0, Math.min(255, b))})`;
};

const App: React.FC = () => {
  // --- State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [params, setParams] = useState<StarParams>({
    temperature: 5778, // Sun-like
    mass: 1.0,
    metallicity: 0.02, // Sun-like (~2%)
    age: 4.6,
  });

  // --- Refs for Audio & Canvas ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Audio Nodes Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const shouldBePlayingRef = useRef(false); // To handle race conditions in toggle
  
  // Oscillator (Temperature)
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  
  // FM Synthesis (Metallicity)
  const modulatorRef = useRef<OscillatorNode | null>(null);
  const modulatorGainRef = useRef<GainNode | null>(null);

  // Noise Engine (Mass/Wind)
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const noiseGainRef = useRef<GainNode | null>(null);
  const noiseFilterRef = useRef<BiquadFilterNode | null>(null);
  const noiseDistortionRef = useRef<WaveShaperNode | null>(null);

  // LFO (Age)
  const lfoRef = useRef<OscillatorNode | null>(null);
  const lfoGainRef = useRef<GainNode | null>(null); // Controls Tremolo (Volume)
  const lfoPitchGainRef = useRef<GainNode | null>(null); // Controls Vibrato (Pitch)

  const animationFrameRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  // --- Audio Engine ---

  const initAudio = () => {
    if (audioContextRef.current) return;

    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;

    // 1. Master Output
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.0; // Start silent
    masterGain.connect(ctx.destination);
    masterGainRef.current = masterGain;

    // 2. Carrier Oscillator (Pitch/Temp)
    const carrier = ctx.createOscillator();
    carrier.type = 'sine';
    carrier.connect(masterGain);
    oscillatorRef.current = carrier;

    // 3. FM Modulator (Metallicity)
    // Modulates the frequency of the carrier
    const modulator = ctx.createOscillator();
    modulator.type = 'sine';
    const modulatorGain = ctx.createGain();
    modulatorGain.gain.value = 0; // Starts at 0 metallicity
    modulator.connect(modulatorGain);
    modulatorGain.connect(carrier.frequency); // FM Synthesis connection
    modulatorRef.current = modulator;
    modulatorGainRef.current = modulatorGain;

    // 4. Noise Generator (Mass/Stellar Wind)
    const noiseBuffer = createPinkNoise(ctx);
    const noiseNode = ctx.createBufferSource();
    noiseNode.buffer = noiseBuffer;
    noiseNode.loop = true;
    
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;

    // New: Distortion for Mass "Roar"
    const noiseDistortion = ctx.createWaveShaper();
    noiseDistortion.curve = makeDistortionCurve(0);
    noiseDistortion.oversample = '4x';

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = 0;

    noiseNode.connect(noiseFilter);
    noiseFilter.connect(noiseDistortion);
    noiseDistortion.connect(noiseGain);
    noiseGain.connect(masterGain);

    noiseNodeRef.current = noiseNode;
    noiseFilterRef.current = noiseFilter;
    noiseDistortionRef.current = noiseDistortion;
    noiseGainRef.current = noiseGain;

    // 5. LFO (Age/Pulsation)
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    
    // Volume LFO (Tremolo)
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0;
    lfo.connect(lfoGain);
    lfoGain.connect(masterGain.gain);

    // Pitch LFO (Vibrato) - NEW for Age Instability
    const lfoPitchGain = ctx.createGain();
    lfoPitchGain.gain.value = 0;
    lfo.connect(lfoPitchGain);
    lfoPitchGain.connect(carrier.frequency); 
    
    lfoRef.current = lfo;
    lfoGainRef.current = lfoGain;
    lfoPitchGainRef.current = lfoPitchGain;

    // Start everything
    carrier.start();
    modulator.start();
    noiseNode.start();
    lfo.start();
  };

  const updateAudioParams = useCallback(() => {
    if (!audioContextRef.current || !oscillatorRef.current) return;

    const ctx = audioContextRef.current;
    const now = ctx.currentTime;
    const rampTime = 0.1;

    // --- 1. TEMPERATURE -> PITCH ---
    // Scientific Logic: Wien's Displacement Law. Hotter = Higher Frequency.
    const minFreq = 65;
    const maxFreq = 880;
    const tRatio = (params.temperature - 2000) / (30000 - 2000);
    const frequency = minFreq * Math.pow(maxFreq / minFreq, tRatio);
    
    oscillatorRef.current.frequency.setTargetAtTime(frequency, now, rampTime);
    
    if (modulatorRef.current) {
        modulatorRef.current.frequency.setTargetAtTime(frequency * 2.0, now, rampTime);
    }

    // --- 2. MASS -> STELLAR WIND (NOISE + DISTORTION) ---
    // Scientific Logic: Massive stars (Wolf-Rayet) have violent winds.
    if (noiseGainRef.current && noiseFilterRef.current && noiseDistortionRef.current) {
        const normalizedMass = params.mass / 50; // 0 to 1
        
        // Volume: Exponential curve. Heavy stars are MUCH louder.
        const windVolume = Math.min(0.8, Math.pow(normalizedMass, 0.7) * 0.9);
        noiseGainRef.current.gain.setTargetAtTime(windVolume, now, 0.5);

        // Filter: Opens wide for high mass to let the "hiss" and "roar" through
        const filterFreq = 60 + Math.pow(normalizedMass, 0.6) * 12000;
        noiseFilterRef.current.frequency.setTargetAtTime(filterFreq, now, 0.5);

        // Distortion: Adds the growl/saturation of a violent nuclear reaction
        const distortionAmount = Math.pow(normalizedMass, 1.2) * 400; 
        noiseDistortionRef.current.curve = makeDistortionCurve(distortionAmount);
    }

    // --- 3. METALLICITY -> TIMBRE (FM SYNTHESIS) ---
    if (modulatorGainRef.current) {
        const modulationIndex = params.metallicity * 1200; 
        modulatorGainRef.current.gain.setTargetAtTime(modulationIndex, now, rampTime);
    }

    // --- 4. AGE -> STABILITY (LFO TREMOLO + VIBRATO) ---
    // Scientific Logic: Young stars flutter; Old stars breathe deeply.
    // CONTINUOUS MAPPING LOGIC
    if (lfoRef.current && lfoGainRef.current && lfoPitchGainRef.current) {
        let lfoRate, lfoDepth, pitchDepth;

        const stabilityThreshold = 5.0; // Age where star is most stable (Main Sequence)
        const maxAge = 13.0;

        if (params.age <= stabilityThreshold) {
            // PHASE 1: YOUTH (Chaos -> Stability)
            // Age 0: High Rate (15Hz), High Chaos
            // Age 5: Low Rate (0.5Hz), Zero Chaos
            const youthFactor = 1 - (params.age / stabilityThreshold); // 1.0 down to 0.0
            
            lfoRate = 0.5 + (youthFactor * 14.5); // 15Hz -> 0.5Hz
            lfoDepth = youthFactor * 0.4;         // 40% Tremolo -> 0%
            pitchDepth = youthFactor * 50;        // +/- 50Hz Vibrato -> 0Hz
            
        } else {
            // PHASE 2: EVOLUTION (Stability -> Deep Pulsation)
            // Age 5: Low Rate (0.5Hz), Stable
            // Age 13: Very Low Rate (0.2Hz), Deep Breath, Pitch Groan
            const oldFactor = (params.age - stabilityThreshold) / (maxAge - stabilityThreshold); // 0.0 to 1.0
            
            lfoRate = 0.5 - (oldFactor * 0.3); // 0.5Hz -> 0.2Hz (Slower breathing)
            lfoDepth = oldFactor * 0.8;        // 0% -> 80% Tremolo (Deep pulsing)
            pitchDepth = oldFactor * 35;       // 0Hz -> +/- 35Hz (Ominous groan)
        }

        lfoRef.current.frequency.setTargetAtTime(lfoRate, now, 0.2);
        lfoGainRef.current.gain.setTargetAtTime(lfoDepth, now, 0.2);
        lfoPitchGainRef.current.gain.setTargetAtTime(pitchDepth, now, 0.2);
    }

  }, [params]);

  const toggleAudio = async () => {
    // 1. Init Audio if missing
    if (!audioContextRef.current) {
      initAudio();
    }
    const ctx = audioContextRef.current;
    if (!ctx) return;

    // 2. Logic based on CURRENT isPlaying state
    if (isPlaying) {
        // --- TURN OFF ---
        // Mark intent as stopped
        shouldBePlayingRef.current = false;
        setIsPlaying(false);

        // Fade out Master Gain
        if (masterGainRef.current) {
             const now = ctx.currentTime;
             masterGainRef.current.gain.cancelScheduledValues(now);
             masterGainRef.current.gain.setValueAtTime(masterGainRef.current.gain.value, now);
             // Quick fade out
             masterGainRef.current.gain.linearRampToValueAtTime(0, now + 0.2);
        }
        
        // Wait for fade then suspend context for COMPLETE shut off
        setTimeout(async () => {
             // Only suspend if the user hasn't clicked "Start" again in the meantime
             if (!shouldBePlayingRef.current && ctx.state === 'running') {
                 await ctx.suspend();
             }
        }, 250);

    } else {
        // --- TURN ON ---
        shouldBePlayingRef.current = true;
        setIsPlaying(true);
        
        // Resume context if browser suspended it (autoplay policy or previous stop)
        if (ctx.state === 'suspended') {
            await ctx.resume();
        }
        
        // Fade in Master Gain
        if (masterGainRef.current) {
             const now = ctx.currentTime;
             masterGainRef.current.gain.cancelScheduledValues(now);
             masterGainRef.current.gain.setValueAtTime(0, now);
             masterGainRef.current.gain.linearRampToValueAtTime(0.5, now + 0.8);
        }
    }
  };

  // --- Visualizer Engine ---

  useEffect(() => {
    updateAudioParams();
  }, [params, updateAudioParams]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (particlesRef.current.length === 0) {
      for (let i = 0; i < 300; i++) {
        particlesRef.current.push({
          angle: Math.random() * Math.PI * 2,
          radius: 50 + Math.random() * 200,
          speed: 0, 
          size: Math.random() * 2,
          alpha: Math.random(),
          trail: []
        });
      }
    }

    const render = () => {
      if (!canvas || !containerRef.current) return;
      
      const { clientWidth, clientHeight } = containerRef.current;
      if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
        canvas.width = clientWidth;
        canvas.height = clientHeight;
      }

      const w = canvas.width;
      const h = canvas.height;
      const cx = w / 2;
      const cy = h / 2;

      // Deep Space Background
      ctx.fillStyle = '#020617'; 
      ctx.fillRect(0, 0, w, h);

      const baseRadius = 15 + (Math.log(params.mass * 10) * 35); 
      
      // Pulsation Visuals (Synced to Age logic continuously)
      const time = Date.now() / 1000;
      let pulseRate = 0;
      let pulseAmp = 0;
      const stabilityThreshold = 5.0;

      if (params.age <= stabilityThreshold) {
           // Youth: Fast, shallow flutter -> Stable
           const youthFactor = 1 - (params.age / stabilityThreshold);
           pulseRate = 0.5 + (youthFactor * 8); 
           pulseAmp = 0.01 + (youthFactor * 0.08); 
      } else {
           // Old: Stable -> Slow, Deep expansion
           const oldFactor = (params.age - stabilityThreshold) / 8.0;
           pulseRate = 0.5 - (oldFactor * 0.3); 
           pulseAmp = 0.01 + (oldFactor * 0.25); // Large expansion for old stars
      }
      
      const pulse = 1 + Math.sin(time * pulseRate * Math.PI * 2) * pulseAmp;
      const radius = baseRadius * pulse;
      const color = kelvinToRgb(params.temperature);

      // --- Draw Star ---
      
      // Corona
      const coronaSize = radius * (2 + (params.mass / 20)); 
      const glow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, coronaSize);
      glow.addColorStop(0, color);
      glow.addColorStop(0.2, color); 
      glow.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      glow.addColorStop(1, 'transparent');

      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, coronaSize, 0, Math.PI * 2);
      ctx.fill();

      // Core
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = color;
      ctx.shadowBlur = Math.min(100, radius * 2);
      ctx.shadowColor = color;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // --- Particles (Stellar Wind) ---
      // Mass affects speed heavily. More logarithmic boost.
      const windSpeedBase = 0.002 + Math.pow(params.mass / 50, 0.8) * 0.15;
      
      particlesRef.current.forEach(p => {
        // Update physics
        p.speed = windSpeedBase * (1 + Math.random() * 0.5);
        p.angle += p.speed;
        p.radius += 0.5 + (params.mass / 50) * 8; // Faster outward expansion for mass

        // Reset
        if (p.radius > Math.max(w, h) / 1.5) {
            p.radius = radius * 1.1; 
            p.alpha = 0;
            p.trail = [];
        }

        if (p.alpha < 1 && p.radius < radius * 3) p.alpha += 0.05;

        // Calculate Position
        const px = cx + Math.cos(p.angle) * p.radius;
        const py = cy + Math.sin(p.angle) * p.radius;

        // Trails
        p.trail.push({x: px, y: py});
        // Longer trails for higher speed/mass
        const maxTrail = 5 + (params.mass * 2); 
        if (p.trail.length > maxTrail) p.trail.shift();

        // Draw Trail
        if (p.trail.length > 1) {
            ctx.beginPath();
            ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let t of p.trail) ctx.lineTo(t.x, t.y);
            ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.3})`;
            ctx.lineWidth = p.size;
            ctx.stroke();
        }

        // Draw Particle
        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [params]);

  const handleParamChange = (key: keyof StarParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col h-screen w-full bg-slate-950 text-cyan-500 overflow-hidden font-mono">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-cyan-900/50 bg-slate-900/50 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Activity className="w-6 h-6 animate-pulse" />
          <h1 className="text-xl tracking-widest font-bold uppercase">Star Synthesizer <span className="text-xs text-slate-500 ml-2">DATA SONIFICATION ENGINE</span></h1>
        </div>
        <button
          onClick={toggleAudio}
          className={`flex items-center gap-2 px-4 py-2 rounded border transition-all duration-300 ${
            isPlaying 
              ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]' 
              : 'bg-transparent border-slate-700 text-slate-500 hover:border-cyan-800 hover:text-cyan-600'
          }`}
        >
          {isPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span>{isPlaying ? 'AUDIO ACTIVE' : 'START AUDIO'}</span>
        </button>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 relative overflow-hidden">
        
        {/* Controls Panel */}
        <aside className="w-96 flex flex-col gap-6 p-6 border-r border-cyan-900/30 bg-slate-900/30 backdrop-blur overflow-y-auto z-10 custom-scrollbar">
          
          {/* Temperature Control */}
          <div className="group border border-slate-800 p-4 rounded bg-slate-900/40 hover:border-cyan-900/60 transition-colors">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
                <Thermometer className="w-4 h-4" /> Temperature
              </label>
              <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-cyan-200 border border-slate-800">{params.temperature} K</span>
            </div>
            <input 
              type="range" min="2000" max="30000" step="100" value={params.temperature}
              onChange={(e) => handleParamChange('temperature', Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
            />
            <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded flex gap-2 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <p>Mapped to <strong>Base Frequency</strong>. According to Wien's Law, hot stars emit high-energy photons (high frequency).</p>
            </div>
          </div>

          {/* Mass Control */}
          <div className="group border border-slate-800 p-4 rounded bg-slate-900/40 hover:border-cyan-900/60 transition-colors">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
                <Weight className="w-4 h-4" /> Mass
              </label>
              <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-cyan-200 border border-slate-800">{params.mass} M☉</span>
            </div>
            <input 
              type="range" min="0.1" max="50" step="0.1" value={params.mass}
              onChange={(e) => handleParamChange('mass', Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
            />
             <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded flex gap-2 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <p>Mapped to <strong>Noise & Distortion</strong>. Supermassive stars generate violent winds. Higher mass = louder distorted 'roar'.</p>
            </div>
          </div>

          {/* Metallicity Control */}
          <div className="group border border-slate-800 p-4 rounded bg-slate-900/40 hover:border-cyan-900/60 transition-colors">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
                <Zap className="w-4 h-4" /> Metallicity
              </label>
              <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-cyan-200 border border-slate-800">{params.metallicity.toFixed(3)}</span>
            </div>
            <input 
              type="range" min="0" max="1" step="0.001" value={params.metallicity}
              onChange={(e) => handleParamChange('metallicity', Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
            />
            <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded flex gap-2 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <p>Mapped to <strong>Timbre (FM Synthesis)</strong>. Heavy elements create complex absorption lines, 'dirtying' the signal spectrum.</p>
            </div>
          </div>

          {/* Age Control */}
          <div className="group border border-slate-800 p-4 rounded bg-slate-900/40 hover:border-cyan-900/60 transition-colors">
            <div className="flex justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-cyan-300">
                <Clock className="w-4 h-4" /> Age
              </label>
              <span className="text-xs bg-slate-950 px-2 py-0.5 rounded text-cyan-200 border border-slate-800">{params.age} Ga</span>
            </div>
            <input 
              type="range" min="0" max="13" step="0.1" value={params.age}
              onChange={(e) => handleParamChange('age', Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer mb-2"
            />
            <div className="text-[10px] text-slate-400 bg-slate-950/50 p-2 rounded flex gap-2 items-start">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              <p>Mapped to <strong>Stability (LFO & Vibrato)</strong>. Slide to hear the continuous transition from youthful chaos to the pulsation of a dying giant.</p>
            </div>
          </div>

        </aside>

        {/* Canvas Visualizer */}
        <main ref={containerRef} className="flex-1 bg-black relative flex flex-col">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900/20 via-slate-950 to-black pointer-events-none"></div>
          
          <div className="absolute inset-0 opacity-10 pointer-events-none" 
               style={{ 
                 backgroundImage: 'linear-gradient(rgba(34, 211, 238, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(34, 211, 238, 0.1) 1px, transparent 1px)', 
                 backgroundSize: '40px 40px' 
               }}>
          </div>
          
          <div className="relative flex-1">
             <canvas ref={canvasRef} className="block w-full h-full" />
          </div>

          {/* Real-time Data Output */}
          <div className="h-32 bg-slate-950 border-t border-cyan-900/30 p-4 grid grid-cols-4 gap-4 text-xs font-mono relative z-20">
              <div>
                  <h4 className="text-slate-500 mb-1">SPECTRAL TYPE</h4>
                  <div className="text-xl text-white font-bold">
                    {params.temperature > 30000 ? 'O5' : params.temperature > 10000 ? 'B0' : params.temperature > 7500 ? 'A0' : params.temperature > 6000 ? 'F5' : params.temperature > 5200 ? 'G2' : params.temperature > 3700 ? 'K0' : 'M5'}
                  </div>
              </div>
              <div>
                  <h4 className="text-slate-500 mb-1">ACOUSTIC OUTPUT</h4>
                  <div className="text-cyan-300">OSC: {Math.round(65 * Math.pow(880/65, (params.temperature - 2000)/28000))} Hz</div>
                  <div className="text-pink-400">WIND: {(Math.min(1, params.mass/50) * 100).toFixed(0)}% (DIST: {params.mass > 10 ? 'HIGH' : 'LOW'})</div>
              </div>
              <div>
                  <h4 className="text-slate-500 mb-1">DYNAMIC STATE</h4>
                  <div className={params.age < 2 ? "text-yellow-400 animate-pulse" : params.age > 8 ? "text-red-400 animate-pulse" : "text-green-400"}>
                      {params.age < 2 ? "UNSTABLE (PROTOSTAR)" : params.age > 8 ? "GIANT PHASE (EXPANDED)" : "MAIN SEQUENCE (STABLE)"}
                  </div>
              </div>
              <div>
                  <h4 className="text-slate-500 mb-1">COMPOSITION</h4>
                  <div className="w-full bg-slate-900 h-2 mt-2 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500" style={{width: `${(1-params.metallicity)*100}%`}}></div>
                  </div>
                  <div className="flex justify-between mt-1 text-[10px]">
                      <span>H/He</span>
                      <span>Metals</span>
                  </div>
              </div>
          </div>
          
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50 top-0 left-0 h-full w-full">
              <button 
                onClick={toggleAudio}
                className="group relative px-10 py-5 bg-transparent overflow-hidden border border-cyan-500 text-cyan-400 font-bold tracking-[0.2em] uppercase transition-all hover:bg-cyan-500/10 hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]"
              >
                <span className="relative z-10 flex flex-col items-center gap-2">
                    <span>Initialize Synthesizer</span>
                    <span className="text-[10px] tracking-normal normal-case opacity-70">Click to start the simulation</span>
                </span>
                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-0 bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent transition-transform duration-500"></div>
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
