# КЭМП — «Путь резидента»: план внедрения (v3, read-only, корректировка основателя 04.11)

Этот план заменяет v2 в части правил. Аудит v1 и разделы v2, которые не затронуты, сохранены. Код, база, права, `supabase/config.toml` и production не менялись.

## Резюме исправлений v3 (переопределяют v2)
1. **Регулярные тренировки:** Пн — БЖЖ, Ср — ОФП, Пт — кикбоксинг. Недельная цель — 3 конкретных **запланированных клубных занятия** этой недели по МСК. Учитываются только события `schedules`, помеченные как регулярные занятия недели (привязка по `schedule_id` и плановой неделе), а не день недели. Начисления: +10 баллов за каждое подтверждённое занятие, при 3/3 — ещё +10 баллов и +70 коинов, один раз за неделю. Правило «любые 3 тренировки» и «4-я тренировка без баллов» отменены. Виды БЖЖ, ОФП и кикбоксинг для званий считаются раздельно.
2. **Только основатель:** все события создаёт и публикует основатель. Он же подтверждает посещения, управляет бронями и оплатами, корректирует баллы и коины, выдаёт особые тотемы. Убраны таблица `event_organizers`, роль и экран организатора, баллы «за организацию по назначению». Добавлено массовое подтверждение посещений из списка события. Оплату по TG подтверждают только верифицированные Telegram ID основателя.
3. **Доступ только для `club_resident`:** статус основатель меняет вручную после 60-дневного интенсива. Новой авторизации нет. Любой резидентский RPC, страница, бот-путь и callback проверяют действующий статус на сервере. Пороги «3 месяца» и «6 месяцев» отсчитываются от даты перехода в `club_resident` из истории статусов. Исторические начисления не пересчитываются.
4. **Сохранено из v2:** платные брони, QR СБП, TG-уведомление основателю, отметки, баллы, коины, рейтинг, «Мой путь», звания, жетоны, тотемы.

Пункты, требующие **отдельного аудита прав / истории статусов**, отмечены ниже как **[АУДИТ-ACL]** и **[АУДИТ-СТАТУС]**.

## 0. PRE-FLIGHT: resident-path-full (v3)
- **Риск:** High (деньги, места, доступ, кошелёк, внешний бот). Каждый этап — отдельный `APPROVE BREAKING <этап>`.
- **БД:** около 7 миграций, к каждой UP и DOWN (DOWN — только после ручной проверки). Новые поля nullable или с безопасным default. Удалений и переименований нет.
- **Запреты, действующие сейчас:** `supabase/config.toml` не менять, пока не сверена база Amvera; PROD-миграции не разрешены.
- **Кредиты (ориентир):** E0 ≤1, E1 6–9, E2 3–5, E3 4–7, E4 6–9, E5 4–6, E6 5–8, E7 5–8, E8 3–5.
- ⚠️ **Потенциальные конфликты:**
  - `schedule_participants.attended` (legacy);
  - `book_schedule_session` (бот);
  - `admin_adjust_coins` — сейчас доступна любому `is_admin` **[АУДИТ-ACL]**;
  - `purchase_reward_web`;
  - `WebScheduleView.tsx`, `WebResidentViews.tsx`, `WebBottomNav.tsx`.

## 1. Аудит (из v1, подтверждено 04.11)
- `supabase/config.toml` указывает `ildxkrlcpojxudvxzudd` (МИРА); КЭМП — `wfjvjvbjjxcgkaolkgdq`.
- `schedules`: полей цены, оплаты и регулярности нет; ответственный — `instructor_id`.
- `schedule_participants`: статусов нет, бронь и посещение смешаны.
- Запись: `book_schedule_session` (бот, FOR UPDATE + COUNT), `register_for_event_web` / `unregister_from_event_web`, триггер `notify_booking_change` → `notify-booking`.
- `check_in_activity_web` пишет в `activity_checkins` только тип и дату, без `schedule_id`.
- Коины: `coin_transactions`, `coin_rules`, `award_coins_by_rule`, `admin_adjust_coins`, магазин `rewards` / `reward_requests` / `purchase_reward_web`.
- Роли: `user_roles` (user, admin, super_admin, trainer, captain); статусы: `participant_status_type`, `is_club_resident`, таблица `participant_status_history` с триггером `log_participant_status_change`.
- Тотемы и награды: `totems`, `user_totems` (is_manual), zakal/gran/shram, `achievements`.

