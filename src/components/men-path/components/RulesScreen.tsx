interface RulesScreenProps {
  onBack: () => void;
  onContinue?: () => void;
  continueLabel?: string;
}

const rules = [
  'Сформулируй один вопрос или жизненную тему, с которой входишь в игру.',
  'Чтобы войти в Путь, бросай кубик. Путь начнётся, только когда выпадет 6.',
  'Если выпало другое число, бросай снова. После каждой попытки шанс шестёрки растёт, а четвёртая попытка откроет Путь наверняка.',
  'Двигайся по выпавшему числу, открывай клетки и выполняй предложенные действия.',
  'Записывай ответы и наблюдения, сохраняя внимание к первоначальному запросу.',
];

export function RulesScreen({ onBack, onContinue, continueLabel = 'Понятно' }: RulesScreenProps) {
  return (
    <section className="gameplay-screen flex min-h-dvh flex-col px-5 pb-[calc(env(safe-area-inset-bottom)+28px)] pt-[calc(env(safe-area-inset-top)+24px)]">
      <header className="flex items-center justify-between">
        <button onClick={onBack} className="gameplay-back">← Назад</button>
        <span className="gameplay-eyebrow">КАК ИГРАТЬ</span>
      </header>

      <div className="mt-7">
        <p className="gameplay-eyebrow">ПЕРЕД НАЧАЛОМ</p>
        <h1 className="gameplay-title mt-2">Правила Пути</h1>
        <p className="mt-3 text-[15px] leading-[1.55] text-muted">
          72 клетки и один исходный запрос. Кубик определяет маршрут, а смысл создают твои решения и действия.
        </p>
      </div>

      <ol className="mt-6 space-y-3">
        {rules.map((rule, index) => (
          <li key={rule} className={`rules-item ${index === 1 ? 'rules-item--entry' : ''}`}>
            <span className="rules-item__number">{index + 1}</span>
            <p>{rule}</p>
          </li>
        ))}
      </ol>

      <p className="rules-closing mt-6">Здесь нет правильных ответов. Путь складывается из твоих решений.</p>

      {onContinue && (
        <div className="mt-auto pt-8">
          <button onClick={onContinue} className="gameplay-primary-button">
            {continueLabel}
          </button>
        </div>
      )}
    </section>
  );
}
