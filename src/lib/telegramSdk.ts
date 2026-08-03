/**
 * Ленивая загрузка Telegram Web App SDK.
 *
 * SDK НЕ подключается глобально в index.html — внешний домен telegram.org
 * может быть недоступен и блокировать запуск основного сайта.
 * Скрипт добавляется только при открытии маршрута /telegram.
 */

const SDK_URL = 'https://telegram.org/js/telegram-web-app.js';
const SCRIPT_ID = 'telegram-web-app-sdk';
const TIMEOUT_MS = 5000;

let sdkPromise: Promise<boolean> | null = null;

function isSdkReady(): boolean {
  return Boolean(window.Telegram?.WebApp);
}

/**
 * Загружает SDK и резолвится в true при успехе, false — при ошибке/тайм-ауте.
 * Никогда не реджектится и не зависает: максимум TIMEOUT_MS.
 * Повторные вызовы переиспользуют одну Promise и не создают второй <script>.
 */
export function loadTelegramSdk(): Promise<boolean> {
  // 1. SDK уже подставлен клиентом Telegram — сеть не трогаем.
  if (isSdkReady()) return Promise.resolve(true);

  // 2. Загрузка уже идёт или завершена — переиспользуем.
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<boolean>((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    const script = existing ?? document.createElement('script');

    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      script.removeEventListener('load', onLoad);
      script.removeEventListener('error', onError);
    };

    const settle = (ok: boolean) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(ok);
    };

    function onLoad() {
      // Скрипт загрузился, но объект мог не появиться (вне Telegram-клиента).
      settle(isSdkReady());
    }

    function onError() {
      settle(false);
    }

    script.addEventListener('load', onLoad);
    script.addEventListener('error', onError);

    timer = setTimeout(() => settle(isSdkReady()), TIMEOUT_MS);

    if (!existing) {
      script.id = SCRIPT_ID;
      script.src = SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkPromise;
}
