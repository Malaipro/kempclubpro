# КЭМП / E1 — Платные мероприятия и статусы брони (узкий этап плана v3)

Основание: план v3 «Путь резидента» (архив) и аудит `sql/resident-path/audit-a0.md`. Этот документ не заменяет v3, а детализирует только E1. Ничего не выполнено: код, БД, бот, production не менялись.

## A. PRE-FLIGHT (Concise): e1-paid-booking

Текущее (проверено read-only):
- `schedules`: нет полей цены/предоплаты/QR/срока оплаты/условия отмены; есть `max_participants`, `schedule_type`, `is_active`, `instructor_id`.
- `schedule_participants`: только `id, schedule_id, user_id, registered_at, attended`; бронь и посещение смешаны в одной строке; уникальность `(schedule_id,user_id)` задублирована двумя индексами.
- RLS INSERT: свой `user_id` + `is_club_resident() OR is_admin()`; отдельная политика INSERT для admin/super_admin/trainer.
- Бот (`bc:` / `gc:`) делает прямой INSERT (по данным пользователя), вероятно через service-role → RLS не действует; проверки статуса/лимита/paid нет.
- `register_for_event_web`, `book_schedule_session` — без проверки статуса (A0).
- Триггер уведомления `notify-booking` срабатывает на INSERT/DELETE строки.

Целевое:
- Событие free/paid; для paid — hold → pending_review → confirmed (E2) / expired / cancelled; статус оплаты отдельно от статуса брони; наличный остаток — отдельное поле.
- Единый серверный контракт `book_event(...)` для web, `bc:`, `gc:`; прямой INSERT не может создать платную бронь или превысить лимит.

Опасные места:
1. Service-role INSERT бота обходит RLS → guard только BEFORE INSERT триггером.
2. Гонка за последнее место → блокировка строки `schedules ... FOR UPDATE` в триггере/RPC.
3. 10 из 42 `club_resident` с `approved=false` — не исправлять; guard использует существующее условие (`is_club_resident` + approved, как в действующей логике после сверки определения функции).
4. `notify-booking` начнёт получать hold-брони — нужна фильтрация (не спамить основателя на каждый hold) или уведомление только на pending_review.
5. Удаление истёкшего hold = DELETE → ложное «отмена записи» в TG; использовать статус `expired`, а не DELETE.

Миграции (тестовая ветка, UP/DOWN):
- M1 (Med): ADD COLUMN в `schedules` (nullable/default, free по умолчанию): `is_paid bool default false`, `price_total_rub`, `prepay_rub`, `cash_rest_rub` (int), `payment_url text`, `payment_qr_path text` (приватный Storage), `payment_window_minutes int default 120`, `cancel_policy text`. DOWN: DROP COLUMN.
- M2 (Med): ADD COLUMN в `schedule_participants`: `booking_status text default 'confirmed'` (`hold|pending_review|confirmed|cancelled|expired`), `payment_status text default 'not_required'` (`not_required|awaiting|reported|prepaid|rejected`), `hold_expires_at`, `reported_paid_at`, `payment_confirmed_at`, `payment_confirmed_by`, `cash_rest_status text default 'n/a'`, `source text` (`web|tg_bc|tg_gc|admin`), `idempotency_key text unique null`. Старые строки = confirmed/not_required → поведение не меняется. Удаление дубль-индекса — НЕ в E1. DOWN: DROP COLUMN.
- M3 (High, RLS/ACL): BEFORE INSERT/UPDATE триггер-guard + RPC `book_event`, `report_payment`, `cancel_booking`, `expire_holds`; запрет клиенту UPDATE полей оплаты; cron истечения hold. DOWN: DROP TRIGGER/FUNCTION, unschedule.

Расход кредитов: ~25–40 (M1–M3, UI админ-формы и карточки, тесты). Требует: CONFIRM e1-paid-booking (M1–M2, UI) и отдельно APPROVE BREAKING e1-guard (M3).

## B. Затрагиваемые объекты

БД (существующие, без дублей):
- `public.schedules`, `public.schedule_participants` (+ RLS этой таблицы).
- `register_for_event_web`, `book_schedule_session` — переписать как тонкие обёртки над `book_event` (сигнатуры сохраняются).
- `is_club_resident`, `is_super_admin` — только чтение/использование, не меняются.
- Триггер/функция `notify_booking_change` + Edge Function `supabase/functions/notify-booking/index.ts` — фильтр по статусам.
- `get_schedule_web` / `get_schedule_for_user` — добавить поля оплаты и статус своей брони.

Frontend:
- `src/components/schedule/ClubScheduleManagement.tsx` — блок «Платное событие» в существующей форме.
- `src/components/schedule/ClubScheduleViewer.tsx` и `src/components/app-shared/apiAdapter.tsx` — карточка резидента: цена, предоплата, остаток наличными, QR/ссылка, таймер hold, кнопка «Я оплатил», статусы.
- Deep-link `/app?event=<id>` с сохранением target event через логин (только чтение параметра; `/telegram`, `/dashboard`, `/auth` не трогать).