## 1a. Обязательные аудиты до кода
**[АУДИТ-ACL] Права основателя** (read-only, до E1):
- Кто сейчас имеет `super_admin` и `admin`; есть ли у основателя единственный аккаунт.
- Какие админские процессы (рассылки, мастермайнд, потоки, договоры, заявки) завязаны на `is_admin` / `is_super_admin`. Их **не менять**.
- Новые функции системы «Путь резидента» проверяют `is_founder(auth.uid())`: список `founder_user_ids` в `internal_settings` (только service role). Глобальные роли и ACL других функций не меняются.
- Сужение `admin_adjust_coins` — только после отдельного `APPROVE VISIBILITY admin_adjust_coins`. Альтернатива без изменения ACL: новая `founder_adjust_resident_coins`, старая функция остаётся как есть.

**[АУДИТ-СТАТУС] Статус и история** (read-only, до E3):
- Тело `is_club_resident` и все места, где проверяется статус: RLS `schedules`, `schedule_participants`, `get_schedule_web`, `register_for_event_web`, `get_resident_rating_web`, `book_schedule_session`, рассылки с кнопками `book_event` / `checkin`.
- Полнота `participant_status_history`: у всех ли текущих резидентов есть запись перехода в `club_resident` и с какой датой.
- Если записи нет — дата не выдумывается: резидент помечается «дата перехода не подтверждена», пороги 3/6 мес. для него закрыты до ручного ввода даты основателем (с записью в журнал).
- Выявленные пути, где не-резидент может попасть в резидентский контент, фиксируются списком и закрываются в E1 серверной проверкой.

## 2. Настройки (дефолты проекта, НЕ решение основателя)
Хранятся в `resident_settings` (key/value), меняет только основатель.

| Ключ | Значение |
|---|---|
| booking.hold_minutes | 120 (дефолт) |
| booking.review_hours | 24 (дефолт) |
| week | ISO-неделя, Europe/Moscow |
| week.points_per_session / week.bonus_points / week.bonus_coins | 10 / 10 / 70 (утверждено) |
| week.required_sessions | 3 (утверждено) |
| coins.streak | +20 на 4/8/12 неделе серии (дефолт v2, не утверждено) |
| ranks.min_months / merch.min_months | 3 / 6 от даты перехода в `club_resident` |
| merch.min_full_weeks | 24 (дефолт) |
| week.cancel_policy | см. раздел 4.2, по умолчанию `manual` |

## 3. Модель данных (новое; существующее не меняется)
**Расширение `schedules`** (nullable):
- оплата: `is_paid` (default false), `price_total`, `prepay_amount`, `cash_remainder`, `payment_recipient_label`, `payment_url`, `payment_qr_path` (приватный Storage), `hold_minutes`, `cancel_terms_text`;
- `event_category` (training_bjj, training_kick, training_ofp, crash_test, lecture, banya, sport_event, excursion, mastermind, other);
- **регулярность:** `is_weekly_core` (bool, default false), `core_kind` (bjj, ofp, kick), `planned_msk_week` (ISO-неделя МСК, в которую занятие засчитывается), `replaces_schedule_id` (ссылка при переносе/замене), `core_status` (planned, moved, cancelled_by_founder).
- `audience` (`resident` | `intensive`), чтобы различать новые клубные занятия и исторические занятия интенсива.

**Расширение `schedule_participants`:** `booking_status` (hold, pending_review, confirmed, expired, cancelled, rejected; default `confirmed`), `payment_status`, `hold_expires_at`, `claimed_at`, суммы, `source`, `idempotency_key` unique. `attended` — legacy.

**Новые таблицы** (GRANT, RLS, запись только через RPC):

