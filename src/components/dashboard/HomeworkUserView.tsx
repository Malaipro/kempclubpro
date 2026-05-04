import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Clock, Send, CheckCircle, RotateCcw } from 'lucide-react';

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
}

export const HomeworkUserView: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogFor, setDialogFor] = useState<Assignment | null>(null);
  const [text, setText] = useState('');
  const [existingSubmission, setExistingSubmission] = useState<Submission | null>(null);

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
  };

  const submit = async () => {
    if (!user || !dialogFor) return;
    if (!text.trim()) {
      toast.error('Введите ответ');
      return;
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
        })
        .eq('id', existingSubmission.id));
    } else {
      ({ error } = await supabase.from('homework_submissions').insert({
        user_id: user.id,
        assignment_id: dialogFor.id,
        homework_type: 'assignment',
        content: text.trim(),
        status: 'submitted',
      }));
    }
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Ответ отправлен');
    setDialogFor(null);
    setText('');
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
