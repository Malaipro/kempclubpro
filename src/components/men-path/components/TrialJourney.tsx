import { useEffect, useState } from 'react';

const KEY = 'put-muzhchiny-cell-trial-v1';
export const samples = [
  {
    title: 'Рождение. Первый шаг', label: 'Клетка 1 · Знакомство',
    short: 'Необязательно знать весь путь, чтобы начать. Выбери одно действие, которое приблизит тебя к тому, ради чего ты пришёл в игру.',
    theory: 'Иногда начало откладывается потому, что задача кажется слишком большой. Хочется сначала разобраться, подготовиться, дождаться подходящего момента.\n\nПодготовка помогает, пока приводит к действию. Но можно долго думать о разговоре, не начиная его, или изучать новое дело, не пробуя сделать первый шаг.\n\nНа этой клетке тебе не нужно менять всю жизнь. Вернись к своему запросу и найди небольшой шаг, который зависит от тебя. Он не обязан сразу дать желаемый результат. Его задача — дать первый реальный опыт: что получилось, что оказалось сложнее и что теперь стало понятнее.\n\nНапример, если твой запрос связан с отношениями, первым шагом может стать предложение договориться о времени для разговора. Если с работой — небольшой законченный фрагмент задачи, которую ты откладывал.',
    question: 'Какой первый шаг я откладываю и чего жду, прежде чем его сделать?',
    task: 'Выбери одно действие по своему запросу, которое займёт 10–20 минут. Запиши, что именно сделаешь, и выполни его. Сформулируй действие так, чтобы можно было понять, состоялось ли оно. Например: «Написать первый абзац предложения клиенту».',
    final: 'Что я сделал? Что произошло на самом деле? Что я понял о своём следующем шаге?',
    reminder: 'Найдётся сегодня 10 минут, чтобы вернуться к выбранному первому шагу?',
  },
  {
    title: 'Очищение. Освободить место', label: 'Клетка 10 · Опора',
    short: 'Что сейчас забирает внимание, нужное для твоей цели? Убери одну помеху и попробуй сделать важное в освободившееся время.',
    theory: 'Внимание расходуется на множество мелочей: сообщения, открытые вкладки, вещи на столе, привычку постоянно проверять телефон. Каждая помеха может казаться незначительной, но вместе они затрудняют начало.\n\nИногда полезно изменить условия, в которых ты действуешь. Подготовить рабочее место, убрать телефон на время разговора, отключить необязательные уведомления на время задачи.\n\nНа этой клетке выбери одну конкретную помеху. Проверь на небольшом опыте, действительно ли без неё становится легче заниматься важным. Если разницы нет, это тоже полезное наблюдение: возможно, препятствие было в другом.\n\nТвоя Опора — условие, которое ты умеешь создавать для себя и можешь повторить завтра.',
    question: 'Что регулярно отвлекает меня, когда я пытаюсь заняться своим запросом?',
    task: 'Выбери одну помеху и убери её на 15 минут. Посвяти эти 15 минут конкретному действию по своему запросу. Посмотри, что изменилось.',
    final: 'Какую помеху я убрал? Что успел сделать? Помогло ли это и что стоит повторить?',
    reminder: 'Удалось попробовать 15 минут без выбранной помехи? Запиши, что изменилось.',
  },
  {
    title: 'Рождение. Новый опыт', label: 'Клетка 1 · Возврат',
    short: 'Ты снова на клетке «Рождение». Посмотри на свой прошлый шаг: что он изменил и какое начало нужно тебе сейчас?',
    theory: 'В прошлый раз ты уже сделал первый шаг. Теперь у тебя есть опыт, которого тогда не было.\n\nВозможно, действие помогло и ты готов продолжить. Возможно, оно оказалось слишком большим или не приблизило к нужному результату. А может быть, изменился сам запрос.\n\nПрочитай свою прошлую запись. Сравни её с тем, что происходило после: появились ли новые действия, изменилось ли решение, сохранилась ли прежняя трудность.\n\nВыбери следующий шаг с учётом этого опыта. Можно продолжить удачное действие, упростить слишком сложное или попробовать другой подход.',
    question: 'После прошлого прохождения что изменилось в моих поступках?',
    task: 'Прочитай прошлый итог. Выбери одно продолжение или изменение предыдущего действия и попробуй его за 10–20 минут. Перед началом допиши фразу: «В этот раз я сделаю …, потому что в прошлый раз заметил …».',
    final: 'Что я попробовал иначе? Чем результат отличается от прошлого раза? Что беру с собой дальше?',
    reminder: 'На этой клетке уже есть твоя прошлая запись. Загляни в неё перед новым шагом — что хочется продолжить или изменить?',
  },
];

