// Единый сервисный слой карточки участника (CRM КЭМП).
// Все вкладки используют ТОЛЬКО этот слой — поэтому будущий Telegram Mini App
// сможет переиспользовать те же запросы/мутации без изменений БД.
//
// Конвенция: каждая функция возвращает данные или бросает ошибку (через Supabase).
// Никакой UI-логики здесь нет — только доступ к данным.

import { supabase } from '@/integrations/supabase/client';

// ---------- Типы ----------
export interface CoinTransaction {
  id: string;
  amount: number;
  reason: string;
  source_type: string | null;
  source_id: string | null;
  created_at: string;
  created_by: string | null;
}

export interface HomeworkSubmission {
  id: string;
  assignment_id: string | null;
  user_id: string;
  homework_type: string;
  content: string | null;
  notes: string | null;
  status: string;
  admin_comment: string | null;
  points_earned: number;
  verified: boolean | null;
  submitted_at: string;
  reviewed_at: string | null;
}

export interface HomeworkAssignment {
  id: string;
  title: string;
  theme: string | null;
  content: string;
  deadline: string | null;
  points_reward: number;
  is_active: boolean;
  target_user_id: string | null;
  stream_id: string | null;
  created_at: string;
}

export interface UserActivity {
  id: string;
  user_id: string;
  activity_id: string | null;
  completed_at: string;
  points_earned: number | null;
  notes: string | null;
  verified: boolean | null;
  created_at: string;
  activities?: { name: string; category: string } | null;
}

export interface ActivityType {
  id: string;
  name: string;
  category: string;
  points: number | null;
}

export interface CooperResult {
  id: string;
  user_id: string;
  test_date: string;
  total_minutes: number | null;
  total_seconds: number | null;
  total_time: number | null;
  fitness_level: string | null;
  test_phase: string | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
  verified: boolean | null;
}

export interface CrashTest {
  id: string;
  user_id: string;
  test_type: string;
  points_earned: number;
  passed: boolean | null;
  verified: boolean | null;
  notes: string | null;
  test_date: string;
}

export interface RewardRequest {
  id: string;
  user_id: string;
  reward_id: string;
  cost_coins: number;
  status: string;
  user_comment: string | null;
  admin_comment: string | null;
  created_at: string;
  reviewed_at: string | null;
  fulfilled_at: string | null;
  rewards?: { title: string } | null;
}

export interface ReferralLead {
  id: string;
  referrer_user_id: string;
  referral_code: string;
  name: string;
  phone: string | null;
  telegram: string | null;
  comment: string | null;
  status: string;
  bonus_awarded: boolean;
  bonus_amount: number | null;
  created_at: string;
  confirmed_at: string | null;
}

export interface UserTotem {
  id: string;
  user_id: string;
  totem_id: string;
  assigned_by: string | null;
  assigned_at: string;
  notes: string | null;
  is_manual: boolean | null;
  totems?: { name: string; discipline: string | null; totem_type: string } | null;
}

export interface AuditEntry {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string | null;
  record_id: string | null;
  timestamp: string | null;
}

export interface CoinRule {
  id: string;
  code: string;
  name: string;
  description: string | null;
  coin_amount: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AwardCoinsResult {
  awarded: boolean;
  duplicate: boolean;
  transaction_id: string | null;
  balance: number;
  rule_id: string | null;
  amount: number;
}

// Telegram-ready: единая сводка по участнику (read-only).
export interface ParticipantFullState {
  found: boolean;
  profile?: {
    user_id: string;
    display_name: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    telegram: string | null;
    approved: boolean | null;
  };
  status?: string | null;
  stream?: Record<string, unknown> | null;
  coins_balance?: number;
  total_points?: number;
  rank_position?: number;
  current_totem?: Record<string, unknown> | null;
  totems_count?: number;
  upcoming_homework?: Record<string, unknown> | null;
  referrals_count?: number;
  referrals_confirmed?: number;
  reward_requests?: Record<string, unknown>[];
  available_materials?: Record<string, unknown>[];
}

const currentUserId = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
};

