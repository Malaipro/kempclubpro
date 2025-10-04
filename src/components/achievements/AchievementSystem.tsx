import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy } from 'lucide-react';
export const AchievementSystem: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Trophy className="w-5 h-5" />
          Система достижений
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-muted-foreground py-8">
          <Trophy className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <p className="text-sm">
            Система достижений в разработке
          </p>
        </div>
      </CardContent>
    </Card>
  );
};