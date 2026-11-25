
import React from 'react';

interface LogoProps {
  onClick: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export const Logo: React.FC<LogoProps> = ({ onClick }) => {
  return (
    <a 
      href="#" 
      className="text-xl font-display font-bold text-black py-1"
      onClick={onClick}
    >
      <img 
        src="/lovable-uploads/99ae4c5c-0227-4240-b061-0dc8c860a5a2.png" 
        alt="КЭМП — Клуб Эффективного Мужского Прогресса"
        className="h-14 md:h-16 lg:h-20 object-contain bg-white/80 backdrop-blur-sm rounded-md p-1" 
      />
    </a>
  );
};
