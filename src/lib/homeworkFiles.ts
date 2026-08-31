export interface HomeworkFile {
  url: string;
  name: string;
}

/** Нормализует список файлов задания: новое поле file_urls + обратная совместимость с file_url. */
export function parseHomeworkFiles(fileUrls: unknown, legacyUrl?: string | null): HomeworkFile[] {
  const list: HomeworkFile[] = [];
  const raw = typeof fileUrls === 'string' ? safeParse(fileUrls) : fileUrls;
  if (Array.isArray(raw)) {
    raw.forEach((item: any) => {
      if (!item) return;
      if (typeof item === 'string') list.push({ url: item, name: fileNameFromUrl(item) });
      else if (typeof item.url === 'string' && item.url)
        list.push({ url: item.url, name: item.name || fileNameFromUrl(item.url) });
    });
  }
  if (!list.length && legacyUrl) list.push({ url: legacyUrl, name: fileNameFromUrl(legacyUrl) });
  return list;
}

function safeParse(value: string): unknown {
  try { return JSON.parse(value); } catch { return null; }
}

export function fileNameFromUrl(url: string): string {
  try {
    const path = url.split('?')[0];
    const last = path.split('/').pop() || 'Файл';
    return decodeURIComponent(last).replace(/^\d{10,}-/, '');
  } catch {
    return 'Файл';
  }
}

/** Безопасное имя файла для ключа Supabase Storage (только ASCII). */
export function safeStorageName(name: string): string {
  const dot = name.lastIndexOf('.');
  const base = dot > 0 ? name.slice(0, dot) : name;
  const ext = dot > 0 ? name.slice(dot + 1).replace(/[^a-zA-Z0-9]/g, '') : '';
  const safeBase = base.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'file';
  return ext ? `${safeBase}.${ext.toLowerCase()}` : safeBase;
}
