"use client";
import { useEffect, useRef } from 'react';
import { useTheme } from '@/context/ThemeContext';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVx: number;
  baseVy: number;
  color: string;
  size: number;
  angle: number;
}

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false, vx: 0, vy: 0 };
    let lastMouse = { x: mouse.x, y: mouse.y };

    // Google-esque brand colors from Antigravity SS
    const colors = ['#EA4335', '#FBBC05', '#34A853', '#4285F4', '#A142F4', '#FF6D00', '#F4B400', '#DB4437'];
    const darkThemeAlpha = 0.8;
    const lightThemeAlpha = 0.6;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const particleCount = Math.floor((canvas.width * canvas.height) / 8000);
      particles = [];

      for (let i = 0; i < particleCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.5 + 0.1;
        
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          baseVx: Math.cos(angle) * speed,
          baseVy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 2 + 1,
          angle
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const globalAlpha = theme === 'dark' ? darkThemeAlpha : lightThemeAlpha;
      ctx.globalAlpha = globalAlpha;

      // Mouse velocity calculation
      mouse.vx = mouse.x - lastMouse.x;
      mouse.vy = mouse.y - lastMouse.y;
      lastMouse.x = mouse.x;
      lastMouse.y = mouse.y;

      particles.forEach((p) => {
        // Antigravity mouse interaction
        if (mouse.active) {
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 200;

          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            
            // Push particles away aggressively, combining positional escape with mouse velocity slipstream
            p.vx += (dx / distance) * force * 0.5 + mouse.vx * force * 0.02;
            p.vy += (dy / distance) * force * 0.5 + mouse.vy * force * 0.02;
          }
        }

        // Apply friction to return to base velocity
        p.vx += (p.baseVx - p.vx) * 0.05;
        p.vy += (p.baseVy - p.vy) * 0.05;

        // Move
        p.x += p.vx;
        p.y += p.vy;

        // Calculate current angle based on actual velocity
        const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        const currentAngle = Math.atan2(p.vy, p.vx);
        
        // The streak gets longer the faster it moves (up to a cap)
        const streakLength = Math.min(currentSpeed * 4 + 2, 20);

        // Screen wrap
        if (p.x < -20) p.x = canvas.width + 20;
        if (p.x > canvas.width + 20) p.x = -20;
        if (p.y < -20) p.y = canvas.height + 20;
        if (p.y > canvas.height + 20) p.y = -20;

        // Draw particle streak
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineWidth = p.size;
        ctx.strokeStyle = p.color;
        
        // Draw a line from (x, y) extending backwards along its velocity vector
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - Math.cos(currentAngle) * streakLength, p.y - Math.sin(currentAngle) * streakLength);
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0; // reset
      animationFrameId = requestAnimationFrame(draw);
    };

    const handleResize = () => { init(); };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };
    const handleMouseLeave = () => { mouse.active = false; };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    init();
    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
        transition: 'opacity 0.5s ease',
        background: 'transparent'
      }}
    />
  );
}
