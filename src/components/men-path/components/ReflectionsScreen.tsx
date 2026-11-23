import { getCellById } from '../lib/cells';
import { getReflections, getVisits } from '../lib/game';

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function ReflectionsScreen() {
  const reflections = getReflections().slice().sort((a, b) => (
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ));
  const visitsById = new Map(getVisits().map((visit) => [visit.visitId, visit]));

  return (
    <section className="gameplay-screen min-h-[calc(100dvh-72px)] px-5 pb-8 pt-[calc(env(safe-area-inset-top)+28px)]">
      <p className="gameplay-eyebrow">ЛИЧНЫЕ ЗАПИСИ</p>
      <h1 className="gameplay-title mt-2">Размышления</h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        Первичные и итоговые ответы сохраняются отдельно и остаются неизменными после отправки.
      </p>

      {reflections.length === 0 ? (
        <div className="gameplay-card mt-7 text-center">
          <p className="font-heading text-lg text-bone">Записей пока нет</p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Первая запись появится после принятия действия на клетке.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {reflections.map((reflection) => {
            const cell = getCellById(reflection.cellId);
            const visit = visitsById.get(reflection.visitId);
            return (
              <article key={reflection.reflectionId} className="gameplay-card">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="gameplay-card__label">
                      {reflection.phase === 'initial' ? 'ПЕРВИЧНЫЙ ОТВЕТ' : 'ИТОГОВЫЙ ОТВЕТ'}
                    </span>
                    <h2 className="mt-1 font-heading text-[17px] text-bone">
                      {reflection.cellId}. {cell?.kempName ?? 'Клетка'}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded bg-bronze/10 px-2 py-1 text-[10px] text-bronze">
                    {visit?.visitMode === 'return' ? 'Возврат' : visit?.visitMode === 'node' ? 'Узел' : 'Знакомство'}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line text-[15px] leading-[1.55] text-bone/90">
                  {reflection.answerText}
                </p>
                <div className="mt-3 flex items-center justify-between border-t border-copper/10 pt-3 text-[11px] text-muted">
                  <span>{formatDate(reflection.createdAt)}</span>
                  <span>Сохранено · без редактирования</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-card border border-copper/15 bg-graphite/35 p-4">
        <span className="gameplay-card__label">СЛЕДУЮЩИЙ ЭТАП</span>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          ИИ-сводка будет добавлена отдельно после утверждения правил согласия, приватности и момента запуска анализа.
        </p>
      </div>
    </section>
  );
}
