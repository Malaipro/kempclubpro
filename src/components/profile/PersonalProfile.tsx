import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from 'lucide-react';
import { AccountSettings } from './AccountSettings';

export const PersonalProfile: React.FC = () => {
  return (
    <div className="space-y-6">
      <Card className="bg-white border-gray-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-900">
            <User className="w-5 h-5 text-kamp-accent" />
            Личный профиль
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-gray-400 py-8">
            <User className="w-16 h-16 mx-auto mb-4 text-kamp-accent/50" />
            <h3 className="text-lg font-semibold mb-2">Профиль в разработке</h3>
            <p className="text-sm">
              Здесь будет ваш личный профиль
            </p>
          </div>
        </CardContent>
      </Card>
      
      <AccountSettings />
    </div>
  );
};