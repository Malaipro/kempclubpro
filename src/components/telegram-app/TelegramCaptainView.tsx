import React, { useEffect, useState, useCallback } from 'react';
import { Shield, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

const SERVER_URL = (import.meta as any).env?.VITE_TELEGRAM_SERVER_URL ?? 'https://tg.kempclub.pro';

type TrafficLight = 'green' | 'yellow' | 'red';

interface TeamMember {
  id: string;
  user_id: string;
  traffic_light: TrafficLight;
  captain_comment: string | null;
  profiles: { display_name: string | null; telegram_id: number | string | null } | null;
}

interface Team {
  id: string;
  name: string | null;
  streams: { name: string } | null;
  captain_team_members: TeamMember[];
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'not_captain' }
  | { status: 'ok'; teams: Team[] };

interface Props { onBack: () => void; }

const LIGHT_OPTIONS: { value: TrafficLight; label: string; dot: string }[] = [
  { value: 'green', label: 'Зелёный', dot: 'bg-green-500' },
  { value: 'yellow', label: 'Жёлтый', dot: 'bg-yellow-500' },
  { value: 'red', label: 'Красный', dot: 'bg-red-500' },
];

const LIGHT_DOT: Record<TrafficLight, string> = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
};

export const TelegramCaptainView: React.FC<Props> = ({ onBack }) => {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  const [lightDialogMember, setLightDialogMember] = useState<TeamMember | null>(null);
  const [selectedLight, setSelectedLight] = useState<TrafficLight>('green');
  const [lightReason, setLightReason] = useState('');
  const [lightSaving, setLightSaving] = useState(false);

  const [commentDialogMember, setCommentDialogMember] = useState<TeamMember | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSaving, setCommentSaving] = useState(false);

  useEffect(() => {
    const btn = (window as any).Telegram?.WebApp?.BackButton;
    if (!btn) return;
    btn.show();
    btn.onClick(onBack);
    return () => { btn.offClick(onBack); btn.hide(); };
  }, [onBack]);

  const fetchData = useCallback(async () => {
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) {
      setLoadState({ status: 'error', message: 'Нет доступа к Telegram WebApp' });
      return;
    }
    try {
      setLoadState({ status: 'loading' });
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, action: 'get_captain_team' }),
      });
      const body = await res.json() as {
        ok: boolean;
        data?: { is_captain: boolean; teams?: Team[] };
        error?: string;
      };
      if (!body.ok || !body.data) throw new Error(body.error ?? 'rpc_error');
      if (!body.data.is_captain) {
        setLoadState({ status: 'not_captain' });
        return;
      }
      setLoadState({ status: 'ok', teams: body.data.teams ?? [] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ошибка загрузки';
      setLoadState({ status: 'error', message: msg });
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openLightDialog = (member: TeamMember) => {
    setLightDialogMember(member);
    setSelectedLight(member.traffic_light);
    setLightReason('');
  };

  const saveLight = async () => {
    if (!lightDialogMember) return;
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setLightSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'update_traffic_light',
          member_id: lightDialogMember.id,
          new_light: selectedLight,
          reason: lightReason || undefined,
        }),
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'rpc_error');
      setLightDialogMember(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setLightSaving(false);
    }
  };

  const openCommentDialog = (member: TeamMember) => {
    setCommentDialogMember(member);
    setCommentDraft(member.captain_comment ?? '');
  };

  const saveComment = async () => {
    if (!commentDialogMember) return;
    const initData = (window as any).Telegram?.WebApp?.initData;
    if (!initData) return;
    setCommentSaving(true);
    try {
      const res = await fetch(`${SERVER_URL}/api/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initData,
          action: 'update_captain_comment',
          member_id: commentDialogMember.id,
          captain_comment: commentDraft,
        }),
      });
      const body = await res.json() as { ok: boolean; error?: string };
      if (!body.ok) throw new Error(body.error ?? 'rpc_error');
      setCommentDialogMember(null);
      await fetchData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setCommentSaving(false);
    }
  };

  // ---------- Render: loading ----------
  if (loadState.status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Загрузка команды...</p>
      </div>
    );
  }

  // ---------- Render: error ----------
  if (loadState.status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <p className="text-destructive text-sm text-center">{loadState.message}</p>
        <Button size="sm" variant="outline" onClick={onBack}>Назад</Button>
      </div>
    );
  }

  // ---------- Render: not captain ----------
  if (loadState.status === 'not_captain') {
    return (
      <div className="min-h-screen bg-background pb-8">
        <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
          <h1 className="text-white text-xl font-bold">Моя команда</h1>
        </div>
        <div className="px-4 pt-8">
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Вы не назначены капитаном</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ---------- Render: ok ----------
  const { teams } = loadState;

  const renderTeam = (team: Team) => (
    <div className="space-y-3">
      {team.captain_team_members.length === 0 && (
        <Card>
          <CardContent className="py-8 px-4 text-center">
            <p className="text-sm text-muted-foreground">В команде пока нет участников</p>
          </CardContent>
        </Card>
      )}

      {team.captain_team_members.map((member) => (
        <Card key={member.id}>
          <CardContent className="py-4 px-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold truncate">
                {member.profiles?.display_name || 'Без имени'}
              </p>
              <button
                type="button"
                onClick={() => openLightDialog(member)}
                className="shrink-0 flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1"
              >
                <span className={`w-3 h-3 rounded-full ${LIGHT_DOT[member.traffic_light]}`} />
                <span className="text-xs text-muted-foreground">
                  {LIGHT_OPTIONS.find((o) => o.value === member.traffic_light)?.label}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => openCommentDialog(member)}
              className="w-full text-left flex items-start gap-2 rounded-lg bg-muted/40 px-3 py-2"
            >
              <MessageSquare className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground line-clamp-2">
                {member.captain_comment || 'Нет комментария'}
              </span>
            </button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-8">

      {/* Header */}
      <div className="bg-kamp-primary px-4 pt-8 pb-6 flex flex-col items-center gap-1">
        <h1 className="text-white text-xl font-bold">Моя команда</h1>
      </div>

      <div className="px-4 pt-4">
        {teams.length === 0 ? (
          <Card>
            <CardContent className="py-8 px-4 text-center">
              <Shield className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">У вас пока нет команды</p>
            </CardContent>
          </Card>
        ) : teams.length === 1 ? (
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold">{teams[0].name || 'Команда'}</h2>
              {teams[0].streams?.name && (
                <p className="text-xs text-muted-foreground">{teams[0].streams.name}</p>
              )}
            </div>
            {renderTeam(teams[0])}
          </div>
        ) : (
          <Tabs defaultValue={teams[0].id}>
            <TabsList className="w-full flex-wrap h-auto">
              {teams.map((team) => (
                <TabsTrigger key={team.id} value={team.id} className="flex-1">
                  {team.name || 'Команда'}
                </TabsTrigger>
              ))}
            </TabsList>
            {teams.map((team) => (
              <TabsContent key={team.id} value={team.id} className="space-y-4 mt-4">
                {team.streams?.name && (
                  <p className="text-xs text-muted-foreground">{team.streams.name}</p>
                )}
                {renderTeam(team)}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* Traffic light dialog */}
      <Dialog open={!!lightDialogMember} onOpenChange={(open) => !open && setLightDialogMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Статус — {lightDialogMember?.profiles?.display_name || 'участник'}
            </DialogTitle>
          </DialogHeader>

          <div className="flex gap-2">
            {LIGHT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelectedLight(opt.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 ${
                  selectedLight === opt.value ? 'border-kamp-primary bg-kamp-primary/10' : 'border-border'
                }`}
              >
                <span className={`w-4 h-4 rounded-full ${opt.dot}`} />
                <span className="text-xs">{opt.label}</span>
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">Причина</p>
            <Textarea
              value={lightReason}
              onChange={(e) => setLightReason(e.target.value)}
              placeholder="Опишите причину смены статуса (необязательно)"
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLightDialogMember(null)} disabled={lightSaving}>
              Отмена
            </Button>
            <Button onClick={saveLight} disabled={lightSaving}>
              {lightSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comment dialog */}
      <Dialog open={!!commentDialogMember} onOpenChange={(open) => !open && setCommentDialogMember(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Комментарий — {commentDialogMember?.profiles?.display_name || 'участник'}
            </DialogTitle>
          </DialogHeader>

          <Textarea
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            placeholder="Комментарий капитана"
            rows={4}
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setCommentDialogMember(null)} disabled={commentSaving}>
              Отмена
            </Button>
            <Button onClick={saveComment} disabled={commentSaving}>
              {commentSaving ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
