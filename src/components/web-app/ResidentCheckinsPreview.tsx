import React, { useState } from 'react';
import { ResidentCheckinsContent, type ResidentCheckinsPayload } from './WebResidentCheckinsView';
import type { ResidentEvent } from './residentCheckins';
import { createCheckinsPreviewStore } from './checkinsPreviewStore';
import { FounderAttendancePanel } from '@/components/schedule/FounderAttendancePanel';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

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
  const [store] = useState(() => createCheckinsPreviewStore(initial));
  const [role, setRole] = useState('resident');
  const [eventId, setEventId] = useState<string | null>(null);
  return <div className="web-app-theme min-h-screen bg-background text-foreground">
    <div className="border-b border-border px-4 py-2 text-sm text-muted-foreground">Тестовые данные · 16 ноября 2026 · без отправки заявок</div>
    <Tabs value={role} onValueChange={setRole} className="px-4 pt-3"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="resident">Резидент</TabsTrigger><TabsTrigger value="founder">Основатель</TabsTrigger></TabsList></Tabs>
    {role === 'resident' ? <ResidentCheckinsContent callApi={store.callApi} /> : <section className="space-y-4 px-4 py-6">
      <h1 className="text-xl font-bold">Отметить присутствие</h1>
      <div className="divide-y divide-border">{initial.events.slice(0, 3).map(event => <div key={event.schedule_id} className="flex items-center justify-between gap-3 py-3">
        <div className="min-w-0"><h2 className="font-semibold">{event.title}</h2><p className="text-xs text-muted-foreground">{new Date(event.start_time).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</p></div>
        <Button variant="outline" size="sm" aria-label={`Участники ${event.title}`} onClick={() => setEventId(event.schedule_id)}>Участники</Button>
      </div>)}</div>
      {eventId && <div className="border-t border-border pt-4"><h2 className="mb-3 font-semibold">{initial.events.find(e => e.schedule_id === eventId)?.title} · участники</h2><FounderAttendancePanel key={eventId} scheduleId={eventId} attendanceRpc={store.attendanceRpc} /></div>}
    </section>}
  </div>;
}