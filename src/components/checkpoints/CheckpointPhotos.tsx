import React, { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Loader2, RefreshCw, Trash2 } from 'lucide-react';

export type PhotoSlot = 'front' | 'side';

export const PHOTO_SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: 'front', label: 'Анфас (спереди)' },
  { key: 'side', label: 'Сбоку' },
];

export type PhotoUrls = Partial<Record<PhotoSlot, string>>;

export function parsePhotoUrls(raw: unknown): PhotoUrls {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: PhotoUrls = {};
  PHOTO_SLOTS.forEach(({ key }) => {
    const v = obj[key];
    if (typeof v === 'string' && v) out[key] = v;
  });
  return out;
}

interface Props {
  urls: PhotoUrls;
  editable?: boolean;
  busySlot?: PhotoSlot | null;
  onUpload?: (slot: PhotoSlot, file: File) => void | Promise<void>;
  onDelete?: (slot: PhotoSlot) => void | Promise<void>;
  title?: string;
  compact?: boolean;
}

export const CheckpointPhotos: React.FC<Props> = ({
  urls, editable = false, busySlot = null, onUpload, onDelete, title, compact = false,
}) => {
  const [preview, setPreview] = useState<string | null>(null);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  // cache-busting: bump the key whenever an upload just finished
  // (busySlot goes from a slot back to null) so <img> refetches the new file
  const [refreshKey, setRefreshKey] = useState(() => Date.now());
  const prevBusySlot = useRef(busySlot);
  useEffect(() => {
    if (prevBusySlot.current && !busySlot) setRefreshKey(Date.now());
    prevBusySlot.current = busySlot;
  }, [busySlot]);

  const bust = (u: string) => `${u}${u.includes('?') ? '&' : '?'}t=${refreshKey}`;

  return (
    <div className="space-y-2">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}
      <div className="grid grid-cols-2 gap-2">
        {PHOTO_SLOTS.map(({ key, label }) => {
          const url = urls[key];
          const busy = busySlot === key;
          return (
            <div key={key} className="space-y-1.5">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div
                className={`relative w-full ${compact ? 'aspect-[3/4]' : 'aspect-[3/4]'} rounded-md border border-border bg-muted/40 overflow-hidden flex items-center justify-center`}
              >
                {url ? (
                  <img
                    src={bust(url)}
                    alt={label}
                    loading="lazy"
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setPreview(url)}
                  />
                ) : (
                  <Camera className="w-6 h-6 text-muted-foreground" />
                )}
                {busy && (
                  <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                )}
                {editable && onDelete && url && !busy && (
                  <button
                    type="button"
                    aria-label="Удалить фото"
                    className="absolute top-1 right-1 z-10 rounded-full bg-background/80 hover:bg-background text-destructive p-1 shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Удалить фото?')) void onDelete(key);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {editable && (
                <>
                  <input
                    ref={(el) => { inputs.current[key] = el; }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = '';
                      if (file && onUpload) void onUpload(key, file);
                    }}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={() => inputs.current[key]?.click()}
                  >
                    {url ? <RefreshCw className="w-3.5 h-3.5 mr-1" /> : <Camera className="w-3.5 h-3.5 mr-1" />}
                    {url ? 'Заменить' : 'Загрузить'}
                  </Button>
                </>
              )}
            </div>
          );
        })}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-3xl p-2">
          {preview && <img src={bust(preview)} alt="Фото участника" className="w-full h-auto rounded-md" />}
        </DialogContent>
      </Dialog>
    </div>
  );
};
