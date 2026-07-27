// Захват UTM-меток и yclid из URL в localStorage с TTL 30 дней.
// Стратегия: Last non-empty — при новом заходе непустые значения перезаписывают старые,
// пустые/отсутствующие параметры сохраняют предыдущее значение.
const KEY = 'kemp_utm';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

const TRACKED_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'yclid',
] as const;

type TrackedKey = typeof TRACKED_KEYS[number];
export type UtmData = Partial<Record<TrackedKey, string>>;

interface Stored {
  data: UtmData;
  expiresAt: number;
  firstSeenAt: number;
  lastSeenAt: number;
}

const readStored = (): Stored | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.data || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const captureUtmFromUrl = () => {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const incoming: UtmData = {};
    for (const key of TRACKED_KEYS) {
      const v = params.get(key);
      if (v && v.trim()) incoming[key] = v.trim().slice(0, 255);
    }
    if (Object.keys(incoming).length === 0) return;

    const now = Date.now();
    const prev = readStored();
    const merged: UtmData = { ...(prev?.data ?? {}), ...incoming };

    const payload: Stored = {
      data: merged,
      expiresAt: now + TTL_MS,
      firstSeenAt: prev?.firstSeenAt ?? now,
      lastSeenAt: now,
    };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    /* noop */
  }
};

export const getStoredUtm = (): UtmData | null => {
  if (typeof window === 'undefined') return null;
  const stored = readStored();
  if (!stored) return null;
  const keys = Object.keys(stored.data);
  return keys.length ? stored.data : null;
};
