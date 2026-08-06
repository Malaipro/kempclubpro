import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Plus, Edit, Trash2, User, CalendarIcon, CheckCircle, XCircle, ChevronDown, ChevronUp, Target, Zap, Dumbbell, Book, Shield, Award, Key, ArrowRightLeft, ExternalLink, Search, Filter, X, Send, Megaphone, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { ParticipantCRMBlock } from './participant/ParticipantCRMBlock';
import { PARTICIPANT_STATUSES, getParticipantStatusMeta, type ParticipantStatus } from '@/constants/participantStatus';
import { supabase } from '@/integrations/supabase/client';
import { formatPhoneRu, isValidPhoneRu } from '@/lib/phoneFormat';

import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Stream {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  stream_type: string;
}

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  telegram?: string;
  total_points: number;
  stream?: string;
  current_stream_id?: string;
  status: 'registered' | 'active' | 'completed';
  participant_status?: string | null;
  height_cm?: number;
  weight_kg?: number;
  date_of_birth?: string;
  approved?: boolean;
  approved_at?: string | null;
  approved_by?: string | null;
}

interface ParticipantDetails {
  bjj_points: number;
  kickboxing_points: number;
  ofp_points: number;
  theory_points: number;
  tactical_points: number;
  kamp_pyramid_points: number;
  nutrition_points: number;
  challenges_points: number;
  bjj_zakals: number;
  bjj_scars: number;
  kick_zakals: number;
  kick_scars: number;
  ofp_zakals: number;
  ofp_scars: number;
  theory_grans: number;
  tactical_scars: number;
}

