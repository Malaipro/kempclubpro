import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Layout } from '@/components/Layout';
import { validateEmail, sanitizeInput, rateLimiter } from '@/lib/validation';
import { formatPhoneRu, isValidPhoneRu } from '@/lib/phoneFormat';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<'phone' | 'email'>('phone');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const { toast } = useToast();


  // Where to go after login: honor a same-origin relative `next` (used by the
  // OAuth consent flow), otherwise fall back to the dashboard.
  const resolveNext = (): string => {
    const raw = new URLSearchParams(window.location.search).get('next');
    if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
    return '/dashboard';
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      const next = resolveNext();
      if (next.startsWith('/.')) {
        window.location.href = next;
      } else {
        navigate(next);
      }
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

    if (mode === 'email' && !validateEmail(sanitizedEmail)) {
      errors.email = 'Введите корректный email адрес';
    }

    if (mode === 'phone' && !isValidPhoneRu(loginPhone)) {
      errors.phone = 'Введите номер в формате +7XXXXXXXXXX';
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

    const goNext = () => {
      const next = resolveNext();
      if (next.startsWith('/.')) {
        window.location.href = next;
      } else {
        navigate(next);
      }
    };

    try {
      if (mode === 'phone') {
        const { data, error } = await supabase.functions.invoke('phone-signin', {
          body: { phone: formatPhoneRu(loginPhone), password: loginPassword },
        });

        const payload = data as { access_token?: string; refresh_token?: string; error?: string } | null;

        if (error || !payload?.access_token || !payload?.refresh_token) {
          setFormErrors({ general: payload?.error || 'Неверный телефон или пароль' });
          return;
        }

        const { error: sessionError } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token,
        });

        if (sessionError) {
          setFormErrors({ general: 'Ошибка входа. Попробуйте ещё раз.' });
          return;
        }

        goNext();
        return;
      }

      const { error } = await signIn(sanitizedEmail, loginPassword);
      if (error) {
        setFormErrors({ general: 'Неверный email или пароль' });
      } else {
        goNext();
      }
    } catch (e) {
      setFormErrors({ general: 'Ошибка входа. Попробуйте ещё раз.' });
    } finally {
      setIsLoading(false);
    }
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
              <div className="grid grid-cols-2 gap-2 mb-4">
                <Button
                  type="button"
                  variant={mode === 'phone' ? 'default' : 'outline'}
                  onClick={() => { setMode('phone'); setFormErrors({}); }}
                  className="w-full"
                >
                  По телефону
                </Button>
                <Button
                  type="button"
                  variant={mode === 'email' ? 'default' : 'outline'}
                  onClick={() => { setMode('email'); setFormErrors({}); }}
                  className="w-full"
                >
                  По email
                </Button>
              </div>

              <form onSubmit={handleSignIn} className="space-y-4">
                {mode === 'phone' ? (
                  <div className="space-y-2">
                    <Label htmlFor="login-phone" className="text-muted-foreground">Телефон</Label>
                    <Input
                      id="login-phone"
                      type="tel"
                      inputMode="tel"
                      placeholder="+7XXXXXXXXXX"
                      value={loginPhone}
                      onChange={(e) => setLoginPhone(formatPhoneRu(e.target.value))}
                      required
                      maxLength={12}
                      className={`kamp-input ${formErrors.phone ? 'border-red-500' : ''}`}
                    />
                    {formErrors.phone && (
                      <p className="text-red-400 text-xs mt-1">{formErrors.phone}</p>
                    )}
                  </div>
                ) : (
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
                )}

                
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