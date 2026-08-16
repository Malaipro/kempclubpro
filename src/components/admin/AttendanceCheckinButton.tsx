import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, Loader2 } from 'lucide-react';

const ACTIVITY_TYPES: { value: string; label: string }[] = [
  { value: 'bjj', label: 'БЖЖ' },
  { value: 'kickboxing', label: 'Кикбоксинг' },
  { value: 'ofp', label: 'ОФП' },
  { value: 'nutrition', label: 'Питание' },
  { value: 'kamp_pyramid', label: 'Пирамида КЭМП' },
  { value: 'tactics', label: 'Тактика' },
];

const today = () => new Date().toISOString().slice(0, 10);

interface Props {
  userId: string;
  userName: string;
  streamId: string | null;
  onDone?: () => void;
}

export const AttendanceCheckinButton: React.FC<Props> = ({
  userId,
  userName,
  streamId,
  onDone,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>('bjj');
  const [date, setDate] = useState<string>(today());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    const { error } = await supabase.from('activity_checkins').insert({
      user_id: userId,
      activity_type: type,
      checked_at: date,
      stream_id: streamId,
    });
    setSaving(false);
    if (error) {
      if ((error as { code?: string }).code === '23505') {
        toast({ title: 'Уже отмечен на эту дату', variant: 'destructive' });
      } else {
        toast({ title: 'Ошибка', description: error.message, variant: 'destructive' });
      }
      return;
    }
    toast({ title: 'Отметка добавлена' });
    setOpen(false);
    onDone?.();
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setType('bjj');
          setDate(today());
          setOpen(true);
        }}
      >
        <CheckCircle className="w-4 h-4 mr-2" />
        Отметить
      </Button>

      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отметить посещение — {userName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Тип занятия</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Дата</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submit} disabled={saving || !date}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
              Отметить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AttendanceCheckinButton;
