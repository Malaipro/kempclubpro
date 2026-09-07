import React, { createContext, useContext, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Единый адаптер доступа к данным Mini App.
 *
 * Две реализации:
 *  - Telegram: запросы идут на tg.kempclub.pro/api/state с initData (как сейчас).
 *  - Web (/app): прямые вызовы Supabase RPC под auth.uid().
 *
 * Экраны Mini App постепенно переводятся на useAppApi().callApi(action, payload),
 * чтобы один и тот же UI работал в обеих средах.
 */

export type ApiEnvironment = 'telegram' | 'web';

export type CallApi = <T = unknown>(
  action: string,
  payload?: Record<string, unknown>,
) => Promise<T>;

interface AppApiValue {
  environment: ApiEnvironment;
  callApi: CallApi;
}

const AppApiContext = createContext<AppApiValue | null>(null);

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

// ---------- Telegram реализация ----------

function createTelegramApi(initData: string): CallApi {
  return async <T,>(action: string, payload: Record<string, unknown> = {}) => {
    const res = await fetch(`${SERVER_URL}/api/state`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initData, action, ...payload }),
    });

    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? 'network_error');
    }

    const body = (await res.json()) as { ok: boolean; data?: T; error?: string };
    if (!body.ok) throw new Error(body.error ?? 'rpc_error');
    return body.data as T;
  };
}

// ---------- Web реализация ----------

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const id = data.user?.id;
  if (!id) throw new Error('not_authenticated');
  return id;
}

const webApi: CallApi = async <T,>(action: string, payload: Record<string, unknown> = {}) => {
  const userId = await currentUserId();

  switch (action) {
    case 'get_state': {
      const { data, error } = await supabase.rpc('get_participant_full_state', {
        p_user_id: userId,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }
    default:
      // Остальные действия подключаются на следующих этапах.
      throw new Error(`unsupported_action:${action}`);
  }
};

// ---------- Provider ----------

export const AppApiProvider: React.FC<{
  environment: ApiEnvironment;
  initData?: string;
  children: React.ReactNode;
}> = ({ environment, initData, children }) => {
  const value = useMemo<AppApiValue>(
    () => ({
      environment,
      callApi: environment === 'telegram' ? createTelegramApi(initData ?? '') : webApi,
    }),
    [environment, initData],
  );

  return <AppApiContext.Provider value={value}>{children}</AppApiContext.Provider>;
};

export function useAppApi(): AppApiValue {
  const ctx = useContext(AppApiContext);
  if (!ctx) throw new Error('useAppApi must be used within AppApiProvider');
  return ctx;
}
