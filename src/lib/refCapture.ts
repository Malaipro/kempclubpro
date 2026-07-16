// Захват реферального кода из URL ?ref=КОД в localStorage с TTL 30 дней
const KEY = 'kemp_ref';
const TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface Stored {
  code: string;
  expiresAt: number;
}

export const captureRefFromUrl = () => {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('ref');
    if (code && code.trim()) {
      const payload: Stored = {
        code: code.trim().slice(0, 64),
        expiresAt: Date.now() + TTL_MS,
      };
      localStorage.setItem(KEY, JSON.stringify(payload));
    }
  } catch {
    /* noop */
  }
};

export const getStoredRefCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!parsed?.code || !parsed?.expiresAt) return null;
    if (Date.now() > parsed.expiresAt) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed.code;
  } catch {
    return null;
  }
};
