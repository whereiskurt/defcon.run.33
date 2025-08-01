'use client';

import { useEffect, useState } from 'react';
import styles from './MatrixLoader.module.css';

interface MatrixLoaderProps {
  onComplete?: () => void;
}

export default function MatrixLoader({ onComplete }: MatrixLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Ensure minimum 2 second display time
    const timer = setTimeout(() => {
      setIsComplete(true);
      onComplete?.();
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={styles.matrixContainer}>
      <div className={styles.matrix}>
        {Array.from({ length: 40 }, (_, i) => (
          <div key={i} className={styles.column}>
            {Array.from({ length: 50 }, (_, j) => (
              <span key={j} className={styles.char}>
                {String.fromCharCode(0x30A0 + Math.random() * 96)}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.overlay}>
        <div className={styles.loadingText}>
          <span>LOADING ROUTES</span>
          <div className={styles.dots}>
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </div>
        </div>
      </div>
    </div>
  );
}