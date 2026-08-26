import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CheckpointPhotos, PhotoSlot, PhotoUrls, parsePhotoUrls } from './CheckpointPhotos';
import { Loader2 } from 'lucide-react';

interface Props {
  userId: string;
  /** Если не передан — берётся current_stream_id из профиля участника */
  streamId?: string | null;
  editable?: boolean;
}

type CheckpointType = 'A' | 'B';

interface Row {
  id: string;
  checkpoint_type: string;
  stream_id: string;
  photo_urls: unknown;
}

export const AdminCheckpointPhotos: React.FC<Props> = ({ userId, streamId, editable = true }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [stream, setStream] = useState<string | null>(streamId ?? null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let sid = streamId ?? null;
    if (!sid) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('current_stream_id')
        .eq('user_id', userId)
        .maybeSingle();
      sid = (profile as { current_stream_id: string | null } | null)?.current_stream_id ?? null;
    }
    setStream(sid);

    const { data } = await supabase
      .from('participant_checkpoints')
      .select('id, checkpoint_type, stream_id, photo_urls')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setRows((data as Row[] | null) ?? []);
    setLoading(false);
  }, [userId, streamId]);

  useEffect(() => { void load(); }, [load]);

  const urlsFor = (type: CheckpointType): PhotoUrls => {
    const row = rows.find(
      (r) => (r.checkpoint_type || '').toUpperCase().startsWith(type) && (!stream || r.stream_id === stream),
    ) ?? rows.find((r) => (r.checkpoint_type || '').toUpperCase().startsWith(type));
    return parsePhotoUrls(row?.photo_urls);
  };

  const handleUpload = async (type: CheckpointType, slot: PhotoSlot, file: File) => {
    const key = `${type}_${slot}`;
    setBusy(key);
    try {
      if (!stream) throw new Error('У участника не указан текущий поток');

      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `${userId}/${type}_${slot}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from('checkpoints')
        .upload(path, file, { upsert: true, contentType: file.type || 'image/jpeg' });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from('checkpoints').getPublicUrl(path);
      const url = `${pub.publicUrl}?v=${Date.now()}`;

      const existing = rows.find(
        (r) => (r.checkpoint_type || '').toUpperCase().startsWith(type) && r.stream_id === stream,
      );
      const photoUrls = { ...parsePhotoUrls(existing?.photo_urls), [slot]: url };

      if (existing) {
        const { error } = await supabase
          .from('participant_checkpoints')
          .update({ photo_urls: photoUrls })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('participant_checkpoints')
          .insert({
            user_id: userId,
            stream_id: stream,
            checkpoint_type: type,
            photo_urls: photoUrls,
          });
        if (error) throw error;
      }

      toast({ title: 'Фото загружено' });
      await load();
    } catch (err: unknown) {
      toast({
        title: 'Ошибка загрузки',
        description: err instanceof Error ? err.message : 'Не удалось загрузить фото',
        variant: 'destructive',
      });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Загрузка фото...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Фото Точка А / Точка Б (До / После)</p>
      {!stream && (
        <p className="text-xs text-destructive">
          У участника не задан текущий поток — загрузка недоступна.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {(['A', 'B'] as CheckpointType[]).map((type) => (
          <div key={type} className="rounded-md border border-border p-3">
            <CheckpointPhotos
              title={type === 'A' ? 'Точка А (До)' : 'Точка Б (После)'}
              urls={urlsFor(type)}
              editable={editable && !!stream}
              busySlot={busy?.startsWith(`${type}_`) ? (busy.split('_')[1] as PhotoSlot) : null}
              onUpload={(slot, file) => handleUpload(type, slot, file)}
              compact
            />
          </div>
        ))}
      </div>
    </div>
  );
};
