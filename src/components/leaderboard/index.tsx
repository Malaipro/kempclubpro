import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';

export const Leaderboard: React.FC = () => {
  return (
    <section id="leaderboard" className="kamp-section bg-kamp-secondary py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Лидерборд</span>
          <h2 className="text-kamp-dark text-xl md:text-3xl">Соревнуйся и побеждай</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Система рейтинга участников клуба
          </p>
        </div>
        
        <Card className="bg-white border-gray-300 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Trophy className="w-5 h-5 text-kamp-accent" />
              Лидерборд
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-400 py-8">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
              <h3 className="text-lg font-semibold mb-2">Рейтинг в разработке</h3>
              <p className="text-sm">
                Здесь будет отображаться рейтинг участников
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};