export const EnhancedParticipantManagement: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [activeStreamTab, setActiveStreamTab] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
  const [transferringParticipant, setTransferringParticipant] = useState<Participant | null>(null);
  const [targetStreamId, setTargetStreamId] = useState<string>('');
  const [expandedParticipants, setExpandedParticipants] = useState<Set<string>>(new Set());
  const [participantDetails, setParticipantDetails] = useState<Map<string, ParticipantDetails>>(new Map());
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    telegram: '',
    stream_id: '',
    password: '',
    height_cm: '',
    weight_kg: '',
    date_of_birth: undefined as Date | undefined,
  });
  const [resetPasswordDialog, setResetPasswordDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Participant | null>(null);
  const [newPassword, setNewPassword] = useState('');

  // D1: фильтры
  const [search, setSearch] = useState('');
  const [filterStatuses, setFilterStatuses] = useState<Set<string>>(new Set());
  const [filterTagIds, setFilterTagIds] = useState<Set<string>>(new Set());
  const [allTags, setAllTags] = useState<Array<{ id: string; name: string; color: string | null }>>([]);
  const [profileTagsMap, setProfileTagsMap] = useState<Map<string, string[]>>(new Map());

  // D2-UI: рассылка из списка
  const [broadcastDialogOpen, setBroadcastDialogOpen] = useState(false);
  const [broadcastText, setBroadcastText] = useState('');
  const [broadcastSending, setBroadcastSending] = useState(false);

  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchStreams();
    fetchParticipants();
    fetchTagsData();
  }, []);

  const fetchTagsData = async () => {
    try {
      const [tagsRes, mapRes] = await Promise.all([
        supabase.from('participant_tags').select('id, name, color').order('name'),
        supabase.from('profile_tags').select('profile_user_id, tag_id'),
      ]);
      if (tagsRes.error) throw tagsRes.error;
      if (mapRes.error) throw mapRes.error;
      setAllTags(tagsRes.data || []);
      const map = new Map<string, string[]>();
      (mapRes.data || []).forEach((r: any) => {
        const arr = map.get(r.profile_user_id) || [];
        arr.push(r.tag_id);
        map.set(r.profile_user_id, arr);
      });
      setProfileTagsMap(map);
    } catch (e) {
      console.error('fetchTagsData error:', e);
    }
  };

  const fetchStreams = async () => {
    try {
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setStreams(data || []);
      
      // Set first stream as active by default
      if (data && data.length > 0) {
        setActiveStreamTab(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching streams:', error);
    }
  };

  const fetchParticipants = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id, 
          user_id, 
          display_name, 
          first_name, 
          last_name, 
          email,
          phone,
          telegram,
          total_points, 
          height_cm, 
          weight_kg, 
          date_of_birth,
          approved,
          approved_at,
          approved_by,
          current_stream_id,
          participant_status
        `)
        .order('display_name');
      
      if (error) throw error;

      // Transform data to match our interface
      const transformedData = data?.map(item => ({
        ...item,
        total_points: item.total_points || 0,
        status: 'registered' as const
      })) || [];

      setParticipants(transformedData);
    } catch (error) {
      console.error('Error fetching participants:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить участников',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedPhone = formatPhoneRu(formData.phone);

    if (!formData.first_name || !formData.last_name || !normalizedPhone) {
      toast({
        title: 'Ошибка',
        description: 'Заполните обязательные поля: имя, фамилия, телефон',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidPhoneRu(formData.phone)) {
      toast({
        title: 'Ошибка',
        description: 'Введите телефон в формате +7XXXXXXXXXX',
        variant: 'destructive',
      });
      return;
    }


    try {
      if (editingParticipant) {
        // Update existing participant
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            display_name: [formData.first_name, formData.last_name].filter(Boolean).join(' ') || null,
            email: formData.email || null,
            phone: normalizedPhone,
            telegram: formData.telegram || null,
            height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
            weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
            date_of_birth: formData.date_of_birth?.toISOString().split('T')[0] || null,
            current_stream_id: formData.stream_id || null,
          })
          .eq('id', editingParticipant.id);

        if (error) throw error;

        toast({
          title: 'Участник обновлен',
          description: 'Данные участника успешно обновлены',
        });
      } else {
        // Email необязателен: если не указан — создаём технический адрес из телефона
        const authEmail = formData.email?.trim()
          || `${normalizedPhone.replace(/\D/g, '')}@kempclub.pro`;

        // Create new participant
        const { data, error } = await supabase.functions.invoke('create-user', {
          body: {
            email: authEmail,
            password: formData.password,
            metadata: {
              first_name: formData.first_name,
              last_name: formData.last_name,
              display_name: [formData.first_name, formData.last_name].filter(Boolean).join(' '),
              profile_email: formData.email?.trim() || null,
              phone: normalizedPhone,
              telegram: formData.telegram || null,
              height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
              weight_kg: formData.weight_kg ? parseInt(formData.weight_kg) : null,
              date_of_birth: formData.date_of_birth ? formData.date_of_birth.toISOString().split('T')[0] : null,
              current_stream_id: formData.stream_id || null,
             }
           }
         });


        if (error) {
          console.error('Error creating participant:', error);
          let errorMessage = 'Не удалось создать участника';
          
          // Try to extract error message from different possible structures
          if (typeof error === 'object' && error !== null) {
            if ('message' in error) {
              errorMessage = error.message as string;
            } else if ('error' in error && typeof error.error === 'string') {
              errorMessage = error.error;
            } else if ('details' in error && typeof error.details === 'string') {
              errorMessage = error.details;
            }
          }
          
          toast({
            title: 'Ошибка',
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }

        toast({
          title: 'Успешно',
          description: 'Участник создан',
          variant: 'default',
        });
      }

      setDialogOpen(false);
      setEditingParticipant(null);
      resetForm();
      fetchParticipants();
    } catch (error) {
      console.error('Error saving participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось сохранить участника',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (participant: Participant) => {
    setEditingParticipant(participant);
    setFormData({
      first_name: participant.first_name || '',
      last_name: participant.last_name || '',
      email: participant.email || '',
      phone: participant.phone || '',
      telegram: participant.telegram || '',
      stream_id: participant.current_stream_id || '',
      password: '',
      height_cm: participant.height_cm?.toString() || '',
      weight_kg: participant.weight_kg?.toString() || '',
      date_of_birth: participant.date_of_birth ? new Date(participant.date_of_birth) : undefined,
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      telegram: '',
      stream_id: activeStreamTab !== 'all' ? activeStreamTab : (streams[0]?.id || ''),
      password: '',
      height_cm: '',
      weight_kg: '',
      date_of_birth: undefined,
    });
  };

  const handleTransferParticipant = async () => {
    if (!transferringParticipant || !targetStreamId) {
      toast({
        title: 'Ошибка',
        description: 'Выберите поток для переноса',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ current_stream_id: targetStreamId })
        .eq('user_id', transferringParticipant.user_id);

      if (error) throw error;

      toast({
        title: 'Успешно',
        description: 'Участник перенесен в другой поток',
      });

      setTransferDialogOpen(false);
      setTransferringParticipant(null);
      setTargetStreamId('');
      fetchParticipants();
    } catch (error) {
      console.error('Error transferring participant:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось перенести участника',
        variant: 'destructive',
      });
    }
  };

  const getStreamName = (streamId?: string) => {
    if (!streamId) return 'Не указан';
    const stream = streams.find(s => s.id === streamId);
    return stream?.name || 'Неизвестный поток';
  };

  // Применяет D1-фильтры (поиск, статусы, теги) к списку
  const applyFilters = (list: Participant[]) => {
    const q = search.trim().toLowerCase();
    return list.filter((p) => {
      // текст: имя / фамилия / display_name / email / telegram / phone
      if (q) {
        const hay = [
          p.first_name, p.last_name, p.display_name, p.email, p.telegram, p.phone,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // статусы
      if (filterStatuses.size > 0) {
        const st = p.participant_status || '';
        if (!filterStatuses.has(st)) return false;
      }
      // теги
      if (filterTagIds.size > 0) {
        const userTags = profileTagsMap.get(p.user_id) || [];
        const hasAny = userTags.some((tid) => filterTagIds.has(tid));
        if (!hasAny) return false;
      }
      return true;
    });
  };

  const streamScoped = activeStreamTab === 'all'
    ? participants
    : participants.filter(p => p.current_stream_id === activeStreamTab);
  const filteredParticipants = applyFilters(streamScoped);
  const activeFiltersCount = (search ? 1 : 0) + filterStatuses.size + filterTagIds.size;

  const toggleSetItem = <T,>(setter: React.Dispatch<React.SetStateAction<Set<T>>>, value: T) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value); else next.add(value);
      return next;
    });
  };

  const clearFilters = () => {
    setSearch('');
    setFilterStatuses(new Set());
    setFilterTagIds(new Set());
  };

  const handleSendBroadcastFromList = async () => {
    const text = broadcastText.trim();
    if (!text) {
      toast({ title: 'Введите текст', variant: 'destructive' });
      return;
    }
    if (filteredParticipants.length === 0) {
      toast({ title: 'Нет получателей', description: 'Список пуст — уточните фильтры', variant: 'destructive' });
      return;
    }
    setBroadcastSending(true);
    try {
      const targetIds = filteredParticipants.map(p => p.user_id);
      const snapshot = {
        statuses: Array.from(filterStatuses),
        tag_ids: Array.from(filterTagIds),
        streams: activeStreamTab === 'all' ? [] : [activeStreamTab],
        search: search.trim() || null,
      };
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await (supabase as any)
        .from('broadcast_messages')
        .insert({
          text,
          audience: 'all',
          buttons: [],
          file_url: null,
          status: 'draft',
          recipients_count: targetIds.length,
          target_user_ids: targetIds,
          filter_snapshot: snapshot,
          created_by: userData?.user?.id ?? null,
        });
      if (error) throw error;

      toast({
        title: 'Черновик рассылки создан',
        description: `Получателей в списке: ${targetIds.length}. Отправка активируется после обновления сервера рассылок.`,
      });
      setBroadcastDialogOpen(false);
      setBroadcastText('');
    } catch (e: any) {
      toast({ title: 'Ошибка', description: e?.message || 'Не удалось сохранить рассылку', variant: 'destructive' });
    } finally {
      setBroadcastSending(false);
    }
  };

  const handleToggleApproval = async (p: Participant) => {
    try {
      const newApproved = !p.approved;
      console.log('[admin_set_approval] call', { user_id: p.user_id, newApproved });
      const { error } = await supabase.rpc('admin_set_approval', {
        p_user_id: p.user_id,
        p_approved: newApproved,
      });
      if (error) throw error;

      toast({
        title: newApproved ? 'Участник утвержден' : 'Утверждение снято',
        description: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Участник',
      });
      await fetchParticipants();
    } catch (err: any) {
      console.error('RPC error admin_set_approval:', err);
      // Fallback: прямое обновление профиля + пересчет рейтинга
      try {
        const newApproved = !p.approved;
        const { error: updErr } = await supabase
          .from('profiles')
          .update({
            approved: newApproved,
            approved_at: newApproved ? new Date().toISOString() : null,
            approved_by: newApproved ? (user?.id ?? null) : null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', p.user_id);
        if (updErr) throw updErr;

        const { error: lbErr } = await supabase.rpc('update_user_leaderboard', { user_uuid: p.user_id });
        if (lbErr) console.warn('Leaderboard update warning:', lbErr);

        toast({
          title: newApproved ? 'Участник утвержден' : 'Утверждение снято',
          description: p.display_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || 'Участник',
        });
        await fetchParticipants();
      } catch (innerErr: any) {
        console.error('Fallback approval update failed:', innerErr);
        const msg = innerErr?.message || 'Неизвестная ошибка';
        toast({ title: 'Ошибка', description: `Не удалось обновить статус: ${msg}`, variant: 'destructive' });
      }
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword) {
      toast({
        title: 'Ошибка',
        description: 'Введите новый пароль',
        variant: 'destructive',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: 'Ошибка',
        description: 'Пароль должен содержать минимум 6 символов',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('reset-user-password', {
        body: {
          userId: selectedUser.user_id,
          newPassword: newPassword
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: 'Пароль изменен',
        description: `Пароль для ${formatParticipantName(selectedUser)} успешно изменен`,
      });

      setResetPasswordDialog(false);
      setSelectedUser(null);
      setNewPassword('');
    } catch (error) {
      console.error('Error resetting password:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось изменить пароль',
        variant: 'destructive',
      });
    }
  };

  const formatParticipantName = (participant: Participant) => {
    const first = (participant.first_name || '').trim();
    const last = (participant.last_name || '').trim();
    const disp = (participant.display_name || '').trim();
    if (first || last) return `${first} ${last}`.trim();
    if (disp) return disp;
    if (participant.email) return participant.email.split('@')[0];
    return 'Участник';
  };

  const getInitials = (participant: Participant) => {
    const name = formatParticipantName(participant);
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'registered':
        return <Badge className="bg-green-100 text-green-800">Зарегистрирован</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800">Активен</Badge>;
      case 'completed':
        return <Badge className="bg-gray-100 text-gray-800">Завершен</Badge>;
      default:
        return <Badge>Неизвестно</Badge>;
    }
  };

  const fetchParticipantDetails = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('leaderboard')
        .select('bjj_points, kickboxing_points, ofp_points, theory_points, tactical_points, kamp_pyramid_points, nutrition_points, challenges_points')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const details: ParticipantDetails = {
          bjj_points: data.bjj_points || 0,
          kickboxing_points: data.kickboxing_points || 0,
          ofp_points: data.ofp_points || 0,
          theory_points: data.theory_points || 0,
          tactical_points: data.tactical_points || 0,
          kamp_pyramid_points: data.kamp_pyramid_points || 0,
          nutrition_points: data.nutrition_points || 0,
          challenges_points: data.challenges_points || 0,
          bjj_zakals: data.bjj_points || 0,
          bjj_scars: Math.floor((data.bjj_points || 0) / 10),
          kick_zakals: data.kickboxing_points || 0,
          kick_scars: Math.floor((data.kickboxing_points || 0) / 10),
          ofp_zakals: data.ofp_points || 0,
          ofp_scars: Math.floor((data.ofp_points || 0) / 10),
          theory_grans: data.theory_points || 0,
          tactical_scars: data.tactical_points || 0,
        };

        setParticipantDetails(prev => new Map(prev).set(userId, details));
      }
    } catch (error) {
      console.error('Error fetching participant details:', error);
    }
  };

  const refreshParticipantData = async (userId?: string) => {
    await fetchParticipants();
    if (userId && expandedParticipants.has(userId)) {
      // Очистить кэш и перезагрузить детали
      setParticipantDetails(prev => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
      await fetchParticipantDetails(userId);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedParticipants(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
        fetchParticipantDetails(userId);
      }
      return newSet;
    });
  };

  // Подписка на изменения в leaderboard
  useEffect(() => {
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leaderboard'
        },
        (payload) => {
          console.log('Leaderboard changed:', payload);
          const userId = (payload.new as any)?.user_id || (payload.old as any)?.user_id;
          if (userId) {
            refreshParticipantData(userId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [expandedParticipants]);

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-pulse">Загрузка участников...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-bold">Управление участниками</h1>
          <p className="text-muted-foreground">Добавляйте и редактируйте участников по потокам</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setBroadcastDialogOpen(true)}
            title="Отправить рассылку по отфильтрованному списку"
          >
            <Megaphone className="w-4 h-4 mr-2" />
            Отправить рассылку ({filteredParticipants.length})
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-white"
                onClick={() => {
                  setEditingParticipant(null);
                  resetForm();
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить участника
              </Button>
            </DialogTrigger>
          
          <DialogContent className="max-w-md bg-gray-900 border-gray-700">
            <DialogHeader>
              <DialogTitle className="text-white">
                {editingParticipant ? 'Редактировать участника' : 'Добавить нового участника'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Имя *</Label>
                  <Input
                    value={formData.first_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, first_name: e.target.value }))}
                    placeholder="Имя участника"
                    className="bg-white text-black"
                    required
                  />
                </div>
                <div>
                  <Label className="text-white">Фамилия</Label>
                  <Input
                    value={formData.last_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_name: e.target.value }))}
                    placeholder="Фамилия участника"
                    className="bg-white text-black"
                  />
                </div>
              </div>

              <div>
                <Label className="text-white">Электронная почта</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@example.com"
                  className="bg-white text-black"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-white">Телефон</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+7 (999) 123-45-67"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Telegram</Label>
                  <Input
                    value={formData.telegram}
                    onChange={(e) => setFormData(prev => ({ ...prev, telegram: e.target.value }))}
                    placeholder="@username"
                    className="bg-white text-black"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label className="text-white">Рост (см)</Label>
                  <Input
                    type="number"
                    value={formData.height_cm}
                    onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                    placeholder="175"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Вес (кг)</Label>
                  <Input
                    type="number"
                    value={formData.weight_kg}
                    onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                    placeholder="70"
                    className="bg-white text-black"
                  />
                </div>
                <div>
                  <Label className="text-white">Дата рождения</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-white text-black hover:bg-gray-50",
                          !formData.date_of_birth && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.date_of_birth ? format(formData.date_of_birth, "dd.MM.yyyy") : "дд.мм.гггг"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-white border border-gray-300 shadow-lg z-[9999]" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.date_of_birth}
                        onSelect={(date) => setFormData(prev => ({ ...prev, date_of_birth: date }))}
                        initialFocus
                        className="bg-white pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div>
                <Label className="text-white">Поток</Label>
                <Select value={formData.stream_id} onValueChange={(value) => setFormData(prev => ({ ...prev, stream_id: value }))}>
                  <SelectTrigger className="bg-white text-black">
                    <SelectValue placeholder="Выберите поток" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                    {streams.map(stream => (
                      <SelectItem key={stream.id} value={stream.id} className="hover:bg-gray-100">
                        {stream.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!editingParticipant && (
                <div>
                  <Label className="text-white">Пароль *</Label>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Минимум 6 символов"
                    className="bg-white text-black"
                    required
                    minLength={6}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  className="bg-destructive hover:bg-destructive/90 text-white"
                >
                  {editingParticipant ? 'Сохранить' : 'Создать'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300 hover:bg-gray-800"
                >
                  Отмена
                </Button>
              </div>
            </form>
          </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* D1: Панель фильтров */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Поиск: имя, email, телефон, telegram"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Статус {filterStatuses.size > 0 && <Badge className="ml-2" variant="secondary">{filterStatuses.size}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 z-50 bg-popover" align="start">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {PARTICIPANT_STATUSES.map((s) => (
                  <label key={s.value} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filterStatuses.has(s.value)}
                      onCheckedChange={() => toggleSetItem(setFilterStatuses, s.value)}
                    />
                    <span>{s.label}{s.legacy && <span className="text-muted-foreground ml-1 text-xs">(legacy)</span>}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Теги {filterTagIds.size > 0 && <Badge className="ml-2" variant="secondary">{filterTagIds.size}</Badge>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 z-50 bg-popover" align="start">
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {allTags.length === 0 && (
                  <p className="text-sm text-muted-foreground">Тегов нет</p>
                )}
                {allTags.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <Checkbox
                      checked={filterTagIds.has(t.id)}
                      onCheckedChange={() => toggleSetItem(setFilterTagIds, t.id)}
                    />
                    <Badge style={{ backgroundColor: t.color || '#6b7280', color: '#fff' }}>{t.name}</Badge>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" /> Сбросить ({activeFiltersCount})
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            Найдено: <span className="font-semibold text-foreground">{filteredParticipants.length}</span> из {streamScoped.length}
          </div>
        </div>
      </Card>

      {/* D2-UI: Диалог рассылки по отфильтрованному списку */}
      <Dialog open={broadcastDialogOpen} onOpenChange={setBroadcastDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" /> Рассылка по списку
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="text-sm text-muted-foreground">
              Получателей: <span className="font-semibold text-foreground">{filteredParticipants.length}</span>
              {activeFiltersCount > 0 && ` (с учётом фильтров${activeStreamTab !== 'all' ? ' и текущего потока' : ''})`}
            </div>
            <div>
              <Label>Текст сообщения</Label>
              <Textarea
                rows={6}
                maxLength={4000}
                value={broadcastText}
                onChange={(e) => setBroadcastText(e.target.value)}
                placeholder="Введите текст рассылки..."
              />
            </div>
            <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
              ⚠️ Рассылка будет сохранена как черновик с явным списком получателей.
              Автоматическая отправка через Telegram активируется после обновления сервера рассылок.
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setBroadcastDialogOpen(false)} disabled={broadcastSending}>
                Отмена
              </Button>
              <Button onClick={handleSendBroadcastFromList} disabled={broadcastSending}>
                {broadcastSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Сохранить черновик
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Перенести участника в другой поток
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-white mb-2">
                Участник: <span className="font-semibold">{transferringParticipant ? formatParticipantName(transferringParticipant) : ''}</span>
              </p>
              <p className="text-gray-400 text-sm">
                Текущий поток: {transferringParticipant ? getStreamName(transferringParticipant.current_stream_id) : ''}
              </p>
            </div>

            <div>
              <Label className="text-white">Новый поток *</Label>
              <Select value={targetStreamId} onValueChange={setTargetStreamId}>
                <SelectTrigger className="bg-white text-black">
                  <SelectValue placeholder="Выберите поток" />
                </SelectTrigger>
                <SelectContent className="bg-white border-gray-300 shadow-lg z-50">
                  {streams
                    .filter(s => s.id !== transferringParticipant?.current_stream_id)
                    .map(stream => (
                      <SelectItem key={stream.id} value={stream.id} className="hover:bg-gray-100">
                        {stream.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleTransferParticipant}
                className="bg-destructive hover:bg-destructive/90 text-white"
              >
                Перенести
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setTransferDialogOpen(false);
                  setTransferringParticipant(null);
                  setTargetStreamId('');
                }}
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                Отмена
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs for Streams */}
      <Tabs value={activeStreamTab} onValueChange={setActiveStreamTab} className="w-full">
        <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${streams.length + 1}, minmax(0, 1fr))` }}>
          <TabsTrigger value="all">Все участники</TabsTrigger>
          {streams.map(stream => (
            <TabsTrigger key={stream.id} value={stream.id}>
              {stream.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* All participants */}
        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4">
            {filteredParticipants.map((participant) => {
          const fullName = formatParticipantName(participant);
          const isExpanded = expandedParticipants.has(participant.user_id);
          const details = participantDetails.get(participant.user_id);
          
          return (
            <Card key={participant.id} className="p-4">
              <CardContent className="p-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <Avatar className="h-12 w-12 bg-destructive/10 flex-shrink-0">
                      <AvatarFallback className="text-destructive font-medium">
                        {getInitials(participant)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg text-foreground">
                        {fullName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        <span>{participant.total_points} баллов</span>
                        {participant.email && (
                          <>
                            <span>•</span>
                            <span className="truncate">{participant.email}</span>
                          </>
                        )}
                        {participant.height_cm && participant.weight_kg && (
                          <>
                            <span>•</span>
                            <span>{participant.height_cm}см, {participant.weight_kg}кг</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline">{getStreamName(participant.current_stream_id)}</Badge>
                        {participant.approved && (<Badge className="bg-green-100 text-green-800">Утвержден</Badge>)}
                        {getStatusBadge(participant.status)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => toggleExpand(participant.user_id)}
                      title={isExpanded ? "Скрыть детали" : "Показать детали"}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setTransferringParticipant(participant);
                        setTransferDialogOpen(true);
                      }}
                      title="Перенести в другой поток"
                    >
                      <ArrowRightLeft className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleToggleApproval(participant)}
                      title={participant.approved ? "Снять утверждение" : "Утвердить участника"}
                    >
                      {participant.approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(participant)}
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSelectedUser(participant);
                        setResetPasswordDialog(true);
                      }}
                      title="Изменить пароль"
                    >
                      <Key className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        // Открыть страницу профиля участника в новой вкладке
                        window.open(`/admin/view-participant/${participant.user_id}`, '_blank');
                      }}
                      title="Просмотреть ЛК участника"
                      className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isExpanded && details && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                      <Award className="w-4 h-4 text-kamp-accent" />
                      Детализация достижений КЭМП:
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {details.bjj_points > 0 && (
                        <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                          <div className="flex items-start gap-2">
                            <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">БЖЖ</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.bjj_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.bjj_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.kickboxing_points > 0 && (
                        <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                          <div className="flex items-start gap-2">
                            <Zap className="w-5 h-5 text-red-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Кикбоксинг</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.kick_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.kick_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.ofp_points > 0 && (
                        <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                          <div className="flex items-start gap-2">
                            <Dumbbell className="w-5 h-5 text-green-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">ОФП</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Закалы:</span>
                                  <span className="font-semibold">{details.ofp_zakals}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.ofp_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.theory_points > 0 && (
                        <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                          <div className="flex items-start gap-2">
                            <Book className="w-5 h-5 text-purple-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Теория</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Грани:</span>
                                  <span className="font-semibold">{details.theory_grans}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.tactical_points > 0 && (
                        <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                          <div className="flex items-start gap-2">
                            <Shield className="w-5 h-5 text-orange-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Тактика</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Шрамы:</span>
                                  <span className="font-semibold text-red-600">{details.tactical_scars}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.kamp_pyramid_points > 0 && (
                        <div className="p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/30">
                          <div className="flex items-start gap-2">
                            <Target className="w-5 h-5 text-yellow-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Пирамида КЭМП</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Баллы:</span>
                                  <span className="font-semibold">{details.kamp_pyramid_points}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {details.nutrition_points > 0 && (
                        <div className="p-3 bg-teal-500/10 rounded-lg border border-teal-500/30">
                          <div className="flex items-start gap-2">
                            <Book className="w-5 h-5 text-teal-400 mt-0.5" />
                            <div className="flex-1">
                              <p className="font-semibold text-gray-900 mb-1">Нутрициология</p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Баллы:</span>
                                  <span className="font-semibold">{details.nutrition_points}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {!details.bjj_points && !details.kickboxing_points && !details.ofp_points && 
                     !details.theory_points && !details.tactical_points && !details.kamp_pyramid_points && !details.nutrition_points && (
                      <div className="text-center py-4 text-gray-400">
                        <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Активности пока не зафиксированы</p>
                      </div>
                    )}

                    <div className="mt-6 pt-4 border-t border-gray-200">
                      <ParticipantCRMBlock
                        userId={participant.user_id}
                        currentStatus={participant.participant_status ?? null}
                        currentStreamId={participant.current_stream_id ?? null}
                        onChanged={fetchParticipants}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
          </div>

          {filteredParticipants.length === 0 && (
            <Card className="p-8">
              <div className="text-center text-muted-foreground">
                <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">Нет участников</h3>
                <p className="text-sm">Добавьте первого участника, чтобы начать</p>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Stream specific tabs */}
        {streams.map(stream => (
          <TabsContent key={stream.id} value={stream.id} className="mt-6">
            <div className="grid gap-4">
              {filteredParticipants.map((participant) => {
                const fullName = formatParticipantName(participant);
                const isExpanded = expandedParticipants.has(participant.user_id);
                const details = participantDetails.get(participant.user_id);
                
                return (
                  <Card key={participant.id} className="p-4">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <Avatar className="h-12 w-12 bg-destructive/10 flex-shrink-0">
                            <AvatarFallback className="text-destructive font-medium">
                              {getInitials(participant)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-foreground">
                              {fullName}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span>{participant.total_points} баллов</span>
                              {participant.email && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{participant.email}</span>
                                </>
                              )}
                              {participant.height_cm && participant.weight_kg && (
                                <>
                                  <span>•</span>
                                  <span>{participant.height_cm}см, {participant.weight_kg}кг</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline">{getStreamName(participant.current_stream_id)}</Badge>
                              {participant.approved && (<Badge className="bg-green-100 text-green-800">Утвержден</Badge>)}
                              {getStatusBadge(participant.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleExpand(participant.user_id)}
                            title={isExpanded ? "Скрыть детали" : "Показать детали"}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setTransferringParticipant(participant);
                              setTransferDialogOpen(true);
                            }}
                            title="Перенести в другой поток"
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleToggleApproval(participant)}
                            title={participant.approved ? "Снять утверждение" : "Утвердить участника"}
                          >
                            {participant.approved ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(participant)}
                            title="Редактировать"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedUser(participant);
                              setResetPasswordDialog(true);
                            }}
                            title="Изменить пароль"
                          >
                            <Key className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              window.open(`/admin/view-participant/${participant.user_id}`, '_blank');
                            }}
                            title="Просмотреть ЛК участника"
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-destructive hover:text-destructive"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && details && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4 text-kamp-accent" />
                            Детализация достижений КЭМП:
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {details.bjj_points > 0 && (
                              <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                                <div className="flex items-start gap-2">
                                  <Target className="w-5 h-5 text-blue-400 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">БЖЖ</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Закалы:</span>
                                        <span className="font-semibold">{details.bjj_zakals}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Шрамы:</span>
                                        <span className="font-semibold text-red-600">{details.bjj_scars}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {details.kickboxing_points > 0 && (
                              <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/30">
                                <div className="flex items-start gap-2">
                                  <Zap className="w-5 h-5 text-red-400 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">Кикбоксинг</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Закалы:</span>
                                        <span className="font-semibold">{details.kick_zakals}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Шрамы:</span>
                                        <span className="font-semibold text-red-600">{details.kick_scars}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {details.ofp_points > 0 && (
                              <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                                <div className="flex items-start gap-2">
                                  <Dumbbell className="w-5 h-5 text-green-400 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">ОФП</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Закалы:</span>
                                        <span className="font-semibold">{details.ofp_zakals}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Шрамы:</span>
                                        <span className="font-semibold text-red-600">{details.ofp_scars}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {details.theory_points > 0 && (
                              <div className="p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                                <div className="flex items-start gap-2">
                                  <Book className="w-5 h-5 text-purple-400 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">Теория</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Грани:</span>
                                        <span className="font-semibold">{details.theory_grans}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {details.tactical_points > 0 && (
                              <div className="p-3 bg-orange-500/10 rounded-lg border border-orange-500/30">
                                <div className="flex items-start gap-2">
                                  <Shield className="w-5 h-5 text-orange-400 mt-0.5" />
                                  <div className="flex-1">
                                    <p className="font-semibold text-gray-900 mb-1">Тактика</p>
                                    <div className="space-y-1 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Шрамы:</span>
                                        <span className="font-semibold text-red-600">{details.tactical_scars}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="mt-6 pt-4 border-t border-gray-200">
                            <ParticipantCRMBlock
                              userId={participant.user_id}
                              currentStatus={participant.participant_status ?? null}
                              currentStreamId={participant.current_stream_id ?? null}
                              onChanged={fetchParticipants}
                            />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {filteredParticipants.length === 0 && (
              <Card className="p-8">
                <div className="text-center text-muted-foreground">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Нет участников в этом потоке</h3>
                  <p className="text-sm">Добавьте участников или перенесите из других потоков</p>
                </div>
              </Card>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {participants.length === 0 && (
        <Card className="p-8">
          <div className="text-center text-muted-foreground">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">Нет участников</h3>
            <p className="text-sm">Добавьте первого участника, чтобы начать</p>
          </div>
        </Card>
      )}

      <Dialog open={resetPasswordDialog} onOpenChange={setResetPasswordDialog}>
        <DialogContent className="max-w-md bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">
              Изменить пароль для {selectedUser && formatParticipantName(selectedUser)}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label className="text-white">Новый пароль</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                className="bg-white text-black"
                minLength={6}
              />
              <p className="text-sm text-gray-400 mt-1">
                Минимум 6 символов
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setResetPasswordDialog(false);
                  setSelectedUser(null);
                  setNewPassword('');
                }}
              >
                Отмена
              </Button>
              <Button 
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleResetPassword}
                disabled={!newPassword || newPassword.length < 6}
              >
                Изменить пароль
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};