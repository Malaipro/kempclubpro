# Аудит КЭМП перед «Путём резидента» и платным бронированием (read-only)

## А) PRE-FLIGHT (кратко): resident-path-audit
- Суть: только аудит и план. Код, БД и production не менялись.
- Влияние на сайт и ЛК: на этом этапе никакого.
- Изменения в БД: 0. В будущем примерно 6–8 миграций, у каждой есть UP и review-only DOWN.
- Риск реализации: **High** — деньги, места, роли, начисления, внешний бот.
- Стоимость этапов: этап 1 около 4–7 кредитов; этап 2 (только контракт) около 2–3; этапы 3–4 около 5–8 каждый; этап 5 около 4–6.
- Требует: ответов на вопросы в разделе Д, сверки Supabase-конфига и отдельного разработчика для репозитория бота.
- ⚠️ Потенциальные конфликты: `supabase/config.toml` (project_id МИРА), `schedule_participants` (сейчас бронь и посещение — одна и та же строка), кнопка `book_event`, `activity_checkins` (без привязки к событию), `leaderboard` и `user_points` (правила интенсива).

## Б) Фактическая карта

### Подтверждено кодом и чтением БД
- **Конфиг:** в `supabase/config.toml` указан `project_id = "ildxkrlcpojxudvxzudd"` (МИРА), а реальный КЭМП — `wfjvjvbjjxcgkaolkgdq`. Это не исправлено. До сверки никаких deploy или db push.
- **Расписание:** таблица `schedules` с полями id, title, description (`Тема|||Описание`), activity_type (text), start/end_time, instructor_id, max_participants, location, is_active, color, schedule_type (intensive/club), stream_id, mastermind_group_id. Полей про цену, оплату, организатора, окно оплаты и условия отмены **нет**.
- **Бронь:** таблица `schedule_participants` с полями id, schedule_id, user_id, registered_at, attended (boolean). Статусов **нет**, бронь и посещение смешаны в одном поле `attended`.
- **RPC записи:**
  - `register_for_event_web` и `unregister_from_event_web` — для веба.
  - `book_schedule_session(p_telegram_id, p_schedule_id)` — для бота. Блокирует `schedules` FOR UPDATE, считает места через COUNT и вставляет строку. То есть защита от гонки за место уже есть, но только через блокировку события.
- **Уведомления:** триггер `notify_booking_change`, затем Edge Function `notify-booking` отправляет в Telegram админу сообщения о записи и отмене.
- **Отметки:** `check_in_activity_web` вставляет строку в `activity_checkins` (user_id, activity_type, checked_at date, stream_id). Связи с `schedule_id` **нет**, подтверждения тренером **нет**.
- **Рассылки:** `src/components/admin/BroadcastManagement.tsx` поддерживает кнопки `url | checkin | book_event | request_reward`. Для `book_event` передаётся `schedule_id`, отправка идёт через `send-broadcast` и `send-to-group`. Сам callback обрабатывает внешний бот.
- **Коины:**
  - Журнал `coin_transactions` (amount, reason, source_type, source_id, created_by, rule_id); баланс считается функцией `get_user_coin_balance`.
  - `award_coins_by_rule` — защита от дублей по rule + source_type + source_id.
  - `admin_adjust_coins` — проверка `is_admin`, причина обязательна, `source_type='admin_manual'`.
  - Таблица правил `coin_rules`.
- **Магазин:** таблицы `rewards` (cost_coins, stock) и `reward_requests`; функции `purchase_reward_web`, `create_reward_request`, `review_reward_request`.
- **Рейтинг интенсива:**
  - `leaderboard` и `user_points` — баллы по направлениям bjj/kick/ofp/theory/tactics;
  - функции `calculate_participant_rating`, `recalculate_all_ranks`;
  - для резидентов есть отдельный `get_resident_rating_web`.
- **Роли:** `user_roles` использует enum `user_role` (user, admin, super_admin, trainer, captain); есть ещё enum `app_role`. Проверки — `is_admin`, `is_super_admin`, `has_role`, `is_captain`. Роли **organizer** нет, роль trainer есть.
- **Статус участника:** enum `participant_status_type` (intensive_active, club_resident и др.), проверка `is_club_resident`, журнал `participant_status_history`.
- **Тотемы и звания:**
  - `totems` (enum totem_type включает bear и lighthouse), `user_totems` (is_manual, assigned_by);
  - enum `reward_type` zakal/gran/shram, таблица `achievements`;
  - жетоны — в `src/components/achievements/SpecialBadges.tsx`.

