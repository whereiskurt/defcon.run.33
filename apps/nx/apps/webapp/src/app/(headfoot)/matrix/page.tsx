'use client';

import { useEffect, useState } from 'react';
import styles from './matrix.module.css';

export default function MatrixPage() {
  const [useEnglish, setUseEnglish] = useState(false);
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimestamp, setClickTimestamp] = useState(0);
  
  // Konami code sequence
  const konamiCode = [
    'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
    'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
    'KeyB', 'KeyA'
  ];

  // Japanese birthday messages for Elkentaro
  const japaneseMessages = [
    "エルケンタロウさん、お誕生日おめでとう！", // Happy Birthday Elkentaro!
    "エルケンタロウさん、お誕生日おめでとう！", // Happy Birthday Elkentaro!
    "エルケンタロウさん、お誕生日おめでとう！"  // Happy Birthday Elkentaro!
  ];

  // English equivalent messages
  const englishMessages = [
    "Happy Birthday Elkentaro!!",
    "Happy Birthday Elkentaro!!",
    "Happy Birthday Elkentaro!!"
  ];

  // Handle rapid clicking (10 clicks in 3 seconds)
  const handleClick = () => {
    const now = Date.now();
    
    if (now - clickTimestamp > 3000) {
      // Reset if more than 3 seconds have passed
      setClickCount(1);
      setClickTimestamp(now);
    } else {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      
      if (newCount >= 10) {
        // 10 clicks in 3 seconds - toggle character set
        setUseEnglish(!useEnglish);
        setClickCount(0);
        setClickTimestamp(0);
        
        // Visual feedback
        document.body.style.filter = 'invert(1)';
        setTimeout(() => {
          document.body.style.filter = 'none';
        }, 200);
      }
    }
  };

  // Handle konami code input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === konamiCode[konamiIndex]) {
        const newIndex = konamiIndex + 1;
        setKonamiIndex(newIndex);
        
        if (newIndex === konamiCode.length) {
          // Konami code completed - toggle character set
          setUseEnglish(!useEnglish);
          setKonamiIndex(0);
          
          // Visual feedback
          document.body.style.filter = 'invert(1)';
          setTimeout(() => {
            document.body.style.filter = 'none';
          }, 200);
        }
      } else {
        // Reset if wrong key pressed
        setKonamiIndex(0);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [konamiIndex, useEnglish, konamiCode]);

  const getCharacterForPosition = (columnIndex: number, charIndex: number) => {
    const messages = useEnglish ? englishMessages : japaneseMessages;
    
    // Combine all messages into one long string with separators
    const combinedMessage = messages.join('   '); // Add spaces between messages
    
    // Each column shows the complete message vertically
    // We cycle through messages for different columns
    const messageIndex = columnIndex % messages.length;
    const currentMessage = messages[messageIndex];
    
    // If we're past the current message length, show space or separator
    if (charIndex >= currentMessage.length) {
      // Add some spacing after each message before it repeats
      const spacingChars = ['', ' ', '✦', ' ', '★', ' ', '💚', ' ', '🥕', ' '];
      return spacingChars[(charIndex - currentMessage.length) % spacingChars.length] || ' ';
    }
    
    // Return the character at this position in the message
    return currentMessage[charIndex];
  };

  const isBirthdayChar = (columnIndex: number, charIndex: number) => {
    const messages = useEnglish ? englishMessages : japaneseMessages;
    const messageIndex = columnIndex % messages.length;
    const currentMessage = messages[messageIndex];
    
    if (charIndex >= currentMessage.length) return false;
    
    if (useEnglish) {
      // "Birthday" starts at index 6 and goes to index 13 (6-13)
      return charIndex >= 6 && charIndex <= 13;
    } else {
      // "誕生日" in Japanese - characters at positions 11, 12, 13 in "エルケンタロウさん、お誕生日"
      return charIndex >= 11 && charIndex <= 13;
    }
  };

  return (
    <div className={styles.matrixContainer} onClick={handleClick}>
      <div className={styles.matrix}>
        {Array.from({ length: 30 }, (_, i) => (
          <div key={i} className={styles.column}>
            {Array.from({ length: 40 }, (_, j) => (
              <span 
                key={j} 
                className={`${styles.char} ${isBirthdayChar(i, j) ? styles.highlight : ''}`}
              >
                {getCharacterForPosition(i, j)}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}