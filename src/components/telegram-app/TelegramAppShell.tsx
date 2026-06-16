import React, { useEffect, useState } from 'react';
import { TelegramLoading } from './TelegramLoading';
import { TelegramNoAccess, NoAccessReason } from './TelegramNoAccess';
import { TelegramParticipantView } from './TelegramParticipantView';
import type { ParticipantFullState } from '@/services/participantService';

type AppState =
  | { status: 'loading' }
  | { status: 'error'; reason: NoAccessReason }
  | { status: 'ok'; data: ParticipantFullState };

const SERVER_URL = import.meta.env.VITE_TELEGRAM_SERVER_URL;

async function fetchState(initData: string): Promise<ParticipantFullState> {
  const res = await fetch(`${SERVER_URL}/api/state`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData, action: 'get_state' }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? 'network_error');
  }

  const body = await res.json() as { ok: boolean; data?: ParticipantFullState; error?: string };

  if (!body.ok) {
    throw new Error(body.error ?? 'rpc_error');
  }

  return body.data!;
}

const KNOWN_REASONS = new Set<NoAccessReason>([
  'not_linked',
  'invalid_init_data',
  'init_data_expired',
  'missing_init_data',
  'missing_user',
  'rpc_error',
  'no_webapp',
  'network_error',
]);

function toReason(msg: string): NoAccessReason {
  return KNOWN_REASONS.has(msg as NoAccessReason) ? (msg as NoAccessReason) : 'rpc_error';
}

export const TelegramAppShell: React.FC = () => {
  const [state, setState] = useState<AppState>({ status: 'loading' });

  useEffect(() => {
    const webapp = window.Telegram?.WebApp;

    if (!webapp) {
      setState({ status: 'error', reason: 'no_webapp' });
      return;
    }

    webapp.ready();

    const initData = webapp.initData;
    if (!initData) {
      setState({ status: 'error', reason: 'missing_init_data' });
      return;
    }

    fetchState(initData)
      .then((data) => setState({ status: 'ok', data }))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'rpc_error';
        setState({ status: 'error', reason: toReason(msg) });
      });
  }, []);

  if (state.status === 'loading') return <TelegramLoading />;
  if (state.status === 'error') return <TelegramNoAccess reason={state.reason} />;
  return <TelegramParticipantView data={state.data} />;
};
