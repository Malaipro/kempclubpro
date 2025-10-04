import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { TotemIcon } from '@/components/totems/TotemIcon';

interface SpecialTotem {
  name: string;
  icon: string;
  description: string;
  color: string;
}

const specialTotems: SpecialTotem[] = [
  {
    name: 'Медведь',
    icon: 'bear',
    description: 'За особые достижения в клубе в испытаниях спорта, мужества, силы',
    color: '#8b4513'
  },
  {
    name: 'Маяк',
    icon: 'lighthouse',
    description: 'За вклад в клуб в наставничестве, развитии клуба',
    color: '#fbbf24'
  }
];

export const SpecialBadges: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Award className="w-5 h-5" />
          Особые тотемы
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <p className="text-sm text-muted-foreground">
            Высшие награды клуба, присуждаемые только основателем за выдающийся вклад и достижения
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {specialTotems.map((totem) => (
            <div 
              key={totem.icon}
              className="border-2 border-border rounded-lg p-6 hover:border-kamp-accent transition-all bg-card/50 backdrop-blur"
              style={{ borderColor: `${totem.color}40` }}
            >
              <div className="flex flex-col items-center text-center gap-4">
                <TotemIcon 
                  iconName={totem.icon} 
                  color={totem.color}
                  className="h-20 w-20"
                />
                
                <div>
                  <h3 className="font-bold text-xl mb-2" style={{ color: totem.color }}>
                    {totem.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {totem.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-sm text-muted-foreground text-center">
            <span className="font-semibold text-foreground">Особые тотемы</span> присуждаются исключительно основателем клуба за выдающиеся достижения и значительный вклад в развитие КЭМП
          </p>
        </div>
      </CardContent>
    </Card>
  );
};