import { useState } from 'react';

import { getPublicUrl } from '../lib/assets';
import { RulesScreen } from './RulesScreen';

interface OnboardingProps {
  onStart: (query: string) => void;
}

export function Onboarding({ onStart }: OnboardingProps) {
  const [query, setQuery] = useState('');
  const [step, setStep] = useState(0);

  const queryStep = {
    subtitle: 'С каким вопросом ты входишь в Путь?',
    text: 'Один вопрос или жизненная тема. Запрос сохраняется неизменным в течение прохождения.',
  };

  if (step === 0) {
    return (
      <section
        className="onboarding-hero relative min-h-dvh overflow-hidden bg-ink"
        style={{
          backgroundImage: `url(${getPublicUrl('/textures/base_graphite_topography_400.png')})`,
          backgroundPosition: 'center',
          backgroundRepeat: 'repeat',
          backgroundSize: '400px 400px',
        }}
      >
        <div aria-hidden="true" className="onboarding-hero__light pointer-events-none absolute inset-0" />

        <main className="relative z-10 mx-auto grid min-h-dvh w-full max-w-[390px] grid-rows-[auto_1fr_auto] justify-items-center px-5 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(env(safe-area-inset-top)+72px)] text-center">
          <h1 className="onboarding-hero__title font-heading text-[38px] font-medium leading-none tracking-[0.015em] text-bone">
            Путь Мужчины
          </h1>

          <div className="onboarding-cube relative flex w-full items-center justify-center self-center">
            <div aria-hidden="true" className="onboarding-cube__glow absolute" />
            <img
              src={getPublicUrl('/runtime/cube_B_v001/cube_B_idle.webp')}
              alt="Бронзовый игровой кубик Путь Мужчины"
              className="onboarding-cube__image relative z-10 h-auto w-[380px] max-w-none select-none"
              draggable={false}
            />
          </div>

          <button
            onClick={() => setStep(1)}
            className="onboarding-cta relative min-h-[64px] w-full max-w-[330px] overflow-hidden px-8 font-heading text-[23px] font-semibold tracking-[0.015em] text-bone transition duration-150 active:translate-y-[2px] active:scale-[0.985]"
          >
            <span aria-hidden="true" className="onboarding-cta__inner absolute inset-[4px]" />
            <span className="relative z-10">Начать Путь</span>
          </button>
        </main>
      </section>
    );
  }

  if (step === 1) {
    return (
      <RulesScreen
        onBack={() => setStep(0)}
        onContinue={() => setStep(2)}
        continueLabel="Сформулировать запрос"
      />
    );
  }

  return (
    <section className="gameplay-screen flex min-h-dvh flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <header className="flex items-center justify-between">
        <button onClick={() => setStep(1)} className="gameplay-back">← Назад</button>
        <span className="gameplay-eyebrow">ПЕРЕД НАЧАЛОМ</span>
      </header>

      <div className="mt-7">
        <p className="gameplay-eyebrow">ИСХОДНАЯ ТОЧКА</p>
        <h1 className="gameplay-title mt-2">Твой запрос</h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">{queryStep.subtitle}</p>
      </div>

      <label className="mt-7 block">
        <span className="mb-3 block text-xs font-bold tracking-[0.1em] text-bronze">ВОПРОС ИЛИ ЖИЗНЕННАЯ ТЕМА</span>
        <textarea
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Например: почему я не довожу начатое до конца?"
          className="reflection-textarea min-h-[210px]"
          autoFocus
        />
      </label>

      <article className="gameplay-card mt-4">
        <span className="gameplay-card__label">ВАЖНО</span>
        <p className="mt-2 text-sm leading-[1.55] text-bone/78">
          {queryStep.text} Все клетки и ответы будут рассматриваться через эту исходную точку.
        </p>
      </article>

      <div className="mt-auto pt-8">
        <button
          onClick={() => query.trim() && onStart(query.trim())}
          disabled={!query.trim()}
          className="gameplay-primary-button disabled:cursor-not-allowed disabled:opacity-35"
        >
          Войти в Путь
        </button>
        <p className="mt-3 text-center text-xs leading-relaxed text-muted">
          После подтверждения изменить запрос в текущем прохождении будет нельзя.
        </p>
      </div>
    </section>
  );
}
