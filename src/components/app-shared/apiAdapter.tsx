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
  switch (action) {
    case 'get_state': {
      const userId = await currentUserId();
      const { data, error } = await supabase.rpc('get_participant_full_state', {
        p_user_id: userId,
      });
      if (error) {
        console.error('[webApi:get_state] RPC error', error);
        throw new Error(error.message);
      }
      if (!data) throw new Error('Данные участника не получены');

      const payload = data as Record<string, unknown>;
      if (payload.error === 'profile_not_found') {
        throw new Error('Профиль участника не найден для этого аккаунта');
      }
      if (typeof payload.error === 'string') {
        throw new Error(payload.error);
      }
      return payload as T;
    }
    case 'get_schedule': {
      await currentUserId();
      const { data, error } = await supabase.rpc('get_schedule_web', {
        p_days: typeof payload.days === 'number' ? payload.days : 90,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'book_session': {
      await currentUserId();
      const scheduleId = payload.schedule_id;
      if (typeof scheduleId !== 'string') throw new Error('schedule_id_required');
      const { data, error } = await supabase.rpc('register_for_event_web', { p_schedule_id: scheduleId });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'cancel_booking': {
      await currentUserId();
      const scheduleId = payload.schedule_id;
      if (typeof scheduleId !== 'string') throw new Error('schedule_id_required');
      const { data, error } = await supabase.rpc('unregister_from_event_web', { p_schedule_id: scheduleId });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'check_in': {
      await currentUserId();
      const activityType = payload.activity_type;
      if (typeof activityType !== 'string') throw new Error('activity_type_required');
      const { data, error } = await supabase.rpc('check_in_activity_web', { p_activity_type: activityType });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'get_ascetics': {
      await currentUserId();
      const { data, error } = await supabase.rpc('get_ascetic_web');
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'take_ascetic': {
      await currentUserId();
      const text = payload.text;
      if (typeof text !== 'string') throw new Error('ascetic_text_required');
      const { data, error } = await supabase.rpc('take_ascetic_web', { p_text: text });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'checkin_ascetic': {
      await currentUserId();
      const asceticId = payload.ascetic_id;
      if (typeof asceticId !== 'string') throw new Error('ascetic_id_required');
      const { data, error } = await supabase.rpc('checkin_ascetic_web', { p_ascetic_id: asceticId });
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'get_homework': {
      await currentUserId();
      const { data, error } = await supabase.rpc('get_homework_web');
      if (error) throw new Error(error.message);
      return data as T;
    }
    case 'submit_homework': {
      await currentUserId();
      const assignmentId = payload.assignment_id;
      const content = payload.content;
      const fileUrl = payload.file_url;
      if (typeof assignmentId !== 'string') throw new Error('assignment_id_required');
      if (typeof content !== 'string') throw new Error('homework_content_required');
      const { data, error } = await supabase.rpc('submit_homework_web', {
        p_assignment_id: assignmentId,
        p_content: content,
        p_file_url: typeof fileUrl === 'string' ? fileUrl : null,
      });
      if (error) throw new Error(error.message);
      return data as T;
    }
    default:
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
