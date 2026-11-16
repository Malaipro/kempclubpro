import React, { useCallback, useRef } from 'react';
import type { CallApi } from '@/components/app-shared/apiAdapter';
import { ResidentCheckinsContent, type ResidentCheckinsPayload } from './WebResidentCheckinsView';
import type { ResidentEvent } from './residentCheckins';

// Local fixtures only: no session, Supabase calls, booking or notifications.
const initial: ResidentCheckinsPayload = {
  ok: true, now: '2026-11-16T12:00:00Z', current_week: '2026-11-16',
  events: [
    { schedule_id: '00000000-0000-4000-8000-000000000001', title: 'БЖЖ', club_kind: 'training_bjj', start_time: '2026-11-16T09:00:00Z' },
    { schedule_id: '00000000-0000-4000-8000-000000000002', title: 'ОФП', club_kind: 'training_ofp', start_time: '2026-11-18T09:00:00Z' },
    { schedule_id: '00000000-0000-4000-8000-000000000003', title: 'Кикбоксинг', club_kind: 'training_kick', start_time: '2026-11-20T09:00:00Z' },
  ].map(e => ({ ...e, theme: null, week_start: '2026-11-16', registered: false, attended: false,
    self_marked_at: null, attended_marked_at: null, booking_mode: 'free', schedule_type: 'club', is_active: true } as ResidentEvent)).concat([{
      schedule_id: '00000000-0000-4000-8000-000000000004', title: 'Клубная встреча', theme: 'Встреча резидентов',
      club_kind: 'lecture', start_time: '2026-11-21T15:00:00Z', week_start: '2026-11-16', registered: true,
      attended: false, self_marked_at: null, attended_marked_at: null, booking_mode: 'free', schedule_type: 'club',
      is_active: true, booking_status: 'registered',
    }]),
};

export default function ResidentCheckinsPreview() {
  const store = useRef(initial);
  const callApi: CallApi = useCallback(async <T,>(action: string, payload: Record<string, unknown> = {}) => {
    const data = store.current;
    if (action === 'get_resident_checkins') return data as T;
    if (action === 'request_attendance') {
      const event = data.events.find(e => e.schedule_id === payload.schedule_id);
      if (!event) return { ok: false, error: 'not_club_event' } as T;
      store.current = { ...data, events: data.events.map(e => e.schedule_id === event.schedule_id
        ? { ...e, registered: true, self_marked_at: e.self_marked_at ?? data.now } : e) };
      return { ok: true, status: 'pending', request_id: event.schedule_id } as T;
    }
    return { ok: false, error: 'Тестовая запись недоступна.' } as T;
  }, []);
  return <div className="web-app-theme min-h-screen bg-background text-foreground">
    <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">Тестовые данные · 16 ноября 2026 · без отправки заявок</div>
    <ResidentCheckinsContent callApi={callApi} />
  </div>;
}