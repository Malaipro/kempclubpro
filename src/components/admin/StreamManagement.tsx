import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export const StreamManagement: React.FC = () => {
  return (
    <Card className="kamp-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-kamp-accent">
          <Calendar className="w-5 h-5" />
          Управление потоками
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center text-gray-400 py-8">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
          <h3 className="text-lg font-semibold mb-2">Управление потоками в разработке</h3>
          <p className="text-sm">
            Здесь будут инструменты для управления интенсивными потоками
          </p>
        </div>
      </CardContent>
    </Card>
  );
};