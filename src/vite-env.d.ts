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

interface TelegramInitDataUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    start_param?: string;
    user?: TelegramInitDataUser;
    [key: string]: unknown;
  };
  colorScheme: 'light' | 'dark';
  BackButton: TelegramBackButton;
  ready(): void;
  expand?(): void;
  close(): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
}

interface Window {
  Telegram?: {
    WebApp: TelegramWebApp;
  };
}
