# КЭМП — «Отметки» для резидентов + подтверждение основателем (план, не выполнен)

Ничего не менялось. Бот, оплаты (E1, Draft PR #2), начисления, `config.toml` — вне объёма.

## Что увидит пользователь
- Резидент (club_resident + approved): плитка «Отметки» на главной. Внутри — клубные события, на которые он записан: дата, тип, запись, статус отметки «не отмечался / ожидает подтверждения / подтверждено / не присутствовал». Кнопка «Я был» после начала события. Сверху цель недели 0/3…3/3 (Пн БЖЖ, Ср ОФП, Пт ударка), направления, история, серия полных недель.
- Основатель: в карточке события клубного календаря — «Отметить присутствие»: список записавшихся, у кого есть «Я был» — подсвечены, галочки «Был / Не был», «Подтвердить всех отмеченных».
- Интенсив: без изменений (старый UI, `check_in_activity_web`).

## Проверенные факты (read-only)
- `schedule_participants`: id, schedule_id, user_id, registered_at, attended; 0/50 attended.
- Политики: нет UPDATE ни для кого; INSERT резидентом своей строки разрешён **без ограничения колонок** — сейчас резидент технически может вставить `attended=true` напрямую. Закрывается триггером (ниже).
- admin/trainer могут INSERT/DELETE любые строки — не меняем.

## Хранение pending self-mark — варианты
- **A (рекомендую):** колонка `schedule_participants.self_marked_at timestamptz null`. Одна строка = запись + запрос + решение. Минимально, без новой таблицы и RLS.
- B: отдельная таблица запросов — лишняя сущность, отклоняю по правилу «без второй системы отметок».

`attended` имеет DEFAULT false, поэтому сам по себе ничего не значит. Статус выводится только по решению основателя:
- `attended_marked_at` null + `self_marked_at` null → «Не отмечался»
- `attended_marked_at` null + `self_marked_at` есть → «Ожидает»
- `attended_marked_at` есть + `attended=true` → «Подтверждено»
- `attended_marked_at` есть + `attended=false` → «Не был»
Все 50 существующих строк остаются «Не отмечался»; бэкфилла нет.

## Изменения БД (одна миграция UP/DOWN, только по APPROVE)
1. `schedule_participants`: + `self_marked_at`, `attended_marked_by uuid`, `attended_marked_at timestamptz` (nullable).
2. `schedules`: + `week_anchor date null` — перенос сохраняет исходную неделю (null = неделя start_time по МСК). + `club_kind text null` — явный вид: `training_bjj | training_ofp | training_kick | banya | sport | excursion | lecture | mastermind | crash_test | other`. Без маппинга по тексту в рантайме; заполняется основателем в форме события. Начальное заполнение — только по согласованному вами списку текущих `activity_type`.
3. Триггер BEFORE INSERT/UPDATE на `schedule_participants` без доверия к GUC/флагам сессии: если `current_user` — клиентская роль (`authenticated`/`anon`, то есть прямой запрос из браузера), то на INSERT принудительно `attended=false`, `attended_marked_*`=null, `self_marked_at`=null; на UPDATE изменение этих полей — отказ. Меняться они могут только внутри SECURITY DEFINER RPC (там `current_user` = владелец функции), а сама RPC проверяет права по `auth.uid()`. service_role (бот) не затронут.
4. RPC (SECURITY DEFINER, `search_path=public`, EXECUTE только authenticated, revoke anon/public):
   - `get_resident_checkins_web(p_weeks int default 12)` — только `auth.uid()`, проверка club_resident AND approved на сервере; события `schedule_type='club'`, где пользователь записан; статусы, недельная цель, серия.
   - `request_attendance_web(p_schedule_id uuid)` — резидент approved, записан, событие club, `start_time <= now()`, не позже 7 дней; идемпотентно ставит `self_marked_at`; attended не трогает.
   - `founder_confirm_attendance(p_schedule_id uuid, p_marks jsonb)` — внутри проверка `is_super_admin(auth.uid())`; только club; только записавшиеся. `p_marks` — явный список `{user_id, attended:true|false}`; меняются только перечисленные, невыбранные остаются «не проверялось» (никакого автоматического «Не был»). UI: «Подтвердить всех ожидающих» отмечает только тех, у кого «Я был», плюс ручные галочки «Был» / «Не был» / «не трогать». Повтор — перезапись с записью в `audit_log`.
5. Цель недели считается по конкретным запланированным событиям календаря: занятия недели (МСК, `coalesce(week_anchor, start_time)`) с `club_kind` training_bjj/ofp/kick. Засчитывается подтверждённое (`marked_at` есть + `attended=true`) посещение конкретного `schedule_id`. Если вида нет в календаре этой недели (сейчас ОФП в клубе не заведено), показываем «Занятие не заведено в календаре» — основателю как ошибку настройки, резиденту как пометку; цель не уменьшается автоматически и 3/3 без него не наступает. Отменённое занятие — только ручное решение основателя (этап позже).
6. Сигналы для этапа начислений (не начисляем): уникальный ключ источника = `schedule_participants.id`; недельный ключ = (user_id, ISO-неделя МСК по `coalesce(week_anchor, start_time)`). Позже `coin_transactions` с source_type/source_id + unique предотвратит двойное начисление.

## Изменения кода
- `src/components/web-app/WebAppShell.tsx` — плитка «Отметки» в `RESIDENT_TILES`; `WebActivitiesView` получает `status`.
- `src/components/web-app/WebActivitiesView.tsx` — ветка: `status==='club_resident'` → резидентский режим (запрос к серверу; если сервер вернул `not_resident`/`not_approved` — сообщение, без старых кнопок). Иначе — существующий код без правок.
- `src/components/web-app/residentCheckins.ts` (+ `.test.ts`) — чистые функции: статус строки, цель недели, серия.
- `src/components/app-shared/apiAdapter.tsx` — actions `get_resident_checkins`, `request_attendance`.
- `src/components/schedule/ClubScheduleManagement.tsx` — поле «Вид» и «Неделя зачёта» в форме; диалог «Отметить присутствие» в карточке события (только super_admin).
- `WebScheduleView.tsx` — не меняется (запись остаётся как есть).

## Риски
- Интенсив: ветка по статусу; старый путь не трогается — регрессия ловится тестом (ниже). Низкий.
- Триггер на `schedule_participants`: может задеть бота/админку, если они пишут attended. Проверено: в коде attended никто не пишет; бот пишет через `book_schedule_session` (service_role — пропускается). Средний, откат — DROP TRIGGER.
- RLS/права: новые права только у super_admin; капитаны/тренеры не получают ничего нового. High по регламенту → `APPROVE BREAKING`.
- Неверный вид события → неверная цель недели; поэтому вид задаётся явно, «other» в цель не входит.

## Тесты и критерии приёмки
SQL (на ветке/вручную после APPROVE):
- anon: EXECUTE всех трёх RPC запрещён.
- резидент approved=false / интенсив → `not_approved` / `not_resident`.
- `request_attendance_web` на незаписанное, интенсивное, будущее событие → отказ; повтор — без ошибки.
- резидент INSERT с `attended=true` → отказ триггера.
- `founder_confirm_attendance` от admin/trainer/captain → отказ; от super_admin → attended выставлен, marked_by = он.
- перенос: событие с week_anchor прошлой недели считается в прошлую.
Дополнительно SQL: все 50 существующих строк после миграции → «Не отмечался»; подтверждение одного участника не меняет остальных; клиентский UPDATE `attended` → отказ даже от super_admin напрямую (только через RPC).
Vitest (`residentCheckins.test.ts`): 4 статуса по marked_at (attended=false без marked_at = «Не отмечался»); 0/3…3/3 только по подтверждённым запланированным событиям; дубли вида не дают 3/3; неделя без ОФП-события → флаг «не заведено», не 3/3; серия сбрасывается на неполной неделе; неделя по МСК (воскресенье 23:30 МСК).
Существующие: `dailyCheckin.test.ts`, `clubBooking.test.ts` проходят без изменений.
Playwright: интенсив — старые 6 кнопок; резидент — «Я был» → «ожидает»; основатель подтверждает → у резидента «подтверждено», 1/3.

## Нужно решить до старта
1. Соответствие текущих клубных `activity_type` видам (BJJ→training_bjj, Кикбоксинг→training_kick; Баня→banya; «Выездное мероприятие», «Встреча клуба», «Выезд на природу», «Совместный ужин», «Мастер-класс» → ?). ОФП в клубном календаре сейчас нет.
2. Окно «Я был»: 7 дней после события — подходит?
3. Основатель = все super_admin или один аккаунт (email)?

Оценка: ~8–14 кредитов. Старт: ответы + `APPROVE BREAKING resident-checkins-1`.
