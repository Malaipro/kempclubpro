export interface IntensiveStream {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date: string | null;
}

export function streamBounds(stream: Pick<IntensiveStream, 'start_date' | 'end_date'>) {
  const start = `${stream.start_date.slice(0, 10)}T00:00:00+03:00`;
  const end = stream.end_date ? new Date(`${stream.end_date.slice(0, 10)}T00:00:00+03:00`) : null;
  if (end) end.setUTCDate(end.getUTCDate() + 1);
  return { start, end: end?.toISOString() ?? null };
}

export function inStreamPeriod(date: string | null | undefined, stream: IntensiveStream | null): boolean {
  if (!date || !stream) return false;
  const { start, end } = streamBounds(stream);
  const value = Date.parse(date.length === 10 ? `${date}T00:00:00+03:00` : date);
  return value >= Date.parse(start) && (!end || value < Date.parse(end));
}

export function assignmentInStream(
  assignment: { stream_id: string | null; target_user_id: string | null; created_at: string },
  stream: IntensiveStream | null,
): boolean {
  if (!stream) return false;
  // An explicit assignment stream always wins, including for transferred participants.
  if (assignment.stream_id) return assignment.stream_id === stream.id;
  return Boolean(assignment.target_user_id) && inStreamPeriod(assignment.created_at, stream);
}

export function submissionInStream(
  submission: { assignment_id: string | null; created_at?: string; submitted_at?: string },
  assignments: readonly { id: string }[],
  stream: IntensiveStream | null,
): boolean {
  if (submission.assignment_id) return assignments.some(a => a.id === submission.assignment_id);
  return inStreamPeriod(submission.submitted_at ?? submission.created_at, stream);
}