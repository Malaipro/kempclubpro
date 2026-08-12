import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileText, Save, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';

const DOC_TYPES = [
  { type: 'rules_intensive', defaultTitle: 'Правила интенсива' },
  { type: 'rules_captain', defaultTitle: 'Правила капитана' },
  { type: 'codex_resident', defaultTitle: 'Кодекс КЭМП' },
] as const;

interface PlatformDocument {
  id?: string;
  doc_type: string;
  title: string;
  content: string;
  file_url: string;
  is_active: boolean;
}

interface CheckpointQuestion {
  id: string;
  question_text: string;
  sort_order: number;
  is_active: boolean;
}

const DocumentsTab: React.FC = () => {
  const { toast } = useToast();
  const [docs, setDocs] = useState<Record<string, PlatformDocument>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('platform_documents')
      .select('*');

    if (error) {
      toast({ title: 'Ошибка загрузки документов', description: error.message, variant: 'destructive' });
      setLoading(false);
      return;
    }

    const map: Record<string, PlatformDocument> = {};
    DOC_TYPES.forEach(({ type, defaultTitle }) => {
      const found = (data || []).find((d: any) => d.doc_type === type);
      map[type] = found
        ? {
            id: found.id,
            doc_type: type,
            title: found.title ?? defaultTitle,
            content: found.content ?? '',
            file_url: found.file_url ?? '',
            is_active: found.is_active ?? true,
          }
        : { doc_type: type, title: defaultTitle, content: '', file_url: '', is_active: true };
    });
    setDocs(map);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const update = (type: string, patch: Partial<PlatformDocument>) => {
    setDocs((prev) => ({ ...prev, [type]: { ...prev[type], ...patch } }));
  };

  const save = async (type: string) => {
    const doc = docs[type];
    if (!doc.title.trim()) {
      toast({ title: 'Укажите заголовок', variant: 'destructive' });
      return;
    }
    setSavingType(type);
    const { data: userData } = await supabase.auth.getUser();
    const payload = {
      doc_type: doc.doc_type,
      title: doc.title.trim(),
      content: doc.content || null,
      file_url: doc.file_url?.trim() || null,
      is_active: doc.is_active,
      updated_by: userData?.user?.id ?? null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (doc.id) {
      ({ error } = await (supabase as any).from('platform_documents').update(payload).eq('id', doc.id));
    } else {
      const res = await (supabase as any).from('platform_documents').insert(payload).select().single();
      error = res.error;
      if (!error && res.data) update(type, { id: res.data.id });
    }
    setSavingType(null);

    if (error) {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Сохранено' });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DOC_TYPES.map(({ type }) => {
        const doc = docs[type];
        if (!doc) return null;
        return (
          <Card key={type}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  {doc.title || type}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`active-${type}`} className="text-xs text-muted-foreground">
                    Активен
                  </Label>
                  <Switch
                    id={`active-${type}`}
                    checked={doc.is_active}
                    onCheckedChange={(v) => update(type, { is_active: v })}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Заголовок</Label>
                <Input value={doc.title} onChange={(e) => update(type, { title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Контент (Markdown)</Label>
                <Textarea
                  rows={12}
                  value={doc.content}
                  onChange={(e) => update(type, { content: e.target.value })}
                  placeholder="# Заголовок&#10;Текст документа..."
                />
              </div>
              <div className="space-y-2">
                <Label>Ссылка на файл (PDF)</Label>
                <Input
                  type="url"
                  value={doc.file_url}
                  onChange={(e) => update(type, { file_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button onClick={() => save(type)} disabled={savingType === type}>
                {doc.id ? <Save className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                {savingType === type ? 'Сохранение...' : doc.id ? 'Сохранить' : 'Создать'}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

const QuestionsTab: React.FC = () => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<CheckpointQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState('');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('checkpoint_questions')
      .select('*')
      .order('sort_order', { ascending: true });
    if (error) {
      toast({ title: 'Ошибка загрузки вопросов', description: error.message, variant: 'destructive' });
    } else {
      setQuestions((data || []) as CheckpointQuestion[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const addQuestion = async () => {
    if (!newText.trim()) return;
    const maxOrder = questions.reduce((m, q) => Math.max(m, q.sort_order), 0);
    const { error } = await (supabase as any).from('checkpoint_questions').insert({
      question_text: newText.trim(),
      sort_order: maxOrder + 1,
      is_active: true,
    });
    if (error) {
      toast({ title: 'Ошибка добавления', description: error.message, variant: 'destructive' });
      return;
    }
    setNewText('');
    toast({ title: 'Вопрос добавлен' });
    load();
  };

  const saveQuestion = async (q: CheckpointQuestion, patch: Partial<CheckpointQuestion>) => {
    setQuestions((prev) => prev.map((it) => (it.id === q.id ? { ...it, ...patch } : it)));
    const { error } = await (supabase as any).from('checkpoint_questions').update(patch).eq('id', q.id);
    if (error) {
      toast({ title: 'Ошибка сохранения', description: error.message, variant: 'destructive' });
      load();
    }
  };

  const move = async (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= questions.length) return;
    const a = questions[index];
    const b = questions[target];
    const next = [...questions];
    next[index] = b;
    next[target] = a;
    setQuestions(next);

    const updates = next.map((q, i) =>
      (supabase as any).from('checkpoint_questions').update({ sort_order: i + 1 }).eq('id', q.id)
    );
    const results = await Promise.all(updates);
    const failed = results.find((r: any) => r.error);
    if (failed) {
      toast({ title: 'Ошибка порядка', description: (failed as any).error.message, variant: 'destructive' });
      load();
    }
  };

  const remove = async (id: string) => {
    const { error } = await (supabase as any).from('checkpoint_questions').delete().eq('id', id);
    if (error) {
      toast({ title: 'Ошибка удаления', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Вопрос удалён' });
    load();
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="pt-6 flex flex-col sm:flex-row gap-2">
          <Input
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            placeholder="Текст нового вопроса"
            onKeyDown={(e) => {
              if (e.key === 'Enter') addQuestion();
            }}
          />
          <Button onClick={addQuestion} disabled={!newText.trim()}>
            <Plus className="w-4 h-4 mr-2" /> Добавить вопрос
          </Button>
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">Вопросов пока нет</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <Card key={q.id}>
              <CardContent className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex flex-col gap-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={i === questions.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>
                <Input
                  className="flex-1"
                  value={q.question_text}
                  onChange={(e) =>
                    setQuestions((prev) =>
                      prev.map((it) => (it.id === q.id ? { ...it, question_text: e.target.value } : it))
                    )
                  }
                  onBlur={(e) => saveQuestion(q, { question_text: e.target.value })}
                />
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={q.is_active}
                      onCheckedChange={(v) => saveQuestion(q, { is_active: v })}
                    />
                    <span className="text-xs text-muted-foreground">{q.is_active ? 'Вкл' : 'Выкл'}</span>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить вопрос?</AlertDialogTitle>
                        <AlertDialogDescription>Действие нельзя отменить.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={() => remove(q.id)}>Удалить</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export const DocumentsManagement: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <FileText className="w-6 h-6" /> Документы
        </h2>
        <p className="text-muted-foreground">Правила, кодекс и вопросы Точка А/Б</p>
      </div>

      <Tabs defaultValue="docs">
        <TabsList>
          <TabsTrigger value="docs">Документы</TabsTrigger>
          <TabsTrigger value="questions">Вопросы Точка А/Б</TabsTrigger>
        </TabsList>
        <TabsContent value="docs" className="mt-4">
          <DocumentsTab />
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DocumentsManagement;