type Entry = { observation: string; action: string; outcome: string; done: boolean; startedAt: number | null; completedAt: number | null; dismissed: boolean };
type State = { version: 1; index: number; query: string; delay: number; reminders: boolean; entries: Entry[]; supportAccepted: boolean };
const fresh = (): State => ({ version: 1, index: 0, query: '', delay: 0, reminders: true, supportAccepted: false, entries: samples.map(() => ({ observation: '', action: '', outcome: '', done: false, startedAt: null, completedAt: null, dismissed: false })) });
function read(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const s = JSON.parse(raw) as State;
    if (s.version !== 1 || !Number.isInteger(s.index) || s.index < 0 || s.index > 2 || ![0, 300000].includes(s.delay) || typeof s.query !== 'string' || typeof s.reminders !== 'boolean' || typeof s.supportAccepted !== 'boolean' || !Array.isArray(s.entries) || s.entries.length !== 3) return fresh();
    if (!s.entries.every(e => e && typeof e.observation === 'string' && typeof e.action === 'string' && typeof e.outcome === 'string' && typeof e.done === 'boolean' && typeof e.dismissed === 'boolean' && (e.startedAt === null || Number.isFinite(e.startedAt)) && (e.completedAt === null || Number.isFinite(e.completedAt)))) return fresh();
    return s;
  } catch { return fresh(); }
}

