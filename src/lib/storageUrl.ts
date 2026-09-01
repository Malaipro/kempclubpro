/**
 * Заменяет публичный URL Supabase Storage на проксируемый домен.
 * Используется только при отображении — не при загрузке.
 */
export function proxyStorageUrl(url: string): string {
  if (!url) return url;
  return url.replace(
    'https://wfjvjvbjjxcgkaolkgdq.supabase.co/storage/',
    'https://kempclub.pro/storage/'
  );
}
