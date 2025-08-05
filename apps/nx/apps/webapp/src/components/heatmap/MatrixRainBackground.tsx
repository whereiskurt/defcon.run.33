'use client';

import { useEffect, useRef } from 'react';

interface MatrixRainBackgroundProps {
  isActive: boolean;
}

export function MatrixRainBackground({ isActive }: MatrixRainBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Matrix characters (katakana + numbers + symbols)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
    const charArray = chars.split('');

    // Resize canvas to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fontSize = 20; // Larger characters
    const columns = Math.floor(canvas.width / fontSize);
    const drops: number[] = Array(columns).fill(1);

    const draw = () => {
      // Black background with transparency for trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff00';
      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Different shades of green for depth - more bright characters
        const alpha = Math.random();
        if (alpha > 0.85) {
          ctx.fillStyle = '#ffffff'; // Bright white (more frequent)
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00ff00';
        } else if (alpha > 0.3) {
          ctx.fillStyle = '#00ff00'; // Standard bright green (more frequent)
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff00';
        } else {
          ctx.fillStyle = '#00cc00'; // Lighter green instead of dark
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00aa00';
        }

        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        // Reset drop to top randomly or when it reaches bottom
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const animate = () => {
      draw();
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[1]"
      style={{ 
        opacity: 0.55,
        mixBlendMode: 'screen'
      }}
    />
  );
}