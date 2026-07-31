import React, { useEffect, useState } from 'react';
import { AskQuestion } from './contact/AskQuestion';
import { CountdownTimer } from './contact/CountdownTimer';
import { CourseInfo } from './contact/CourseInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { toast } from 'sonner';
import { captureRefFromUrl, getStoredRefCode } from '@/lib/refCapture';
import { captureUtmFromUrl, getStoredUtm, type UtmData } from '@/lib/utmCapture';
import { Loader2, Send, CheckCircle2 } from 'lucide-react';

// Менять дату следующего запуска КЭМП здесь
export const FIXED_TARGET_DATE = new Date('2026-08-10T00:00:00');

const SUBMIT_URL = 'https://wfjvjvbjjxcgkaolkgdq.supabase.co/functions/v1/submit-application';

const formatPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  const d = digits.startsWith('8') ? '7' + digits.slice(1) : digits.startsWith('7') ? digits : '7' + digits;
  const p = d.padEnd(11, '_').slice(0, 11);
  const parts = ['+7'];
  if (p[1] !== '_') parts.push(' (' + p.slice(1, 4).replace(/_/g, ''));
  if (p[4] !== '_') parts.push(') ' + p.slice(4, 7).replace(/_/g, ''));
  if (p[7] !== '_') parts.push('-' + p.slice(7, 9).replace(/_/g, ''));
  if (p[9] !== '_') parts.push('-' + p.slice(9, 11).replace(/_/g, ''));
  return parts.join('');
};

