import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const ChangePassword: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Загрузка...</div>;
  if (!user) return <Navigate to="/app/login" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (pwd.length < 6) return setError('Пароль должен содержать минимум 6 символов');
    if (pwd !== confirm) return setError('Пароли не совпадают');
    setSaving(true);
    try {
      const { error: authErr } = await supabase.auth.updateUser({ password: pwd });
      if (authErr) { setError('Не удалось сменить пароль: ' + authErr.message); return; }
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ must_change_password: false } as any)
        .eq('user_id', user.id);
      if (profErr) { setError('Пароль изменён, но не удалось обновить профиль. Попробуйте ещё раз.'); return; }
      navigate('/app', { replace: true });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="web-app-theme min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <form onSubmit={submit} className="app-login-panel w-full max-w-sm rounded-lg border border-border p-6 space-y-5">
        <div className="text-center space-y-2">
          <Lock className="w-8 h-8 text-primary mx-auto" />
          <h1 className="text-2xl font-bold uppercase tracking-wide">Смена пароля</h1>
          <p className="text-sm text-muted-foreground">Для безопасности установите свой пароль</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="new-pwd">Новый пароль</Label>
          <div className="relative">
            <Input id="new-pwd" type={show ? 'text' : 'password'} autoComplete="new-password"
              value={pwd} onChange={(e) => setPwd(e.target.value)} className="pr-10" />
            <button type="button" aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
              onClick={() => setShow(!show)}
              className="absolute right-0 top-0 h-full px-3 text-muted-foreground">
              {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-pwd">Подтвердите пароль</Label>
          <Input id="confirm-pwd" type={show ? 'text' : 'password'} autoComplete="new-password"
            value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-destructive text-center">{error}</p>}
        <Button type="submit" disabled={saving} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 uppercase">
          {saving ? 'Сохранение...' : 'Сохранить'}
        </Button>
      </form>
    </div>
  );
};

export default ChangePassword;
