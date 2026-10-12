import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const formatPhone = (raw: string): string => {
  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`;
  if (!digits.startsWith('7')) digits = `7${digits}`;
  digits = digits.slice(0, 11);

  const rest = digits.slice(1);
  let out = '+7';
  if (rest.length) out += ` (${rest.slice(0, 3)}`;
  if (rest.length >= 3) out += `) ${rest.slice(3, 6)}`;
  if (rest.length >= 6) out += `-${rest.slice(6, 8)}`;
  if (rest.length >= 8) out += `-${rest.slice(8, 10)}`;
  return out;
};

const AppLogin: React.FC = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const login = phone.trim();

      // «Запомнить меня»: если выключено — помечаем сессию как временную,
      // WebApp завершит её при следующем открытии /app
      if (remember) {
        localStorage.removeItem('kamp_session_temporary');
      } else {
        localStorage.setItem('kamp_session_temporary', '1');
      }
      sessionStorage.setItem('kamp_tab_active', '1');

      // Вход по email — напрямую через Supabase
      if (login.includes('@')) {
        const { error: emailError } = await supabase.auth.signInWithPassword({
          email: login,
          password,
        });
        if (emailError) {
          setError('Неверный email или пароль');
          return;
        }
        navigate('/app', { replace: true });
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('phone-signin', {
        body: { phone: login, password },
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
                <p className="text-sm text-destructive font-medium text-center">{error}</p>
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
              autoComplete="email"
              placeholder="+7 (999) 123-45-67 или email"
              value={phone}
              onChange={(e) => {
                const v = e.target.value;
                // Форматируем как телефон, только если нет букв и @
                setPhone(/[a-zA-Z@]/.test(v) ? v : formatPhone(v));
              }}
              className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-muted-foreground text-xs uppercase tracking-wider">
              Пароль
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
            <p className="text-sm text-destructive font-medium text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Войти'}
          </Button>
        </form>

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