| Таблица | Содержимое |
|---|---|
| `booking_payment_events` | неизменяемый журнал оплат |
| `payment_confirm_tokens` | одноразовые токены TG |
| `event_attendance` | schedule_id, user_id, status (self_marked, confirmed, rejected, absent), confirmed_by, confirmed_at, note; unique(schedule_id, user_id) |
| `resident_week_plan` | msk_week, core_kind, schedule_id, status (active, excused); 3 слота недели |
| `resident_point_ledger` | user_id, points, rule_code, source_key unique, msk_week, schedule_id |
| `resident_point_rules` | code, points, label, is_active |
| `resident_week_stats` | user_id, msk_week, confirmed_core, required_core, is_green |
| `resident_ranks` / `user_resident_ranks` | звания, раздельно по видам (bjj, ofp, kick) |
| `resident_badges` / `user_resident_badges` | цифровые знаки |
| `resident_status_dates` | user_id, resident_since, source (history, founder_manual), set_by |
| `internal_settings` | `founder_tg_ids`, `founder_user_ids` (только service role) |

`event_organizers` **не создаётся.**

## 4. Правила
### 4.1 Бронь и оплата (из v2, с правкой доступа)
1. `book_event(schedule_id, source, idempotency_key)`: сначала серверная проверка `is_club_resident` для событий `audience='resident'`, затем FOR UPDATE и подсчёт мест (confirmed + pending_review + неистёкший hold). Бесплатное → confirmed, платное → hold.
2. `register_for_event_web` и `book_schedule_session` — обёртки. BEFORE INSERT триггер блокирует прямую запись в обход `book_event` и запись не-резидента на резидентское событие (защита от старых callback и прямого URL).
3. `claim_payment_web` → pending_review → TG-сообщение основателю.
4. `confirm_payment(token, tg_id, decision)`: tg_id только из `founder_tg_ids`; одноразовый токен; атомарный UPDATE.
5. `founder_booking_action` — только `is_founder`: наличные, возврат, отмена, ручное подтверждение; журнал.
6. Cron истечения hold — без изменений v2.

### 4.2 Регулярная неделя (новое)
- Основатель публикует события Пн БЖЖ / Ср ОФП / Пт кик с `is_weekly_core=true`, `core_kind`, `planned_msk_week`. Это заполняет `resident_week_plan` (3 слота).
- Засчитывается только подтверждённое посещение события из плана своей недели. Тренировка вне плана — статистика, без баллов недели.
- **Перенос/замена:** основатель создаёт новое событие с `replaces_schedule_id`; оно наследует `core_kind` и `planned_msk_week` старого, даже если дата сместилась на другую неделю. Старое получает `core_status=moved`.
- **Отмена занятия основателем — бизнес-решение не принято.** Настройка `week.cancel_policy`:
  - `manual` (дефолт): слот остаётся, основатель решает вручную в админке;
  - `excuse_slot`: отменённый слот исключается, цель недели = число активных слотов (например 2/2);
  - `keep_required`: цель остаётся 3, нужна замена.
  Значение выбирает основатель; до выбора действует `manual`.
- Начисления при подтверждении посещения (только `club_resident` на дату события):
  - +10 баллов, ключ `core:<schedule_id>:<user_id>`;
  - когда все слоты недели подтверждены: +10 баллов (`week3:<user>:<week>`) и +70 коинов через `award_coins_by_rule('resident_week3', 'resident_week', <week>)` — ровно один раз;
  - серия зелёных недель: дефолт v2, не утверждён.
- Звания по видам считают подтверждённые занятия `core_kind` раздельно.

### 4.3 Посещения
1. `self_mark_attendance_web` — только резидент с confirmed-бронью, в окне события до 23:55 МСК. Начислений нет.
2. `founder_confirm_attendance(schedule_id, user_ids[], status)` — **массовое подтверждение** из списка события: «Подтвердить всех отметившихся», выбор чекбоксами, добавление пришедших без записи. Одна транзакция, начисления идемпотентны по source_key.
3. Отмена подтверждения — сторно строки в ledger и коины, исходные записи не удаляются.
4. Прочие события (краш-тест +20, лекция +10, мастермайнд +5, баня/спорт/экскурсия +10 и +15 коинов) — как в v2. Баллы «за организацию» удалены; помощь резидента с проведением основатель может отметить ручной корректировкой.
5. Исторические занятия интенсива (`audience='intensive'`, `activity_checkins`) в резидентские баллы не входят; backfill нет.

