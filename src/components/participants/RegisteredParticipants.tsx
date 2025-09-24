import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users } from 'lucide-react';

export const RegisteredParticipants: React.FC = () => {
  return (
    <section id="participants" className="kamp-section py-4 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-accent font-semibold mb-1 text-sm md:text-base">Участники</span>
          <h2 className="text-gradient text-xl md:text-3xl">Участники КЭМП</h2>
          <p className="text-gray-400 text-sm md:text-base">
            Активные участники клуба и их достижения в системе геймификации
          </p>
        </div>
        
        <Card className="bg-white border-gray-300 mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-gray-900">
              <Users className="w-5 h-5 text-kamp-accent" />
              Зарегистрированные участники
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center text-gray-400 py-8">
              <Users className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
              <h3 className="text-lg font-semibold mb-2">Система участников в разработке</h3>
              <p className="text-sm">
                Здесь будет отображаться список зарегистрированных участников
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};