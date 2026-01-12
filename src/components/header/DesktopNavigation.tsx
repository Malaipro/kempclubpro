
import React from 'react';
import { MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MenuItem } from './types';

interface DesktopNavigationProps {
  menuItems: MenuItem[];
  scrollToSection: (sectionId: string) => void;
}

export const DesktopNavigation: React.FC<DesktopNavigationProps> = ({ 
  menuItems, 
  scrollToSection 
}) => {
  return (
    <nav className="hidden md:flex items-center space-x-4 lg:space-x-6">
      {menuItems.map((item) => (
        item.href ? (
          <Link
            key={item.id}
            to={item.href}
            className="text-black font-medium hover:text-kamp-accent transition-colors text-xs lg:text-sm"
          >
            {item.label}
          </Link>
        ) : (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="text-black font-medium hover:text-kamp-accent transition-colors text-xs lg:text-sm"
          >
            {item.label}
          </button>
        )
      ))}
      <a
        href="https://t.me/Dmitriy116"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center text-black font-medium hover:text-kamp-accent transition-colors text-xs lg:text-sm"
      >
        <MessageSquare size={14} className="mr-1" />
        Задать вопрос
      </a>
    </nav>
  );
};
