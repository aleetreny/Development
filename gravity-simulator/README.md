# Gravity Lens Simulator

## Abstract

Gravity Lens Simulator is a high-performance, interactive web application that visualizes the behavior of particles under intense gravitational fields. Built with React 19, TypeScript, and the HTML5 Canvas API, it combines Newtonian orbital mechanics with an artistic approximation of gravitational lensing to create a visually striking and interactive "spacetime sandbox."

This project prioritizes frame rate (60 FPS), interactivity, and stable orbital mechanics over the strict tensor calculus required for General Relativity simulations.

---

## Physics Engine: Newtonian Mechanics

To ensure a smooth simulation where particles can orbit stably for long periods (creating satisfying "spirograph" patterns), the engine utilizes classical mechanics rather than General Relativity.

### 1. The Gravity Model
We use Newton's Law of Universal Gravitation with a softened core to prevent numerical singularities:

$$\vec{F} = G \frac{M \cdot m}{r^2} \hat{r}$$

* **Why Newton?** In General Relativity (Schwarzschild metric), stable orbits only exist outside the ISCO (3x Schwarzschild Radius). Any particle crossing that limit spirals inward immediately. While physically correct, this makes for a frustrating "game" experience where particles die too quickly.
* **The "Fun" Factor:** Newtonian gravity allows for stable elliptical orbits at any distance, permitting users to create complex swarms of particles that remain on screen.

### 2. Numerical Integration (Semi-Implicit Euler)
The simulation advances time using the Semi-Implicit Euler method (also known as Symplectic Euler).

* **Step 1 (Velocity):** `v(t+1) = v(t) + a(t) * dt`
* **Step 2 (Position):** `r(t+1) = r(t) + v(t+1) * dt`
  
**Trade-off:** While less precise than Runge-Kutta 4 (RK4) or Velocity Verlet regarding energy conservation over hours of simulation, Symplectic Euler is exceptionally fast and stable enough for real-time visual usage.

---

## Rendering Engine: Artistic Lensing

Real-time ray-tracing of curved spacetime is computationally prohibitive for a browser-based 2D Canvas application. Instead, we use a geometric vertex displacement technique to approximate the look of gravitational lensing.

### The Algorithm
Instead of calculating the actual bending of light rays ($\alpha \approx 4GM/c^2b$), the grid background is distorted using a radial interpolation function:

1.  **Grid Generation:** A high-density grid of points is generated.
2.  **Radial Falloff:** For every point, the distance $d$ from the gravity well is calculated.
3.  **Displacement:** Points within a "Lensing Radius" are pulled toward the center using a cubic easing function:

    $$\text{Pull Factor} = \left( 1 - \frac{d}{R_{lens}} \right)^3$$

**Visual Result:** This creates the characteristic "magnifying glass" and "pinching" effect associated with black holes, purely as a visual shader effect, without impacting the actual physics of the particles.

---

## Controls & Features

The simulation is designed to be a "toy" for exploration.

* **Orbital Injection (Click):** Clicking anywhere on the canvas spawns a particle.
    * **Smart Velocity:** The engine automatically calculates the tangent velocity required for a perfect circular orbit at that distance ($v = \sqrt{GM/r}$), ensuring particles don't just crash immediately.
* **Mass Slider:** Increases the central mass. This creates stronger gravity and expands the visual lensing radius.
* **Time Scale:** Allows for slow-motion observation or fast-forwarding the orbital evolution.
* **Grid Density:** Adjusts the resolution of the background spacetime fabric.

---

## Technical Stack

* **Core Framework:** React 19 (Hooks based architecture)
* **Language:** TypeScript 5.0 (Strict typing for vector math)
* **Build Tool:** Vite (Hot Module Replacement)
* **Rendering:** HTML5 Canvas Context 2D (Optimized for massive particle counts)
* **Styling:** TailwindCSS

---

## Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone [https://github.com/your-username/gravity-simulator.git](https://github.com/your-username/gravity-simulator.git)
    cd gravity-simulator
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  **Build for production:**
    ```bash
    npm run build
    ```

---

## Limitations & Honesty

In the interest of scientific transparency, users should be aware of the following divergences from reality:

1.  **No Event Horizon:** Particles can pass through the center (though a clamp prevents division by zero).
2.  **Speed of Light:** The "speed limit" in the code is a hard clamp (`if v > c then v = c`), not a relativistic mass increase.
3.  **2D Plane:** The simulation assumes a 2D universe; 3D orbital inclination is not simulated.

*Created as an exploration of canvas performance and physics algorithms.*
