import React, { useEffect, useState, useCallback } from 'react';
import { Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckpointPhotos, PhotoSlot, parsePhotoUrls } from '@/components/checkpoints/CheckpointPhotos';


const SERVER_URL = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

type CheckpointType = 'A' | 'B';

const PYRAMID_LEVELS: { key: string; label: string }[] = [
  { key: 'environment', label: 'Окружение' },
  { key: 'behavior', label: 'Поведение' },
  { key: 'abilities', label: 'Способности' },
  { key: 'beliefs', label: 'Убеждения' },
  { key: 'identity', label: 'Идентичность' },
  { key: 'mission', label: 'Миссия' },
  { key: 'synthesis', label: 'Синтез' },
];

interface Checkpoint {
  id: string;
  checkpoint_type: CheckpointType;
  weight_kg: number | null;
  waist_cm: number | null;
  belly_cm: number | null;
  chest_cm: number | null;
  hips_cm: number | null;
  body_fat_pct: number | null;
  pyramid_scores: Record<string, number> | null;
  pyramid_average: number | null;
  personal_goal: string | null;
  personal_result: string | null;
  main_achievement: string | null;
  photo_urls?: unknown;
}


type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; checkpoint: Checkpoint | null };

interface Props { onBack: () => void; }

interface FormState {
  weight_kg: string;
  waist_cm: string;
  belly_cm: string;
  chest_cm: string;
  hips_cm: string;
  body_fat_pct: string;
  pyramid_scores: Record<string, number>;
  personal_goal: string;
  personal_result: string;
  main_achievement: string;
}

function defaultPyramidScores(): Record<string, number> {
  const scores: Record<string, number> = {};
  PYRAMID_LEVELS.forEach((lvl) => { scores[lvl.key] = 5; });
  return scores;
}

function emptyForm(): FormState {
  return {
    weight_kg: '', waist_cm: '', belly_cm: '', chest_cm: '', hips_cm: '', body_fat_pct: '',
    pyramid_scores: defaultPyramidScores(),
    personal_goal: '', personal_result: '', main_achievement: '',
  };
}

function checkpointToForm(cp: Checkpoint): FormState {
  return {
    weight_kg: cp.weight_kg != null ? String(cp.weight_kg) : '',
    waist_cm: cp.waist_cm != null ? String(cp.waist_cm) : '',
    belly_cm: cp.belly_cm != null ? String(cp.belly_cm) : '',
    chest_cm: cp.chest_cm != null ? String(cp.chest_cm) : '',
    hips_cm: cp.hips_cm != null ? String(cp.hips_cm) : '',
    body_fat_pct: cp.body_fat_pct != null ? String(cp.body_fat_pct) : '',
    pyramid_scores: { ...defaultPyramidScores(), ...(cp.pyramid_scores || {}) },
    personal_goal: cp.personal_goal || '',
    personal_result: cp.personal_result || '',
    main_achievement: cp.main_achievement || '',
  };
}

function pyramidAverage(scores: Record<string, number>): number {
  const values = PYRAMID_LEVELS.map((lvl) => scores[lvl.key] ?? 0);
  const sum = values.reduce((acc, v) => acc + v, 0);
  return Math.round((sum / values.length) * 10) / 10;
}

