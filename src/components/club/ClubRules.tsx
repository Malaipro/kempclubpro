import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle2 } from 'lucide-react';

export const ClubRules: React.FC = () => {
  const rules = [
    'Уважайте других участников клуба и тренерский состав',
    'Приходите на тренировки вовремя',
    'Соблюдайте технику безопасности во время занятий',
    'Поддерживайте чистоту и порядок в зале',
    'Приносите с собой необходимое снаряжение',
    'Предупреждайте о пропуске тренировки заранее',
    'Следите за своим здоровьем и сообщайте о травмах',
    'Помогайте новичкам адаптироваться в клубе'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-destructive" />
          Правила мужского клуба
        </h1>
        <p className="text-muted-foreground">
          Базовые правила для всех резидентов клуба
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Правила и рекомендации</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {rules.map((rule, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm">{rule}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Дополнительная информация</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Как резидент клуба, вы получаете доступ к регулярным тренировкам и мероприятиям.
            Все результаты вашего интенсива сохранены в архиве.
          </p>
          <p>
            По всем вопросам обращайтесь к администрации клуба или тренерскому составу.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
