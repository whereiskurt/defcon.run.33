'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './matrix.module.css';

export default function MatrixPage() {
  const router = useRouter();
  const [useEnglish, setUseEnglish] = useState(false);
  const [konamiIndex, setKonamiIndex] = useState(0);
  const [clickCount, setClickCount] = useState(0);
  const [clickTimestamp, setClickTimestamp] = useState(0);
  const [redirectTimer, setRedirectTimer] = useState<NodeJS.Timeout | null>(null);
  const [showRedirectWarning, setShowRedirectWarning] = useState(false);
  
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

  // Check if user has elkentaro accomplishments
  const checkElkentaroAccomplishments = async () => {
    try {
      const response = await fetch('/api/user/accomplishments');
      if (!response.ok) return false;
      
      const data = await response.json();
      const accomplishments = data.accomplishments || [];
      
      return accomplishments.some((acc: any) => 
        acc.name?.toLowerCase().includes('elkentaro') || 
        acc.description?.toLowerCase().includes('elkentaro')
      );
    } catch (error) {
      console.error('Error checking accomplishments:', error);
      return false;
    }
  };

  // Start redirect timer if user doesn't have elkentaro accomplishments
  const startRedirectTimer = async () => {
    const hasElkentaroAccomplishment = await checkElkentaroAccomplishments();
    
    if (!hasElkentaroAccomplishment) {
      setShowRedirectWarning(true);
      const timer = setTimeout(() => {
        router.push('/qr/happybirthdayelkentaro');
      }, 10000);
      setRedirectTimer(timer);
    }
  };

  // Cancel redirect timer
  const cancelRedirectTimer = () => {
    if (redirectTimer) {
      clearTimeout(redirectTimer);
      setRedirectTimer(null);
    }
    setShowRedirectWarning(false);
  };

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
        const newEnglishState = !useEnglish;
        setUseEnglish(newEnglishState);
        setClickCount(0);
        setClickTimestamp(0);
        
        // Start redirect timer when switching to birthday mode
        if (newEnglishState) {
          startRedirectTimer();
        } else {
          cancelRedirectTimer();
        }
        
        // Visual feedback
        document.body.style.filter = 'invert(1)';
        setTimeout(() => {
          document.body.style.filter = 'none';
        }, 200);
      }
    }
  };

  // Handle konami code input and ESC key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Handle ESC key to cancel redirect
      if (event.code === 'Escape' && showRedirectWarning) {
        cancelRedirectTimer();
        return;
      }
      
      if (event.code === konamiCode[konamiIndex]) {
        const newIndex = konamiIndex + 1;
        setKonamiIndex(newIndex);
        
        if (newIndex === konamiCode.length) {
          // Konami code completed - toggle character set
          const newEnglishState = !useEnglish;
          setUseEnglish(newEnglishState);
          setKonamiIndex(0);
          
          // Start redirect timer when switching to birthday mode
          if (newEnglishState) {
            startRedirectTimer();
          } else {
            cancelRedirectTimer();
          }
          
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
  }, [konamiIndex, useEnglish, konamiCode, showRedirectWarning]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [redirectTimer]);

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
      {showRedirectWarning && (
        <div className={styles.redirectWarning}>
          <div className={styles.warningBox}>
            <p>Redirecting to special birthday QR in 10 seconds...</p>
            <p><small>Press ESC to cancel</small></p>
          </div>
        </div>
      )}
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