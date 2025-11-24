import React, { useRef, useEffect, useCallback } from 'react';
import { Vector2, Particle } from '../types';
import { 
  EVENT_HORIZON_RADIUS, 
  ACCRETION_DISK_RADIUS,
  GRID_COLOR,
  MAX_PARTICLES
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

  const spawnParticle = (x: number, y: number, aimTowardsMouse: boolean = true) => {
    if (particlesRef.current.length >= MAX_PARTICLES) return;

    let vx = (Math.random() - 0.5) * 2;
    let vy = (Math.random() - 0.5) * 2;

    if (aimTowardsMouse) {
      const dx = mousePosRef.current.x - x;
      const dy = mousePosRef.current.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      
      // Calculate orbital velocity for a circular orbit: v = sqrt(GM/r)
      // We scale G by 1000 to match pixel space physics
      const physicsG = gConstant * 1000;
      const orbitalSpeed = Math.sqrt((physicsG * massMultiplier) / dist);

      // Tangent vector (perpendicular to radius)
      // If radius is (dx, dy), tangent is (-dy, dx) or (dy, -dx)
      // We add a slight random variation to create elliptical orbits
      const angle = Math.atan2(dy, dx);
      const tangentAngle = angle + (Math.PI / 2); 

      // Apply velocity
      vx = Math.cos(tangentAngle) * orbitalSpeed;
      vy = Math.sin(tangentAngle) * orbitalSpeed;
    }

    const newParticle: Particle = {
      id: Date.now() + Math.random(),
      pos: { x, y },
      vel: { x: vx, y: vy },
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
      // Only reset mouse if it hasn't been moved yet
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
      
      // Clear with deep black
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);

      // --- 1. Draw Distorted Grid (Lensing Effect) ---
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      // Lensing Radius is now purely a function of Mass. 
      const lensingReach = 120 * Math.sqrt(massMultiplier);
      const lensingReachSq = lensingReach * lensingReach; // Pre-calculate squared for performance
      
      const eventHorizonR = EVENT_HORIZON_RADIUS * Math.sqrt(massMultiplier);
      const eventHorizonRSq = eventHorizonR * eventHorizonR;

      const getDistortedPos = (ox: number, oy: number): Vector2 => {
        const dx = ox - mouse.x;
        const dy = oy - mouse.y;
        
        // Performance Optimization: Use squared distance first to avoid expensive Sqrt
        const distSq = dx * dx + dy * dy;
        
        // Only calculate distortion if within range and outside event horizon
        if (distSq < lensingReachSq && distSq > eventHorizonRSq) {
            const dist = Math.sqrt(distSq);
            
            // "Einstein Ring" style distortion
            // The closer to the mass, the more space is "pulled" in visually
            const factor = dist / lensingReach; // 0 to 1
            
            // Inverse cubic function for sharp distortion near center
            const pullStrength = Math.pow(1 - factor, 3);
            
            // How many pixels to shift
            const distortionAmount = pullStrength * (lensingReach * 0.4);
            
            const angle = Math.atan2(dy, dx);
            
            // Pull points TOWARDS the black hole to simulate space curvature
            return {
                x: ox - Math.cos(angle) * distortionAmount,
                y: oy - Math.sin(angle) * distortionAmount
            };
        }
        return { x: ox, y: oy };
      };

      // Draw Horizontal Lines using dynamic gridSpacing
      // Optimization: Increased step size for performance on high-res screens
      // Was gridSpacing / 3, changed to gridSpacing / 1.5 with a higher min floor
      const drawStep = Math.max(20, gridSpacing / 1.5); 

      for (let y = 0; y <= height; y += gridSpacing) {
        let first = true;
        for (let x = 0; x <= width; x += drawStep) { 
          const p = getDistortedPos(x, y);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }

      // Draw Vertical Lines
      for (let x = 0; x <= width; x += gridSpacing) {
        let first = true;
        for (let y = 0; y <= height; y += drawStep) {
          const p = getDistortedPos(x, y);
          if (first) {
            ctx.moveTo(p.x, p.y);
            first = false;
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
      }
      ctx.stroke();

      // --- 2. Physics & Particle Rendering ---
      const activeParticles: Particle[] = [];
      const horizonRadiusSq = eventHorizonR * eventHorizonR;
      
      // Physics Constants
      // G scaled up for pixel coordinates
      const G = gConstant * 1000; 
      // Softening parameter to prevent division by zero (singularity), but kept very small for robustness
      const SOFTENING = 100; 

      particlesRef.current.forEach(p => {
        const dx = mouse.x - p.pos.x;
        const dy = mouse.y - p.pos.y;
        const distSq = dx * dx + dy * dy;

        // --- Event Horizon Absorption ---
        // If particle enters the Schwarzschild radius, it is lost forever.
        if (distSq < horizonRadiusSq) {
          return; // Remove particle
        }

        const dist = Math.sqrt(distSq);

        // --- Newtonian Gravity Logic ---
        // F = G * M / r^2
        // We calculate acceleration directly (assuming particle mass = 1)
        // a = F
        const forceMagnitude = (G * massMultiplier) / (distSq + SOFTENING);
        
        // Clamp force to prevent integration errors at high speeds/close distances
        // This stops particles from teleporting across the screen in one frame
        const clampedForce = Math.min(forceMagnitude, 5.0); 

        const ax = (dx / dist) * clampedForce;
        const ay = (dy / dist) * clampedForce;

        p.vel.x += ax * timeScale;
        p.vel.y += ay * timeScale;

        p.pos.x += p.vel.x * timeScale;
        p.pos.y += p.vel.y * timeScale;

        // History optimization
        p.history.push({ ...p.pos });
        if (p.history.length > 25) {
          p.history.shift();
        }

        // Draw Trail
        if (p.history.length > 1) {
          ctx.beginPath();
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.moveTo(p.history[0].x, p.history[0].y);
          for (let i = 1; i < p.history.length; i++) {
             // Fade out tail
             ctx.globalAlpha = (i / p.history.length) * 0.6;
             ctx.lineTo(p.history[i].x, p.history[i].y);
          }
          ctx.stroke();
          ctx.globalAlpha = 1.0;
        }

        // Draw Head (Star)
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Screen bounds check (keep them longer to allow large elliptical orbits)
        if (p.pos.x > -3000 && p.pos.x < width + 3000 && p.pos.y > -3000 && p.pos.y < height + 3000) {
          activeParticles.push(p);
        }
      });

      particlesRef.current = activeParticles;

      // --- 3. Draw Black Hole / Attractor ---
      const accretionRadius = ACCRETION_DISK_RADIUS * Math.sqrt(massMultiplier);
      
      // Accretion Disk Glow
      const gradient = ctx.createRadialGradient(mouse.x, mouse.y, eventHorizonR, mouse.x, mouse.y, accretionRadius * 2);
      gradient.addColorStop(0, '#ffffff'); // Inner rim
      gradient.addColorStop(0.05, '#fff'); 
      gradient.addColorStop(0.15, 'rgba(34, 211, 238, 1)'); // Cyan
      gradient.addColorStop(0.4, 'rgba(6, 182, 212, 0.3)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, accretionRadius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Event Horizon (Pure Black)
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, eventHorizonR, 0, Math.PI * 2);
      ctx.fill();
      
      // Photon Ring (Thin white line around horizon)
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [handleResize, massMultiplier, gConstant, gridSpacing, timeScale]);

  const handleMouseMove = (e: React.MouseEvent) => {
    mousePosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Spawn burst
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