import React, { useEffect, useState } from 'react';
import { TelegramAppShell } from '@/components/telegram-app/TelegramAppShell';
import { TelegramLoading } from '@/components/telegram-app/TelegramLoading';
import { TelegramNoAccess } from '@/components/telegram-app/TelegramNoAccess';
import { loadTelegramSdk } from '@/lib/telegramSdk';

type SdkState = 'loading' | 'ready' | 'failed';

const TelegramApp: React.FC = () => {
  const [sdkState, setSdkState] = useState<SdkState>('loading');

  useEffect(() => {
    let cancelled = false;

    loadTelegramSdk().then((ok) => {
      if (cancelled) return;
      setSdkState(ok ? 'ready' : 'failed');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (sdkState === 'loading') return <TelegramLoading />;
  if (sdkState === 'failed') return <TelegramNoAccess reason="no_webapp" />;

  return <TelegramAppShell />;
};

export default TelegramApp;
