# Star Synthesizer 

**An interactive audio-visual experiment exploring the sonification of stellar astrophysics.**

The **Star Synthesizer** is a web-based application that allows users to generate and manipulate a star in real-time. By adjusting fundamental astrophysical parameters—Temperature, Mass, Metallicity, and Age—the application renders a scientifically inspired visual representation on an HTML5 Canvas and generates a corresponding soundscape using the Web Audio API.

##  Features

*   **Real-time Visualization:** High-performance HTML5 Canvas rendering of stellar bodies, including coronal glow, core color (based on Kelvin temperature), and stellar wind particle systems.
*   **Procedural Audio Engine:** A robust synthesizer built with the native Web Audio API that generates sound in real-time without using pre-recorded samples.
*   **Data Sonification:** Each visual and physical parameter maps directly to specific audio synthesis techniques, grounded in scientific analogies.
*   **Sci-Fi UI:** A responsive, "dashboard-style" interface with real-time data feedback.

##  The Science Behind the Sound

This project uses **Data Sonification** to translate physical properties into audible characteristics:

### 1. Temperature (Kelvin) → Pitch
*   **The Science:** According to **Wien's Displacement Law**, hotter objects emit radiation at shorter wavelengths (higher frequencies/blue), while cooler objects emit at longer wavelengths (lower frequencies/red).
*   **The Sound:** A sine wave oscillator where 2,000K maps to a low, deep drone (~65Hz) and 30,000K maps to a high-pitched tone (~880Hz).

### 2. Mass (Solar Masses) → Stellar Wind (Noise)
*   **The Science:** Massive stars (like Wolf-Rayet stars) drive violent stellar winds due to intense radiation pressure. Low-mass stars are relatively quiet.
*   **The Sound:** Generated using **Pink Noise** passed through a low-pass filter and a **WaveShaper Distortion** node.
    *   *Low Mass:* Gentle, wind-like hiss.
    *   *High Mass:* Aggressive, distorted "roar" simulating nuclear instability and supersonic winds.

### 3. Metallicity (Index) → Timbre
*   **The Science:** In astronomy, "metals" are any elements heavier than Helium. High metallicity creates complex absorption lines in a star's spectrum, making the light "dirtier" or more complex.
*   **The Sound:** Implemented via **FM Synthesis** (Frequency Modulation).
    *   *Low Metallicity:* A pure, clean sine wave (primordial star).
    *   *High Metallicity:* Complex, metallic, inharmonic overtones.

### 4. Age (Billions of Years) → Stability (LFO)
*   **The Science:** Stars evolve dynamically.
    *   *Protostars (Young):* Unstable, chaotic gravitational collapse.
    *   *Main Sequence (Middle):* Hydrostatic equilibrium (stable).
    *   *Red Giants (Old):* Unstable expansion and contraction (pulsation).
*   **The Sound:** Mapped to **Low Frequency Oscillators (LFOs)** controlling Amplitude (Tremolo) and Pitch (Vibrato).
    *   *Young:* Fast, chaotic fluttering.
    *   *Middle:* Silence/Stability.
    *   *Old:* Slow, deep, heavy breathing/pulsation.

##  Controls

1.  **Initialize Audio:** Click the button in the header or the center overlay to start the Audio Context (browser requirement).
2.  **Temperature Slider:** Changes color from Red to Blue and pitch from Low to High.
3.  **Mass Slider:** Increases star size, particle speed, and adds distorted noise layers.
4.  **Metallicity Slider:** Changes the "texture" of the sound from smooth to metallic.
5.  **Age Slider:**
    *   *Left (0-2 Ga):* Rapid fluttering sound.
    *   *Center (5 Ga):* Stable, steady tone.
    *   *Right (8-13 Ga):* Slow, rhythmic pulsing.
