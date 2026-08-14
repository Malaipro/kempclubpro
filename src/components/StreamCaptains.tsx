import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

import compassIcon from '@/assets/totems/compass.png';
import evgeniyCaptainAsset from '@/assets/evgeniy-menshov-captain.jpg.asset.json';

interface Captain {
  name: string;
  photo?: string;
  description: string;
}

// Данные капитанов потока. Для правок — измените этот массив.
const CAPTAINS: Captain[] = [
  {
    name: 'Евгений Меньшов',
    photo: evgeniyCaptainAsset.url,
    description:
      'Мастер спорта по фехтованию на шпагах. Победитель и призёр чемпионатов РТ и РФ.\nУчастник международных соревнований.\nЧлен сборной команды РТ. Регулярный участник спортивных мероприятий: Гонка героев, Полумарафон.\n Резидент КЭМП.',
  },
];

const initials = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

export const StreamCaptains: React.FC = () => {
  return (
    <section id="captains" className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center gap-3 text-kamp-primary">
            <img src={compassIcon} alt="Тотем компас" className="w-8 h-8 object-contain" />
            Капитаны 7 потока
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Те, кто помогает участникам держать дисциплину, мотивирует и отвечает за результат потока.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-4xl mx-auto">
          {CAPTAINS.map((c) => (
            <Card key={c.name} className="h-full overflow-hidden">
              <div className="relative w-full aspect-[3/4] bg-muted">
                {c.photo ? (
                  <img
                    src={c.photo}
                    alt={`Капитан потока — ${c.name}`}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-4xl font-bold text-muted-foreground">
                    {initials(c.name)}
                  </div>
                )}
              </div>
              <CardContent className="p-5 text-left">
                <h3 className="text-xl font-semibold mb-2">{c.name}</h3>
                <div className="space-y-2">
                  {c.description.split('\n').filter(Boolean).map((line, i) => (
                    <p key={i} className="text-sm text-foreground font-medium leading-relaxed">
                      {line.trim()}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </section>
  );
};

export default StreamCaptains;
