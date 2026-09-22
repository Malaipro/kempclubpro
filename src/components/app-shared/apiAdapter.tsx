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
  const rpc = async (name: keyof typeof supabase.rpc extends never ? never : string, args?: Record<string, unknown>) => {
    await currentUserId();
    const { data, error } = await (supabase.rpc as (fn: string, params?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>)(name, args);
    if (error) throw new Error(error.message);
    const result = data as Record<string, unknown> | null;
    if (result && result.ok === false) throw new Error(typeof result.error === 'string' ? result.error : 'Операция не выполнена');
    if (result && result.found === false) throw new Error(typeof result.error === 'string' ? result.error : 'Данные не найдены');
    return data;
  };

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
    case 'get_rating': return await rpc('get_rating_web') as T;
    case 'get_profile': return await rpc('get_profile_web') as T;
    case 'update_profile': return await rpc('update_profile_web', {
      p_weight_kg: typeof payload.weight === 'number' ? payload.weight : null,
      p_height_cm: typeof payload.height === 'number' ? payload.height : null,
      p_date_of_birth: typeof payload.birth_date === 'string' ? payload.birth_date : null,
    }) as T;
    case 'update_avatar': return await rpc('update_avatar_web', { p_avatar_url: payload.avatar_url }) as T;
    case 'get_journal': return await rpc('get_journal_web', {
      p_date: typeof payload.date === 'string' ? payload.date : undefined,
    }) as T;
    case 'save_journal': return await rpc('save_journal_web', {
      p_entry_date: payload.entry_date,
      p_day_type: payload.day_type,
      p_emotions: payload.emotions ?? [],
      p_answers: payload.answers ?? [],
    }) as T;
    case 'get_shop': return await rpc('get_shop_web') as T;
    case 'purchase_reward': return await rpc('purchase_reward_web', {
      p_reward_id: payload.reward_id,
      p_user_comment: typeof payload.comment === 'string' ? payload.comment : null,
    }) as T;
    case 'get_challenges': return await rpc('get_challenges_web') as T;
    case 'challenge_checkin': return await rpc('challenge_checkin_web', { p_challenge_id: payload.challenge_id }) as T;
    case 'get_mastermind': return await rpc('get_mastermind_web', {
      p_group_id: typeof payload.group_id === 'string' ? payload.group_id : undefined,
    }) as T;
    case 'complete_mastermind_task': return await rpc('complete_mastermind_task_web', {
      p_task_id: payload.task_id,
      p_comment: typeof payload.comment === 'string' ? payload.comment : null,
      p_file_url: typeof payload.file_url === 'string' ? payload.file_url : null,
    }) as T;
    case 'create_mastermind_task': return await rpc('create_mastermind_task_web', {
      p_title: payload.title,
      p_description: typeof payload.description === 'string' ? payload.description : null,
      p_deadline: typeof payload.deadline === 'string' && payload.deadline ? payload.deadline : null,
    }) as T;
    case 'submit_mastermind_entry': return await rpc('submit_mastermind_entry_web', {
      p_summary: payload.summary,
      p_my_tasks: typeof payload.my_tasks === 'string' ? payload.my_tasks : null,
    }) as T;
    case 'get_pyramid': return await rpc('get_pyramid_web') as T;
    case 'get_rules': return await rpc('get_rules_web') as T;
    case 'get_checkpoint': return await rpc('get_checkpoint_web', { p_checkpoint_type: payload.checkpoint_type ?? 'A' }) as T;
    case 'save_checkpoint': return await rpc('save_checkpoint_web', {
      p_checkpoint_type: payload.checkpoint_type,
      p_data: payload.checkpoint_data,
    }) as T;
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
