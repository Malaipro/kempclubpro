import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layout } from '@/components/Layout';
import { validateEmail, validatePassword, validateName, sanitizeInput, rateLimiter } from '@/lib/validation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

export const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupName, setSignupName] = useState('');
  const [signupLastName, setSignupLastName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Rate limiting
    if (!rateLimiter.isAllowed('signup-attempt', 3, 300000)) {
      setFormErrors({ general: 'Слишком много попыток регистрации. Попробуйте через 5 минут.' });
      return;
    }

    // Validate inputs
    const errors: Record<string, string> = {};
    const sanitizedEmail = sanitizeInput(signupEmail);
    const sanitizedName = sanitizeInput(signupName);
    const sanitizedLastName = sanitizeInput(signupLastName);
    
    if (!validateEmail(sanitizedEmail)) {
      errors.email = 'Введите корректный email адрес';
    }
    
    if (!validateName(sanitizedName)) {
      errors.name = 'Имя должно содержать только буквы и пробелы';
    }
    
    if (!validateName(sanitizedLastName)) {
      errors.lastName = 'Фамилия должна содержать только буквы и пробелы';
    }
    
    if (!validatePassword(signupPassword)) {
      errors.password = 'Пароль должен содержать минимум 8 символов, буквы и цифры';
    }
    
    if (signupPassword !== confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают';
    }
    
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    
    setFormErrors({});
    setIsLoading(true);

    const { error } = await signUp(sanitizedEmail, signupPassword, sanitizedName, sanitizedLastName);
    
    if (error) {
      setFormErrors({ general: error.message || 'Ошибка при регистрации' });
    } else {
      // Stay on auth page to show success message
      setSignupName('');
      setSignupLastName('');
      setSignupEmail('');
      setSignupPassword('');
      setConfirmPassword('');
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
                Авторизация
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login">Вход</TabsTrigger>
                  <TabsTrigger value="signup">Регистрация</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
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
                </TabsContent>

                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-muted-foreground">Имя</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="Ваше имя"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        required
                        maxLength={50}
                        className={`kamp-input ${formErrors.name ? 'border-red-500' : ''}`}
                      />
                      {formErrors.name && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.name}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-lastname" className="text-muted-foreground">Фамилия</Label>
                      <Input
                        id="signup-lastname"
                        type="text"
                        placeholder="Ваша фамилия"
                        value={signupLastName}
                        onChange={(e) => setSignupLastName(e.target.value)}
                        required
                        maxLength={50}
                        className={`kamp-input ${formErrors.lastName ? 'border-red-500' : ''}`}
                      />
                      {formErrors.lastName && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.lastName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-muted-foreground">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        required
                        maxLength={254}
                        className={`kamp-input ${formErrors.email ? 'border-red-500' : ''}`}
                      />
                      {formErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.email}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-muted-foreground">Пароль</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        required
                        minLength={8}
                        className={`kamp-input ${formErrors.password ? 'border-red-500' : ''}`}
                      />
                      {formErrors.password && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.password}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        Минимум 8 символов, включая буквы и цифры
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-muted-foreground">Подтвердите пароль</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className={`kamp-input ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
                      />
                      {formErrors.confirmPassword && (
                        <p className="text-red-400 text-xs mt-1">{formErrors.confirmPassword}</p>
                      )}
                      {confirmPassword && signupPassword !== confirmPassword && !formErrors.confirmPassword && (
                        <p className="text-sm text-red-400">Пароли не совпадают</p>
                      )}
                    </div>

                    {formErrors.general && (
                      <p className="text-red-400 text-sm text-center">{formErrors.general}</p>
                    )}

                    <Button 
                      type="submit" 
                      className="kamp-button-primary w-full"
                      disabled={isLoading || signupPassword !== confirmPassword || Object.keys(formErrors).length > 0}
                    >
                      {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
};