### Требует проверки (БД, бот, production)
- Точный код `register_for_event_web`, `get_schedule_web`, `get_resident_rating_web`, а также RLS на `schedule_participants`: ограничивают ли они запись только резидентами.
- Правила бронзовых, серебряных и золотых жетонов в `SpecialBadges` и `achievements`: где хранятся и кто их выдаёт.
- В репозитории бота `kempclubpro-telegram-server`: вызывает ли callback `book_event` функцию `book_schedule_session` или пишет напрямую в таблицу, мимо проверки мест; как обрабатываются повторные callback.
- Не получает ли `schedules` записи из Mini App через `tg.kempclub.pro` в обход RPC.
- Деплой на Amvera: какой Supabase ref там в env.
- Есть ли хранилище для QR-картинок СБП.

## В) Риски и конфликты
1. **Неверный project_id** — главный риск: миграцию или deploy можно отправить в МИРА. Решение: сначала отдельно исправить конфиг (этап 0).
2. **Бронь и посещение — одно поле `attended`.** Новые статусы надо добавлять отдельными полями, а `attended` сохранить как legacy, чтобы старые экраны и интенсив не сломались.
3. **Два пути записи (веб-RPC и бот).** Для платного события `book_schedule_session` должен возвращать `payment_required` и deep-link, а не создавать подтверждённую бронь. Пока бот не обновлён, старые кнопки на платных событиях нужно отклонять на стороне БД (триггер или проверка в RPC).
4. **Места:** временные брони (hold) и `pending_review` тоже должны занимать место, а просроченные hold — освобождаться. Подсчёт мест в обоих RPC надо перевести на учёт статусов.
5. **Суперадмин и Telegram:** callback «Подтвердить» должен проверять конкретный TG ID из `internal_settings`, а не просто роль. Сервер меняет статус одним атомарным переходом `pending_review → confirmed` с одноразовым токеном, чтобы повторный или старый callback ничего не делал.
6. **Начисления:**
   - У интенсива свои `leaderboard` и `user_points`; новый рейтинг резидентов должен быть в отдельном журнале, без записи в эти таблицы.
   - Коины идут только через `award_coins_by_rule` с уникальным source (например, `resident_week:<user>:<iso_week>`). Исторического backfill нет.
7. **Роль организатора:** в enum её нет. Лучше привязать организатора к событию полем `schedules.organizer_id`, а не новой глобальной ролью, чтобы не давать доступ ко всей админке.
8. **Тотемы «Медведь» и «Маяк»:** выдача только через RPC, разрешённую конкретному основателю, а не любому `is_admin`.
9. **Юридические моменты:** тексты условий отмены — только по шаблону, который даст основатель; чеки не автоматизировать.

## Г) Поэтапный план (каждый этап — отдельный CONFIRM)

**Этап 0 — сверка конфигурации.** Файл `supabase/config.toml`: заменить ref на `wfjvjvbjjxcgkaolkgdq` после подтверждения. Проверить env на Amvera. Приёмка: ref совпадает везде. Откат: вернуть строку.

**Этап 1 — платные события и статусы брони.**
- В `schedules` добавить nullable-поля: is_paid, price_total, prepay_amount, cash_remainder, payment_url, payment_qr_path, payment_window_minutes, cancel_terms, organizer_id.
- В `schedule_participants` добавить: booking_status (`hold | pending_review | confirmed | cancelled | expired | rejected`), payment_status (`none | prepay_claimed | prepaid | paid_full | refunded`), hold_expires_at, prepaid_amount, cash_received_amount, idempotency_key (unique). Для старых строк статус по умолчанию `confirmed` — так старые записи останутся корректными.
- Новая таблица `booking_payment_events` — неизменяемый журнал (только вставка, доступ только для service и admin).
- RPC:
  - доработать `register_for_event_web` (для платных создаёт hold);
  - новые `claim_payment_web` и `admin_set_payment_status`;
  - `expire_booking_holds` по cron.
