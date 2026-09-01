import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

const FOUNDER_PHOTO = '/lovable-uploads/dmitry-andreev.jpg';
const PERSONAL_SITE_URL = 'https://andreevmentor.ru/';

export const PersonalCoachingCTA: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <section id="personal-coaching" className="kamp-section bg-kamp-light border-t border-gray-800">
      <div className="kamp-container">
        <div className="relative overflow-hidden border border-gray-700 bg-[#161616]">
          {/* Accent top line */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-kamp-primary" />

          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Text content */}
            <div className="p-6 sm:p-8 md:p-12 lg:p-16 flex flex-col justify-center order-2 lg:order-1">
              <span className="inline-block w-max text-[10px] sm:text-xs font-bold uppercase tracking-[0.2em] text-kamp-primary mb-4 sm:mb-6">
                Эксклюзивный формат
              </span>

              <h2 className="font-display font-extrabold uppercase tracking-tight text-white text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-[1.1] mb-5 sm:mb-7">
                Трансформация на уровне личности: индивидуальная работа с основателем
              </h2>

              <p className="text-sm sm:text-base text-gray-400 leading-relaxed mb-8 sm:mb-10 max-w-xl">
                КЭМП дает фундамент, дисциплину и сильное окружение. Но если перед тобой стоят
                амбициозные цели в бизнесе и жизни, требующие нестандартных решений и точечной
                стратегии — нам нужно поработать один на один. Я проведу тебя через принципы клуба,
                адаптировав их под твои личные точки роста и масштабирование.
              </p>

              <a
                href={PERSONAL_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center sm:justify-start gap-3 w-full sm:w-auto bg-kamp-primary hover:bg-kamp-accent text-white font-bold uppercase tracking-wider text-xs sm:text-sm px-6 sm:px-8 py-4 rounded-sm transition-colors duration-300 group"
              >
                Хочу в личную работу
                <ArrowUpRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </a>
            </div>

            {/* Founder photo */}
            <div className="relative min-h-[280px] sm:min-h-[360px] lg:min-h-full order-1 lg:order-2">
              <img
                src={FOUNDER_PHOTO}
                alt="Дмитрий Андреев — основатель КЭМП"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#161616] via-[#161616]/40 to-transparent lg:bg-gradient-to-l lg:from-[#161616] lg:via-transparent lg:to-transparent" />
              
              {/* Founder nameplate */}
              <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 lg:bottom-8 lg:left-8">
                <div className="border-l-2 border-kamp-primary pl-3">
                  <p className="text-white font-bold text-sm sm:text-base">Дмитрий Андреев</p>
                  <p className="text-gray-400 text-xs sm:text-sm">Основатель КЭМП</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
