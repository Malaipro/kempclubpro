import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Paperclip, FileText, Loader2 } from 'lucide-react';
import { proxyStorageUrl } from '@/lib/storageUrl';

interface HomeworkFileLinkProps {
  /** Путь к файлу в bucket "homework-files" */
  path: string;
}

const isImage = (p: string) => /\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(p);

/** Показывает превью изображения или ссылку на файл из приватного bucket через signed URL. */
export const HomeworkFileLink: React.FC<HomeworkFileLinkProps> = ({ path }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase.storage
        .from('homework-files')
        .createSignedUrl(path, 3600);
      if (active) {
        setUrl(data?.signedUrl || null);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [path]);

  if (loading) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
  if (!url) return <span className="text-xs text-muted-foreground">Файл недоступен</span>;

  if (isImage(path)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-block mt-1">
        <img src={url} alt="Прикреплённый файл" className="max-h-40 rounded border object-cover" />
      </a>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-1"
    >
      <FileText className="w-4 h-4" /> Открыть файл
    </a>
  );
};

export default HomeworkFileLink;
