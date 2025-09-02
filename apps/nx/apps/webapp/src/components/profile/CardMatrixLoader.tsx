'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import styles from './CardMatrixLoader.module.css';

interface CardMatrixLoaderProps {
  text?: string;
  height?: string;
}

export default function CardMatrixLoader({ 
  text = 'LOADING...', 
  height = '200px' 
}: CardMatrixLoaderProps) {
  const { resolvedTheme } = useTheme();
  const [isClient, setIsClient] = useState(false);

  // Japanese birthday messages for Elkentaro
  const birthdayChars = [
    // "エルケンタロウさん、お誕生日おめでとう！" (Happy Birthday Elkentaro!)
    'エ', 'ル', 'ケ', 'ン', 'タ', 'ロ', 'ウ', 'さ', 'ん', '、', 
    'お', '誕', '生', '日', 'お', 'め', 'で', 'と', 'う', '！',
    // "エルケンタロウさんへ誕生日おめでとう" (Birthday Wishes Elkentaro)
    'エ', 'ル', 'ケ', 'ン', 'タ', 'ロ', 'ウ', 'さ', 'ん', 'へ',
    '誕', '生', '日', 'お', 'め', 'で', 'と', 'う',
    // Additional Japanese characters for variety
    '祝', '福', '幸', '運', '愛', '心', '友', '達', '楽', '笑'
  ];

  useEffect(() => {
    setIsClient(true);
  }, []);

  const getCharacter = (i: number, j: number) => {
    if (!isClient) {
      // Use deterministic characters from birthday message for server-side rendering
      return birthdayChars[(i * 7 + j * 13) % birthdayChars.length];
    }
    // Use random birthday characters on client-side
    return birthdayChars[Math.floor(Math.random() * birthdayChars.length)];
  };

  // Theme-aware colors
  const isDarkMode = resolvedTheme === 'dark';
  const themeVars = isDarkMode 
    ? {
        '--matrix-bg': '#000',
        '--matrix-primary': '#00ff00'
      }
    : {
        '--matrix-bg': '#ffffff',
        '--matrix-primary': '#006600'
      };

  return (
    <div className={styles.matrixContainer} style={{ height, ...themeVars } as React.CSSProperties}>
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