### 4.4 Коины, тотемы, мерч
- Ручная корректировка баллов/коинов резидента — только основатель (новая функция; ACL старой не меняется без `APPROVE VISIBILITY`) **[АУДИТ-ACL]**.
- `grant_special_totem` (bear, lighthouse) — только `is_founder`.
- Мерч программы: `rewards.activity_program=true`, `min_months` от `resident_status_dates.resident_since`, `min_full_weeks`. Старые товары не затрагиваются **[АУДИТ-СТАТУС]**.

## 5. Экраны
**`/app` резидента** — показываются только при `club_resident` (проверка и на клиенте, и в каждом RPC):
- Расписание: бейдж «Платно ₽», `EventPaymentCard`, deep-link `/app/event/:id` (не-резиденту — «доступно резидентам клуба», без данных события).
- Отметки: кольцо недели с тремя слотами Пн БЖЖ / Ср ОФП / Пт кик, статусы слотов (подтверждено, ждёт, перенесено, отменено), самоотметка.
- Рейтинг: месяц / квартал / всё время, без чужих коинов.
- Мой путь: итоги по видам раздельно, зелёные недели, звания (от даты перехода), знаки, тотемы, прогресс к мерчу.

**Кабинет основателя** (группа «Резиденты», видна только `is_founder`; прочие вкладки админки не меняются):
- Конструктор события: оплата, QR, категория, флаг «регулярное занятие недели», вид, плановая неделя, «заменяет событие».
- Заявки и оплаты.
- Посещаемость: список события, массовое подтверждение.
- Правила и настройки (включая `week.cancel_policy`).
- Рейтинг, звания и награды, ручные корректировки, особые тотемы.
- Дата перехода в резиденты: просмотр из истории, ручной ввод при отсутствии.

Экрана организатора для резидентов **нет.**

## 6. Этапы
| # | Этап | Приёмка | Rollback |
|---|---|---|---|
| A0 | Аудиты [АУДИТ-ACL], [АУДИТ-СТАТУС] (read-only) | отчёт: роли, пути доступа, полнота истории статусов | — |
| E0 | Контур БД (только после сверки Amvera) | ref = КЭМП | вернуть строку |
| E1 | Бронь, оплата, серверная проверка статуса | не-резидент не может записаться ни через веб, ни через бот/RPC/URL; гонка за место — 1 победитель | DOWN |
| E2 | TG-подтверждение основателем | чужой TG ID — отказ; повтор ничего не меняет | отключить функцию |
| E3 | Посещения и массовое подтверждение | 30 человек подтверждаются одним действием; не-основатель — отказ | DOWN |
| E4 | Регулярная неделя и начисления | 3/3 по плану → +30 +10 баллов, +70 коинов один раз; перенос сохраняет неделю; тренировка вне плана без баллов недели; интенсив без изменений | деактивировать правила |
| E5 | Рейтинг | только резиденты, без чужих коинов | удалить RPC |
| E6 | Мой путь и звания по видам | звание не раньше 3 мес. от перехода | DOWN |
| E7 | Коины, тотемы, мерч | мерч закрыт до 6 мес. от перехода; старые товары работают | снимок функций |
| E8 | Сквозные тесты | «запись → оплатил → TG → массовое подтверждение → баллы → коины» | — |

Все миграции применяются только в тестовом контуре до отдельного разрешения на PROD.

**Контракт внешнего бота:** только `book_schedule_session`; при `payment_required` или `resident_only` — кнопка-URL; callback `pay:<token>:ok|no` → `confirm_payment` с `from.id`; прямой записи в `schedule_participants` нет.

## 7. Открытые решения (не блокируют A0)
1. Подтверждение контура КЭМП и ref Amvera — блокирует E0 и все миграции.
2. Telegram ID и аккаунт основателя — блокирует E2, E3, E7.
3. `week.cancel_policy` — до решения действует `manual`.
4. Серия зелёных недель (+20) — оставить или убрать.
5. Список званий и знаков — блокирует E6.
6. Сужение `admin_adjust_coins` или отдельная функция основателя.

**Первым безопасно:** A0 (read-only аудиты). После E0 — E1 с `is_paid=false` по умолчанию и E3.

## Технические заметки
- После выхода из plan mode обновить память проекта `mem://features/resident-path-rules` под правила v3 (Пн/Ср/Пт, только основатель, пороги от даты перехода).
- `is_founder(uuid)` — SECURITY DEFINER, читает `internal_settings`; не заменяет `is_super_admin` в других функциях.
