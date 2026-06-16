import React from 'react';
import { Loader2 } from 'lucide-react';

export const TelegramLoading: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4">
    <div className="w-16 h-16 rounded-2xl bg-kamp-primary flex items-center justify-center">
      <span className="text-white text-2xl font-black">K</span>
    </div>
    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    <p className="text-sm text-muted-foreground">Загрузка...</p>
  </div>
);
