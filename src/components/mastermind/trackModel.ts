export type Track = { id: string; group_id: string; title: string; description?: string | null; start_date: string; end_date: string; status: string };
export type TrackTask = { id: string; member_id: string; track_id: string | null; title: string; description: string | null; deadline: string | null; is_completed: boolean | null; is_failed: boolean | null; completed_at: string | null; participant_comment: string | null; file_url: string | null; approval_status: string | null; admin_comment: string | null };
export type TrackEntry = { id: string; member_id: string; track_id: string | null; entry_date: string; summary: string; my_tasks: string | null; status: string | null; admin_comment: string | null };
export type TrackGoal = { member_id: string; goal: string | null; request: string | null; plan: string | null; outcome: string | null };
export type ProgressRow = { member_id: string; is_me: boolean; name: string; total: number; done: number; on_time: number; attended: number };
export const dateLabel = (date: string) => new Date(date.length === 10 ? `${date}T12:00:00` : date).toLocaleDateString('ru-RU');
export const moscowToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const initialTrack = (tracks: Track[], today = moscowToday()) => tracks.find(t => t.status === 'active' && t.start_date <= today && t.end_date >= today)?.id || tracks[0]?.id || '';
export const tasksForTrack = <T extends { track_id: string | null }>(tasks: T[], trackId: string) => tasks.filter(t => trackId === 'legacy' ? !t.track_id : t.track_id === trackId);
export function taskStats(tasks: TrackTask[], track?: Track | null, today = moscowToday()) {
  const done = tasks.filter(t => t.is_completed);
  const notDone = tasks.filter(t => !t.is_completed && (t.is_failed || (track && track.end_date < today)));
  const overdue = tasks.filter(t => !t.is_completed && !t.is_failed && (!track || track.end_date >= today) && t.deadline && t.deadline < today);
  return { total: tasks.length, done: done.length, late: done.filter(t => t.deadline && t.completed_at && new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date(t.completed_at)) > t.deadline).length, overdue: overdue.length, notDone: notDone.length, inWork: tasks.length - done.length - notDone.length - overdue.length };
}