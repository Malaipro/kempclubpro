import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Send, CheckCircle, RotateCcw, Paperclip, X } from 'lucide-react';
import { HomeworkFileLink } from '@/components/homework/HomeworkFileLink';

interface Assignment {
  id: string;
  title: string;
  theme: string | null;
  content: string;
  deadline: string | null;
  points_reward: number;
}

interface Submission {
  id: string;
  assignment_id: string | null;
  content: string | null;
  status: string;
  admin_comment: string | null;
  points_earned: number;
  created_at: string;
  reviewed_at: string | null;
  file_url: string | null;
}

interface HomeworkUserViewProps {
  /** Для club_resident: read-only архив выполненных ДЗ без отправки новых ответов. */
  archiveMode?: boolean;
}

export const HomeworkUserView: React.FC<HomeworkUserViewProps> = ({ archiveMode = false }) => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogFor, setDialogFor] = useState<Assignment | null>(null);
  const [text, setText] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: a }, { data: s }] = await Promise.all([
      supabase.from('homework_assignments').select('*').eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('homework_submissions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setAssignments(a || []);
    setSubmissions(s || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const submissionFor = (id: string) =>
    submissions.find((s) => s.assignment_id === id) || null;

  const openSubmit = (a: Assignment) => {
    const existing = submissionFor(a.id);
    setExistingSubmission(existing);
    setDialogFor(a);
    setText(existing?.status === 'rework' ? existing.content || '' : '');
    setFile(null);
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    if (f && f.size > 20 * 1024 * 1024) {
      toast.error('Файл слишком большой (макс. 20 МБ)');
      return;
    }
    setFile(f);
  };

  const submit = async () => {
    if (!user || !dialogFor) return;
    if (!text.trim()) {
      toast.error('Введите ответ');
      return;
    }

    setUploading(true);

    // Загрузка файла (если выбран) в приватный bucket homework-files
    let filePath: string | null = existingSubmission?.file_url || null;
    if (file) {
      const ext = file.name.split('.').pop() || 'bin';
      const path = `${user.id}/${dialogFor.id}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homework-files')
        .upload(path, file, { upsert: true });
      if (upErr) {
        setUploading(false);
        toast.error('Ошибка загрузки файла: ' + upErr.message);
        return;
      }
      filePath = path;
    }

    let error;
    if (existingSubmission && existingSubmission.status === 'rework') {
      // Update existing rework submission to resubmit
      ({ error } = await supabase
        .from('homework_submissions')
        .update({
          content: text.trim(),
          status: 'submitted',
          admin_comment: null,
          reviewed_at: null,
          reviewed_by: null,
          verified: false,
          points_earned: 0,
          file_url: filePath,
        })
        .eq('id', existingSubmission.id));
    } else {
      ({ error } = await supabase.from('homework_submissions').insert({
        user_id: user.id,
        assignment_id: dialogFor.id,
        homework_type: 'assignment',
        content: text.trim(),
        status: 'submitted',
        file_url: filePath,
      }));
    }
    setUploading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Ответ отправлен');
    setDialogFor(null);
    setText('');
    setFile(null);
    load();
  };


  const statusBadge = (status: string) => {
    const map: Record<string, { label: string; cls: string; icon: any }> = {
      submitted: { label: 'На проверке', cls: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40', icon: Clock },
      accepted: { label: 'Принято', cls: 'bg-green-500/20 text-green-300 border-green-500/40', icon: CheckCircle },
      rework: { label: 'На доработку', cls: 'bg-red-500/20 text-red-300 border-red-500/40', icon: RotateCcw },
    };
    const m = map[status];
    if (!m) return null;
    const Icon = m.icon;
    return <Badge variant="outline" className={m.cls}><Icon className="w-3 h-3 mr-1" />{m.label}</Badge>;
  };

  if (loading) return <div className="text-muted-foreground p-6">Загрузка…</div>;

  // Архивный режим для резидентов клуба: read-only история выполненных ДЗ
  if (archiveMode) {
    const assignmentTitle = (id: string | null) =>
      assignments.find((a) => a.id === id)?.title || 'Задание интенсива';
    if (submissions.length === 0 && assignments.length === 0) {
      return (
        <Card><CardContent className="p-8 text-center text-muted-foreground">
          Архив ДЗ пуст — у вас нет истории выполненных заданий интенсива
        </CardContent></Card>
      );
    }
    return (
      <div className="space-y-3">
        <div className="text-sm text-muted-foreground">
          Архив домашних заданий интенсива (только просмотр). Новые задания доступны участникам активного интенсива.
        </div>
        {submissions.map((sub) => (
          <Card key={sub.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className="font-semibold">{assignmentTitle(sub.assignment_id)}</h3>
                {statusBadge(sub.status)}
                {sub.points_earned > 0 && <Badge variant="outline">{sub.points_earned} баллов</Badge>}
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(sub.created_at).toLocaleDateString('ru-RU')}
              </p>
              {sub.content && (
                <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                  <strong>Ваш ответ:</strong>
                  <p className="whitespace-pre-wrap mt-1">{sub.content}</p>
                </div>
              )}
              {sub.file_url && (
                <div className="mt-3">
                  <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />Прикреплённый файл:</p>
                  <HomeworkFileLink path={sub.file_url} />
                </div>
              )}
              {sub.admin_comment && (
                <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                  <strong>Комментарий админа:</strong> {sub.admin_comment}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <Card><CardContent className="p-8 text-center text-muted-foreground">
        Пока нет назначенных заданий
      </CardContent></Card>
    );
  }


  return (
    <div className="space-y-3">
      {assignments.map((a) => {
        const sub = submissionFor(a.id);
        const canSubmit = !sub || sub.status === 'rework';
        return (
          <Card key={a.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{a.title}</h3>
                    <Badge variant="outline">{a.points_reward} баллов</Badge>
                    {sub && statusBadge(sub.status)}
                  </div>
                  {a.theme && <p className="text-sm text-muted-foreground">{a.theme}</p>}
                  <p className="text-sm mt-2 whitespace-pre-wrap">{a.content}</p>
                  {a.deadline && (
                    <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> До {new Date(a.deadline).toLocaleString('ru-RU')}
                    </p>
                  )}
                  {sub?.admin_comment && (
                    <div className="mt-3 p-2 bg-muted/50 rounded text-sm">
                      <strong>Комментарий админа:</strong> {sub.admin_comment}
                    </div>
                  )}
                  {sub?.content && sub.status !== 'rework' && (
                    <div className="mt-3 p-2 bg-muted/30 rounded text-sm">
                      <strong>Ваш ответ:</strong>
                      <p className="whitespace-pre-wrap mt-1">{sub.content}</p>
                    </div>
                  )}
                  {sub?.file_url && sub.status !== 'rework' && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><Paperclip className="w-3 h-3" />Прикреплённый файл:</p>
                      <HomeworkFileLink path={sub.file_url} />
                    </div>
                  )}
                </div>
                {canSubmit && (
                  <Button size="sm" onClick={() => openSubmit(a)}>
                    <Send className="w-4 h-4 mr-1" />
                    {sub?.status === 'rework' ? 'Отправить заново' : 'Отправить'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!dialogFor} onOpenChange={(o) => !o && setDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogFor?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{dialogFor?.content}</p>
            <div>
              <Label>Ваш ответ</Label>
              <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="Опишите выполнение, добавьте ссылки…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogFor(null)}>Отмена</Button>
            <Button onClick={submit}><Send className="w-4 h-4 mr-1" />Отправить</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
