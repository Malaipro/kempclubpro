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
}

const totems: TotemInfo[] = [
  {
    name: 'Змей',
    icon: 'snake',
    symbol: 'Контроль',
    direction: 'БЖЖ',
    meaning: 'Гибкость, стратегия, захват'
  },
  {
    name: 'Лапа',
    icon: 'paw',
    symbol: 'Удар',
    direction: 'Кикбоксинг',
    meaning: 'Сила, скорость, агрессия'
  },
  {
    name: 'Молот',
    icon: 'hammer',
    symbol: 'Сила',
    direction: 'ОФП',
    meaning: 'Физическая мощь, выносливость'
  },
  {
    name: 'Звезда',
    icon: 'star',
    symbol: 'Осознание',
    direction: 'Лекции Пирамиды',
    meaning: 'Мышление, ясность, рост'
  },
  {
    name: 'Росток',
    icon: 'sprout',
    symbol: 'Восстановление',
    direction: 'Нутрициология',
    meaning: 'Питание, энергия, здоровье'
  },
  {
    name: 'Компас',
    icon: 'compass',
    symbol: 'Тактика и медицина',
    direction: 'Навигация, выживание, точность',
    meaning: ''
  },
  {
    name: 'Клинок',
    icon: 'blade',
    symbol: 'Шрам',
    direction: 'Испытания',
    meaning: 'Боль, путь, преодоление'
  },
  {
    name: 'Монах',
    icon: 'monk',
    symbol: 'Аскеза',
    direction: 'Отказ от лишнего',
    meaning: 'Воля, дисциплина, внутренняя сила'
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
            Каждый тотем присваивается за выдающиеся достижения и представляет собой определенную грань развития бойца.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {totems.map((totem) => (
            <div 
              key={totem.icon}
              className="border border-border rounded-lg p-4 hover:border-kamp-accent transition-colors bg-card"
            >
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <TotemIcon 
                    iconName={totem.icon} 
                    color="#e60000"
                    className="h-12 w-12"
                  />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-1 flex items-center gap-2">
                    {totem.name}
                  </h3>
                  
                  <div className="space-y-1 text-sm">
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
            администраторами за выдающиеся достижения в соответствующем направлении подготовки. 
            Продолжайте тренироваться и развиваться, чтобы заслужить свой тотем!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
