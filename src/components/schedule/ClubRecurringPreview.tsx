import { useState } from 'react';
import { ClubScheduleManagement } from './ClubScheduleManagement';
import { createClubScheduleFixture, weekAnchor, type ClubFixture } from './clubRecurrence';
import { emptyPaidSettings } from '@/components/web-app/paidBooking';
import { ResidentCheckinsContent, type ResidentCheckinsPayload } from '@/components/web-app/WebResidentCheckinsView';
import { createCheckinsPreviewStore } from '@/components/web-app/checkinsPreviewStore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const recurringFixtures: ClubFixture[] = [{ id: '00000000-0000-4000-8000-000000000001', title: 'BJJ', start_time: '2026-11-16T09:00:00.000Z', end_time: '2026-11-16T11:00:00.000Z',
  location: 'Тестовый зал', club_kind: 'training_bjj', week_anchor: '2026-11-16', is_active: true, description: null, booking_mode: 'free', paid: emptyPaidSettings }];

export default function ClubRecurringPreview() {
  const [api] = useState(() => createClubScheduleFixture(recurringFixtures));
  const [tab, setTab] = useState('calendar');
  const [residentStore, setResidentStore] = useState<ReturnType<typeof createCheckinsPreviewStore> | null>(null);
  const changeTab = (v: string) => {
    if (v === 'resident') {
      const payload: ResidentCheckinsPayload = { ok: true, now: '2026-11-16T12:00:00Z', current_week: '2026-11-16',
        events: api.list().filter(e => e.is_active).map(e => ({ schedule_id: e.id, title: e.title, theme: null, start_time: e.start_time, club_kind: e.club_kind,
          week_start: e.week_anchor || weekAnchor(e.start_time.slice(0, 10)), registered: false, attended: false, self_marked_at: null, attended_marked_at: null,
          schedule_type: 'club', booking_mode: e.booking_mode, is_active: e.is_active })) };
      setResidentStore(createCheckinsPreviewStore(payload));
    }
    setTab(v);
  };
  return <main className="web-app-theme min-h-screen bg-background text-foreground">
    <div className="border-b border-border px-4 py-3 text-sm text-muted-foreground">Тестовый календарь · 16 ноября 2026 · без отправки уведомлений</div>
    <Tabs value={tab} onValueChange={changeTab} className="px-4 py-3"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="calendar">Расписание клуба</TabsTrigger><TabsTrigger value="resident">Отметки резидента</TabsTrigger></TabsList></Tabs>
    {tab === 'calendar' ? <section className="mx-auto max-w-6xl p-4"><ClubScheduleManagement previewApi={api} /></section> : residentStore && <ResidentCheckinsContent callApi={residentStore.callApi} />}
  </main>;
}