- В `book_schedule_session` добавить ветку `payment_required`.
- Интерфейс: `ClubScheduleManagement.tsx` (поля цены), `ClubScheduleViewer.tsx` и веб-расписание `/app` (QR, кнопка «Я оплатил», статус), deep-link `/app/schedule/:id` с возвратом после логина.
- Приёмка: бесплатная запись работает как раньше; гонка за последнее место — ровно один победитель; повторный «Я оплатил» ничего не меняет.
- Тесты: SQL-регрессия в `sql/resident-path/`, тесты vitest на статусы.
- Откат: удалить новые колонки и таблицу через review-only DOWN.

**Этап 2 — Telegram-подтверждение оплаты.**
- В Lovable: Edge Function `notify-payment-claim` отправляет основателю в личный чат сообщение с кнопками и подписанным одноразовым токеном; RPC `confirm_payment_by_telegram(token, tg_id, decision)` — атомарный переход статуса, проверка TG ID из `internal_settings`.
- Для отдельного репозитория бота: **интеграционный контракт** — формат callback_data `pay:<token>:<ok|no>`, вызов RPC с service-ключом, ответ answerCallbackQuery, редактирование сообщения. Список задач для разработчика бота. Интеграцию здесь не изображаем.
- Приёмка: чужой TG ID получает отказ; второй клик ничего не делает; просроченный токен отклоняется.

**Этап 3 — посещения.**
- Добавить таблицу `event_attendance` (schedule_id, user_id, self_marked_at, confirmed_by, confirmed_at, status, unique(schedule_id, user_id)).
- RPC: `self_mark_attendance_web`, `organizer_confirm_attendance` (только `organizer_id` или `instructor_id` события), `admin_fix_attendance`.
- Старые `activity_checkins` и поле `attended` не трогать.
- Интерфейс: вкладка «Отметки» и мини-экран организатора для его событий.
- Приёмка: организатор видит только свои события; без подтверждения баллы не начисляются.

**Этап 4 — геймификация резидентов.**
- Таблица `resident_point_ledger` (user_id, points, rule_code, source_key unique, msk_week).
- Правила: тренировка +10, но не более 3 тренировок в неделю; бонус +10 за 3 разные; краш-тест +20; лекция, баня, активность, экскурсия +10; мастермайнд +5; организованное событие +20 после одобрения.
- Коины через `award_coins_by_rule` с новыми `coin_rules`: 70 за неделю, 20 за серию из 4 недель, 15 за основное событие.
- Начисления только для статуса `club_resident` и только при подтверждённой посещаемости. Интенсив не затрагивается.
- RPC `get_resident_leaderboard_web(period)` за месяц, квартал и всё время.
- Приёмка: повторное подтверждение не даёт второго начисления; 4-я тренировка за неделю попадает в статистику, но не даёт баллов.

**Этап 5 — звания, «Мой путь», мерч.**
- Правила званий с минимальным стажем 3 месяца; мерч доступен только после 6 месяцев и 24 полных недель — проверку добавить в `purchase_reward_web` только для новых флагованных товаров.
- RPC `grant_special_totem` только для основателя.
- Экран «Мой путь» внутри существующего `/app`.
- Закал, Шрам, Грань и Тотем не меняются.

**Этап 6 — тесты.** Сквозные SQL-сценарии (гонка, идемпотентность, роли), vitest, Edge-тесты на `notify-payment-claim`, Playwright по сценарию «запись → оплатил → подтверждение → отметка → баллы».

## Д) Вопросы, без которых не начать
1. Какой Telegram ID основателя может подтверждать оплаты? Один или несколько?
2. Сколько длится hold до «Я оплатил» и сколько ждать проверки — например, 30 минут и 24 часа?
3. Серия коинов: +20 за каждые 4 недели подряд без сброса (на 4-й, 8-й, 12-й неделе) или серия сбрасывается после выплаты?
4. Какие события считаются «тремя основными клубными» (+15 коинов)?
5. Организатор — это существующий тренер (`instructor_id`) или любой резидент, назначенный на событие?
6. Есть ли доступ к репозиторию бота, или достаточно контракта для другого разработчика?
