'use client';

import { useEffect, useState } from 'react';
import styles from './MatrixLoader.module.css';

interface MatrixLoaderProps {
  onComplete?: () => void;
  text?: string;
}

export default function MatrixLoader({ onComplete, text = "LOADING ROUTES" }: MatrixLoaderProps) {
  const [isComplete, setIsComplete] = useState(false);

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
                {birthdayChars[Math.floor(Math.random() * birthdayChars.length)]}
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