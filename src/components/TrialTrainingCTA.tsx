import React, { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const TrialTrainingCTA: React.FC = () => {
  const bitrixScriptAnchorRef = useRef<HTMLDivElement>(null);
  const triggerButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const anchor = bitrixScriptAnchorRef.current;
    const button = triggerButtonRef.current;
    if (!anchor || !button) return;

    const existingScript = anchor.querySelector('script[data-b24-form="click/142/4lvzlj"]');
    if (existingScript) return;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.setAttribute('data-b24-form', 'click/142/4lvzlj');
    script.setAttribute('data-skip-moving', 'true');
    script.text = `(function(w,d,u){
var s=d.createElement('script');s.async=true;s.src=u+'?'+(Date.now()/180000|0);
var h=d.getElementsByTagName('script')[0];h.parentNode.insertBefore(s,h);
})(window,document,'https://cdn-ru.bitrix24.ru/b23536290/crm/form/loader_142.js');`;

    anchor.appendChild(script);

    return () => {
      const currentScript = anchor.querySelector('script[data-b24-form="click/142/4lvzlj"]');
      currentScript?.remove();
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

          <div className="flex flex-col items-center gap-4">
            <div ref={bitrixScriptAnchorRef} aria-hidden="true" />
            <Button
              ref={triggerButtonRef}
              size="lg"
              className="bg-background text-foreground hover:bg-background/90 font-bold text-base md:text-lg px-8 py-6 shadow-xl transition-all duration-300"
            >
              Записаться на пробную тренировку
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
