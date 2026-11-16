import type { ResidentCheckinsPayload } from './WebResidentCheckinsView';
import { attendanceStatus } from './residentCheckins';
import type { AttendanceRpc } from '@/components/schedule/FounderAttendancePanel';
import type { CallApi } from '@/components/app-shared/apiAdapter';

const USER_ID = 'preview-resident';

// Pure in-memory fixture API. Never delegates to Supabase or sends notifications.
export function createCheckinsPreviewStore(initial: ResidentCheckinsPayload) {
  let data = structuredClone(initial);
  const callApi: CallApi = async <T,>(action: string, payload: Record<string, unknown> = {}) => {
    if (action === 'get_resident_checkins') return structuredClone(data) as T;
    if (action === 'request_attendance') {
      const event = data.events.find(e => e.schedule_id === payload.schedule_id);
      if (!event) return { ok: false, error: 'not_club_event' } as T;
      data = { ...data, events: data.events.map(e => e.schedule_id === event.schedule_id
        ? { ...e, registered: true, self_marked_at: e.self_marked_at ?? data.now } : e) };
      return { ok: true, status: attendanceStatus(data.events.find(e => e.schedule_id === event.schedule_id) ?? event), request_id: event.schedule_id } as T;
    }
    return { ok: false, error: 'Тестовая операция недоступна.' } as T;
  };
  const attendanceRpc: AttendanceRpc = async (action, args) => {
    const event = data.events.find(e => e.schedule_id === args.p_schedule_id);
    if (!event) return { data: null, error: { message: 'not_club_event' } };
    if (action === 'founder_get_event_attendance') return { data: { ok: true, club_kind: event.club_kind, week_anchor: event.week_start,
      participants: event.registered ? [{ user_id: USER_ID, name: 'Дмитрий · тестовый резидент', is_resident: true, attended: event.attended,
        self_marked_at: event.self_marked_at, attended_marked_at: event.attended_marked_at, history_count: event.attended_marked_at ? 1 : 0 }] : [] }, error: null };
    if (action === 'founder_confirm_attendance') {
      const marks = Array.isArray(args.p_marks) ? args.p_marks : [];
      const mark = marks.find(m => m && m.user_id === USER_ID && typeof m.attended === 'boolean');
      if (mark && event.registered) data = { ...data, events: data.events.map(e => e.schedule_id === event.schedule_id
        ? { ...e, attended: mark.attended, attended_marked_at: data.now } : e) };
      return { data: { ok: true, updated: mark && event.registered ? 1 : 0 }, error: null };
    }
    if (action === 'founder_set_event_kind') {
      data = { ...data, events: data.events.map(e => e.schedule_id === event.schedule_id ? { ...e,
        club_kind: typeof args.p_club_kind === 'string' ? args.p_club_kind : e.club_kind,
        week_start: typeof args.p_week_anchor === 'string' ? args.p_week_anchor : e.week_start } : e) };
      return { data: { ok: true }, error: null };
    }
    return { data: null, error: { message: 'Тестовая операция недоступна.' } };
  };
  return { callApi, attendanceRpc };
}