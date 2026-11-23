/**
 * Адаптер путей к статике игры для кабинета КЭМП.
 * Ассеты игры лежат под /men-path/* (скопированы из put-muzhchiny/public/).
 */
export const PUBLIC_ASSET_REVISION = '2026-10-20-v5';

export function getPublicUrl(path: string): string {
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const separator = cleanPath.includes('?') ? '&' : '?';
  return `/men-path/${cleanPath}${separator}asset=${PUBLIC_ASSET_REVISION}`;
}
