import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, FileText, Save, Lock, Unlock } from 'lucide-react';

interface PyramidLevel {
  id: string;
  level_number: number;
  title: string;
  description: string | null;
  presentation_url: string | null;
  is_unlocked: boolean;
}

const isImage = (p: string) => /\.(png|jpe?g|gif|webp)$/i.test(p);

const PresentationLink: React.FC<{ path: string }> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data } = await supabase.storage
        .from('pyramid-materials')
        .createSignedUrl(path, 3600);
      if (active) setUrl(data?.signedUrl || null);
    })();
    return () => { active = false; };
  }, [path]);

  if (!url) return <span className="text-xs text-muted-foreground">Загрузка ссылки…</span>;
  if (isImage(path)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1">
        <img src={url} alt="Презентация" className="max-h-32 rounded border object-cover" />
      </a>
    );
  }
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <FileText className="w-4 h-4" /> Открыть презентацию
    </a>
  );
};

const LevelRow: React.FC<{ level: PyramidLevel; onChanged: () => void }> = ({ level, onChanged }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [unlocked, setUnlocked] = useState(level.is_unlocked);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setUnlocked(level.is_unlocked);
    setFile(null);
  }, [level]);

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 50 * 1024 * 1024) {
      toast({
        title: 'Файл слишком большой',
        description: `Максимум 50 МБ (ваш файл ${(f.size / 1024 / 1024).toFixed(1)} МБ). Сожмите PDF или загрузите ссылку.`,
        variant: 'destructive',
      });
      e.target.value = '';
      return;
    }
    setFile(f);
  };

  const save = async () => {
    setSaving(true);
    try {
      let presentation_url = level.presentation_url;

      if (file) {
        const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '');
        const path = `${level.id}-${Date.now()}.${ext}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from('pyramid-materials')
            .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
          if (uploadError) throw uploadError;
        } catch (uploadErr: any) {
          const msg = String(uploadErr?.message || '');
          throw new Error(
            /failed to fetch|network/i.test(msg)
              ? 'Не удалось загрузить файл: соединение прервалось. Обычно это слишком большой файл (лимит 50 МБ) или нестабильная сеть. Попробуйте сжать файл и повторить.'
              : `Ошибка загрузки файла: ${msg}`
          );
        }
        presentation_url = path;
      }

      const { error } = await supabase
        .from('pyramid_levels')
        .update({ is_unlocked: unlocked, presentation_url })
        .eq('id', level.id);
      if (error) throw error;

      toast({ title: 'Сохранено', description: `Уровень ${level.level_number}: ${level.title}` });
      setFile(null);
      onChanged();
    } catch (err: any) {
      toast({ title: 'Ошибка сохранения', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };


  return (
    <Card className="bg-card">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-base">{level.level_number}</Badge>
            <div>
              <h3 className="font-semibold">{level.title}</h3>
              {level.description && (
                <p className="text-xs text-muted-foreground max-w-md">{level.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {unlocked ? <Unlock className="w-4 h-4 text-green-500" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
            <Switch checked={unlocked} onCheckedChange={setUnlocked} />
            <Label className="text-sm">{unlocked ? 'Открыт' : 'Закрыт'}</Label>
          </div>
        </div>

        <div className="space-y-2">
          {level.presentation_url && !file && (
            <div>
              <Label className="text-xs text-muted-foreground">Текущая презентация</Label>
              <div><PresentationLink path={level.presentation_url} /></div>
            </div>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.ppt,.pptx,image/*"
              className="hidden"
              onChange={onPickFile}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />
              {level.presentation_url ? 'Заменить файл' : 'Загрузить презентацию'}
            </Button>
            {file && <span className="text-sm text-muted-foreground truncate max-w-[200px]">{file.name}</span>}
            <Button size="sm" onClick={save} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Сохранить
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const PyramidManagement: React.FC = () => {
  const [levels, setLevels] = useState<PyramidLevel[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pyramid_levels')
      .select('*')
      .order('level_number', { ascending: true });
    setLevels((data as PyramidLevel[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-card">
        <CardHeader>
          <CardTitle>Пирамида КЭМП — 7 уровней</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Управляйте доступом к уровням и загружайте презентации для каждого уровня.
        </CardContent>
      </Card>
      {levels.map((level) => (
        <LevelRow key={level.id} level={level} onChanged={load} />
      ))}
    </div>
  );
};
