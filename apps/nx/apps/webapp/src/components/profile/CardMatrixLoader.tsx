'use client';

import { useEffect, useState } from 'react';
import styles from './CardMatrixLoader.module.css';

interface CardMatrixLoaderProps {
  text?: string;
  height?: string;
}

export default function CardMatrixLoader({ 
  text = 'LOADING...', 
  height = '200px' 
}: CardMatrixLoaderProps) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getCharacter = (i: number, j: number) => {
    if (!isClient) {
      // Use deterministic characters for server-side rendering
      return String.fromCharCode(0x30A0 + ((i * 7 + j * 13) % 96));
    }
    // Use random characters on client-side
    return String.fromCharCode(0x30A0 + Math.random() * 96);
  };

  return (
    <div className={styles.matrixContainer} style={{ height }}>
      <div className={styles.matrix}>
        {Array.from({ length: 15 }, (_, i) => (
          <div key={i} className={styles.column}>
            {Array.from({ length: 20 }, (_, j) => (
              <span key={j} className={styles.char}>
                {getCharacter(i, j)}
              </span>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.overlay}>
        <div className={styles.loadingText}>
          <span>{text}</span>
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