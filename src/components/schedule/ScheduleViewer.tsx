import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from 'lucide-react';

export const ScheduleViewer: React.FC = () => {
  return (
    <div className="bg-gray-900 p-6 rounded-lg">
      <div className="flex items-center gap-2 mb-6">
        <Calendar className="w-5 h-5 text-destructive" />
        <h2 className="text-xl font-semibold text-destructive">Просмотр расписания</h2>
      </div>
      <div className="text-center text-gray-400 py-8">
        <Calendar className="w-16 h-16 mx-auto mb-4 text-destructive/50" />
        <h3 className="text-lg font-semibold mb-2 text-white">Расписание в разработке</h3>
        <p className="text-sm">
          Здесь будет просмотр расписания
        </p>
      </div>
    </div>
  );
};