export const ContactForm: React.FC = () => {
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [social, setSocial] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [refCode, setRefCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [utmData, setUtmData] = useState<UtmData | null>(null);

  useEffect(() => {
    captureRefFromUrl();
    captureUtmFromUrl();
    setRefCode(getStoredRefCode());
    setUtmData(getStoredUtm());
  }, []);

  useEffect(() => {
    const fetchActiveStream = async () => {
      try {
        const { data, error } = await supabase
          .from('streams')
          .select('start_date, is_active')
          .order('is_active', { ascending: false })
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle();
        if (data && !error) setStartDate(new Date(data.start_date));
        else setStartDate(new Date('2025-11-10T00:00:00'));
      } catch (e) {
        console.error('Error fetching active stream:', e);
      }
    };
    fetchActiveStream();
    const channel = supabase
      .channel('streams-contactform')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'streams' }, () => fetchActiveStream())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scrollToContactForm = () => {
    document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedName = name.trim();
    const digits = phone.replace(/\D/g, '');
    if (trimmedName.length < 2) {
      toast.error('Введите имя');
      return;
    }
    if (digits.length < 11) {
      toast.error('Введите корректный телефон');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(SUBMIT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: '+' + digits,
          social: social.trim() || undefined,
          message: message.trim() || undefined,
          ref_code: refCode || undefined,
          utm_data: utmData || undefined,
          website, // honeypot
        }),
      });

      if (res.status === 429) {
        toast.error('Слишком много попыток. Попробуйте позже.');
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body?.error === 'name_and_phone_required'
          ? 'Заполните имя и телефон'
          : 'Не удалось отправить заявку. Попробуйте позже.');
        return;
      }
      setSuccess(true);
      setName(''); setPhone(''); setSocial(''); setMessage('');
      toast.success('Заявка принята. Свяжемся в ближайшее время.');
    } catch (err) {
      console.error(err);
      toast.error('Ошибка сети. Проверьте соединение.');
    } finally {
      setSubmitting(false);
    }
  };

  const effectiveDate = FIXED_TARGET_DATE;
  const formattedDate = format(effectiveDate, 'd MMMM yyyy', { locale: ru });

  return (
    <section id="contact" className="kamp-section bg-black text-white py-6 md:py-16">
      <div className="kamp-container">
        <div className="section-heading reveal-on-scroll">
          <span className="inline-block text-kamp-primary font-semibold mb-2">Записаться в клуб</span>
          <h2 className="text-white">Готов проверить себя?</h2>
          <p className="text-gray-300">
            Заполни форму ниже, и мы свяжемся с тобой для уточнения деталей.
            Количество мест ограничено, не упусти свой шанс.
          </p>
        </div>

        <div className="mt-6 md:mt-16 grid grid-cols-1 gap-6 md:gap-12">
          <div className="reveal-on-scroll order-2 md:order-1">
            <div id="contact-form" className={`bg-[#111] rounded-xl shadow-soft ${isMobile ? 'p-4' : 'p-8'} border border-gray-800`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white mb-4 md:mb-6`}>Оставить заявку</h3>

              {success ? (
                <div className="text-center py-10">
                  <CheckCircle2 className="w-14 h-14 text-kamp-accent mx-auto mb-4" />
                  <h4 className="text-xl font-semibold text-white mb-2">Заявка принята</h4>
                  <p className="text-gray-300 mb-6">Свяжемся с тобой в ближайшее время.</p>
                  <button
                    type="button"
                    onClick={() => setSuccess(false)}
                    className="text-kamp-accent hover:text-kamp-primary text-sm underline"
                  >
                    Отправить ещё одну заявку
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Имя *</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={100}
                      required
                      className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kamp-primary focus:border-transparent"
                      placeholder="Как к тебе обращаться"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Телефон *</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      inputMode="tel"
                      required
                      className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kamp-primary focus:border-transparent"
                      placeholder="+7 (___) ___-__-__"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Telegram или другой контакт</label>
                    <input
                      type="text"
                      value={social}
                      onChange={(e) => setSocial(e.target.value)}
                      maxLength={200}
                      className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kamp-primary focus:border-transparent"
                      placeholder="@username, Instagram, VK"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Комментарий</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={3}
                      maxLength={1000}
                      className="w-full px-3 py-2.5 bg-black border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-kamp-primary focus:border-transparent resize-none"
                      placeholder="Расскажи о себе или задай вопрос"
                    />
                  </div>

                  {/* honeypot: visually hidden, но не display:none */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}>
                    <label>
                      Ваш сайт
                      <input
                        type="text"
                        tabIndex={-1}
                        autoComplete="off"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                      />
                    </label>
                  </div>

                  {refCode && (
                    <p className="text-xs text-kamp-accent">Заявка отправлена по приглашению · код: {refCode}</p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-kamp-primary hover:bg-kamp-primary/90 disabled:opacity-60 text-white font-semibold py-3 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Отправка…</>
                    ) : (
                      <><Send className="w-4 h-4" /> Отправить заявку</>
                    )}
                  </button>
                  <p className="text-xs text-gray-500 text-center">
                    Отправляя форму, вы соглашаетесь с обработкой персональных данных.
                  </p>
                </form>
              )}
            </div>

            {!isMobile && <AskQuestion />}
          </div>

          <div className="reveal-on-scroll order-1 md:order-2">
            <div className="bg-gradient-to-r from-kamp-accent to-kamp-primary text-white rounded-xl overflow-hidden shadow-lg h-full flex flex-col">
              <div className={`flex-grow ${isMobile ? 'p-4' : 'p-8'}`}>
                <h3 className={`${isMobile ? 'text-lg mb-3' : 'text-xl mb-6'} font-bold`}>Новый интенсив</h3>
                {isMobile ? (
                  <p className="text-white/80 mb-4 text-sm whitespace-pre-line">
                    Интенсив начинается {formattedDate}! Записывайся сейчас — количество мест ограничено!
                  </p>
                ) : (
                  <p className="text-white/80 mb-8 whitespace-pre-line">
                    Новый интенсив стартует {formattedDate}! Записывайся сейчас — количество мест ограничено, чтобы мы могли уделить внимание каждому участнику.
                  </p>
                )}
                <CountdownTimer targetDate={effectiveDate} />
                {!isMobile && <CourseInfo />}
              </div>
              <div className={`${isMobile ? 'p-4' : 'p-6'} bg-black/20 backdrop-blur-sm border-t border-white/10`}>
                <div className="flex items-center">
                  <div className="flex-grow">
                    <div className={`${isMobile ? 'text-base' : 'text-xl'} font-bold`}>Ограниченный набор</div>
                    <div className="text-white/70 text-xs md:text-sm">Запишись прямо сейчас</div>
                  </div>
                  <button onClick={scrollToContactForm} className={`kamp-button text-kamp-primary bg-white hover:bg-white/90 ${isMobile ? 'text-xs px-3 py-2' : 'px-4 py-2.5'}`}>
                    Записаться
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