// ---------- Коины ----------
export const participantService = {
  async getCoinBalance(userId: string): Promise<number> {
    const { data, error } = await supabase.rpc('get_user_coin_balance', { p_user_id: userId });
    if (error) throw error;
    return (data as number) ?? 0;
  },

  async listCoinTransactions(userId: string): Promise<CoinTransaction[]> {
    const { data, error } = await supabase
      .from('coin_transactions')
      .select('id, amount, reason, source_type, source_id, created_at, created_by')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },

  async adjustCoins(userId: string, amount: number, reason: string): Promise<number> {
    const { data, error } = await supabase.rpc('admin_adjust_coins', {
      p_user_id: userId, p_amount: amount, p_reason: reason,
    });
    if (error) throw error;
    return data ?? 0;
  },

  // ---------- ДЗ ----------
  async listHomeworkSubmissions(userId: string): Promise<HomeworkSubmission[]> {
    const { data, error } = await supabase
      .from('homework_submissions')
      .select('*')
      .eq('user_id', userId)
      .order('submitted_at', { ascending: false });
    if (error) throw error;
    return (data as HomeworkSubmission[]) || [];
  },

  async listHomeworkAssignments(userId: string, streamId: string | null): Promise<HomeworkAssignment[]> {
    let query = supabase.from('homework_assignments').select('*').order('created_at', { ascending: false });
    if (streamId) {
      query = query.or(`target_user_id.eq.${userId},stream_id.eq.${streamId}`);
    } else {
      query = query.eq('target_user_id', userId);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data as HomeworkAssignment[]) || [];
  },

  async createHomeworkAssignment(payload: {
    title: string; content: string; theme?: string | null; deadline?: string | null;
    points_reward?: number; target_user_id: string; stream_id?: string | null;
  }): Promise<void> {
    const createdBy = await currentUserId();
    const { error } = await supabase.from('homework_assignments').insert([{
      title: payload.title,
      content: payload.content,
      theme: payload.theme || null,
      deadline: payload.deadline || null,
      points_reward: payload.points_reward ?? 10,
      target_user_id: payload.target_user_id,
      stream_id: payload.stream_id || null,
      is_active: true,
      created_by: createdBy,
    }]);
    if (error) throw error;
  },

  async updateHomeworkAssignment(id: string, patch: Partial<HomeworkAssignment>): Promise<void> {
    const { error } = await supabase.from('homework_assignments').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteHomeworkAssignment(id: string): Promise<void> {
    const { error } = await supabase.from('homework_assignments').delete().eq('id', id);
    if (error) throw error;
  },

  async reviewHomeworkSubmission(submissionId: string, status: 'accepted' | 'rework', comment?: string): Promise<void> {
    const { error } = await supabase.rpc('review_homework_submission', {
      p_submission_id: submissionId, p_status: status, p_admin_comment: comment || null,
    });
    if (error) throw error;
  },

  // ---------- Активности ----------
  async listActivities(userId: string): Promise<UserActivity[]> {
    const { data, error } = await supabase
      .from('user_activities')
      .select('*, activities(name, category)')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });
    if (error) throw error;
    return (data as UserActivity[]) || [];
  },

  async listActivityTypes(): Promise<ActivityType[]> {
    const { data, error } = await supabase
      .from('activities')
      .select('id, name, category, points')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return (data as ActivityType[]) || [];
  },

  async createActivity(payload: {
    user_id: string; activity_id?: string | null; points_earned?: number;
    notes?: string | null; completed_at?: string; verified?: boolean;
  }): Promise<void> {
    const verifiedBy = await currentUserId();
    const { error } = await supabase.from('user_activities').insert([{
      user_id: payload.user_id,
      activity_id: payload.activity_id || null,
      points_earned: payload.points_earned ?? 0,
      notes: payload.notes || null,
      completed_at: payload.completed_at || new Date().toISOString(),
      verified: payload.verified ?? true,
      verified_by: payload.verified ? verifiedBy : null,
    }]);
    if (error) throw error;
  },

  async updateActivity(id: string, patch: Partial<UserActivity>): Promise<void> {
    const { error } = await supabase.from('user_activities').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteActivity(id: string): Promise<void> {
    const { error } = await supabase.from('user_activities').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Купер ----------
  async listCooper(userId: string): Promise<CooperResult[]> {
    const { data, error } = await supabase
      .from('cooper_test_results')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false });
    if (error) throw error;
    return (data as CooperResult[]) || [];
  },

  async createCooper(payload: {
    user_id: string; total_minutes?: number | null; total_seconds?: number | null;
    fitness_level?: string | null; test_phase?: string; notes?: string | null;
    test_date?: string; verified?: boolean;
  }): Promise<void> {
    const verifiedBy = await currentUserId();
    const minutes = payload.total_minutes ?? 0;
    const seconds = payload.total_seconds ?? 0;
    const { error } = await supabase.from('cooper_test_results').insert([{
      user_id: payload.user_id,
      total_minutes: minutes,
      total_seconds: seconds,
      total_time: minutes * 60 + seconds,
      fitness_level: payload.fitness_level || null,
      test_phase: payload.test_phase || 'during_stream',
      notes: payload.notes || null,
      test_date: payload.test_date || new Date().toISOString(),
      verified: payload.verified ?? true,
      verified_by: payload.verified ? verifiedBy : null,
    }]);
    if (error) throw error;
  },

  async updateCooper(id: string, patch: Partial<CooperResult>): Promise<void> {
    const { error } = await supabase.from('cooper_test_results').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteCooper(id: string): Promise<void> {
    const { error } = await supabase.from('cooper_test_results').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Краш-тесты ----------
  async listCrashTests(userId: string): Promise<CrashTest[]> {
    const { data, error } = await supabase
      .from('crash_tests')
      .select('*')
      .eq('user_id', userId)
      .order('test_date', { ascending: false });
    if (error) throw error;
    return (data as CrashTest[]) || [];
  },

  async createCrashTest(payload: {
    user_id: string; test_type: string; points_earned?: number;
    passed?: boolean; verified?: boolean; notes?: string | null; test_date?: string;
  }): Promise<void> {
    const verifiedBy = await currentUserId();
    const { error } = await supabase.from('crash_tests').insert([{
      user_id: payload.user_id,
      test_type: payload.test_type,
      points_earned: payload.points_earned ?? 6,
      passed: payload.passed ?? false,
      verified: payload.verified ?? true,
      verified_by: payload.verified ? verifiedBy : null,
      notes: payload.notes || null,
      test_date: payload.test_date || new Date().toISOString(),
    }]);
    if (error) throw error;
  },

  async updateCrashTest(id: string, patch: Partial<CrashTest>): Promise<void> {
    const { error } = await supabase.from('crash_tests').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteCrashTest(id: string): Promise<void> {
    const { error } = await supabase.from('crash_tests').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Награды ----------
  async listRewardRequests(userId: string): Promise<RewardRequest[]> {
    const { data, error } = await supabase
      .from('reward_requests')
      .select('*, rewards(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as RewardRequest[]) || [];
  },

  async reviewRewardRequest(id: string, status: 'approved' | 'rejected' | 'fulfilled' | 'cancelled', comment?: string): Promise<void> {
    const { error } = await supabase.rpc('review_reward_request', {
      p_request_id: id, p_new_status: status, p_admin_comment: comment || null,
    });
    if (error) throw error;
  },

  // ---------- Рефералы ----------
  async listReferralLeads(userId: string): Promise<ReferralLead[]> {
    const { data, error } = await supabase
      .from('referral_leads')
      .select('*')
      .eq('referrer_user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data as ReferralLead[]) || [];
  },

  async confirmReferralLead(leadId: string): Promise<void> {
    const { error } = await supabase.rpc('confirm_referral_lead', { _lead_id: leadId });
    if (error) throw error;
  },

  async updateReferralLead(id: string, patch: { status?: string }): Promise<void> {
    const { error } = await supabase.from('referral_leads').update(patch).eq('id', id);
    if (error) throw error;
  },

  async deleteReferralLead(id: string): Promise<void> {
    const { error } = await supabase.from('referral_leads').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Тотемы ----------
  async listUserTotems(userId: string): Promise<UserTotem[]> {
    const { data, error } = await supabase
      .from('user_totems')
      .select('*, totems(name, discipline, totem_type)')
      .eq('user_id', userId)
      .order('assigned_at', { ascending: false });
    if (error) throw error;
    return (data as UserTotem[]) || [];
  },

  async listTotemCatalog(): Promise<{ id: string; name: string }[]> {
    const { data, error } = await supabase
      .from('totems')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async assignTotem(userId: string, totemId: string, notes?: string | null): Promise<void> {
    const assignedBy = await currentUserId();
    const { error } = await supabase.from('user_totems').insert([{
      user_id: userId, totem_id: totemId, assigned_by: assignedBy, notes: notes || null, is_manual: true,
    }]);
    if (error) throw error;
  },

  async removeTotem(id: string): Promise<void> {
    const { error } = await supabase.from('user_totems').delete().eq('id', id);
    if (error) throw error;
  },

  // ---------- Аудит ----------
  async listAudit(userId: string): Promise<AuditEntry[]> {
    const { data, error } = await supabase
      .from('audit_log')
      .select('id, user_id, action, table_name, record_id, timestamp')
      .eq('record_id', userId)
      .order('timestamp', { ascending: false })
      .limit(200);
    if (error) throw error;
    return (data as AuditEntry[]) || [];
  },

  // ---------- Правила коинов (справочник, D1) ----------
  async listCoinRules(includeInactive = false): Promise<CoinRule[]> {
    let query = supabase.from('coin_rules').select('*').order('name', { ascending: true });
    if (!includeInactive) query = query.eq('is_active', true);
    const { data, error } = await query;
    if (error) throw error;
    return (data as CoinRule[]) || [];
  },

  async updateCoinRule(id: string, patch: Partial<Pick<CoinRule, 'name' | 'description' | 'coin_amount' | 'is_active'>>): Promise<void> {
    const { error } = await supabase.from('coin_rules').update(patch).eq('id', id);
    if (error) throw error;
  },

  // Начисление коинов по правилу (с защитой от дублей через source_type + source_id).
  async awardCoinsByRule(params: {
    userId: string;
    ruleCode: string;
    sourceType?: string | null;
    sourceId?: string | null;
    reason?: string | null;
    amountOverride?: number | null;
  }): Promise<AwardCoinsResult> {
    const { data, error } = await supabase.rpc('award_coins_by_rule', {
      p_user_id: params.userId,
      p_rule_code: params.ruleCode,
      p_source_type: params.sourceType ?? undefined,
      p_source_id: params.sourceId ?? undefined,
      p_reason: params.reason ?? undefined,
      p_amount_override: params.amountOverride ?? undefined,
    });
    if (error) throw error;
    return data as AwardCoinsResult;
  },

  // ---------- Полное состояние участника (Telegram-ready, D1) ----------
  async getParticipantFullState(userId: string): Promise<ParticipantFullState> {
    const { data, error } = await supabase.rpc('get_participant_full_state', { p_user_id: userId });
    if (error) throw error;
    return data as ParticipantFullState;
  },
};
