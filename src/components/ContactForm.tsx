import React, { useEffect, useState } from 'react';
import { AskQuestion } from './contact/AskQuestion';
import { CountdownTimer } from './contact/CountdownTimer';
import { CourseInfo } from './contact/CourseInfo';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

// Менять дату следующего запуска КЭМП здесь
export const FIXED_TARGET_DATE = new Date('2026-03-09T00:00:00');

// Declare Bitrix form interface for TypeScript
declare global {
  interface Window {
    B24Form?: {
      init: (config: {
        id: number;
        type: string;
        container: string;
      }) => void;
    };
  }
}
export const ContactForm: React.FC = () => {
  const isMobile = useIsMobile();
  const [startDate, setStartDate] = useState<Date | null>(null);
  useEffect(() => {
    const loadBitrixForm = () => {
      // Проверяем, что форма еще не загружена
      if (document.querySelector(`[data-b24-form="inline/134/km4hms"]`)) {
        return;
      }
      try {
        // Создаем скрипт точно как предоставил пользователь
        const script = document.createElement('script');
        script.setAttribute('data-b24-form', 'inline/134/km4hms');
        script.setAttribute('data-skip-moving', 'true');
        script.innerHTML = `
          (function(w,d,u){
            var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/180000|0);
            var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
          })(window,document,'https://cdn-ru.bitrix24.ru/b23536290/crm/form/loader_134.js');
        `;

        // Обработка ошибок загрузки
        script.onerror = () => {
          console.error('Failed to load Bitrix24 form script');
          showFallbackForm();
        };
        script.onload = () => {
          console.log('Bitrix24 form loaded successfully');
        };
        const container = document.getElementById('bitrix-form-container');
        if (container) {
          container.innerHTML = '';
          container.appendChild(script);
        }
      } catch (error) {
        console.error('Error creating Bitrix24 form script:', error);
        showFallbackForm();
      }
    };
    const showFallbackForm = () => {
      const container = document.getElementById('bitrix-form-container');
      if (container) {
        container.innerHTML = `
          <div class="bg-gray-900 rounded-lg p-6 border border-gray-700">
            <h4 class="text-white text-lg font-semibold mb-4">Заявка на участие в КЭМП</h4>
            <form id="fallback-contact-form" class="space-y-4">
              <div>
                <label class="block text-gray-300 text-sm font-medium mb-2">Имя *</label>
                <input type="text" name="name" required class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Ваше имя">
              </div>
              <div>
                <label class="block text-gray-300 text-sm font-medium mb-2">Телефон *</label>
                <input type="tel" name="phone" required class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="+7 (999) 123-45-67">
              </div>
              <div>
                <label class="block text-gray-300 text-sm font-medium mb-2">Интенсив *</label>
                <select name="course" required class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-red-500">
                  <option value="">Выберите интенсив</option>
                  <option value="intensive-1">1-й интенсив КЭМП</option>
                  <option value="intensive-2">2-й интенсив КЭМП</option>
                  <option value="intensive-3">3-й интенсив КЭМП</option>
                </select>
              </div>
              <div>
                <label class="block text-gray-300 text-sm font-medium mb-2">Социальные сети</label>
                <input type="text" name="social" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Instagram, VK или другое">
              </div>
              <div>
                <label class="block text-gray-300 text-sm font-medium mb-2">Сообщение</label>
                <textarea name="message" rows="3" class="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500" placeholder="Расскажите о себе и ваших целях"></textarea>
              </div>
              <button type="submit" class="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-md transition-colors">
                Отправить заявку
              </button>
            </form>
            <div class="mt-6 pt-4 border-t border-gray-600">
              <p class="text-gray-400 text-sm mb-2">Или свяжитесь с нами напрямую:</p>
              <div class="space-y-1">
                <p class="text-gray-300 text-sm">WhatsApp: <a href="https://wa.me/79673785151" class="text-red-400 hover:underline">+7 967 378 51 51</a></p>
                <p class="text-gray-300 text-sm">Telegram: <a href="https://t.me/Dmitriy116" class="text-red-400 hover:underline">@Dmitriy116</a></p>
              </div>
            </div>
          </div>
        `;

        // Добавляем обработчик формы
        const fallbackForm = document.getElementById('fallback-contact-form');
        if (fallbackForm) {
          fallbackForm.addEventListener('submit', handleFallbackFormSubmit);
        }
      }
    };
    const handleFallbackFormSubmit = async (e: Event) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      try {
        // Здесь можно добавить отправку на сервер или в Supabase
        const response = await fetch('/api/contact', {
          method: 'POST',
          body: formData
        });
        if (response.ok) {
          const container = document.getElementById('bitrix-form-container');
          if (container) {
            container.innerHTML = `
              <div class="text-center text-green-400 p-8">
                <div class="text-4xl mb-4">✓</div>
                <h4 class="text-xl font-semibold mb-2">Заявка отправлена!</h4>
                <p class="text-gray-300">Мы свяжемся с вами в ближайшее время</p>
              </div>
            `;
          }
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('Произошла ошибка при отправке. Попробуйте связаться с нами напрямую.');
      }
    };

    // Задержка для предотвращения спам-загрузок
    const timeoutId = setTimeout(loadBitrixForm, 100);

    // Очистка при размонтировании компонента
    return () => {
      clearTimeout(timeoutId);
      const scripts = document.querySelectorAll(`[data-b24-form="inline/134/km4hms"]`);
      scripts.forEach(script => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      });

      // Очистка глобальных переменных Bitrix24
      if (window.B24Form) {
        try {
          delete window.B24Form;
        } catch (e) {
          // Игнорируем ошибки при очистке
        }
      }
    };
  }, []);

  // Fetch active stream date and subscribe to realtime updates
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

        if (data && !error) {
          setStartDate(new Date(data.start_date));
        } else {
          // Fallback date: 10 November 2025
          setStartDate(new Date('2025-11-10T00:00:00'));
        }
      } catch (e) {
        console.error('Error fetching active stream for ContactForm:', e);
      }
    };

    fetchActiveStream();

    const channel = supabase
      .channel('streams-contactform')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'streams' },
        () => fetchActiveStream()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const scrollToContactForm = () => {
    const contactFormElement = document.getElementById('contact-form');
    if (contactFormElement) {
      contactFormElement.scrollIntoView({
        behavior: 'smooth'
      });
    }
  };
