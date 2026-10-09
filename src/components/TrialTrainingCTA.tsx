import React, { useState } from 'react';
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { getStoredUtm } from '@/lib/utmCapture';

const SUBMIT_URL = 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/submit-application';

export const TrialTrainingCTA: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [hp, setHp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const n = name.trim();
    const digits = phone.replace(/\D/g, '');
    if (n.length < 2) return toast.error('Введите имя');
    if (digits.length < 10) return toast.error('Введите корректный телефон');
    const normalized = '+' + (digits.length === 10 ? '7' + digits : digits.replace(/^8/, '7'));

    setSubmitting(true);
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'trial',
          name: n,
          phone: normalized,
          utm_data: getStoredUtm() || undefined,
          hp_field: hp,
        }),
      });
      if (res.status === 429) {
        toast.error('Слишком много попыток. Напишите нам: t.me/Dmitriy116');
        return;
      }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !(body?.id || body?.skipped)) {
        toast.error('Заявка не сохранилась. Напишите нам: t.me/Dmitriy116');
        return;
      }
      setSuccess(true);
      setName(''); setPhone('');
      toast.success('Вы записаны! Свяжемся для подтверждения.');
      try {
        (window as unknown as { ym?: (id: number, a: string, g: string) => void })
          .ym?.(105195673, 'reachGoal', 'kemp_trial_success');
      } catch { /* noop */ }
    } catch {
      toast.error('Ошибка сети. Напишите нам: t.me/Dmitriy116');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 rounded-md bg-background/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-kamp-accent';

  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-kamp-primary via-kamp-primary to-black relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#ffffff_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-kamp-accent/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-kamp-accent/10 rounded-full blur-3xl" />

      <div className="kamp-container relative z-10">
        <div className="max-w-3xl mx-auto text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-kamp-accent/20 backdrop-blur-sm border border-kamp-accent/30 mb-4">
            <Sparkles size={14} className="text-kamp-accent" />
            <span className="text-xs md:text-sm font-semibold uppercase tracking-wider text-kamp-accent">
              Бесплатно
            </span>
          </div>

          <h2 className="text-2xl md:text-4xl lg:text-5xl font-display font-bold mb-4 leading-tight">
            Попробуй КЭМП на одной тренировке
          </h2>

          <p className="text-base md:text-lg text-white/80 mb-8 max-w-2xl mx-auto">
            Приходи на пробную тренировку и почувствуй атмосферу клуба. Никаких обязательств — только реальный опыт и знакомство с командой.
          </p>

          {success ? (
            <div className="flex flex-col items-center gap-3">
              <CheckCircle2 className="w-12 h-12 text-kamp-accent" />
              <p className="text-lg font-semibold">Заявка принята — свяжемся для подтверждения.</p>
            </div>
          ) : !open ? (
            <Button
              size="lg"
              onClick={() => setOpen(true)}
              className="bg-background text-foreground hover:bg-background/90 font-bold text-base md:text-lg px-8 py-6 shadow-xl transition-all duration-300"
            >
              Записаться на пробную тренировку
            </Button>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="max-w-md mx-auto space-y-3 text-left">
              <input className={inputCls} placeholder="Имя" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} />
              <input className={inputCls} placeholder="+7 (___) ___-__-__" type="tel" inputMode="tel" value={phone} maxLength={20} onChange={(e) => setPhone(e.target.value)} />
              <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
                <input tabIndex={-1} autoComplete="off" value={hp} onChange={(e) => setHp(e.target.value)} />
              </div>
              <Button type="submit" size="lg" disabled={submitting} className="w-full bg-background text-foreground hover:bg-background/90 font-bold py-6">
                {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Отправка…</> : 'Записаться на пробную тренировку'}
              </Button>
              <p className="text-xs text-white/60 text-center">Отправляя форму, вы соглашаетесь с обработкой персональных данных.</p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
};
