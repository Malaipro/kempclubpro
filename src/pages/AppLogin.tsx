import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { formatPhoneRu } from '@/lib/phoneFormat';

const normalizeLoginPhone = (value: string): string | null => {
  if (!/^\+?[\d\s().-]+$/.test(value)) return null;

  const digits = value.replace(/\D/g, '');
  const hasPrefix = /^(?:\+|[78][\s(.-])/.test(value);
  if (!hasPrefix && digits.length === 10) return `+7${digits}`;
  if (!/^[78]\d{10}$/.test(digits)) return null;
  if (value.startsWith('+') && !digits.startsWith('7')) return null;

  return formatPhoneRu(digits);
};

const AppLogin: React.FC = () => {
  const navigate = useNavigate();
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/app', { replace: true });
    });
  }, [navigate]);

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: 'https://kemp-app.ru/app/reset-password',
      });
      if (resetError) {
        setError('Не удалось отправить письмо. Проверьте email.');
        return;
      }
      setResetSent(true);
    } catch {
      setError('Ошибка. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIdentifierError(null);

    const fields = new FormData(e.currentTarget);
    const login = String(fields.get('username') ?? '').trim();
    const submittedPassword = String(fields.get('password') ?? '');
    const isEmail = login.includes('@');
    const normalizedPhone = isEmail ? null : normalizeLoginPhone(login);

    if (!login) {
      setIdentifierError('Введите телефон или email.');
      return;
    }
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login)) {
      setIdentifierError('Введите email полностью, например name@example.com.');
      return;
    }
    if (!isEmail && !normalizedPhone) {
      setIdentifierError('Введите номер полностью, например +7 (999) 123-45-67, или укажите email.');
      return;
    }
    if (!submittedPassword) {
      setError('Введите пароль.');
      return;
    }

    setLoading(true);
    try {
      // «Запомнить меня»: если выключено — помечаем сессию как временную,
      // WebApp завершит её при следующем открытии /app
      if (remember) {
        localStorage.removeItem('kamp_session_temporary');
      } else {
        localStorage.setItem('kamp_session_temporary', '1');
      }
      sessionStorage.setItem('kamp_tab_active', '1');

      // Вход по email — напрямую через Supabase
      if (isEmail) {
        const { error: emailError } = await supabase.auth.signInWithPassword({
          email: login,
          password: submittedPassword,
        });
        if (emailError) {
          setError('Неверный email или пароль');
          return;
        }
        navigate('/app', { replace: true });
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('phone-signin', {
        body: { phone: normalizedPhone, password: submittedPassword },
      });

      const result = data as
        | { access_token?: string; refresh_token?: string; error?: string }
        | null;

      if (fnError || !result?.access_token || !result?.refresh_token) {
        setError(result?.error ?? 'Неверный телефон или пароль');
        return;
      }

      const { error: sessionError } = await supabase.auth.setSession({
        access_token: result.access_token,
        refresh_token: result.refresh_token,
      });

      if (sessionError) {
        setError('Неверный телефон или пароль');
        return;
      }

      navigate('/app', { replace: true });
    } catch {
      setError('Ошибка входа. Попробуйте ещё раз.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="web-app-theme min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-5 py-10">
      <div className="app-login-panel w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4">
            <span className="text-foreground text-3xl font-black">K</span>
          </div>
          <h1 className="text-foreground text-2xl font-black tracking-wider">КЭМП</h1>
          <p className="text-muted-foreground text-sm mt-1">Личный кабинет участника</p>
        </div>

        {resetMode ? (
          resetSent ? (
            <div className="space-y-5 text-center">
              <p className="text-foreground text-sm font-medium">Письмо отправлено на вашу почту</p>
              <button
                type="button"
                onClick={() => { setResetMode(false); setResetSent(false); setResetEmail(''); setError(null); }}
                className="text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
              >
                Вернуться ко входу
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-muted-foreground text-xs uppercase tracking-wider">
                  Введите email
                </Label>
                <Input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="your@email.com"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
                />
              </div>

              {error && (
                <p role="alert" className="text-sm text-destructive font-medium text-center">{error}</p>
              )}

              <Button
                type="submit"
                disabled={loading || !resetEmail}
                className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Отправить ссылку для сброса'}
              </Button>

              <button
                type="button"
                onClick={() => { setResetMode(false); setError(null); }}
                className="w-full text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
              >
                Вернуться ко входу
              </button>
            </form>
          )
        ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-muted-foreground text-xs uppercase tracking-wider">
              Телефон или email
            </Label>
            <Input
              id="phone"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="+7 (999) 123-45-67 или email"
              aria-invalid={identifierError ? true : undefined}
              aria-describedby={identifierError ? 'login-identifier-error' : undefined}
              onChange={() => {
                setIdentifierError(null);
                setError(null);
              }}
              className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
            />
            {identifierError && (
              <p id="login-identifier-error" role="alert" className="text-sm text-destructive font-medium">
                {identifierError}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">
              Пароль
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              onChange={() => setError(null)}
              className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-primary"
            />
            <span className="text-muted-foreground text-sm">Запомнить меня</span>
          </label>

          {error && (
            <p role="alert" className="text-sm text-destructive font-medium text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Войти'}
          </Button>

          <button
            type="button"
            onClick={() => { setResetMode(true); setError(null); setIdentifierError(null); }}
            className="w-full text-muted-foreground text-sm underline underline-offset-4 hover:text-foreground"
          >
            Забыли пароль?
          </button>
        </form>
        )}

        <p className="text-muted-foreground text-xs text-center mt-8 leading-relaxed">
          Доступ выдаёт администратор клуба.
          <br />
          Нет доступа — напишите куратору.
        </p>
      </div>
    </div>
  );
};

export default AppLogin;
