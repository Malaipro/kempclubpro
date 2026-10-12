import React from 'react';
import { ArrowRight, Lock } from 'lucide-react';
import level01 from '@/assets/journey-level-01.jpg';
import level02 from '@/assets/journey-level-02.jpg';

const scrollTo = (id: string) => {
  const el = document.getElementById(id);
  if (el) window.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
};

export const DevelopmentJourney: React.FC = () => (
  <section id="journey" className="kamp-section bg-[#121212] border-t border-gray-800">
    <div className="kamp-container">
      <div className="section-heading max-w-3xl mx-auto text-center">
        <span className="inline-block text-kamp-primary font-semibold mb-2 uppercase tracking-[0.2em] text-xs md:text-sm">Непрерывное развитие</span>
        <h2 className="text-white font-display mb-4">Твой путь в КЭМП</h2>
        <p className="text-gray-300">Каждый пройденный этап открывает новые возможности. Первый интенсив — только начало.</p>
      </div>

      <ol className="relative mt-10 md:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-6">
        <span aria-hidden="true" className="md:hidden absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-kamp-primary via-kamp-primary/50 to-gray-700" />

        <li className="relative pl-12 md:pl-0">
          <span aria-hidden="true" className="md:hidden absolute left-[18px] top-6 w-3 h-3 rounded-full bg-kamp-primary ring-4 ring-[#121212]" />
          <article className="h-full flex flex-col overflow-hidden rounded-lg border border-gray-700 bg-[#1d1d1d] text-left">
            <img src={level01} alt="Участники КЭМП на тренировке" width={1024} height={640} loading="lazy" className="w-full aspect-[16/10] object-cover" />
            <div className="flex flex-col flex-1 p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-kamp-primary">01 / Старт</p>
              <h3 className="mt-2 text-2xl font-display font-extrabold text-white">КЭМП</h3>
              <p className="mt-1 text-white font-semibold">Трансформация. Начало пути.</p>
              <p className="mt-3 text-sm text-gray-400 flex-1">60 дней, чтобы заложить фундамент дисциплины, силы, мышления и характера. Вход в закрытое мужское сообщество.</p>
              <button onClick={() => scrollTo('program')} className="mt-5 inline-flex items-center gap-2 self-start rounded-md bg-kamp-primary px-5 py-3 text-sm font-bold text-white hover:bg-kamp-primary/90 transition-colors">
                Узнать о программе <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </article>
        </li>

        <li className="relative pl-12 md:pl-0">
          <span aria-hidden="true" className="md:hidden absolute left-[18px] top-6 w-3 h-3 rounded-full bg-kamp-primary/60 ring-4 ring-[#121212]" />
          <article className="h-full flex flex-col overflow-hidden rounded-lg border-2 border-kamp-primary bg-[#1d1d1d] text-left">
            <div className="relative">
              <img src={level02} alt="Восхождение — следующий уровень" width={1024} height={640} loading="lazy" className="w-full aspect-[16/10] object-cover" />
              <span className="absolute top-3 right-3 rounded-sm bg-kamp-primary px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">Скоро</span>
            </div>
            <div className="flex flex-col flex-1 p-5 md:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-kamp-primary">02 / Скоро</p>
              <h3 className="mt-2 text-2xl font-display font-extrabold text-white">ЛИГА КЭМП</h3>
              <p className="mt-1 text-white font-semibold">Следующий уровень. Превзойди себя.</p>
              <p className="mt-3 text-sm text-gray-400">Продвинутая 60-дневная программа для выпускников КЭМП:</p>
              <p className="mt-2 text-sm text-gray-200 font-medium flex-1">Боец · Интеллект · Рубеж · Команда · Гонка героев</p>
              <span aria-disabled="true" className="mt-5 inline-flex items-center gap-2 self-start rounded-md border border-gray-600 px-5 py-3 text-sm font-bold text-gray-400 cursor-not-allowed">
                <Lock className="w-4 h-4" /> Скоро
              </span>
            </div>
          </article>
        </li>

        <li className="relative pl-12 md:pl-0">
          <span aria-hidden="true" className="md:hidden absolute left-[18px] top-6 w-3 h-3 rounded-full bg-gray-600 ring-4 ring-[#121212]" />
          <article className="h-full min-h-[180px] flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-700 bg-[#161616] p-6 text-center opacity-70">
            <p className="text-4xl font-display font-extrabold text-gray-600">03+</p>
            <p className="mt-3 text-lg font-semibold text-gray-400">Продолжение следует…</p>
          </article>
        </li>
      </ol>
    </div>
  </section>
);
