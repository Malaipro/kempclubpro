import React, { useState } from 'react';
import { Play, Tv, ExternalLink } from 'lucide-react';
import interviewPreview from '@/assets/interview-tnv-preview.jpg';
import interviewPreviewWebp from '@/assets/interview-tnv-preview.jpg?format=webp';

const VIDEO_URL = 'https://tnv.ru/tv-projects-item/7-dney-plyus/#video&id=536154&iblock_id=8&iblock_type=';

export const FounderInterview: React.FC = () => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative w-full overflow-hidden bg-black">
      {/* Background image */}
      <div className="absolute inset-0">
        <picture>
          <source srcSet={interviewPreviewWebp} type="image/webp" />
          <img
            src={interviewPreview}
            alt="Интервью основателя КЭМП на телеканале ТНВ"
            className={`w-full h-full object-cover transition-transform duration-700 ${isHovered ? 'scale-105' : 'scale-100'}`}
            loading="lazy"
            width={1920}
            height={864}
          />
        </picture>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 kamp-container mx-auto px-4 md:px-8 py-16 md:py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center text-left">
        <div className="max-w-2xl space-y-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold uppercase tracking-wider text-kamp-accent bg-kamp-accent/10 border border-kamp-accent/30 px-3 py-1.5 rounded-full backdrop-blur-sm">
              <Tv className="w-3.5 h-3.5" />
              Телеканал ТНВ — «7 дней плюс»
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold text-white leading-tight">
            Почему я создал КЭМП
          </h2>

          <p className="text-sm text-gray-400">
            Интервью основателя · 27 марта 2026 г.
          </p>

          <a
            href={VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="inline-flex items-center gap-3 bg-kamp-primary hover:bg-kamp-primary/90 text-white font-bold px-6 py-3.5 md:px-8 md:py-4 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-kamp-primary/30 group"
          >
            <span className="flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/20 group-hover:bg-white/30 transition-colors">
              <Play className="w-5 h-5 md:w-6 md:h-6 fill-current" />
            </span>
            <span className="text-base md:text-lg">Смотреть интервью</span>
            <ExternalLink className="w-4 h-4 opacity-60" />
          </a>
        </div>

        <blockquote className="rounded-lg border-l-4 border-kamp-primary bg-black/60 backdrop-blur-sm p-6 md:p-8 space-y-4 text-gray-200 text-base md:text-lg leading-relaxed">
          <p>Я создавал КЭМП не ради очередного спортивного клуба или двухмесячного курса. Мне хотелось создать среду, в которой мужчины работают над собой, держат слово, преодолевают трудности и помогают друг другу становиться сильнее.</p>
          <p className="text-white font-semibold">Для меня КЭМП — это не история на 60 дней. Это путь, который продолжается всю жизнь.</p>
          <footer className="text-sm text-gray-400">— Дмитрий Андреев, основатель КЭМП</footer>
        </blockquote>
      </div>
    </section>
  );
};
