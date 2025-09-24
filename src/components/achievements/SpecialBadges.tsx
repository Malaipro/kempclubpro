import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Star } from 'lucide-react';

export const SpecialBadges: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Star className="w-5 h-5" />
          Специальные значки
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Star className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Значки в разработке</h3>
          <p className="text-sm">
            Здесь будут отображаться ваши специальные значки и награды
          </p>
        </div>
      </CardContent>
    </Card>
  );
};