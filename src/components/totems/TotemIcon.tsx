import React from 'react';
import bladeIcon from '@/assets/totems/blade.png';
import compassIcon from '@/assets/totems/compass.png';
import hammerIcon from '@/assets/totems/hammer.png';
import lighthouseIcon from '@/assets/totems/lighthouse.png';
import monkIcon from '@/assets/totems/monk.png';
import pawIcon from '@/assets/totems/paw.png';
import snakeIcon from '@/assets/totems/snake.png';
import sproutIcon from '@/assets/totems/sprout.png';
import starIcon from '@/assets/totems/star.png';
import bearIcon from '@/assets/totems/bear.png';
import { Award } from 'lucide-react';

interface TotemIconProps {
  iconName: string | null;
  color?: string;
  className?: string;
}

const totemIcons: Record<string, string> = {
  blade: bladeIcon,
  compass: compassIcon,
  hammer: hammerIcon,
  lighthouse: lighthouseIcon,
  monk: monkIcon,
  paw: pawIcon,
  snake: snakeIcon,
  sprout: sproutIcon,
  star: starIcon,
  bear: bearIcon,
};

export const TotemIcon: React.FC<TotemIconProps> = ({ iconName, color = '#e60000', className = 'h-12 w-12' }) => {
  const iconSrc = iconName ? totemIcons[iconName.toLowerCase()] : null;

  if (!iconSrc) {
    return <Award className={className} style={{ color }} />;
  }

  return (
    <img 
      src={iconSrc} 
      alt={iconName || 'totem'} 
      className={className}
      style={{ 
        filter: color !== '#e60000' ? `brightness(0) saturate(100%) hue-rotate(${getHueRotation(color)}deg)` : undefined 
      }}
    />
  );
};

// Helper to calculate hue rotation for color filter
function getHueRotation(color: string): number {
  // Basic color mapping - can be extended
  const colorMap: Record<string, number> = {
    '#e60000': 0,
    '#ff6b6b': 10,
    '#4ecdc4': 180,
    '#45b7d1': 190,
    '#f7b731': 45,
    '#5f27cd': 270,
    '#00d2d3': 180,
  };
  
  return colorMap[color.toLowerCase()] || 0;
}
