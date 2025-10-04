import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { TotemIcon } from '@/components/totems/TotemIcon';

interface TotemInfo {
  name: string;
  icon: string;
  symbol: string;
  direction: string;
  meaning: string;
  color: string;
}

const totems: TotemInfo[] = [
  {
    name: 'Змея',
    icon: 'snake',
    symbol: 'Контроль',
    direction: 'БЖЖ',
    meaning: 'Гибкость, стратегия, захват',
    color: '#8b5cf6'
  },
  {
    name: 'Лапа',
    icon: 'paw',
    symbol: 'Удар',
    direction: 'Кикбоксинг',
    meaning: 'Сила, скорость, агрессия',
    color: '#ef4444'
  },
  {
    name: 'Молот',
    icon: 'hammer',
    symbol: 'Сила',
    direction: 'ОФП',
    meaning: 'Физическая мощь, выносливость',
    color: '#f97316'
  },
  {
    name: 'Звезда',
    icon: 'star',
    symbol: 'Осознание',
    direction: 'Лекции Пирамиды',
    meaning: 'Мышление, ясность, рост',
    color: '#eab308'
  },
  {
    name: 'Росток',
    icon: 'sprout',
    symbol: 'Восстановление',
    direction: 'Нутрициология',
    meaning: 'Питание, энергия, здоровье',
    color: '#22c55e'
  },
  {
    name: 'Компас',
    icon: 'compass',
    symbol: 'Тактика и медицина',
    direction: 'Навигация, выживание, точность',
    meaning: '',
    color: '#06b6d4'
  },
  {
    name: 'Клинок',
    icon: 'blade',
    symbol: 'Шрам',
    direction: 'Испытания',
    meaning: 'Боль, путь, преодоление',
    color: '#64748b'
  },
  {
    name: 'Монах',
    icon: 'monk',
    symbol: 'Аскеза',
    direction: 'Отказ от лишнего',
    meaning: 'Воля, дисциплина, внутренняя сила',
    color: '#0ea5e9'
  }
];

export const BeadBracelet: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Award className="w-5 h-5" />
          Тотемы КЭМП
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            Система тотемов КЭМП — это символы мастерства в различных направлениях подготовки. 
            Каждый тотем присваивается за достижения и представляет собой определенную грань развития бойца.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {totems.map((totem) => (
            <div 
              key={totem.icon}
              className="border border-border rounded-lg p-4 hover:border-kamp-accent transition-colors bg-card"
              style={{ borderColor: `${totem.color}20` }}
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <TotemIcon 
                    iconName={totem.icon} 
                    color={totem.color}
                    className="h-12 w-12"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
                    {totem.name}
                  </h3>
                  
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Тотем:</span> {totem.name}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Символ:</span> {totem.symbol}
                    </p>
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">Направление:</span> {totem.direction}
                    </p>
                    {totem.meaning && (
                      <p className="text-muted-foreground italic">
                        {totem.meaning}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Как получить тотем:</span> Тотемы присваиваются 
            администраторами за достижения в соответствующем направлении подготовки. 
            Продолжайте тренироваться и развиваться, чтобы заслужить свой тотем!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
