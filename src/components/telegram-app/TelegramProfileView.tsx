import React, { useEffect, useState } from 'react';
import { Camera, Trophy, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { proxyStorageUrl } from '@/lib/storageUrl';
import { Label } from '@/components/ui/label';

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Types ----------

interface ProfileData {
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  date_of_birth: string | null;
}

interface CooperTest {
  test_date: string;
  total_minutes: number | null;
  total_seconds: number | null;
  fitness_level: string | null;
}

interface Totem {
  id: string;
  name: string;
  discipline: string;
  icon_name: string | null;
  icon_color: string | null;
  assigned_at: string;
}

interface RatingProfileData {
  profile: ProfileData;
  cooper_test: CooperTest | null;
  totems: Totem[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: RatingProfileData };

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type AvatarState = 'idle' | 'uploading' | 'error';

interface Props {
  onBack: () => void;
}

// ---------- Helpers ----------

const FITNESS_LABELS: Record<string, string> = {
  excellent: 'Отлично',
  good: 'Хорошо',
  satisfactory: 'Удовлетворительно',
  poor: 'Слабо',
  unknown: '—',
};

const formatCooperTime = (test: CooperTest): string => {
  const minutes = test.total_minutes ?? 0;
  const seconds = test.total_seconds ?? 0;
  return `${minutes} мин ${String(seconds).padStart(2, '0')} сек`;
};

// ---------- View ----------

export const TelegramProfileView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saveState, setSaveState] = useState<SaveState>('idle');

  // Telegram BackButton — показываем при маунте, скрываем при размонтировании
  useEffect(() => {
    const btn = window.Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => {
      btn.offClick(onBack);
      btn.hide();
    };
  }, [onBack]);

  // Загрузка профиля
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action: 'get_profile' }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; data?: RatingProfileData; error?: string };
        if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
        return body.data;
      })
      .then((data) => {
        setLoadState({ status: 'ok', data });
        setWeight(data.profile.weight_kg != null ? String(data.profile.weight_kg) : '');
        setHeight(data.profile.height_cm != null ? String(data.profile.height_cm) : '');
        setBirthDate(data.profile.date_of_birth ?? '');
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
        setLoadState({ status: 'error', message: msg });
      });
  }, []);

  const uploadAvatar = (file: File) => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || avatarState === 'uploading') return;

    setAvatarState('uploading');

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = String(reader.result).split(',')[1] ?? '';
      fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'upload_avatar',
          file_name: file.name,
          file_base64: base64,
        }),
      })
        .then(async (res) => {
          const body = await res.json() as { ok: boolean; data?: { avatar_url: string }; error?: string };
          if (!body.ok || !body.data) throw new Error(body.error ?? 'upload_failed');
          return body.data.avatar_url;
        })
        .then((avatarUrl) => {
          setLoadState((prev) =>
            prev.status === 'ok'
              ? { ...prev, data: { ...prev.data, profile: { ...prev.data.profile, avatar_url: avatarUrl } } }
              : prev
          );
          setAvatarState('idle');
        })
        .catch(() => setAvatarState('error'));
    };
    reader.onerror = () => setAvatarState('error');
    reader.readAsDataURL(file);
  };

  const save = () => {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData || saveState === 'saving') return;

    setSaveState('saving');

    fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        initData,
        action: 'update_profile',
        weight: weight.trim() ? Number(weight) : null,
        height: height.trim() ? Number(height) : null,
        birth_date: birthDate.trim() ? birthDate.trim() : null,
      }),
    })
      .then(async (res) => {
        const body = await res.json() as { ok: boolean; error?: string };
        if (!body.ok) throw new Error(body.error ?? 'rpc_error');
      })
      .then(() => setSaveState('saved'))
      .catch(() => setSaveState('error'));
  };

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка профиля...</p>
      </div>
    );
  }

  // ---------- Render: error ----------
  if (loadState.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-destructive text-sm text-center">{loadState.message}</p>
        <Button size="sm" variant="outline" onClick={onBack}>Назад</Button>
      </div>
    );
  }

  const { profile, cooper_test, totems } = loadState.data;
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Участник';

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-2">
        <h1 className="text-white text-xl font-bold">Профиль</h1>
      </div>

      {/* ── Личные данные ── */}
      <div className="px-4 pt-4">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Личные данные
        </p>

        <Card className="mb-3">
          <CardContent className="py-4 px-4 space-y-4">
            <div className="flex flex-col items-center gap-2">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center overflow-hidden">
                  {profile.avatar_url ? (
                    <img src={proxyStorageUrl(profile.avatar_url)} alt={fullName} className="w-full h-full object-cover" />
                  ) : (
                  <span className="text-primary text-3xl font-black">
                    {fullName.trim().charAt(0).toUpperCase() || 'K'}
                  </span>
                )}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-kamp-primary cursor-pointer w-fit">
                <Camera className="w-3.5 h-3.5" />
                {avatarState === 'uploading' ? 'Загрузка...' : 'Загрузить фото'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={avatarState === 'uploading'}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = '';
                    if (f && f.size > 5 * 1024 * 1024) {
                      setAvatarState('error');
                      return;
                    }
                    if (f) uploadAvatar(f);
                  }}
                />
              </label>
              {avatarState === 'error' && (
                <p className="text-xs text-destructive">Не удалось загрузить фото (до 5 МБ)</p>
              )}
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Имя и фамилия</Label>
              <p className="text-sm font-medium mt-1">{fullName}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="profile-weight" className="text-xs text-muted-foreground">Вес (кг)</Label>
                <Input
                  id="profile-weight"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="profile-height" className="text-xs text-muted-foreground">Рост (см)</Label>
                <Input
                  id="profile-height"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="profile-birth-date" className="text-xs text-muted-foreground">Дата рождения</Label>
              <Input
                id="profile-birth-date"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <Button
              className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white"
              disabled={saveState === 'saving'}
              onClick={save}
            >
              {saveState === 'saving' ? 'Сохраняем...' : saveState === 'saved' ? 'Сохранено ✓' : saveState === 'error' ? 'Ошибка — повторить' : 'Сохранить'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* ── Мои результаты ── */}
      <div className="px-4 pt-6">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Мои результаты
        </p>

        <Card className="mb-3">
          <CardContent className="py-3 px-4 flex items-start gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground mb-1">Тест Купера</p>
              {cooper_test ? (
                <>
                  <p className="font-medium text-sm">{formatCooperTime(cooper_test)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(cooper_test.test_date).toLocaleDateString('ru-RU')}
                    {' · '}
                    {FITNESS_LABELS[cooper_test.fitness_level ?? 'unknown'] ?? cooper_test.fitness_level}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Пока нет результатов</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-3 px-4">
            <p className="text-xs text-muted-foreground mb-2">Тотемы</p>
            {totems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Пока нет тотемов</p>
            ) : (
              <div className="space-y-2">
                {totems.map((totem) => (
                  <div key={totem.id} className="flex items-start gap-2">
                    <Award className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{totem.name}</p>
                      <p className="text-xs text-muted-foreground">{totem.discipline}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
};
