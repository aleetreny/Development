import { RetroPlanetParams } from '../types';

// Helper to seed random numbers for consistent generation if needed
const mulberry32 = (a: number) => {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

// Color Palettes map
const COLORS: Record<string, string> = {
    "Toxic Green": "#33ff00",
    "Deep Blue": "#0033ff",
    "Plasma Red": "#ff3333",
    "Void Black": "#111111",
    "Neon Pink": "#ff00ff",
    "Sulfur Yellow": "#ffff00",
    "No Atmosphere": "#000000",
    
    "Water": "#2244cc",
    "Molten Lava": "#cc2200",
    "Liquid Methane": "#00cccc",
    "Acid": "#88cc00",
    "Mercury": "#aaaaaa",
    "Blood": "#660000",
    "None": "#444444",

    "Jagged Mountains": "#554433",
    "Endless Deserts": "#ccaa66",
    "Fungal Forests": "#6600cc",
    "Crystal Spires": "#aaddff",
    "Bio-Mechanical Flesh": "#aa5555",
    "Metallic Cities": "#556677",
    "Obsidian Plains": "#111122"
};

export const buildLorePrompt = (params: RetroPlanetParams): string => {
  return `
    CONTEXT: You are the AI mainframe of a retro sci-fi exploration vessel.
    TASK: Generate a PLANETARY SCAN REPORT based on these parameters:
    ${JSON.stringify(params, null, 2)}

    Directives:
    - Be creative, weird, and a bit "trippy" (fumada).
    - Tone: Cold analysis mixed with cosmic horror or wonder.
    - Format: JSON only.

    Expected JSON Output:
    {
      "name": "Generated Name (e.g. XG-99 'Widow')",
      "designation": "Sector/Coords",
      "description": "Visual description of the landscape.",
      "history": "A bizarre myth or historical event that ruined or shaped this world.",
      "inhabitants": "Details on the ${params.dominantLifeForm} (Level: ${params.civilizationLevel}).",
      "resources": ["Strange Resource 1", "Strange Resource 2"]
    }
  `;
};

// The Procedural Pixel Drawer
export const drawPlanet = (canvas: HTMLCanvasElement, params: RetroPlanetParams) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = width * 0.35;

    // Clear
    ctx.fillStyle = '#050000';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Stars (Background)
    for(let i=0; i<50; i++) {
        ctx.fillStyle = Math.random() > 0.9 ? '#ff3333' : '#ffffff';
        const x = Math.random() * width;
        const y = Math.random() * height;
        ctx.fillRect(x, y, 1, 1);
    }

    // Planet colors derived from params
    const baseColor = COLORS[params.liquidType] || '#444444';
    const landColor = COLORS[params.surfaceFeature] || '#888888';
    const atmosColor = COLORS[params.atmosphereColor] || 'transparent';

    // Helper for noise
    const rand = mulberry32(Date.now()); 
    
    // Pixel Loop for Planet Body
    const pixelSize = 4; // Blocky feel
    
    for (let y = 0; y < height; y += pixelSize) {
        for (let x = 0; x < width; x += pixelSize) {
            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < radius) {
                // Shading (Spherical effect)
                const lightX = cx - radius * 0.5;
                const lightY = cy - radius * 0.5;
                const lightDist = Math.sqrt((x - lightX)**2 + (y - lightY)**2);
                let shade = 1 - (lightDist / (radius * 2.5));
                
                // Noise for terrain (Simulated)
                const noise = Math.sin(x * 0.05) + Math.cos(y * 0.05) + Math.random() * 0.5;
                const isLand = noise > 0.2; // Simple threshold

                // Base color selection
                ctx.fillStyle = isLand ? landColor : baseColor;
                
                // Apply atmosphere tint at edges
                if (dist > radius * 0.85 && atmosColor !== 'transparent' && atmosColor !== '#000000') {
                     ctx.fillStyle = atmosColor;
                }

                // Scanline effect/Dithering for shading
                if (Math.random() > shade + 0.2) {
                    ctx.fillStyle = '#000000'; // Shadow
                }

                ctx.fillRect(x, y, pixelSize, pixelSize);
            }
        }
    }

    // 2. Special Features
    if (params.skyFeature.includes("Ring")) {
        ctx.strokeStyle = atmosColor;
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.ellipse(cx, cy, radius * 1.8, radius * 0.4, Math.PI / 8, 0, Math.PI * 2);
        ctx.stroke();
    }

    // 3. Weird Features (Simple representation)
    if (params.weirdFeature.includes("Floating")) {
        ctx.fillStyle = landColor;
        for(let i=0; i<5; i++) {
            ctx.fillRect(cx + (Math.random()-0.5)*radius*2.5, cy + (Math.random()-0.5)*radius*2, 8, 4);
        }
    }

    // 4. Atmosphere Glow
    if (atmosColor !== '#000000') {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.2);
        grad.addColorStop(0, 'transparent');
        grad.addColorStop(1, atmosColor);
        ctx.fillStyle = grad;
        ctx.fillRect(0,0,width,height);
        ctx.restore();
    }
};