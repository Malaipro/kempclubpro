import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { validatePassword } from '@/lib/validation';

export const AccountSettings: React.FC = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset errors
    setErrors({});
    
    // Validate inputs
    const validationErrors: Record<string, string> = {};
    
    if (!currentPassword) {
      validationErrors.currentPassword = 'Введите текущий пароль';
    }
    
    if (!validatePassword(newPassword)) {
      validationErrors.newPassword = 'Пароль должен содержать минимум 8 символов, буквы и цифры';
    }
    
    if (newPassword !== confirmPassword) {
      validationErrors.confirmPassword = 'Пароли не совпадают';
    }
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // First verify current password by attempting to sign in
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: (await supabase.auth.getUser()).data.user?.email || '',
        password: currentPassword
      });
      
      if (verifyError) {
        setErrors({ currentPassword: 'Неверный текущий пароль' });
        setIsLoading(false);
        return;
      }
      
      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) {
        toast({
          title: 'Ошибка',
          description: 'Не удалось изменить пароль',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Успешно',
          description: 'Пароль изменен',
        });
        
        // Clear form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      toast({
        title: 'Ошибка',
        description: 'Произошла ошибка при изменении пароля',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="bg-white border-gray-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-gray-900">
          <Settings className="w-5 h-5 text-kamp-accent" />
          Настройки аккаунта
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handlePasswordChange} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-password" className="text-muted-foreground">
              Текущий пароль
            </Label>
            <div className="relative">
              <Input
                id="current-password"
                type={showPasswords ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`pr-10 ${errors.currentPassword ? 'border-red-500' : ''}`}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </Button>
            </div>
            {errors.currentPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.currentPassword}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="new-password" className="text-muted-foreground">
              Новый пароль
            </Label>
            <Input
              id="new-password"
              type={showPasswords ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={errors.newPassword ? 'border-red-500' : ''}
              placeholder="••••••••"
            />
            {errors.newPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.newPassword}</p>
            )}
            <p className="text-xs text-gray-400">
              Минимум 8 символов, включая буквы и цифры
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-new-password" className="text-muted-foreground">
              Подтвердите новый пароль
            </Label>
            <Input
              id="confirm-new-password"
              type={showPasswords ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={errors.confirmPassword ? 'border-red-500' : ''}
              placeholder="••••••••"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <Button 
            type="submit" 
            className="kamp-button-primary w-full"
            disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
          >
            {isLoading ? 'Изменение...' : 'Изменить пароль'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};