TG — трогать ТОЛЬКО в E2 (отдельный repo `Malaipro/kempclubpro-telegram-server` / `telegram-server`):
- `src/bot/handlers/onCallbackQuery.ts`: `onCallbackQuery` (`bc:`) и `onGroupCallbackQuery` (`gc:`) — заменить прямой INSERT на вызов `book_event(source)`; для paid отвечать URL/WebApp-кнопкой на карточку.
- Подтверждение оплаты основателем по верифицированному Telegram ID.
- `supabase/functions/send-broadcast/index.ts` (→ `tg.kempclub.pro/api/broadcast`) — только формат кнопок paid-события.

## C. Последовательность E1 (тестовая ветка/окружение)

1. Сверить определения `is_club_resident`, `register_for_event_web`, `book_schedule_session`, `notify_booking_change` и роль, под которой пишет бот (service_role или прямой postgres).
2. M1 + M2 (аддитивно).
3. M3: `book_event(schedule_id, user_id, source, idempotency_key)`:
   - проверка доступа (club_resident + действующее условие approved) для резидентских событий;
   - `SELECT ... FOR UPDATE` события; лимит считает `confirmed + pending_review + hold (не истёкший)`;
   - free → `confirmed/not_required` (как сейчас); paid → `hold/awaiting`, `hold_expires_at = now()+window`;
   - повтор с тем же ключом или существующая активная бронь → возврат той же записи.
   BEFORE INSERT guard на `schedule_participants`: любой INSERT (включая service-role бота) приводится к правилам: для paid-события принудительно `hold/awaiting`, клиентские значения статусов оплаты игнорируются; превышение лимита/нет доступа → исключение. Бесплатные legacy-INSERT проходят без изменений.
   BEFORE UPDATE guard: поля оплаты/подтверждения меняет только основатель (функция E2) или `report_payment` (только `awaiting→reported`, `hold→pending_review`).
   `expire_holds()` по cron каждые 5 мин: `hold` с истёкшим сроком → `expired` (место освобождается, без DELETE).
4. Админ-форма платного события; реквизиты не хранятся в коде, QR — загрузка файла в приватное хранилище.
5. Карточка резидента и статусы; deep-link.
6. Фильтр уведомлений `notify-booking`.

Тесты (SQL-регрессия в `sql/resident-path/e1-tests.sql` + frontend):
- free legacy unchanged: прямой INSERT/старые RPC на бесплатное событие → `confirmed`, как раньше, уведомление приходит.
- paid hold only: запись на платное → только `hold/awaiting`, никогда `confirmed`.
- timeout releases slot: истёкший hold → `expired`, место доступно, TG-«отмена» не отправлена.
- no unauthorized users: не-резидент и резидент с `approved=false` (по действующему правилу) получают отказ во всех трёх путях, включая прямой URL.
- no direct insert bypass: INSERT от service_role с `booking_status='confirmed'` на paid → сохранён как hold; на переполненное событие → ошибка.
- limited capacity: параллельные записи на последнее место → ровно одна успешная.
- repeat idempotent: повтор с тем же ключом/пользователем → одна строка.
- client cannot self-confirm: UPDATE `payment_status='prepaid'` от пользователя → отказ.
- fallback if TG E2 not deployed: старая кнопка `gc:`/`bc:` на paid создаёт hold (через guard), бот показывает свой обычный ответ; резидент завершает оплату в /app; кнопка на free работает как прежде.

## D. send-to-group

`BroadcastManagement.tsx` вызывает `supabase.functions.invoke('send-to-group')`, но папки `supabase/functions/send-to-group` в этом репозитории нет — функция, вероятно, развернута отдельно. До любых изменений группового сценария нужно получить её реальный исходник (дашборд Supabase / другой repo). В E1 она не меняется.

## E. Итог

E1 готов к реализации после отдельного разрешения (CONFIRM e1-paid-booking + APPROVE BREAKING e1-guard).

Оставшиеся блокеры:
1. Тестовое окружение/ветка БД для M1–M3 (production-миграции запрещены).
2. Роль, под которой бот пишет в `schedule_participants` (подтвердить из исходника бота).
3. Исходник развернутой `send-to-group`.
4. Правило для 10 резидентов с `approved=false` (видят ли резидентские события) — решение основателя, автоматически не исправляем.
5. Текст условия отмены и возврата предоплаты (без «невозвратной брони»).
6. Реальный QR/ссылка СБП загружаются основателем в интерфейсе, не через чат.
7. Telegram ID основателя для E2 (не нужен для E1).
8. `supabase/config.toml` (ref МИРА) не трогаем; DB-операции только по проверенному ref КЭМП.
