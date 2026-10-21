import { taskStats, Track, TrackTask, ProgressRow } from './trackModel';
import { Progress } from '@/components/ui/progress';

export function TrackDashboard({ tasks, track, attended = 0, meetings = 0 }: { tasks: TrackTask[]; track?: Track | null; attended?: number; meetings?: number }) {
  const s = taskStats(tasks, track);
  const items = [['Всего задач', s.total], ['Выполнено', s.done], ['В работе', s.inWork], ['Просрочено', s.overdue], ['Не выполнено', s.notDone], ['С опозданием', s.late], ['Посещения', `${attended} / ${meetings}`]];
  return <section className="space-y-4" aria-label="Сводка трека">
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{items.map(([label, value]) => <div key={label} className="min-w-0 border-b pb-3"><p className="text-2xl font-bold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}</div>
    <div className="space-y-2"><div className="flex justify-between text-sm"><span>Выполнение задач</span><span>{s.total ? Math.round(s.done / s.total * 100) : 0}%</span></div><Progress value={s.total ? s.done / s.total * 100 : 0} /></div>
  </section>;
}
export function GroupProgress({ rows, meetings }: { rows: ProgressRow[]; meetings: number }) {
  return <div className="space-y-3">{!rows.length && <p className="text-sm text-muted-foreground">Участников пока нет</p>}{rows.map(r => <div key={r.member_id} className="space-y-2 border-b py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className={`break-words text-sm font-semibold ${r.is_me ? 'text-primary' : 'text-foreground'}`}>{r.name}{r.is_me ? ' · Вы' : ''}</p><span className="text-xs text-muted-foreground">Выполнено {r.done} / {r.total}</span></div><Progress value={r.total ? r.done / r.total * 100 : 0}/><p className="text-xs text-muted-foreground">В срок: {r.on_time} · Посещения: {r.attended} / {meetings}</p></div>)}</div>;
}