export function TrialJourney() {
  const [state, setState] = useState<State>(read);
  const [clock, setClock] = useState(Date.now());
  const [error, setError] = useState('');
  useEffect(() => { const id = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(id); }, []);
  const commit = (next: State) => {
    try { localStorage.setItem(KEY, JSON.stringify(next)); setState(next); setError(''); }
    catch { setError('Не удалось сохранить запись в этом браузере. Не закрывай страницу и попробуй ещё раз.'); }
  };
  const update = (values: Partial<Entry>) => commit({ ...state, entries: state.entries.map((e, i) => i === state.index ? { ...e, ...values } : e) });
  const entry = state.entries[state.index];
  const sample = samples[state.index];
  const remaining = entry.startedAt === null ? 0 : Math.max(0, entry.startedAt + state.delay - clock);
  const completed = entry.completedAt !== null;
  const reminder = state.reminders && entry.startedAt !== null && !completed && !entry.dismissed && clock - entry.startedAt >= 30000;
  const advance = (index: number) => { commit({ ...state, index }); window.scrollTo(0, 0); };
  const complete = () => {
    if (!entry.startedAt || !entry.done || !entry.outcome.trim() || Date.now() < entry.startedAt + state.delay) return;
    update({ completedAt: Date.now() });
  };

  return <main className="min-h-dvh bg-ink text-bone px-5 py-8 mx-auto max-w-lg space-y-6">
    <header><p className="gameplay-eyebrow">Путь Мужчины · Пробное прохождение</p><h1 className="gameplay-title mt-2">Три шага для знакомства</h1><p className="text-sm text-muted mt-3">Записи сохраняются в этом браузере. Здесь проверяем выбранные ситуации без случайного броска.</p></header>
    <details className="border border-bronze/40 rounded p-3"><summary>Настройки пробы</summary>
      <label className="block mt-3">Ожидание после начала задания<select aria-label="Ожидание" className="block w-full bg-ink border p-2 mt-2" value={state.delay} disabled={state.entries.some(e => e.startedAt !== null)} onChange={e => commit({ ...state, delay: Number(e.target.value) })}><option value={0}>Без ожидания</option><option value={300000}>5 минут — проверить таймер</option></select></label>
      <label className="flex gap-2 mt-4"><input type="checkbox" checked={state.reminders} onChange={e => commit({ ...state, reminders: e.target.checked })} />Напоминать в открытом приложении</label><p className="text-xs text-muted mt-2">Пробное напоминание появится через 30 секунд после начала задания. Сообщения в Telegram пока не отправляются.</p>
    </details>
    <label className="block">С каким запросом ты проходишь игру?<textarea aria-label="Мой запрос" className="block w-full bg-ink border rounded p-3 mt-2" rows={2} value={state.query} onChange={e => commit({ ...state, query: e.target.value })} /></label>
    <section className="space-y-5"><p className="gameplay-eyebrow">Пример {state.index + 1} из 3 · {sample.label}</p><h2 className="gameplay-title">{sample.title}</h2><p>{sample.short}</p>
      <details><summary className="text-amber-200 cursor-pointer">Прочитать объяснение</summary><p className="whitespace-pre-line leading-relaxed mt-3">{sample.theory}</p></details>
      {state.index === 2 && <aside className="border border-amber-700 rounded p-4 space-y-2"><h3>Твоя прошлая запись на клетке «Рождение»</h3><p className="whitespace-pre-wrap">Действие: {state.entries[0].action}</p><p className="whitespace-pre-wrap">Итог: {state.entries[0].outcome}</p></aside>}
      <label className="block">{sample.question}<textarea aria-label="Первое наблюдение" readOnly={entry.startedAt !== null} rows={3} className="block w-full bg-ink border rounded p-3 mt-2" value={entry.observation} onChange={e => update({ observation: e.target.value })} /></label>
      <div><h3 className="text-amber-200 mb-2">Твоё задание</h3><p className="leading-relaxed">{sample.task}</p></div>
      <label className="block">Какое действие ты выбираешь?<textarea aria-label="Моё действие" readOnly={entry.startedAt !== null} rows={3} className="block w-full bg-ink border rounded p-3 mt-2" value={entry.action} onChange={e => update({ action: e.target.value })} /></label>
      {entry.startedAt === null ? <button className="gameplay-primary-button disabled:opacity-40" disabled={!state.query.trim() || !entry.observation.trim() || !entry.action.trim()} onClick={() => update({ startedAt: Date.now() })}>Сохранить и начать задание</button> : <>
        {reminder && <aside role="status" className="border border-amber-500 p-3 rounded"><p>{entry.done ? 'Задание выполнено. Сохрани итог, когда будешь готов.' : sample.reminder}</p><button className="underline mt-2" onClick={() => update({ dismissed: true })}>Понятно</button></aside>}
        {!completed && <p role="status">{remaining > 0 ? `До продолжения: ${Math.ceil(remaining / 1000)} сек. Итог можно записать сейчас.` : 'Ожидание закончено. После задания и сохранения итога можно продолжить.'}</p>}
        <label className="flex gap-3"><input type="checkbox" checked={entry.done} disabled={completed} onChange={e => update({ done: e.target.checked })} />Я выполнил выбранное действие</label>
        <label className="block">{sample.final}<textarea aria-label="Итог" readOnly={completed} rows={4} className="block w-full bg-ink border rounded p-3 mt-2" value={entry.outcome} onChange={e => update({ outcome: e.target.value })} /></label>
        {!completed && <button className="gameplay-primary-button disabled:opacity-40" disabled={!entry.done || !entry.outcome.trim() || remaining > 0} onClick={complete}>Сохранить итог и завершить клетку</button>}
      </>}
      {completed && <div className="space-y-4" role="status"><p className="text-amber-200">Итог сохранён. Клетка завершена.</p>
        {state.index === 0 && <><p>Следующий бросок был бы доступен. В этой пробе переходим к выбранной клетке с Опорой.</p><button className="gameplay-primary-button" onClick={() => advance(1)}>Попробовать Опору</button></>}
        {state.index === 1 && <><p>Ты проверил, какие условия помогают тебе действовать. Сохрани этот опыт — он может пригодиться дальше.</p><p>В текущей карте Опора ведёт с клетки 10 на 23. Убрав помеху, ты освобождаешь внимание для следующего шага. Полное содержание клетки 23 рассмотрим отдельно.</p>{!state.supportAccepted ? <button className="gameplay-primary-button" onClick={() => commit({ ...state, supportAccepted: true })}>Подтвердить переход 10 → 23</button> : <><p>Переход подтверждён. Для следующего примера вернёмся к клетке «Рождение».</p><button className="gameplay-primary-button" onClick={() => advance(2)}>Попробовать Возврат</button></>}</>}
        {state.index === 2 && <><h3 className="gameplay-title">Проба завершена</h3><p>Ты прошёл обычную клетку, Опору и Возврат. Все три итога сохранены ниже.</p></>}
      </div>}
    </section>
    {error && <p role="alert" className="text-red-300">{error}</p>}
    <details className="border-t pt-4"><summary>Мои сохранённые итоги</summary>{state.entries.map((e, i) => e.completedAt !== null && <article key={i} className="mt-4"><h3 className="text-amber-200">{samples[i].label}</h3><p className="whitespace-pre-wrap mt-2">{e.action}</p><p className="whitespace-pre-wrap mt-2">{e.outcome}</p></article>)}</details>
  </main>;
}