export const TelegramCheckpointView: React.FC<Props> = ({ onBack }) => {
  const [checkpointType, setCheckpointType] = useState<CheckpointType>('A');
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);
  const [busySlot, setBusySlot] = useState<PhotoSlot | null>(null);


  useEffect(() => {
    const btn = (window as any).Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => { btn.offClick(onBack); btn.hide(); };
  }, [onBack]);

  const fetchData = useCallback(async (type: CheckpointType) => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }
    try {
      setLoadState({ status: 'loading' });
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_checkpoint', checkpoint_type: type }),
      });
      const body = await res.json() as {
        ok: boolean;
        data?: { checkpoint: Checkpoint | null };
        error?: string;
      };
      if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
      const cp = body.data.checkpoint;
      setLoadState({ status: 'ok', checkpoint: cp });
      setForm(cp ? checkpointToForm(cp) : emptyForm());
      setEditing(!cp);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
      setLoadState({ status: 'error', message: msg });
    }
  }, []);

  useEffect(() => { fetchData(checkpointType); }, [checkpointType, fetchData]);

  const setField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const setPyramidScore = (key: string, value: number) => {
    setForm((prev) => ({ ...prev, pyramid_scores: { ...prev.pyramid_scores, [key]: value } }));
  };

  const handleSave = async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setSaving(true);
    try {
      const checkpoint_data = {
        weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
        waist_cm: form.waist_cm ? parseFloat(form.waist_cm) : null,
        belly_cm: form.belly_cm ? parseFloat(form.belly_cm) : null,
        chest_cm: form.chest_cm ? parseFloat(form.chest_cm) : null,
        hips_cm: form.hips_cm ? parseFloat(form.hips_cm) : null,
        body_fat_pct: form.body_fat_pct ? parseFloat(form.body_fat_pct) : null,
        pyramid_scores: form.pyramid_scores,
        pyramid_average: pyramidAverage(form.pyramid_scores),
        personal_goal: checkpointType === 'A' ? form.personal_goal : null,
        personal_result: checkpointType === 'B' ? form.personal_result : null,
        main_achievement: checkpointType === 'B' ? form.main_achievement : null,
      };

      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'save_checkpoint',
          checkpoint_type: checkpointType,
          checkpoint_data,
        }),
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'rpc_error');
      await fetchData(checkpointType);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (slot: PhotoSlot, file: File) => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setBusySlot(slot);
    try {
      const base64: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
        reader.onerror = () => reject(new Error('Не удалось прочитать файл'));
        reader.readAsDataURL(file);
      });

      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'upload_checkpoint_photo',
          checkpoint_type: checkpointType,
          photo_type: slot,
          file_base64: base64,
          file_name: file.name,
        }),
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'upload_failed');
      await fetchData(checkpointType);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка загрузки фото');
    } finally {
      setBusySlot(null);
    }
  };

  const renderPhotos = (cp: Checkpoint | null) => (
    <Card>
      <CardContent className="py-4 px-4">
        <CheckpointPhotos
          title={`Фото — Точка ${checkpointType}`}
          urls={parsePhotoUrls(cp?.photo_urls)}
          editable
          busySlot={busySlot}
          onUpload={handlePhotoUpload}
        />
      </CardContent>
    </Card>
  );



  const renderTabs = () => (
    <div className="px-4 pt-4">
      <Tabs value={checkpointType} onValueChange={(v) => setCheckpointType(v as CheckpointType)}>
        <TabsList className="w-full">
          <TabsTrigger value="A" className="flex-1">Точка А</TabsTrigger>
          <TabsTrigger value="B" className="flex-1">Точка Б</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );

  const header = (
    <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
      <h1 className="text-white text-xl font-bold">Точка А / Точка Б</h1>
    </div>
  );

  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background pb-8">
        {header}
        {renderTabs()}
        <div className="px-4 pt-8 text-center">
          <p className="text-muted-foreground text-sm">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (loadState.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-destructive text-sm text-center">{loadState.message}</p>
        <Button size="sm" variant="outline" onClick={onBack}>Назад</Button>
      </div>
    );
  }

  const { checkpoint } = loadState;

  // ---------- Readonly view ----------
  if (checkpoint && !editing) {
    return (
      <div className="min-h-screen bg-background pb-8">
        {header}
        {renderTabs()}

        <div className="px-4 pt-4 space-y-4">
          <Card>
            <CardContent className="py-4 px-4 space-y-2">
              <h2 className="text-sm font-bold mb-1">Замеры тела</h2>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">Вес <span className="text-foreground font-medium">{checkpoint.weight_kg ?? '—'} кг</span></p>
                <p className="text-muted-foreground">Талия <span className="text-foreground font-medium">{checkpoint.waist_cm ?? '—'} см</span></p>
                <p className="text-muted-foreground">Живот <span className="text-foreground font-medium">{checkpoint.belly_cm ?? '—'} см</span></p>
                <p className="text-muted-foreground">Грудь <span className="text-foreground font-medium">{checkpoint.chest_cm ?? '—'} см</span></p>
                <p className="text-muted-foreground">Бёдра <span className="text-foreground font-medium">{checkpoint.hips_cm ?? '—'} см</span></p>
                <p className="text-muted-foreground">% жира <span className="text-foreground font-medium">{checkpoint.body_fat_pct ?? '—'}%</span></p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="py-4 px-4 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-sm font-bold">Пирамида КЭМП</h2>
                <span className="text-sm font-bold text-kamp-primary">
                  {checkpoint.pyramid_average ?? pyramidAverage(checkpoint.pyramid_scores || defaultPyramidScores())}
                </span>
              </div>
              <div className="space-y-1.5">
                {PYRAMID_LEVELS.map((lvl) => (
                  <div key={lvl.key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{lvl.label}</span>
                    <span className="font-medium">{checkpoint.pyramid_scores?.[lvl.key] ?? '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {checkpointType === 'A' && checkpoint.personal_goal && (
            <Card>
              <CardContent className="py-4 px-4">
                <h2 className="text-sm font-bold mb-2">Моя главная цель на интенсив</h2>
                <p className="text-sm text-muted-foreground whitespace-pre-line">{checkpoint.personal_goal}</p>
              </CardContent>
            </Card>
          )}

          {checkpointType === 'B' && (checkpoint.personal_result || checkpoint.main_achievement) && (
            <Card>
              <CardContent className="py-4 px-4 space-y-3">
                {checkpoint.personal_result && (
                  <div>
                    <h2 className="text-sm font-bold mb-1">Мой главный результат</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{checkpoint.personal_result}</p>
                  </div>
                )}
                {checkpoint.main_achievement && (
                  <div>
                    <h2 className="text-sm font-bold mb-1">Главное достижение</h2>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{checkpoint.main_achievement}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Button className="w-full" variant="outline" onClick={() => setEditing(true)}>
            Редактировать
          </Button>
        </div>
      </div>
    );
  }

  // ---------- Form ----------
  return (
    <div className="min-h-screen bg-background pb-8">
      {header}
      {renderTabs()}

      <div className="px-4 pt-4 space-y-4">
        <Card>
          <CardContent className="py-4 px-4 space-y-3">
            <h2 className="text-sm font-bold">Замеры тела</h2>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Вес, кг</label>
              <Input type="number" inputMode="decimal" value={form.weight_kg} onChange={(e) => setField('weight_kg', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Талия, см</label>
              <Input type="number" inputMode="decimal" value={form.waist_cm} onChange={(e) => setField('waist_cm', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Живот, см</label>
              <Input type="number" inputMode="decimal" value={form.belly_cm} onChange={(e) => setField('belly_cm', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Грудь, см</label>
              <Input type="number" inputMode="decimal" value={form.chest_cm} onChange={(e) => setField('chest_cm', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">Бёдра, см</label>
              <Input type="number" inputMode="decimal" value={form.hips_cm} onChange={(e) => setField('hips_cm', e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">% жира</label>
              <Input type="number" inputMode="decimal" value={form.body_fat_pct} onChange={(e) => setField('body_fat_pct', e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4 px-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Пирамида КЭМП</h2>
              <span className="text-sm font-bold text-kamp-primary">{pyramidAverage(form.pyramid_scores)}</span>
            </div>

            {PYRAMID_LEVELS.map((lvl) => (
              <div key={lvl.key} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span>{lvl.label}</span>
                  <span className="font-medium text-kamp-primary">{form.pyramid_scores[lvl.key]}</span>
                </div>
                <Slider
                  value={[form.pyramid_scores[lvl.key]]}
                  min={1}
                  max={10}
                  step={1}
                  onValueChange={(v) => setPyramidScore(lvl.key, v[0])}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        {checkpointType === 'A' && (
          <Card>
            <CardContent className="py-4 px-4 space-y-2">
              <h2 className="text-sm font-bold">Цели</h2>
              <label className="text-xs text-muted-foreground">Моя главная цель на интенсив</label>
              <Textarea
                value={form.personal_goal}
                onChange={(e) => setField('personal_goal', e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>
        )}

        {checkpointType === 'B' && (
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <h2 className="text-sm font-bold">Результаты</h2>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Мой главный результат</label>
                <Textarea
                  value={form.personal_result}
                  onChange={(e) => setField('personal_result', e.target.value)}
                  rows={4}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Главное достижение</label>
                <Textarea
                  value={form.main_achievement}
                  onChange={(e) => setField('main_achievement', e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-2">
          {checkpoint && (
            <Button variant="outline" className="flex-1" onClick={() => { setForm(checkpointToForm(checkpoint)); setEditing(false); }} disabled={saving}>
              Отмена
            </Button>
          )}
          <Button className="flex-1 bg-kamp-primary hover:bg-kamp-primary/90" onClick={handleSave} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      </div>
    </div>
  );
};
