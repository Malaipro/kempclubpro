
import React, { useEffect, useState } from 'react';
import { VideoBackground } from './ui/VideoBackground';

export const Hero: React.FC = () => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

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
      imageUrl="/lovable-uploads/897a2b54-4b4a-4946-a08b-5c76b0474438.png"
      overlayColor="rgba(0, 0, 0, 0.7)"
      className="h-[90vh] md:h-screen flex items-center justify-center"
    >
      <div className="kamp-container text-center mx-auto px-4 md:px-8">
        <div className={`space-y-6 max-w-4xl mx-auto transition-all duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0 translate-y-10'}`}>
          <span className="inline-block text-white/80 text-xs md:text-base font-semibold uppercase tracking-wider mb-2 px-3 py-1 md:px-4 md:py-1.5 rounded-full bg-kamp-primary/80 backdrop-blur-sm">
            Клуб Эффективного Мужского Прогресса
          </span>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl text-white font-display font-bold leading-tight text-center">
            <img 
              src="/lovable-uploads/dc02efeb-43ee-450d-a695-096ffa5ee61c.png" 
              alt="КЭМП Logo" 
              className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 object-contain inline-block mr-3 md:mr-4"
            />КЭМП — закрытый мужской клуб и интенсив для тех, кто готов пройти испытания и стать 
            <span className="text-gradient bg-gradient-to-r from-kamp-accent to-kamp-primary"> сильнее.</span>
          </h1>
          
          <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto font-light">
            Вступай в клуб выносливости, дисциплины и лидерства. Тренировки по Бразильскому Джиу-Джитсу, Кикбоксингу, ОФП, выездные испытания, закаливания, тактической подготовке и самобороне.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-3 md:gap-4 pt-4">
            <button 
              onClick={() => scrollToSection('contact')}
              className="kamp-button-primary bg-kamp-primary hover:bg-opacity-90 text-center py-2.5 md:py-3"
            >
              Записаться в клуб
            </button>
            <button 
              onClick={() => scrollToSection('program')}
              className="kamp-button-secondary text-white bg-black/60 border-white/20 hover:bg-black/80 py-2.5 md:py-3"
            >
              Программа клуба
            </button>
          </div>

          <div className="flex flex-col items-center gap-1.5 pt-4">
            <p className="text-white/60 text-xs md:text-sm">Номинант премии</p>
            <img 
              src="/lovable-uploads/russia-opportunities-logo.svg" 
              alt="Россия — страна возможностей" 
              className="h-10 md:h-14 object-contain"
            />
          </div>
        </div>
      </div>
    </VideoBackground>
  );
};
