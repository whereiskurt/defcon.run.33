import React, { useEffect, useState } from 'react';

interface TileProps {
  imagePath: string;
  style: React.CSSProperties;
  className?: string;
}

interface BlurPulseBackgroundProps {
  imagePath: string;
  className?: string;
  tileCount?: number;
}

const BackgroundTile: React.FC<TileProps> = ({ imagePath, style, className = '' }) => {
  return (
    <div
      className={`absolute z-0 animate-blurPulse ${className}`}
      style={{
        backgroundImage: `url('${imagePath}')`,
        backgroundSize: 'contain',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        imageRendering: 'pixelated',
        ...style,
      }}
    />
  );
};

export const BlurPulseBackground: React.FC<BlurPulseBackgroundProps> = ({ 
  imagePath, 
  className = '',
  tileCount = 4 // Increased from 12 to 30
}) => {
  const [tiles, setTiles] = useState<React.ReactNode[]>([]);
  
  useEffect(() => {
    const newTiles = [];
    
    // Create a grid-like distribution to ensure coverage
    const gridCells = 2; // 6x6 grid for better distribution
    const cellSize = 4 / gridCells;
    
    for (let i = 0; i < tileCount; i++) {
      // Generate random properties for each tile
      const size = Math.floor(Math.random() * 50) + 50; // 15% to 45% of container size (slightly smaller)
      
      // Use grid-based positioning to ensure better coverage
      const gridX = i % gridCells;
      const gridY = Math.floor(i / gridCells) % gridCells;
      
      // Add some randomness within each grid cell
      const jitterX = Math.random() * cellSize * 0.8;
      const jitterY = Math.random() * cellSize * 0.8;
      
      const left = (gridX * cellSize) + jitterX;
      const top = (gridY * cellSize);
      
      const opacity = Math.random() * 0.1 + 0.8; // 0.2 to 0.7 opacity
      const rotationDeg = Math.floor(Math.random() * -25); // 0 to 360 degrees rotation
      const animationDelay = Math.random() * -10; // Staggered animation (increased range)
      
      const tileStyle: React.CSSProperties = {
        width: `${size}%`,
        height: `${size}%`,
        left: `${left}%`,
        top: `${top}%`,
        opacity,
        transform: `rotate(${rotationDeg}deg)`,
        animationDelay: `${animationDelay}s`,
      };
      
      newTiles.push(
        <BackgroundTile 
          key={i}
          imagePath={imagePath}
          style={tileStyle}
          className={className}
        />
      );
    }
    
    setTiles(newTiles);
  }, [imagePath, className, tileCount]);
  
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      {tiles}
    </div>
  );
};

export default BlurPulseBackground;