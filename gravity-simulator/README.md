# Gravity Lens Simulator

## Abstract

The Gravity Lens Simulator is a web-based physics visualization engine capable of rendering real-time interactions between massive bodies and particulate matter. It creates a composite visualization by layering a Newtonian gravitational physics engine over a geometric distortion renderer that simulates the optical effects of General Relativity (Gravitational Lensing).

## 1. Physics Engine Implementation

The core movement of particles is governed by classical mechanics. The simulation operates in a 2D Euclidean space where the "Black Hole" acts as a point mass attractor.

### 1.1 Gravitational Acceleration
The simulation applies Newton's Law of Universal Gravitation. For every frame $t$, the force $\vec{F}$ acting on a particle at position $\vec{p}$ relative to the singularity at $\vec{s}$ is calculated as:

$$ \vec{r} = \vec{s} - \vec{p} $$
$$ r = ||\vec{r}|| $$
$$ \vec{a} = G \cdot \frac{M}{r^2} \cdot \hat{r} $$

Where:
*   $G$ is the gravitational constant (user-adjustable).
*   $M$ is the mass of the singularity (user-adjustable).
*   $\hat{r}$ is the normalized direction vector pointing to the singularity.

To prevent numerical singularities when $r \to 0$ (which would result in infinite acceleration and "teleporting" particles), the force magnitude is clamped to a maximum value, and particles entering the Event Horizon radius are culled from the simulation entirely.

### 1.2 Time Integration
The simulation uses a semi-implicit Euler integration method to update the state of each particle:

$$ \vec{v}_{t+1} = \vec{v}_t + \vec{a} \cdot \Delta t $$
$$ \vec{p}_{t+1} = \vec{p}_t + \vec{v}_{t+1} \cdot \Delta t $$

The $\Delta t$ factor is controlled by the "Time Dilation" parameter, allowing the user to slow down or speed up the integration steps without affecting the underlying forces.

### 1.3 Orbital Injection Logic
When a user spawns particles via a mouse click, the system calculates the exact velocity vector required to place the particle in a stable circular orbit at its spawn radius. This is derived from the centripetal force equation:

$$ \frac{v^2}{r} = \frac{GM}{r^2} \implies v_{orbit} = \sqrt{\frac{GM}{r}} $$

The velocity vector is applied tangentially to the radius vector. A small randomized scalar is added to this velocity to produce a variety of elliptical and hyperbolic trajectories rather than perfect circles.

## 2. Optical Distortion Engine (Lensing)

Unlike ray-tracing engines which simulate individual photons, this application uses a Vertex Displacement algorithm to simulate the warping of spacetime. This approach is significantly more performant for real-time web rendering.

### 2.1 The Distortion Field
The background grid represents the fabric of spacetime. For every node $(x, y)$ on the grid, the rendering engine calculates a displacement vector based on its proximity to the singularity.

The lensing radius $R_L$ is defined as a function of the mass:
$$ R_L = k \cdot \sqrt{M} $$

For a grid point at distance $d$ from the singularity, if $d < R_L$, the displacement magnitude $D$ is calculated using an inverse cubic falloff:

$$ factor = \frac{d}{R_L} $$
$$ pull = (1 - factor)^3 $$
$$ D = pull \cdot (R_L \cdot C) $$

Where $C$ is a scaling constant for visual intensity.

### 2.2 Grid Rendering
The grid is not a static image but a procedurally generated mesh drawn every frame.
1.  **Input**: A grid of coordinates $(x, y)$ spaced by the `Grid Density` parameter.
2.  **Transformation**: The Distortion Field function maps $(x, y) \to (x', y')$.
3.  **Rendering**: Lines are drawn connecting the transformed coordinates $(x', y')$.

To optimize performance on high-resolution displays, the engine utilizes a dynamic step size ($S$). If the curvature is low, $S$ increases to reduce draw calls. If curvature is high, $S$ decreases to maintain smooth geometric lines.

## 3. Technical Architecture

### 3.1 React & Canvas Ref Pattern
The application avoids React's standard state reconciliation cycle for the main render loop. Instead, it utilizes the `useRef` hook to maintain mutable references to the physics state (particle arrays, mouse position). This allows the animation loop to run at the native refresh rate of the monitor (typically 60Hz or 144Hz) without triggering React re-renders.

### 3.2 Computational Optimization
Square roots are computationally expensive operations. The engine optimizes collision detection and lensing checks by working in "squared space":

*   Instead of checking `if (Math.sqrt(dx*dx + dy*dy) < radius)`,
*   The system pre-calculates `radiusSq = radius * radius`
*   And checks `if ((dx*dx + dy*dy) < radiusSq)`.

This reduces the complexity of the per-pixel operations inside the rendering loop significantly.

## 4. User Parameters

*   **Black Hole Mass (M)**: The scalar value representing the mass of the singularity. This directly influences both the Schwarzschild radius (Event Horizon size) and the gravitational acceleration.
*   **Gravity Constant (G)**: A global multiplier for the gravitational force. Increasing this strengthens the pull without increasing the visual size of the black hole, resulting in faster orbital velocities.
*   **Grid Density**: Controls the spatial resolution of the background grid. Lower values result in a tighter mesh, allowing for visualization of finer distortion details near the horizon.
*   **Time Dilation**: A scalar multiplier for the simulation time step ($\Delta t$).

## 5. Installation and Setup

This project is built with React 19 and Tailwind CSS.

1.  **Clone the repository**
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run the development environment**:
    ```bash
    npm start
    ```
