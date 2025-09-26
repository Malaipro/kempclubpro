import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { validateEmail, sanitizeInput, rateLimiter } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const { toast } = useToast();

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // One-time super admin setup trigger via URL param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('setupSuperAdmin') === '1') {
      (async () => {
        const { data, error } = await supabase.functions.invoke('setup-super-admin', {
          body: {}
        });
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Ошибка создания супер-админа',
            description: error.message || 'Попробуйте ещё раз'
          });
        } else {
          toast({
            title: 'Супер-админ создан',
            description: 'Теперь можете войти: kemp.club@yandex.com'
          });
        }
      })();
    }
  }, [toast]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting
    if (!rateLimiter.isAllowed('signin-attempt', 5, 300000)) {
      setFormErrors({ general: 'Слишком много попыток входа. Попробуйте через 5 минут.' });
      return;
    }

    // Validate inputs
    const errors: Record<string, string> = {};
    const sanitizedEmail = sanitizeInput(loginEmail);
    
    if (!validateEmail(sanitizedEmail)) {
      errors.email = 'Введите корректный email адрес';
    }
    
    if (!loginPassword || loginPassword.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setIsLoading(true);

    const { error } = await signIn(sanitizedEmail, loginPassword);
    
    if (error) {
      if (sanitizedEmail === 'kemp.club@yandex.com') {
        toast({ title: 'Создание супер-админа…', description: 'Пробуем создать аккаунт и войти' });
        const { error: setupError } = await supabase.functions.invoke('setup-super-admin', { body: {} });
        if (!setupError) {
          const retry = await signIn(sanitizedEmail, loginPassword);
          if (!retry.error) {
            navigate('/dashboard');
            setIsLoading(false);
            return;
          }
        }
      }
      setFormErrors({ general: 'Неверный email или пароль' });
    } else {
      navigate('/dashboard');
    }
    
    setIsLoading(false);
  };

  return (
    <Layout>
      <section className="kamp-section bg-black min-h-screen flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gradient mb-2">КЭМП</h1>
            <p className="text-gray-400">Вход в личный кабинет</p>
          </div>

          <Card className="kamp-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-center text-kamp-accent">
                Вход в систему
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-muted-foreground">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    maxLength={254}
                    className={`kamp-input ${formErrors.email ? 'border-red-500' : ''}`}
                  />
                  {formErrors.email && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="login-password" className="text-muted-foreground">Пароль</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    minLength={6}
                    className={`kamp-input ${formErrors.password ? 'border-red-500' : ''}`}
                  />
                  {formErrors.password && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>
                  )}
                </div>

                {formErrors.general && (
                  <p className="text-red-400 text-sm text-center">{formErrors.general}</p>
                )}

                <Button 
                  type="submit" 
                  className="kamp-button-primary w-full"
                  disabled={isLoading || Object.keys(formErrors).length > 0}
                >
                  {isLoading ? 'Вход...' : 'Войти'}
                </Button>
              </form>

              <div className="mt-6 text-center text-sm text-gray-400">
                <p>Аккаунт создается администратором.</p>
                <p>После входа вы можете изменить пароль в настройках.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};