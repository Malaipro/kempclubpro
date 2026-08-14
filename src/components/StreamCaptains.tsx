import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield } from 'lucide-react';

interface Captain {
  name: string;
  photo?: string;
  description: string;
}

// Данные капитанов потока. Для правок — измените этот массив.
const CAPTAINS: Captain[] = [
  {
    name: 'Евгений Меньшов',
    photo: '',
    description:
      'Мастер спорта по фехтованию на шпагах. Победитель и призёр чемпионатов РТ и РФ. Участник международных соревнований. Член сборной команды РТ. Регулярный участник спортивных мероприятий: Гонка героев, Полумарафон. Резидент КЭМП.',
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
          <h2 className="text-3xl md:text-4xl font-bold mb-3 flex items-center justify-center gap-3">
            <Shield className="w-8 h-8 text-kamp-accent" />
            Капитаны 7 потока
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Те, кто помогает участникам держать дисциплину, мотивирует и отвечает за результат потока.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {CAPTAINS.map((c) => (
            <Card key={c.name} className="h-full">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
                <Avatar className="w-24 h-24 border-2 border-kamp-accent/40">
                  {c.photo ? <AvatarImage src={c.photo} alt={`Капитан потока — ${c.name}`} loading="lazy" /> : null}
                  <AvatarFallback className="text-lg font-bold">{initials(c.name)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-xl font-semibold">{c.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{c.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default StreamCaptains;
