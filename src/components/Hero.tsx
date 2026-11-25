
import React from 'react';
import { VideoBackground } from './ui/VideoBackground';
import { clubName, coverPath, logoPath } from '../seo/homeContent';

export const Hero: React.FC<{ staticSnapshot?: boolean }> = ({ staticSnapshot = false }) => {
  const scrollToSection = (sectionId: string) => {
    const programSection = document.getElementById(sectionId);
    if (programSection) {
      window.scrollTo({
        top: programSection.offsetTop - 80,
        behavior: 'smooth'
      });
    }
  };

  return (
    <VideoBackground
      imageUrl={coverPath}
      overlayColor="rgba(0, 0, 0, 0.7)"
      className="h-[90vh] md:h-screen flex items-center justify-center"
    >
      <div className="kamp-container text-center mx-auto px-4 md:px-8">
        <div className="space-y-6 max-w-4xl mx-auto">
          <span className="inline-block text-white/80 text-xs md:text-base font-semibold uppercase tracking-wider mb-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-kamp-primary/80 backdrop-blur-sm">
            {clubName}
          </span>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl text-white font-display font-bold leading-tight text-center">
            <img 
              src={logoPath}
              alt=""
              className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain inline-block mr-3 md:mr-4"
            />КЭМП — мужской клуб
            <span className="text-gradient bg-gradient-to-r from-kamp-accent to-kamp-primary"> непрерывного развития</span>
          </h1>

          <p className="text-xl md:text-3xl text-white font-display font-extrabold uppercase tracking-wider">
            Сильнее каждый день.
          </p>
          
          <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto font-light">
            Закрытое мужское сообщество, где развивают тело, мышление и характер. Твой путь начинается с 60-дневного интенсива и продолжается в клубе.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 pt-4">
            {staticSnapshot ? (
              <a href="#kemp-overview" className="kamp-button-primary text-center py-2.5 md:py-3">О клубе и интенсиве</a>
            ) : (
              <>
                <button
                  onClick={() => scrollToSection('contact')}
                  className="kamp-button-primary bg-kamp-primary hover:bg-opacity-90 text-center py-2.5 md:py-3"
                >
                  Начать свой путь
                </button>
                <button
                  onClick={() => scrollToSection('program')}
                  className="kamp-button-secondary text-white bg-black/60 border-white/20 hover:bg-black/80 py-2.5 md:py-3"
                >
                  Узнать о программе
                </button>
              </>
            )}
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <p className="text-white/60 text-2xl md:text-3xl">Номинант премии</p>
            <img 
              src="/lovable-uploads/russia-opportunities-logo.svg" 
              alt="Россия — страна возможностей" 
              className="h-20 md:h-28 object-contain"
            />
          </div>
        </div>
      </div>
    </VideoBackground>
  );
};
