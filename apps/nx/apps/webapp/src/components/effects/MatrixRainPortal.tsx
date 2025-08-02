'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface MatrixRainPortalProps {
  duration?: number; // Duration in milliseconds
  onComplete?: () => void;
}

export default function MatrixRainPortal({ duration = 3000, onComplete }: MatrixRainPortalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Matrix characters - mix of letters, numbers, and symbols
    const matrixChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()_+-=[]{}|;:,.<>?/~`デファコン';
    const fontSize = 16;
    const columns = canvas.width / fontSize;

    // Array to track position of drops for each column
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start some drops off-screen
    }

    // Colors for the matrix effect
    const colors = [
      '#00FF00', // Bright green
      '#00DD00', // Medium green
      '#00BB00', // Darker green
      '#009900', // Even darker
      '#007700', // Fading
    ];

    let animationId: number;
    const startTime = Date.now();

    const draw = () => {
      // Check if duration has passed
      if (Date.now() - startTime > duration) {
        setIsActive(false);
        if (onComplete) onComplete();
        return;
      }

      // Add semi-transparent black to create fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text properties
      ctx.font = `${fontSize}px monospace`;

      // Draw characters
      for (let i = 0; i < drops.length; i++) {
        // Pick a random character
        const char = matrixChars[Math.floor(Math.random() * matrixChars.length)];
        
        // Pick color based on position (newer drops are brighter)
        const colorIndex = Math.min(Math.floor(drops[i] / 5), colors.length - 1);
        ctx.fillStyle = drops[i] < 5 ? '#FFFFFF' : colors[Math.max(0, colorIndex)];
        
        // Draw the character
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        // Reset drop to top when it goes off screen
        // Add some randomness to make it look more organic
        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }

        // Move drop down
        drops[i]++;
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    // Handle window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [duration, onComplete, mounted]);

  if (!isActive || !mounted) return null;

  const content = (
    <div 
      className="fixed inset-0 pointer-events-none"
      style={{ 
        zIndex: 2147483647, // Maximum z-index value
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ 
          background: 'rgba(0, 0, 0, 0.7)',
          position: 'absolute',
          top: 0,
          left: 0
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div 
          className="px-12 py-6 rounded-lg animate-pulse"
          style={{
            background: 'rgba(0, 0, 0, 0.95)',
            border: '2px solid #00FF00',
            boxShadow: '0 0 40px rgba(0, 255, 0, 0.8), inset 0 0 20px rgba(0, 255, 0, 0.3)',
          }}
        >
          <p 
            className="text-3xl font-mono font-bold"
            style={{
              color: '#00FF00',
              textShadow: '0 0 10px #00FF00, 0 0 20px #00FF00',
              letterSpacing: '0.2em'
            }}
          >
            DEFCON.RUN ACCOMPLISHMENT ADDED
          </p>
          <p 
            className="text-center text-sm font-mono mt-2"
            style={{
              color: '#00DD00',
              textShadow: '0 0 5px #00DD00'
            }}
          >
            WAY TO GET GOING
          </p>
        </div>
      </div>
    </div>
  );

  // Use createPortal to render outside of the modal hierarchy
  return createPortal(content, document.body);
}