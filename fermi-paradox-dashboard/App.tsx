import React, { useState, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { INITIAL_PARAMS, PARAM_DEFINITIONS } from './constants';
import { calculateResults, formatNumber, Scenario, calculateStrategicMetrics } from './utils';
import { BrutalistSlider } from './components/BrutalistSlider';
import { CanvasVisualizer } from './components/CanvasVisualizer';

function App() {
  const [params, setParams] = useState(INITIAL_PARAMS);
  const [showScenario, setShowScenario] = useState(false);
  const [scenarioData, setScenarioData] = useState<Scenario | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const updateParam = (key: keyof typeof INITIAL_PARAMS, val: number) => {
    setParams(prev => ({ ...prev, [key]: val }));
  };

  const results = useMemo(() => calculateResults(params), [params]);
  const strategic = useMemo(() => calculateStrategicMetrics(results, params), [results, params]);

  const handleScenarioAnalysis = async () => {
    setShowScenario(true);
    setIsLoading(true);
    setScenarioData(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `
        Act as a military AI from an advanced civilization, cold and calculating (Style: HAL 9000 or SHODAN).
        Analyze the following cosmological parameters of the Milky Way and generate a strategic prediction.
        
        INPUT DATA:
        - Star Formation Rate: ${params.R_star}/year
        - Habitable Worlds: ${params.n_e} per system
        - Life Origin: ${(params.f_l * 100).toFixed(1)}%
        - Intelligence: ${(params.f_i * 100).toFixed(1)}%
        - Communication Tech: ${(params.f_c * 100).toFixed(1)}%
        - Avg Longevity: ${params.L} years
        - Extinction Factor: ${(params.C_f * 100).toFixed(4)}% annual

        CURRENT TELEMETRY:
        - Active Civilizations: ${results.N_active}
        - Dead Civilizations: ${results.N_ruins}
        - Mean Distance: ${results.avgDistance} light years

        Generate a BRIEF SCI-FI SCENARIO (Max 50 words) explaining the state of the galaxy.
        
        JSON FORMAT:
        {
            "title": "TACTICAL TITLE (E.G., SILENCE PROTOCOL, AGGRESSIVE EXPANSION)",
            "description": "Cold, direct narrative text.",
            "color": "HEX CODE (#00FF00 safe, #FF0000 danger, #FFFF00 warning, #00FFFF anomaly)"
        }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json'
            }
        });

        const text = response.text;
        if (text) {
            setScenarioData(JSON.parse(text));
        } else {
            throw new Error("No data returned");
        }

    } catch (e) {
        console.error(e);
        setScenarioData({
            title: "CONNECTION ERROR",
            description: "Subspace uplink interrupted. Unable to contact AI Core.",
            color: "#FF0000"
        });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden bg-black text-[#00FF00] p-2 md:p-6 max-w-[1920px] mx-auto font-mono selection:bg-[#00FF00] selection:text-black flex flex-col">
      {/* Header */}
      <header className="border-b-2 border-[#00FF00] mb-6 pb-2 flex-none flex flex-col md:flex-row justify-between items-end">
        <div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tighter mb-1 text-[#00FF00] drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">
            FERMI_TERMINAL_v2.1
            </h1>
            <p className="text-xs text-[#008800]">EXOBIOLOGICAL SIMULATION OPERATING SYSTEM</p>
        </div>
        <div className="text-right text-xs md:text-sm font-bold mt-4 md:mt-0">
          <span className="block text-[#004400]">USER: ADMINISTRATOR</span>
          <span className="text-[#FF0000] animate-pulse">● RECORDING ACTIVE</span>
        </div>
      </header>

      <main className="flex-grow grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-hidden">
        
        {/* Left Column: Controls (Full Height Scrollable) */}
        <div className="lg:col-span-4 h-full overflow-y-auto pr-2 custom-scrollbar pb-8">
          
          <section>
            <h2 className="bg-[#003300] text-[#00FF00] text-xl font-bold px-2 py-1 mb-4 inline-block border border-[#00FF00]">
              [A] ASTROPHYSICAL PARAMETERS
            </h2>
            <BrutalistSlider
              label={PARAM_DEFINITIONS.R_star.label}
              value={params.R_star}
              min={PARAM_DEFINITIONS.R_star.min}
              max={PARAM_DEFINITIONS.R_star.max}
              step={PARAM_DEFINITIONS.R_star.step}
              description={PARAM_DEFINITIONS.R_star.desc}
              onChange={(v) => updateParam('R_star', v)}
            />
            <BrutalistSlider
              label={PARAM_DEFINITIONS.f_p.label}
              value={params.f_p}
              min={PARAM_DEFINITIONS.f_p.min}
              max={PARAM_DEFINITIONS.f_p.max}
              step={PARAM_DEFINITIONS.f_p.step}
              description={PARAM_DEFINITIONS.f_p.desc}
              onChange={(v) => updateParam('f_p', v)}
            />
            <BrutalistSlider
              label={PARAM_DEFINITIONS.n_e.label}
              value={params.n_e}
              min={PARAM_DEFINITIONS.n_e.min}
              max={PARAM_DEFINITIONS.n_e.max}
              step={PARAM_DEFINITIONS.n_e.step}
              description={PARAM_DEFINITIONS.n_e.desc}
              onChange={(v) => updateParam('n_e', v)}
            />
          </section>

          <section>
            <h2 className="bg-[#003300] text-[#00FF00] text-xl font-bold px-2 py-1 mb-4 inline-block border border-[#00FF00]">
              [B] BIOLOGICAL FILTERS
            </h2>
            <BrutalistSlider
              label={PARAM_DEFINITIONS.f_l.label}
              value={params.f_l}
              min={PARAM_DEFINITIONS.f_l.min}
              max={PARAM_DEFINITIONS.f_l.max}
              step={PARAM_DEFINITIONS.f_l.step}
              description={PARAM_DEFINITIONS.f_l.desc}
              onChange={(v) => updateParam('f_l', v)}
            />
            <BrutalistSlider
              label={PARAM_DEFINITIONS.f_i.label}
              value={params.f_i}
              min={PARAM_DEFINITIONS.f_i.min}
              max={PARAM_DEFINITIONS.f_i.max}
              step={PARAM_DEFINITIONS.f_i.step}
              description={PARAM_DEFINITIONS.f_i.desc}
              onChange={(v) => updateParam('f_i', v)}
            />
             <BrutalistSlider
              label={PARAM_DEFINITIONS.f_c.label}
              value={params.f_c}
              min={PARAM_DEFINITIONS.f_c.min}
              max={PARAM_DEFINITIONS.f_c.max}
              step={PARAM_DEFINITIONS.f_c.step}
              description={PARAM_DEFINITIONS.f_c.desc}
              onChange={(v) => updateParam('f_c', v)}
            />
          </section>

          <section>
            <h2 className="bg-[#003300] text-[#00FF00] text-xl font-bold px-2 py-1 mb-4 inline-block border border-[#00FF00]">
              [C] THE GREAT FILTER
            </h2>
            <BrutalistSlider
              label={PARAM_DEFINITIONS.L.label}
              value={params.L}
              min={PARAM_DEFINITIONS.L.min}
              max={PARAM_DEFINITIONS.L.max}
              step={PARAM_DEFINITIONS.L.step}
              description={PARAM_DEFINITIONS.L.desc}
              onChange={(v) => updateParam('L', v)}
            />
            <BrutalistSlider
              label={PARAM_DEFINITIONS.C_f.label}
              value={params.C_f}
              min={PARAM_DEFINITIONS.C_f.min}
              max={PARAM_DEFINITIONS.C_f.max}
              step={PARAM_DEFINITIONS.C_f.step}
              description={PARAM_DEFINITIONS.C_f.desc}
              onChange={(v) => updateParam('C_f', v)}
            />
          </section>

        </div>

        {/* Right Column: Visualization & Data */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto pb-8 custom-scrollbar">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Main Visual */}
              <div className="order-2 md:order-1">
                 <CanvasVisualizer results={results} />
              </div>

              {/* Data Panel */}
              <div className="order-1 md:order-2 flex flex-col gap-4">
                  
                  {/* Primary Metrics */}
                  <div className="border border-[#00FF00] bg-[#001100] p-4 relative overflow-hidden flex-grow">
                      <div className="absolute top-0 right-0 p-1 text-[10px] bg-[#00FF00] text-black font-bold">REAL-TIME TELEMETRY</div>
                      
                      <div className="mb-6 mt-2">
                          <h3 className="text-xs font-bold text-[#008800] uppercase mb-1">ACTIVE CIVILIZATIONS (N)</h3>
                          <p className="text-5xl font-bold text-[#00FF00] drop-shadow-[0_0_5px_rgba(0,255,0,0.8)]">
                              {formatNumber(results.N_active)}
                          </p>
                      </div>

                      <div className="mb-6">
                          <h3 className="text-xs font-bold text-[#880000] uppercase mb-1">GALACTIC GRAVEYARD</h3>
                          <p className="text-4xl font-bold text-[#FF0000] opacity-80">
                              {formatNumber(results.N_ruins)}
                          </p>
                      </div>

                      <div>
                          <h3 className="text-xs font-bold text-[#0000FF] uppercase mb-1">MEAN SIGNAL DISTANCE</h3>
                          <p className="text-3xl font-bold text-[#4444FF]">
                              {results.N_active > 0 ? formatNumber(results.avgDistance) : "∞"} <span className="text-sm">Light Years</span>
                          </p>
                      </div>
                  </div>

                  {/* AI Button */}
                  <button 
                    onClick={handleScenarioAnalysis}
                    disabled={isLoading}
                    className="w-full bg-[#003300] border-2 border-[#00FF00] text-[#00FF00] font-bold text-lg py-4 hover:bg-[#00FF00] hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-widest shadow-[4px_4px_0px_0px_#00FF00]"
                  >
                    {isLoading ? "/// PROCESSING DATA ///" : ">> INITIATE DEEP SCAN"}
                  </button>

              </div>
          </div>

          {/* New Dashboard: Strategic Analysis */}
          <div className="border border-[#00FF00] p-1 bg-black mb-6">
              <div className="bg-[#002200] border-b border-[#00FF00] p-2 mb-2 flex justify-between items-center">
                  <h3 className="text-sm font-bold text-[#00FF00]">STRATEGIC ANALYSIS DASHBOARD</h3>
                  <span className="text-[10px] text-[#008800]">TACTICAL PREDICTION MODULE v0.9</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-2 text-center">
                  <div className="border border-[#004400] p-2 bg-black">
                      <p className="text-[10px] text-[#00AA00] mb-1">EFFECTIVE LONGEVITY</p>
                      <p className="text-xl font-bold text-white">{strategic.effectiveL}</p>
                  </div>
                  <div className="border border-[#004400] p-2 bg-black">
                      <p className="text-[10px] text-[#00AA00] mb-1">CONTACT PROB. (100Y)</p>
                      <p className="text-xl font-bold text-[#00FF00]">{strategic.contactProbability}</p>
                  </div>
                   <div className="border border-[#004400] p-2 bg-black">
                      <p className="text-[10px] text-[#00AA00] mb-1">SIGNAL COVERAGE</p>
                      <p className="text-xl font-bold text-[#FFFF00]">{strategic.radioHorizon}</p>
                  </div>
                   <div className="border border-[#004400] p-2 bg-black">
                      <p className="text-[10px] text-[#00AA00] mb-1">NETWORK STRENGTH</p>
                      <p className="text-sm font-bold text-white mt-1">{strategic.signalStrength}</p>
                  </div>
              </div>
          </div>

          {/* Detailed Explanations / Telemetry - FULL WIDTH */}
          <div className="border border-[#004400] bg-[#001100] p-6 text-xs font-mono mt-auto">
            <h3 className="text-[#00FF00] font-bold mb-4 border-b border-[#004400] inline-block uppercase text-sm">Detailed Telemetry Explanation</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-[#00AA00]">
                <div>
                    <span className="text-white font-bold block mb-2 text-sm border-b border-[#003300]">N (Active)</span>
                    Estimated number of technological civilizations currently broadcasting radio signals. We can only contact these.
                </div>
                <div>
                    <span className="text-white font-bold block mb-2 text-sm border-b border-[#003300]">Galactic Graveyard</span>
                    Number of civilizations that rose and fell over the last 10 billion years. Archaeological ruins, impossible to contact.
                </div>
                <div>
                    <span className="text-white font-bold block mb-2 text-sm border-b border-[#003300]">Signal Coverage</span>
                    Percentage of the Milky Way volume reached by our radio transmissions since the invention of the technology.
                </div>
                <div>
                    <span className="text-white font-bold block mb-2 text-sm border-b border-[#003300]">Effective L</span>
                    The actual lifespan of a civilization, adjusted for the annual catastrophe factor (War, AI, Asteroids).
                </div>
            </div>
          </div>

        </div>
      </main>

      {/* Scenario Modal */}
      {showScenario && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
          <div className="bg-black border-2 border-[#00FF00] max-w-2xl w-full p-1 relative shadow-[0_0_50px_rgba(0,255,0,0.2)]">
             
             <div className="bg-[#003300] text-[#00FF00] p-2 font-bold flex justify-between items-center mb-4 border-b border-[#00FF00]">
               <span className="animate-pulse">/// INCOMING TRANSMISSION ///</span>
               <button 
                 onClick={() => setShowScenario(false)}
                 className="text-[#00FF00] hover:text-white font-bold"
               >
                 [X] TERMINATE
               </button>
             </div>
             
             {isLoading ? (
               <div className="p-12 text-center">
                 <p className="text-xl font-bold text-[#00FF00] animate-pulse">DECODING SIGNAL...</p>
                 <div className="mt-4 w-full bg-[#001100] h-2 border border-[#004400]">
                    <div className="h-full bg-[#00FF00] animate-[width_2s_ease-in-out_infinite]" style={{width: '50%'}}></div>
                 </div>
               </div>
             ) : (
               scenarioData && (
                 <div className="p-6">
                    <h2 
                      className="text-3xl font-bold mb-6 border-b border-dashed border-[#555] pb-2 uppercase"
                      style={{ color: scenarioData.color }}
                    >
                      {scenarioData.title}
                    </h2>
                    <p className="text-lg md:text-xl leading-relaxed font-bold text-justify mb-8 text-white font-mono">
                      "{scenarioData.description}"
                    </p>
                    <div className="bg-[#111] p-3 text-xs font-mono border border-[#333] flex justify-between text-[#888]">
                      <span>ORIGIN: AI CORE</span>
                      <span>CONFIDENTIALITY: MAXIMUM</span>
                    </div>
                 </div>
               )
             )}
             
             <div className="p-4 flex justify-end bg-[#001100]">
               <button 
                 onClick={() => setShowScenario(false)}
                 className="border border-[#00FF00] text-[#00FF00] px-6 py-2 font-bold hover:bg-[#00FF00] hover:text-black transition-colors uppercase"
               >
                 ARCHIVE REPORT
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;