import React, { useState } from 'react';
import { Dumbbell, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export const TrialTrainingCTA: React.FC = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast({
        title: 'Заполните обязательные поля',
        description: 'Имя и телефон обязательны.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('contact_submissions').insert({
        name: name.trim(),
        phone: phone.trim(),
        course: 'Пробная тренировка',
        message: message.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Заявка отправлена!',
        description: 'Мы свяжемся с вами в ближайшее время.',
      });
      setName('');
      setPhone('');
      setMessage('');
      setOpen(false);
    } catch (err) {
      console.error('Trial training submission error:', err);
      toast({
        title: 'Ошибка отправки',
        description: 'Попробуйте ещё раз или напишите нам в Telegram.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-12 md:py-20 bg-gradient-to-br from-kamp-primary via-kamp-primary to-black relative overflow-hidden">
      {/* Decorative background */}
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

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                size="lg"
                className="bg-kamp-accent hover:bg-kamp-accent/90 text-black font-bold text-base md:text-lg px-8 py-6 rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
              >
                <Dumbbell className="w-5 h-5 mr-2" />
                Записаться на пробную тренировку
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-xl">Запись на пробную тренировку</DialogTitle>
                <DialogDescription>
                  Оставьте контакты — мы свяжемся с вами и подберём удобное время.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label htmlFor="trial-name">Имя *</Label>
                  <Input
                    id="trial-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ваше имя"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial-phone">Телефон *</Label>
                  <Input
                    id="trial-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+7 (___) ___-__-__"
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="trial-message">Комментарий (необязательно)</Label>
                  <Input
                    id="trial-message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Удобное время или вопрос"
                    disabled={loading}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-kamp-primary hover:bg-kamp-primary/90 text-white font-semibold"
                  disabled={loading}
                >
                  {loading ? 'Отправка...' : 'Отправить заявку'}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Нажимая кнопку, вы соглашаетесь на обработку персональных данных
                </p>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </section>
  );
};