const effectiveDate = (startDate && startDate.getTime() > Date.now()) ? startDate : FIXED_TARGET_DATE;
const formattedDate = format(effectiveDate, 'd MMMM yyyy', { locale: ru });
  return <section id="contact" className="kamp-section bg-black text-white py-6 md:py-16">
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
          {/* Contact Form */}
          <div className="reveal-on-scroll order-2 md:order-1">
            <div id="contact-form" className={`bg-[#111] rounded-xl shadow-soft ${isMobile ? 'p-4' : 'p-8'} border border-gray-800`}>
              <h3 className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-white mb-4 md:mb-6`}>Оставить заявку</h3>
              
              {/* Безопасный контейнер для Битрикс формы */}
              <div id="bitrix-form-container" className="bitrix-form-container min-h-[600px] flex items-center justify-center">
                <div className="text-gray-400 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-kamp-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                  <p className="text-sm">Загрузка формы...</p>
                </div>
              </div>
            </div>
            
            {/* Ask a Question Button */}
            {!isMobile && <AskQuestion />}
          </div>

          {/* Timer and Info */}
          <div className="reveal-on-scroll order-1 md:order-2">
            <div className="bg-gradient-to-r from-kamp-accent to-kamp-primary text-white rounded-xl overflow-hidden shadow-lg h-full flex flex-col">
              <div className={`flex-grow ${isMobile ? 'p-4' : 'p-8'}`}>
                <h3 className={`${isMobile ? 'text-lg mb-3' : 'text-xl mb-6'} font-bold`}>Новый интенсив</h3>
                {isMobile ? (
                  <p className="text-white/80 mb-4 text-sm">
                    Интенсив начинается {formattedDate}! Записывайся сейчас — количество мест ограничено!
                  </p>
                ) : (
                  <p className="text-white/80 mb-8">
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
    </section>;
};