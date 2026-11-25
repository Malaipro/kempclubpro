import React from 'react';
import { clubDescription, intensiveDescription, pyramidLevels } from '../seo/homeContent';

export function KempOverview() {
  return (
    <section id="kemp-overview" aria-labelledby="kemp-overview-title" className="scroll-mt-24 border-t border-gray-800 bg-[#121212] py-8 md:py-12">
      <div className="kamp-container">
        <h2 id="kemp-overview-title" className="mb-3 text-white">Коротко о КЭМП</h2>
        <p className="max-w-3xl">{clubDescription}</p>

        <div className="mt-6 grid gap-x-10 gap-y-5 md:grid-cols-2">
          <div id="intensive" className="scroll-mt-24">
            <h3 className="mb-2 text-base md:text-lg">Как устроен вход в клуб</h3>
            <p>{intensiveDescription}</p>
          </div>
          <div>
            <h3 className="mb-2 text-base md:text-lg">Чем КЭМП отличается от спортивной секции</h3>
            <p>Тренировки помогают применять дисциплину и ответственность на практике. Ментальная часть помогает разобраться, какие привычки, навыки и ценности стоят за поступками в зале и за его пределами.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base md:text-lg">Что такое Пирамида КЭМП</h3>
            <p>Это модель, по которой участники разбирают связь между ежедневными действиями и тем, кем хотят быть. В ней шесть уровней, от основания к вершине: {pyramidLevels.join(' → ')}.</p>
          </div>
          <div>
            <h3 className="mb-2 text-base md:text-lg">Для кого программа</h3>
            <p>Для мужчин, которые хотят развивать физическую форму и мышление, работать над дисциплиной и найти окружение с таким же отношением к развитию.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
