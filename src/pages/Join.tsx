import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useSearchParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';

const schema = z.object({
  name: z.string().trim().min(2, 'Минимум 2 символа').max(100, 'Максимум 100 символов'),
  phone: z.string().trim().min(5, 'Введите телефон').max(30, 'Слишком длинный'),
  telegram: z.string().trim().max(100).optional().or(z.literal('')),
  comment: z.string().trim().max(1000).optional().or(z.literal('')),
});

const Join: React.FC = () => {
  const [params] = useSearchParams();
  const { toast } = useToast();
  const ref = params.get('ref')?.trim().toUpperCase() || '';

  const [validating, setValidating] = useState(true);
  const [refValid, setRefValid] = useState(false);
  const [referrerId, setReferrerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({ name: '', phone: '', telegram: '', comment: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // SEO
  useEffect(() => {
    document.title = 'Заявка в КЭМП — присоединяйся к клубу';
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute('content', 'Оставьте заявку на участие в клубе КЭМП по приглашению резидента');
  }, []);

  // Validate ref code
  useEffect(() => {
    const validate = async () => {
      if (!ref) {
        setRefValid(false);
        setValidating(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('user_id')
          .eq('referral_code', ref)
          .maybeSingle();
        if (data?.user_id) {
          setRefValid(true);
          setReferrerId(data.user_id);
        } else {
          setRefValid(false);
        }
      } catch (e) {
        setRefValid(false);
      } finally {
        setValidating(false);
      }
    };
    validate();
  }, [ref]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      (parsed.error as any).issues?.forEach((err: any) => {
        if (err.path?.[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!referrerId || !ref) {
      toast({ title: 'Реферальный код недействителен', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from('referral_leads').insert({
        referrer_user_id: referrerId,
        referral_code: ref,
        name: parsed.data.name,
        phone: parsed.data.phone,
        telegram: parsed.data.telegram || null,
        comment: parsed.data.comment || null,
        status: 'new',
        bonus_awarded: false,
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'Не удалось отправить заявку',
        description: err.message || 'Попробуйте ещё раз',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-4xl font-bold text-white">
              КЭМП<span className="text-[#e60000]">.</span>
            </h1>
          </Link>
        </div>

        {validating ? (
          <Card className="bg-kamp-secondary border-kamp-gray">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-8 h-8 mx-auto text-[#e60000] animate-spin" />
              <p className="text-muted-foreground mt-3">Проверяем приглашение…</p>
            </CardContent>
          </Card>
        ) : !refValid ? (
          <Card className="bg-kamp-secondary border-red-500/30">
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
              <h2 className="text-xl font-bold text-white mb-2">Приглашение недействительно</h2>
              <p className="text-muted-foreground text-sm mb-6">
                Эта страница доступна только по персональной ссылке от резидента клуба КЭМП.
              </p>
              <Link to="/">
                <Button variant="outline" className="border-kamp-gray text-white hover:bg-kamp-gray">
                  На главную
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : submitted ? (
          <Card className="bg-kamp-secondary border-green-500/30">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-400 mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">Заявка отправлена</h2>
              <p className="text-muted-foreground mb-6">
                Мы свяжемся с тобой в ближайшее время. Спасибо за интерес к КЭМП!
              </p>
              <Link to="/">
                <Button className="bg-[#e60000] hover:bg-[#ff3030] text-white">
                  На главную
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-kamp-secondary border-kamp-gray">
            <CardContent className="py-8 px-6">
              <h2 className="text-2xl font-bold text-white mb-2">Заявка в клуб</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Тебя пригласили в КЭМП. Заполни форму — мы свяжемся с тобой.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name" className="text-white">Имя *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    className="bg-black/40 border-kamp-gray text-white mt-1"
                    placeholder="Как тебя зовут"
                    disabled={submitting}
                  />
                  {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Телефон *</Label>
                  <Input
                    id="phone"
                    value={form.phone}
                    onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="bg-black/40 border-kamp-gray text-white mt-1"
                    placeholder="+7 ___ ___ __ __"
                    disabled={submitting}
                  />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </div>

                <div>
                  <Label htmlFor="telegram" className="text-white">Telegram</Label>
                  <Input
                    id="telegram"
                    value={form.telegram}
                    onChange={e => setForm({ ...form, telegram: e.target.value })}
                    className="bg-black/40 border-kamp-gray text-white mt-1"
                    placeholder="@username"
                    disabled={submitting}
                  />
                </div>

                <div>
                  <Label htmlFor="comment" className="text-white">Комментарий</Label>
                  <Textarea
                    id="comment"
                    value={form.comment}
                    onChange={e => setForm({ ...form, comment: e.target.value })}
                    className="bg-black/40 border-kamp-gray text-white mt-1"
                    placeholder="Расскажи, что тебя интересует"
                    rows={3}
                    disabled={submitting}
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#e60000] hover:bg-[#ff3030] text-white font-semibold py-6 text-base"
                >
                  {submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Отправляем…</>
                  ) : (
                    'Отправить заявку'
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  Приглашение от резидента: <span className="font-mono text-[#e60000]">{ref}</span>
                </p>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Join;
