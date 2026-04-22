import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

export const TrialTrainingCTA: React.FC = () => {
  const bitrixButtonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = bitrixButtonRef.current;
    if (!container) return;

    container.innerHTML = '';

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-b24-form', 'click/142/4lvzlj');
    script.setAttribute('data-skip-moving', 'true');
    script.text = `(function(w,d,u){
var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/180000|0);
var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
})(window,document,'https://cdn-ru.bitrix24.ru/b23536290/crm/form/loader_142.js');`;

    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, []);

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

          <div ref={bitrixButtonRef} className="flex justify-center" />
        </div>
      </div>
    </section>
  );
};
