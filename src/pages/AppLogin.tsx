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
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate('/app', { replace: true });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('phone-signin', {
        body: { phone, password },
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
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-kamp-primary flex items-center justify-center mb-4">
            <span className="text-white text-3xl font-black">K</span>
          </div>
          <h1 className="text-white text-2xl font-black tracking-wider">КЭМП</h1>
          <p className="text-white/50 text-sm mt-1">Личный кабинет участника</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-white/70 text-xs uppercase tracking-wider">
              Телефон
            </Label>
            <Input
              id="phone"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+7 (999) 123-45-67"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              className="h-12 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-kamp-primary"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/70 text-xs uppercase tracking-wider">
              Пароль
            </Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-white/5 border-white/15 text-white placeholder:text-white/30 focus-visible:ring-kamp-primary"
            />
          </div>

          {error && (
            <p className="text-sm text-kamp-primary font-medium text-center">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading || !phone || !password}
            className="w-full h-12 bg-kamp-primary hover:bg-red-700 text-white font-bold uppercase tracking-wider"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Войти'}
          </Button>
        </form>

        <p className="text-white/30 text-xs text-center mt-8 leading-relaxed">
          Доступ выдаёт администратор клуба.
          <br />
          Нет доступа — напишите куратору.
        </p>
      </div>
    </div>
  );
};

export default AppLogin;
