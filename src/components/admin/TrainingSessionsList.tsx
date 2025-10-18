import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Pencil, Trash2, Calendar, History } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Profile {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface TrainingSession {
  id: string;
  user_id: string;
  session_type: string;
  activity_type: string;
  session_date: string;
  points_earned: number;
  verified: boolean;
  notes: string | null;
  created_at: string;
  profiles?: Profile;
}

const activityTypeLabels: Record<string, string> = {
  bjj: 'БЖЖ',
  kickboxing: 'Кикбоксинг',
  ofp: 'ОФП',
  theory: 'Теория',
  tactics: 'Тактика',
  kamp_pyramid: 'Пирамида КЭМП',
  nutrition: 'Нутрициология',
};

export const TrainingSessionsList: React.FC = () => {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [editingSession, setEditingSession] = useState<TrainingSession | null>(null);
  const [deletingSession, setDeletingSession] = useState<TrainingSession | null>(null);
  
  // Edit form states
  const [editActivityType, setEditActivityType] = useState<string>('');
  const [editSessionDate, setEditSessionDate] = useState<Date>(new Date());
  const [editPointsEarned, setEditPointsEarned] = useState<number>(1);
  const [editNotes, setEditNotes] = useState<string>('');
  const [editVerified, setEditVerified] = useState<boolean>(true);

  useEffect(() => {
    loadData();
  }, [selectedUserId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, display_name, first_name, last_name')
        .order('display_name');

      if (profilesError) throw profilesError;
      setProfiles(profilesData || []);

      // Load training sessions
      let query = supabase
        .from('training_sessions')
        .select(`
          *,
          profiles:user_id (
            user_id,
            display_name,
            first_name,
            last_name
          )
        `)
        .order('session_date', { ascending: false });

      if (selectedUserId !== 'all') {
        query = query.eq('user_id', selectedUserId);
      }

      const { data: sessionsData, error: sessionsError } = await query;

      if (sessionsError) throw sessionsError;
      setSessions(sessionsData || []);
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast.error('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (session: TrainingSession) => {
    setEditingSession(session);
    setEditActivityType(session.activity_type || session.session_type);
    setEditSessionDate(new Date(session.session_date));
    setEditPointsEarned(session.points_earned);
    setEditNotes(session.notes || '');
    setEditVerified(session.verified);
  };

  const handleUpdate = async () => {
    if (!editingSession) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const { error } = await supabase
        .from('training_sessions')
        .update({
          activity_type: editActivityType,
          session_type: editActivityType,
          session_date: editSessionDate.toISOString(),
          points_earned: editPointsEarned,
          verified: editVerified,
          notes: editNotes || null,
        })
        .eq('id', editingSession.id);

      if (error) throw error;

      // Log the change
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'ADMIN_ACTION',
        table_name: 'training_sessions',
        record_id: editingSession.id,
      });

      toast.success('Тренировка обновлена');
      setEditingSession(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating session:', error);
      toast.error('Ошибка обновления');
    }
  };

  const handleDelete = async () => {
    if (!deletingSession) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Не авторизован');

      const { error } = await supabase
        .from('training_sessions')
        .delete()
        .eq('id', deletingSession.id);

      if (error) throw error;

      // Log the deletion
      await supabase.from('audit_log').insert({
        user_id: user.id,
        action: 'ADMIN_ACTION',
        table_name: 'training_sessions',
        record_id: deletingSession.id,
      });

      toast.success('Тренировка удалена');
      setDeletingSession(null);
      loadData();
    } catch (error: any) {
      console.error('Error deleting session:', error);
      toast.error('Ошибка удаления');
    }
  };

  const getUserName = (session: TrainingSession) => {
    if (session.profiles) {
      return session.profiles.display_name || 
             `${session.profiles.first_name || ''} ${session.profiles.last_name || ''}`.trim() ||
             'Без имени';
    }
    return 'Неизвестный участник';
  };

  if (loading) {
    return (
      <Card className="kamp-card">
        <CardContent className="pt-6">
          <div className="text-center text-gray-400">Загрузка...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="kamp-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-kamp-accent">
            <History className="w-5 h-5" />
            История тренировок
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter by user */}
          <div>
            <Label className="text-white">Фильтр по участнику</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все участники</SelectItem>
                {profiles.map((profile) => (
                  <SelectItem key={profile.user_id} value={profile.user_id}>
                    {profile.display_name || 
                     `${profile.first_name || ''} ${profile.last_name || ''}`.trim() ||
                     'Без имени'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Sessions list */}
          <div className="space-y-2">
            {sessions.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                Нет записей о тренировках
              </div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-white">
                        {getUserName(session)}
                      </span>
                      <span className="text-sm text-gray-400">
                        {format(new Date(session.session_date), 'dd MMM yyyy', { locale: ru })}
                      </span>
                    </div>
                    <div className="text-sm text-gray-300">
                      {activityTypeLabels[session.activity_type || session.session_type] || session.session_type}
                      {' · '}
                      <span className="text-kamp-accent font-semibold">
                        {session.points_earned} {session.points_earned === 1 ? 'балл' : 'баллов'}
                      </span>
                      {session.verified && ' · ✓ Проверено'}
                    </div>
                    {session.notes && (
                      <div className="text-sm text-gray-400 mt-1">
                        {session.notes}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(session)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeletingSession(session)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={!!editingSession} onOpenChange={() => setEditingSession(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-white">Редактировать тренировку</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-white">Тип активности</Label>
              <Select value={editActivityType} onValueChange={setEditActivityType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bjj">БЖЖ</SelectItem>
                  <SelectItem value="kickboxing">Кикбоксинг</SelectItem>
                  <SelectItem value="ofp">ОФП</SelectItem>
                  <SelectItem value="theory">Теория</SelectItem>
                  <SelectItem value="tactics">Тактика</SelectItem>
                  <SelectItem value="kamp_pyramid">Пирамида КЭМП</SelectItem>
                  <SelectItem value="nutrition">Нутрициология</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Дата тренировки</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {format(editSessionDate, 'PPP', { locale: ru })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={editSessionDate}
                    onSelect={(date) => date && setEditSessionDate(date)}
                    locale={ru}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label className="text-white">Количество баллов</Label>
              <Select value={editPointsEarned.toString()} onValueChange={(value) => setEditPointsEarned(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((points) => (
                    <SelectItem key={points} value={points.toString()}>
                      {points} {points === 1 ? 'балл' : 'баллов'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Статус проверки</Label>
              <Select value={editVerified ? 'true' : 'false'} onValueChange={(value) => setEditVerified(value === 'true')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Проверено</SelectItem>
                  <SelectItem value="false">Не проверено</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Заметки</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Дополнительная информация..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingSession(null)}>
              Отмена
            </Button>
            <Button onClick={handleUpdate}>
              Сохранить изменения
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSession} onOpenChange={() => setDeletingSession(null)}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Удалить тренировку?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Это действие нельзя отменить. Тренировка будет удалена, и баллы будут автоматически пересчитаны.
              {deletingSession && (
                <div className="mt-2 p-2 bg-muted/20 rounded">
                  <div className="text-white font-semibold">{getUserName(deletingSession)}</div>
                  <div className="text-sm">
                    {activityTypeLabels[deletingSession.activity_type || deletingSession.session_type]} · {deletingSession.points_earned} баллов
                  </div>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
