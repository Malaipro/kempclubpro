# club-recurring-persistence — локальная проверка 2026-11-17

## Статус и границы

Реализация подготовлена в ветке `codex/club-recurring-persistence`, созданной от актуального
`origin/amvera-release` (`ce1f642`). Из Lovable-коммита
`6c81b356b2e1ab979122b9fd75017837ec31ab6c` выборочно перенесены только проверенные правила дат и
UI-паттерн. Development Preview, in-memory store и маршрут в `src/App.tsx` не переносились.

Production Supabase, Amvera, Telegram, Edge Functions, домены и опубликованный сайт не вызывались
и не изменялись. Реальные тренировки не создавались. Все SQL-проверки выполнялись в одноразовом
локальном PostgreSQL-кластере без сетевых вызовов.

Перед любыми дальнейшими project-linked командами нужен отдельный preflight: в этой рабочей копии
`supabase/config.toml` содержит project ref `ildxkrlcpojxudvxzudd`, тогда как код КЭМП и URL
календаря используют `wfjvjvbjjxcgkaolkgdq`. Из-за конфликта Supabase CLI/MCP в этом этапе не
использовались.

## Серверная модель

Миграция `up.sql` добавляет две закрытые от клиента таблицы:

- `club_recurring_series` — параметры и каноническая идентичность серии;
- `club_recurring_occurrences` — неизменяемая связь исходной московской даты с созданным событием.

Ledger хранит `original_start`, `original_end`, `original_week_anchor` и ссылку на отдельную строку
`schedules`. При переносе строка расписания меняет время, но исходная неделя остаётся в
`week_anchor`. При физическом удалении события FK делает `schedule_id=NULL`, а occurrence остаётся,
поэтому повтор серии не восстанавливает отменённую тренировку.

Совпадение определяется по:

1. каноническому `club_kind` (`BJJ` и `БЖЖ` — один вид);
2. исходным start/end в `Europe/Moscow`;
3. location после trim, схлопывания пробелов и независимого от locale приведения русских букв к
   нижнему регистру.

Поэтому тренировка другого вида, времени, длительности или зала остаётся отдельным событием.
Legacy-событие с пустым `club_kind`, но распознаваемым `title/activity_type`, принимается в серию и
получает `club_kind`/`week_anchor`.

`club_recurring_series_save`:

- работает одной PostgreSQL-транзакцией;
- разрешён только `authenticated`, но внутри повторно проверяет фактическую роль
  `admin/super_admin/trainer`, как действующая политика управления `schedules`;
- всегда создаёт только бесплатные `schedule_type='club'` тренировки;
- сериализует одну серию через transaction advisory lock;
- использует UNIQUE identity/occurrence keys как окончательную защиту повторов и параллельных
  запросов;
- создаёт каждую тренировку отдельной строкой `schedules` с `club_kind` и исходным
  `week_anchor`.

`club_recurring_series_preview` использует те же серверные правила и возвращает для каждой даты
`new`, `existing`, `moved` или `cancelled`, а также месяцы без выбранного числа.

RLS включён на обеих новых таблицах, клиентские table grants отозваны. Вызов внутренних helper
functions также закрыт. Клиенту доступны только две RPC, причём `anon` не имеет EXECUTE.

## Совместимость с текущими сценариями

- Форма показывает переключатель только для новой бесплатной БЖЖ/ОФП/кикбоксинг-тренировки;
  по умолчанию он выключен.
- Разовые бесплатные insert/update и существующий атомарный `paid_event_save` не изменены.
- Существующий `sql/resident-checkins-request/up.sql` применяется в fixture перед recurring
  миграцией. Резидент без предварительной записи создаёт pending-заявку только для бесплатной
  активной клубной тренировки после её начала; платные и прочие события сохраняют прежние правила.
- Тестовый `net.http_post` пишет только в локальную таблицу. Attendance-only insert не создаёт
  уведомление. Изменение Telegram-подтверждений находится вне этой задачи.

## PostgreSQL-проверка

Команда:

```bash
bash sql/club-recurring/run-isolated.sh
```

Результат на локальном PostgreSQL 17.11:

- **28 SQL assertions passed, 0 failed**;
- Preview четырёх понедельников: `уже есть 1`, `будет создано 3`;
- после save/reload — четыре события, retry не добавляет строки;
- два параллельных save оставляют ровно четыре `schedules` и четыре occurrence claims;
- 31 января — 31 мая: созданы 31.01, 31.03, 31.05; февраль и апрель возвращены как skipped;
- перенос сохраняет исходный `week_anchor`; удалённое событие не восстанавливается;
- резидент без записи создаёт pending-заявку и видит исходную неделю;
- пользователь без manager-роли получает `forbidden`;
- платное контрольное событие и его настройки не изменились;
- `down.sql` отказал при наличии истории и сохранил схему;
- на отдельной пустой базе полный `up.sql -> down.sql` удалил новые объекты и сохранил базовые
  `schedules`/RLS.

## Приложение

```bash
bun test src
bunx tsc --noEmit
bunx eslint src/components/schedule/ClubScheduleManagement.tsx \
  src/components/schedule/ClubRecurrenceFields.tsx \
  src/components/schedule/clubRecurrence.ts \
  src/components/schedule/clubRecurrence.test.ts
bun run build
```

Фактические результаты:

- **78 tests passed, 0 failed** в 8 файлах;
- TypeScript: без диагностик;
- ESLint изменённых TS/TSX: 0 errors, один существующий warning initial-load `useEffect` в
  `ClubScheduleManagement.tsx`;
- Vite build: успешно, 2 973 модуля;
- нефатальные прежние warnings: устаревший Browserslist, смешанный static/dynamic import
  `ContactForm.tsx`, chunk больше 500 kB.

## Порядок применения и откат — не выполнялись

Предусловия для отдельного будущего релиза:

1. Устранить конфликт project ref и заново прочитать live schema, ACL, функции отметок и paid
   columns.
2. Подтвердить, что `sql/resident-checkins-request/up.sql` уже применён либо отдельно согласовать
   его применение перед recurring migration.
3. Выключить выпуск UI до успешной серверной миграции и read-only post-checks.
4. Применить `sql/club-recurring/up.sql`, затем проверить Preview RPC, save RPC и одну синтетическую
   серию в разрешённом staging-контуре.

Откат:

- до появления данных: `down.sql` полностью удаляет новые RPC, helpers, индекс и таблицы;
- после появления истории: `down.sql` fail-closed; для остановки новых операций использовать
  `disable.sql`, затем отдельно решить судьбу уже созданных `schedules` и ledger. Ни один rollback
  автоматически не удаляет тренировки.

Merge, deploy, hosted SQL и создание реальных тренировок требуют отдельного согласования.
