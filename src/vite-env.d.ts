/// <reference types="vite/client" />

declare module '*?format=webp' {
  const src: string;
  export default src;
}

declare module '*&format=webp' {
  const src: string;
  export default src;
}

// ENV переменные Vite
interface ImportMetaEnv {
  readonly VITE_TELEGRAM_SERVER_URL: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Telegram Mini App WebApp SDK (загружается Telegram при открытии Mini App)
interface TelegramBackButton {
  isVisible: boolean;
  show(): void;
  hide(): void;
  onClick(callback: () => void): void;
  offClick(callback: () => void): void;
}

interface TelegramWebApp {
  initData: string;
  colorScheme: 'light' | 'dark';
  BackButton: TelegramBackButton;
  ready(): void;
  close(): void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
