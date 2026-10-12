import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const AppResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  // Supabase перенаправляет сюда с токеном восстановления —
  // ждём событие PASSWORD_RECOVERY / установку сессии
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }
    if (password !== confirm) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError('Не удалось сохранить пароль. Попробуйте запросить ссылку ещё раз.');
        return;
      }
      navigate('/app', { replace: true });
    } catch {
      setError('Ошибка. Попробуйте ещё раз.');
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
          <p className="text-muted-foreground text-sm mt-1">Новый пароль</p>
        </div>

        {!ready ? (
          <p className="text-muted-foreground text-sm text-center leading-relaxed">
            Ссылка недействительна или устарела.
            <br />
            Запросите новую на странице входа.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-muted-foreground text-xs uppercase tracking-wider">
                Новый пароль
              </Label>
              <Input
                id="new-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-muted-foreground text-xs uppercase tracking-wider">
                Повторите пароль
              </Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="h-12 bg-secondary border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-ring"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive font-medium text-center">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading || !password || !confirm}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold uppercase tracking-wider"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default AppResetPassword;
