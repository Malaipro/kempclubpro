import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Публичный VAPID-ключ — не секрет, хранится в коде.
const VAPID_PUBLIC_KEY = 'BD5SMtGEJ4jKJ19SYYNMrRPINhGochhWBVUXAinL45vNMhwyW5pMsDRqDL8jPHHv6S22Ls_uxKGmN_bN1lEXeVM';

export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

// Не регистрируем worker в превью Lovable и во фреймах.
const isBlockedContext = () => {
  if (typeof window === 'undefined') return true;
  if (window.top !== window.self) return true;
  const h = window.location.hostname;
  return h.startsWith('id-preview--') || h.startsWith('preview--') || h.endsWith('lovableproject.com') || h.endsWith('lovableproject-dev.com');
};

export const isPushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export function usePushSubscription() {
  const isSupported = isPushSupported();
  const [permission, setPermission] = useState<string>(isSupported ? Notification.permission : 'unsupported');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!isSupported || isBlockedContext()) return;
    let active = true;
    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      if (!active) return;
      setRegistration(reg);
      const sub = await reg.pushManager.getSubscription();
      if (active) setIsSubscribed(!!sub);
    }).catch(() => { /* регистрация не критична */ });
    return () => { active = false; };
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return;
    if (isBlockedContext()) throw new Error('Откройте приложение в отдельной вкладке или на kemp-app.ru');
    setLoading(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== 'granted') return;
      const reg = registration ?? await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      });
      const json = sub.toJSON();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Нужно войти в аккаунт');
      await (supabase as any).from('push_subscriptions').delete().eq('endpoint', json.endpoint);
      const { error } = await (supabase as any).from('push_subscriptions').insert({
        user_id: user.id,
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
        device_info: navigator.userAgent.slice(0, 500),
      });
      if (error) throw error;
      setIsSubscribed(true);
    } finally {
      setLoading(false);
    }
  }, [isSupported, registration]);

  const unsubscribe = useCallback(async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const reg = registration ?? await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await (supabase as any).from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  }, [isSupported, registration]);

  return { isSupported, permission, isSubscribed, subscribe, unsubscribe, loading };
}
