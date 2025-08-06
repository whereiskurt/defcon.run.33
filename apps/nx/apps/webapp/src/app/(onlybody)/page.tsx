'use client';

import Image from 'next/image';
import BunnyBlack from '@/public/login/bunny-face-dark.svg';

import { Text } from '@components/text-effects/Common';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';

// Simple Matrix Background Component
function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Matrix characters (katakana + numbers + symbols)
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()';
    const charArray = chars.split('');

    let columns = 0;
    let drops: number[] = [];

    // Resize canvas to match window
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      const fontSize = 20;
      columns = Math.floor(canvas.width / fontSize);
      drops = Array(columns).fill(1);
      
      // Initialize some drops at random heights for immediate effect
      for (let i = 0; i < drops.length; i++) {
        drops[i] = Math.floor(Math.random() * canvas.height / fontSize);
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const fontSize = 20;

    const draw = () => {
      // Clear with lower alpha for longer trails
      ctx.fillStyle = 'rgba(0, 0, 0, 0.035)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `bold ${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        // Random character
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        
        // Different shades of green for depth - more bright characters
        const alpha = Math.random();
        if (alpha > 0.85) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00ff00';
        } else if (alpha > 0.3) {
          ctx.fillStyle = '#00ff00';
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#00ff00';
        } else {
          ctx.fillStyle = '#00cc00';
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
  }, []);

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

export default function Home() {
  const router = useRouter();

  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          router.push('/dashboard');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <>
      <MatrixBackground />
      <div className="fixed inset-0 flex flex-col justify-center items-center bg-black text-white z-10">
        <Text variant="large" className="p-10 text-center">
          Run. Defcon. Run.
        </Text>
        <div className="flex justify-center items-center">
          <Image alt="Bunny" priority={true} src={BunnyBlack} />
        </div>
        <Text variant="large" className="p-10 text-center">
          Redirecting in {countdown}...
        </Text>
      </div>
    </>
  );
}
