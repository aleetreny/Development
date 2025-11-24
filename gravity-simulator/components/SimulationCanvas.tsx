import React, { useRef, useEffect, useCallback } from 'react';
import { Vector2, Particle } from '../types';
import { 
  SPEED_OF_LIGHT,
  GRID_COLOR,
  MAX_PARTICLES,
  MAX_SPEED
} from '../constants';

interface SimulationCanvasProps {
  massMultiplier: number;
  gConstant: number;
  gridSpacing: number;
  timeScale: number;
}

const SimulationCanvas: React.FC<SimulationCanvasProps> = ({ 
  massMultiplier,
  gConstant,
  gridSpacing,
  timeScale
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  // Mutable state for the physics engine
  const particlesRef = useRef<Particle[]>([]);
  const mousePosRef = useRef<Vector2>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const dimensionsRef = useRef<{ width: number, height: number }>({ width: 0, height: 0 });

  // Helper to calculate Schwarzschild Radius
  // Rs = 2GM / c^2
  const getSchwarzschildRadius = useCallback((mass: number, g: number) => {
    // We scale G by 1000 for pixel-space units, consistent with previous versions
    return (2 * (g * 1000) * mass) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
  }, []);

  const spawnParticle = (x: number, y: number, aimTowardsMouse: boolean = true) => {
    if (particlesRef.current.length >= MAX_PARTICLES) return;

    let vx = (Math.random() - 0.5) * 2;
    let vy = (Math.random() - 0.5) * 2;
    let ax = 0;
    let ay = 0;

    const Rs = getSchwarzschildRadius(massMultiplier, gConstant);
    const physicsG = gConstant * 1000;
    const GM = physicsG * massMultiplier;

    if (aimTowardsMouse) {
      const dx = mousePosRef.current.x - x;
      const dy = mousePosRef.current.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // RELATIVISTIC ORBITAL INJECTION
      // Based on Paczyński-Wiita potential centrifugal balance:
      // v^2 / r = F_g(r)
      // v^2 / r = GM / (r - Rs)^2
      // v = sqrt( (GM * r) / (r - Rs)^2 )
      
      // Prevent spawning inside or too close to horizon
      if (dist > Rs * 1.1) {
          const denominator = Math.pow(dist - Rs, 2);
          const orbitalSpeedSq = (GM * dist) / denominator;
          let orbitalSpeed = Math.sqrt(orbitalSpeedSq);

          // Cap speed at light speed (sanity check)
          orbitalSpeed = Math.min(orbitalSpeed, SPEED_OF_LIGHT * 0.95);

          const angle = Math.atan2(dy, dx);
          const tangentAngle = angle + (Math.PI / 2); 

          vx = Math.cos(tangentAngle) * orbitalSpeed;
          vy = Math.sin(tangentAngle) * orbitalSpeed;

          // Calculate initial acceleration for the very first frame of Verlet
          // F = GM / (r - Rs)^2
          const distFromHorizon = dist - Rs;
          const safeDist = Math.max(distFromHorizon, 1.0);
          const forceMagnitude = GM / (safeDist * safeDist);
          // Clamp force
          const clampedForce = Math.min(forceMagnitude, 50.0);
          
          ax = (dx / dist) * clampedForce;
          ay = (dy / dist) * clampedForce;
      }
    }

    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      pos: { x, y },
      vel: { x: vx, y: vy },
      acc: { x: ax, y: ay },
      history: [],
      color: `hsl(${180 + Math.random() * 60}, 100%, 85%)`
    };
    particlesRef.current.push(newParticle);
  };

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      const { innerWidth, innerHeight } = window;
      canvasRef.current.width = innerWidth;
      canvasRef.current.height = innerHeight;
      dimensionsRef.current = { width: innerWidth, height: innerHeight };
      if (mousePosRef.current.x === 0 && mousePosRef.current.y === 0) {
        mousePosRef.current = { x: innerWidth / 2, y: innerHeight / 2 };
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    handleResize();

    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      const mouse = mousePosRef.current;
      
      // Physics Constants for this frame
      const physicsG = gConstant * 1000; 
      const GM = physicsG * massMultiplier;
      const Rs = getSchwarzschildRadius(massMultiplier, gConstant);
      
      // ISCO (Innermost Stable Circular Orbit) is at 3 * Rs in this potential
      // Photon Sphere is at 1.5 * Rs (approx)
      const photonSphereR = Rs * 1.5;
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // --- 1. Relativistic Lensing (Einstein Deflection) ---
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Einstein Radius approximation for visuals: theta_E ~ sqrt(4GM/c^2 * ... geometric terms)
      // Visual displacement D ~ 1/b (impact parameter)
      const einsteinDeflectionConstant = (4 * physicsG * massMultiplier) / (SPEED_OF_LIGHT * SPEED_OF_LIGHT);
      
      // Multiplier to make the effect visible on screen pixels
      const visualLensingScale = 300; 

      const getRelativisticDistortion = (ox: number, oy: number): Vector2 => {
        const dx = ox - mouse.x;
        const dy = oy - mouse.y;
        const distSq = dx * dx + dy * dy;

        // Optimization: Don't compute sqrt if far away
        if (distSq > 250000) return { x: ox, y: oy }; // > 500px away

        const dist = Math.sqrt(distSq);

        // Inside event horizon or very close? Don't lend, or absorb grid
        if (dist < Rs) {
             return { x: ox, y: oy }; 
        }

        // Einstein deflection angle alpha = 4GM / (c^2 * b)
        // Displacement on screen approx proportional to alpha
        const displacementMagnitude = (einsteinDeflectionConstant / dist) * visualLensingScale;
        
        const angle = Math.atan2(dy, dx);
        
        // Pull grid towards center (simulating light bending towards mass)
        // Limit displacement to avoid grid crossing itself inside the horizon visually
        const clampedDisplacement = Math.min(displacementMagnitude, dist - Rs);

        return {
            x: ox - Math.cos(angle) * clampedDisplacement,
            y: oy - Math.sin(angle) * clampedDisplacement
        };
      };

      const drawStep = Math.max(15, gridSpacing / 1.5); 

      // Horizontal Lines
      for (let y = 0; y <= height; y += gridSpacing) {
        let first = true;
        for (let x = 0; x <= width; x += drawStep) { 
          const p = getRelativisticDistortion(x, y);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }

      // Vertical Lines
      for (let x = 0; x <= width; x += gridSpacing) {
        let first = true;
        for (let y = 0; y <= height; y += drawStep) {
          const p = getRelativisticDistortion(x, y);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }
      ctx.stroke();

      // --- 2. Pseudo-Newtonian Physics (Velocity Verlet Integrator) ---
      const activeParticles: Particle[] = [];
      const horizonRadiusSq = Rs * Rs;
      
      // Time step logic
      const dt = timeScale;
      const dtSqHalf = 0.5 * dt * dt;

      particlesRef.current.forEach(p => {
        // --- STEP 1: Position Update ---
        // r(t+1) = r(t) + v(t)dt + 0.5 * a(t) * dt^2
        const nextX = p.pos.x + p.vel.x * dt + p.acc.x * dtSqHalf;
        const nextY = p.pos.y + p.vel.y * dt + p.acc.y * dtSqHalf;

        // --- STEP INTERMEDIATE: Horizon Check ---
        const dx = mouse.x - nextX;
        const dy = mouse.y - nextY;
        const distSq = dx * dx + dy * dy;

        // If particle has crossed the horizon, absorb it (do not update/render)
        if (distSq < horizonRadiusSq) {
          return; 
        }

        const dist = Math.sqrt(distSq);

        // --- STEP 2: Calculate New Force / Acceleration ---
        // Paczyński-Wiita Potential Force: F = GM / (r - Rs)^2
        const distFromHorizon = dist - Rs;
        
        // Safety epsilon to prevent division by zero at the exact singularity lip
        const safeDist = Math.max(distFromHorizon, 1.0); 
        
        const forceMagnitude = GM / (safeDist * safeDist);
        
        // Clamp force to avoid numerical explosion at the singularity lip
        const clampedForce = Math.min(forceMagnitude, 50.0);

        // New acceleration a(t+1)
        const nextAccX = (dx / dist) * clampedForce;
        const nextAccY = (dy / dist) * clampedForce;

        // --- STEP 3: Velocity Update ---
        // v(t+1) = v(t) + 0.5 * (a(t) + a(t+1)) * dt
        let nextVelX = p.vel.x + 0.5 * (p.acc.x + nextAccX) * dt;
        let nextVelY = p.vel.y + 0.5 * (p.acc.y + nextAccY) * dt;

        // Speed of light cap
        const currentSpeed = Math.sqrt(nextVelX * nextVelX + nextVelY * nextVelY);
        if (currentSpeed > MAX_SPEED) {
            const ratio = MAX_SPEED / currentSpeed;
            nextVelX *= ratio;
            nextVelY *= ratio;
        }

        // --- STEP 4: Update State ---
        p.pos.x = nextX;
        p.pos.y = nextY;
        p.vel.x = nextVelX;
        p.vel.y = nextVelY;
        
        // Update accumulator for next frame
        p.acc.x = nextAccX;
        p.acc.y = nextAccY;

        // History / Visuals
        p.history.push({ ...p.pos });
        if (p.history.length > 25) {
          p.history.shift();
        }

        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
             ctx.globalAlpha = (i / p.history.length) * 0.6;
             ctx.lineTo(p.history[i].x, p.history[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();

        if (p.pos.x > -3000 && p.pos.x < width + 3000 && p.pos.y > -3000 && p.pos.y < height + 3000) {
          activeParticles.push(p);
        }
      });

      particlesRef.current = activeParticles;

      // --- 3. Draw Black Hole (Relativistic Visuals) ---
      
      const accretionOuter = Rs * 4.0;
      const accretionInner = Rs * 1.1;

      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, accretionInner, mouse.x, mouse.y, accretionOuter);
      gradient.addColorStop(0, '#000'); 
      gradient.addColorStop(0.1, '#fff'); // Photon sphere intensity
      gradient.addColorStop(0.2, 'rgba(34, 211, 238, 1)'); // Hot inner disk
      gradient.addColorStop(0.6, 'rgba(6, 182, 212, 0.2)'); // Cooler outer disk
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, accretionOuter, 0, Math.PI * 2);
      ctx.fill();

      // The Shadow (Event Horizon)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, Rs, 0, Math.PI * 2);
      ctx.fill();
      
      // Photon Ring
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.8;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, photonSphereR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1.0;

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [handleResize, massMultiplier, gConstant, gridSpacing, timeScale, getSchwarzschildRadius]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    for(let i=0; i<12; i++) {
        const side = Math.floor(Math.random() * 4);
        let sx = 0, sy = 0;
        const w = window.innerWidth;
        const h = window.innerHeight;
        
        switch(side) {
            case 0: sx = Math.random() * w; sy = -50; break;
            case 1: sx = w + 50; sy = Math.random() * h; break;
            case 2: sx = Math.random() * w; sy = h + 50; break;
            case 3: sx = -50; sy = Math.random() * h; break;
        }
        spawnParticle(sx, sy);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      className="absolute top-0 left-0 w-full h-full cursor-none"
    />
  );
};

export default SimulationCanvas;