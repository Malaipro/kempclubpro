# КЭМП — «Путь резидента»: полный план внедрения (v2, read-only)

Это уточнение согласованного аудита от 04.11. Аудит сохранён в архиве плана и коротко повторён в разделе 1. В рамках этого плана код, база, deploy и production не менялись.

## 0. PRE-FLIGHT: resident-path-full
- **Суть:** платные брони, посещения, рейтинг резидентов, коины, звания, «Мой путь» и разделы админки. Всё встраивается в существующий `/app` и кабинет суперадмина.
- **Риск:** **High.** Затрагиваются деньги, места, роли, кошелёк и внешний бот. Каждый этап требует отдельного `APPROVE BREAKING <этап>`.
- **Изменения БД:** примерно 8 миграций; к каждой — UP и DOWN, который применяется только после ручной проверки. Новые поля nullable или с безопасным default. Удалений и переименований нет.
- **Кредиты (ориентир):**

| Этап | Кредиты |
|---|---|
| E0 | ≤1 |
| E1 | 6–9 |
| E2 | 3–5 |
| E3 | 5–8 |
| E4 | 6–9 |
| E5 | 4–6 |
| E6 | 5–8 |
| E7 | 6–10 |
| E8 | 3–5 |

- **Обязательное условие (стоп-фактор):** до письменного подтверждения правильного контура базы (раздел 7, пункт 1) база не трогается.
- ⚠️ **Потенциальные конфликты:**
  - `supabase/config.toml` (ref МИРА);
  - `schedule_participants.attended`;
  - `book_schedule_session` (бот);
  - `admin_adjust_coins` (сейчас доступна любому `is_admin`);
  - `purchase_reward_web`;
  - `WebScheduleView.tsx`, `WebResidentViews.tsx`, `WebBottomNav.tsx` (общая навигация `/app`).

## 1. Аудит (кратко, подтверждено чтением кода и БД 04.11)
- **Ссылка на базу:** `supabase/config.toml` указывает `ildxkrlcpojxudvxzudd` (МИРА), а КЭМП — это `wfjvjvbjjxcgkaolkgdq`.
- **События:** в `schedules` нет полей цены, оплаты и организатора. Ответственный задаётся только через `instructor_id`.
- **Брони:** в `schedule_participants` (schedule_id, user_id, registered_at, attended) нет статусов; бронь и посещение смешаны.
- **Функции записи:**
  - `book_schedule_session(telegram_id, schedule_id)` — запись из бота: FOR UPDATE и COUNT, поэтому мест больше лимита не выдаёт;
  - `register_for_event_web` и `unregister_from_event_web` — запись из веба;
  - триггер `notify_booking_change` → Edge Function `notify-booking`.
- **Отметки:** `check_in_activity_web` пишет в `activity_checkins` только тип занятия и дату, без schedule_id.
- **Рассылки:** `BroadcastManagement.tsx` поддерживает кнопки `book_event`, `checkin`, `url`, `request_reward`; callback обрабатывает внешний бот.
- **Коины:**
  - журнал `coin_transactions`, правила `coin_rules`;
  - `award_coins_by_rule` — защита от дублей по source;
  - `admin_adjust_coins` — проверка `is_admin`, причина обязательна;
  - магазин: `rewards`, `reward_requests`, `purchase_reward_web`.
- **Рейтинг интенсива:** `leaderboard`, `user_points`, `recalculate_all_ranks`. Для резидентов есть `get_resident_rating_web`.
- **Роли:** `user_roles` с enum `user_role` (user, admin, super_admin, trainer, captain). Роли организатора нет.
- **Статус участника:** `participant_status_type` (club_resident и другие), функция `is_club_resident`.
- **Тотемы и награды:** `totems` (в том числе bear и lighthouse), `user_totems` (is_manual), zakal/gran/shram, `achievements`, `SpecialBadges.tsx`.
- **Экраны `/app`:** `WebAppShell`, `WebBottomNav`, `WebScheduleView`, `WebActivitiesView`, `WebResidentViews`, `WebProgressViews`, `WebGrowthViews`, `WebEngagementViews`.
- **Требует отдельной проверки:**
  - код `register_for_event_web`, `get_schedule_web`, `get_resident_rating_web` и RLS `schedule_participants`;
  - правила бронзовых, серебряных и золотых жетонов;
  - что делает бот на `book_event`;
  - env на Amvera;
  - Storage для QR.

## 2. Предварительные настройки (дефолты проекта, НЕ выбор пользователя)
Хранятся в новой таблице `resident_settings` (key/value), меняются из админки без правки кода.

| Ключ | Дефолт |
|---|---|
| booking.hold_minutes | 120 (от записи) |
| booking.review_hours | 24 (после «Я оплатил») |
| organizer.scope | резидент или тренер, доступ только к назначенным событиям |
| coins.streak | +20 на 4-й, 8-й, 12-й… неделе непрерывной серии; разрыв серии — отсчёт заново |
| week | ISO-неделя, Europe/Moscow |
| ranks.min_months | 3 |
| merch.min_months / merch.min_full_weeks | 6 / 24 |

## 3. Модель данных (новое; существующее не меняется)

**Расширение `schedules`** (все поля nullable):
- `is_paid` (default false), `price_total`, `prepay_amount`, `cash_remainder`;
- `payment_recipient_label`, `payment_url`, `payment_qr_path` — QR только загруженный из банка, Storage приватный;
- `hold_minutes`, `cancel_terms_text`, `event_category`.

`event_category` принимает значения: training_bjj, training_kick, training_ofp, crash_test, lecture, banya, sport_event, excursion, mastermind, other. Для старых событий значение берётся из `activity_type` через view, в данных ничего не переписывается.

**Расширение `schedule_participants`:**
- `booking_status` (hold, pending_review, confirmed, expired, cancelled, rejected; default `confirmed` для совместимости со старыми записями);
- `payment_status` (none, prepay_claimed, prepaid, paid_full, refunded, partially_refunded; default none);
- `hold_expires_at`, `claimed_at`, `prepaid_amount`, `cash_received_amount`, `refund_amount`, `source` (web, tg, admin);
- `idempotency_key` unique.

Поле `attended` остаётся legacy и не используется новыми правилами.

**Новые таблицы.** У каждой: GRANT, RLS, клиентская запись только через RPC.

| Таблица | Содержимое | Особенности |
|---|---|---|
| `event_organizers` | schedule_id, user_id, assigned_by | доступ организатора только к событиям из этой таблицы или к событиям, где он `instructor_id` |
| `booking_payment_events` | booking_id, kind, amount, actor_id, actor_tg_id, note, created_at | только вставка, неизменяемый журнал |
| `payment_confirm_tokens` | token_hash, booking_id, expires_at, used_at | одноразовые токены |
| `event_attendance` | schedule_id, user_id, status (self_marked, confirmed, rejected, absent), self_marked_at, confirmed_by, confirmed_at, corrected_by, note | unique(schedule_id, user_id) |
| `resident_point_ledger` | user_id, points, rule_code, source_key, msk_week, schedule_id, created_at | source_key unique — это и есть защита от двойного начисления |
| `resident_point_rules` | code, points, label, is_active | — |
| `resident_week_stats` | user_id, msk_week, confirmed_trainings, distinct_kinds, is_green | пересчитывается функцией, служит для серий и «Моего пути» |
| `resident_ranks` / `user_resident_ranks` | справочник званий и выданные звания, notified_at | — |
| `resident_badges` / `user_resident_badges` | постоянные цифровые знаки | — |
| `founder_settings` (в `internal_settings`) | `founder_tg_ids`, `founder_user_ids` | только для сервисной роли |

**Флаги на `rewards`** (nullable):
- `activity_program` (bool) — товар из программы активности;
- `min_months`, `min_full_weeks` — пороги доступа.

Старые товары и исторические заказы этих флагов не получают, ограничения на них не действуют.

## 4. Правила транзакций (ядро)

**Бронь (одна заявка на оба канала: веб и TG):**
1. `book_event(schedule_id, source, idempotency_key)` — общая внутренняя функция. Она блокирует событие (FOR UPDATE) и считает места: confirmed + pending_review + hold, у которого `hold_expires_at` ещё не наступил.
   - Бесплатное событие → `confirmed`, как и сейчас.
   - Платное → `hold` и `hold_expires_at` = now + hold_minutes.
   - Повторная запись возвращает существующую строку, новую не создаёт.
2. `register_for_event_web` и `book_schedule_session` становятся обёртками над `book_event`.
   - Если бот вызывает запись на платное событие → ответ `{booked:false, reason:'payment_required', deep_link}`.
   - Если бот пишет в таблицу напрямую, это перекрывает BEFORE INSERT триггер. На платном событии он разрешает только `booking_status='hold'` и только через `book_event` (проверка session-флага). Это и есть защита от обхода оплаты старыми callback.
3. `claim_payment_web(booking_id)`: переход hold → pending_review только для владельца брони и только пока hold не истёк. Пишет журнал и создаёт токены. Повторный вызов ничего не меняет.
4. `confirm_payment(token, tg_id, decision)` с сервисной ролью: tg_id должен быть в `founder_tg_ids`, токен не использован и не просрочен, бронь в статусе `pending_review`. Затем одним UPDATE … WHERE status='pending_review' RETURNING:
   - «Подтвердить» → confirmed + prepaid;
   - «Не поступил» → rejected, место освобождается.
5. `admin_booking_action(booking_id, action, amount, note)` — только super_admin: наличный остаток, частичная сумма, возврат, отмена, ручное подтверждение. Каждое действие — строка журнала.
6. Cron `expire_booking_holds` раз в 5 минут:
   - hold с истёкшим сроком → expired;
   - pending_review старше review_hours не отменяется, а ставит флаг «просрочена проверка» и отправляет напоминание основателю.

**Посещение и начисления:**
1. `self_mark_attendance_web(schedule_id)` — только при записи `confirmed`, в окне от начала события до 23:55 МСК того же дня. Ставит `self_marked`. Начислений нет.
2. `confirm_attendance(schedule_id, user_ids[], status)` — организатор этого события, тренер или super_admin. Может отметить и того, кто пришёл без записи (только super_admin или организатор).
3. При переходе в `confirmed` вызывается `apply_resident_rewards(user_id, schedule_id)`, но только если `is_club_resident`. Интенсив не затрагивается.
   - **Баллы за тренировку:** +10 с ключом `train:<sid>:<uid>`, если в эту неделю у резидента меньше 3 тренировок с баллами. Иначе посещение остаётся только в статистике.
   - **Бонус недели:** при 3 подтверждённых разных тренировках за неделю +10 баллов с ключом `week3:<uid>:<week>` и +70 коинов через `award_coins_by_rule('resident_week3', source 'resident_week', id недели)`.
   - **Серия:** если непрерывная серия зелёных недель кратна 4 → +20 коинов с ключом `streak:<uid>:<week>`.
   - **Остальные события:**

| Событие | Баллы | Коины |
|---|---|---|
| Краш-тест | +20 | — |
| Лекция | +10 | — |
| Мастермайнд | +5 | — |
| Баня | +10 | +15 (`resident_club_event`) |
| Спортивное событие | +10 | +15 (`resident_club_event`) |
| Экскурсия | +10 | +15 (`resident_club_event`) |

   - **Организатор:** +20 баллов после `approve_organizer_credit(schedule_id)` super_admin'ом.
4. Отмена подтверждения посещения пишет сторнирующие строки: −баллы в ledger, −коины через `admin_adjust_coins`-сторно с source. Исходные записи не удаляются.
5. Рейтинговые баллы не тратятся, в коины не конвертируются, исторического backfill нет. Начисления действуют от даты включения функции.

**Ручные коины:** `admin_adjust_coins` переводится на проверку `is_super_admin`. Добавляется необязательная ссылка на карточку резидента; причина обязательна, журнал — `coin_transactions` (только вставка). Ручные коины на рейтинг не влияют.
⚠️ Это сужение текущей логики доступа: обычные админы потеряют возможность ручных коинов. Нужен `APPROVE VISIBILITY admin_adjust_coins`.

**Особые тотемы:** `grant_special_totem(user_id, totem: bear|lighthouse, note)` — только `founder_user_ids`. Использует существующий `user_totems` с `is_manual=true`. Автоматической выдачи нет.

**Награды программы активности:** в `purchase_reward_web` добавляется проверка только для `rewards.activity_program=true`: стаж ≥ min_months календарных месяцев и подтверждённых зелёных недель ≥ min_full_weeks. Одного баланса недостаточно. Коуч-сессия заводится как неактивный товар до утверждения.

## 5. Экранные блоки

**`/app` резидента** (существующая оболочка `WebAppShell`; нижняя навигация не расширяется, новые разделы — плитки «Главной» и вкладки):
- **Расписание** (`WebScheduleView`):
  - единый календарь и бейдж «Платно ₽»;
  - новая карточка `EventPaymentCard`: цена, предоплата, остаток наличными, получатель, QR и ссылка банка, таймер hold, условия отмены, кнопка «Я оплатил», статус-чип;
  - deep-link `/app/event/:id` с сохранением назначения после логина в `AppLogin`;
  - бесплатные события без изменений.
- **Отметки** (`WebActivitiesView`, вкладка «Резидент»): прогресс-кольцо недели 0/3–3/3, календарь месяца с фактическими занятиями (подтверждено, ждёт, отклонено), кнопка самоотметки у сегодняшних событий, история недель.
- **Рейтинг** (`WebResidentViews`): переключатель месяц / квартал / всё время, таблица резидентов по баллам, «моё место», разбивка моих баллов по правилам. Коины других не показываются.
- **Мой путь** (новый `WebResidentPathView`, плитка на «Главной»):
  - итоги тренировок всего и по БЖЖ, кикбоксингу, ОФП;
  - зелёные недели, текущая и лучшая серия;
  - лестница званий с прогрессом и условием «не ранее 3 мес.»;
  - мероприятия, лекции, краш-тесты, инициативы;
  - цифровые знаки, существующие жетоны и тотемы (только показ), «Медведь» и «Маяк» при наличии;
  - баланс коинов, прогресс к футболке, бейсболке, худи по трём условиям;
  - модалка «Новое звание» по `notified_at`.

**Кабинет суперадмина** (новая группа вкладок «Резиденты» в существующей админке, без изменения прочих вкладок):

| Вкладка | Что внутри |
|---|---|
| Конструктор события | поля оплаты в `ClubScheduleManagement`, загрузка QR, организаторы, категория, лимиты, предпросмотр начислений |
| Заявки и оплаты | фильтры по статусам, карточка брони с журналом, ручное подтверждение, наличный остаток, возврат и отмена |
| Посещаемость | по событию: записаны, отметились, подтверждены; массовое подтверждение; коррекция |
| Правила начислений | `resident_point_rules`, `coin_rules` с префиксом `resident_*`, `resident_settings` |
| Рейтинг | те же периоды плюс детализация ledger по резиденту |
| Звания и награды | справочник званий, флаги наград программы, кто приближается к порогу |
| Ручные коины | в карточке резидента, только super_admin |
| Организаторы | назначение на события |
| Особые тотемы | видна только `founder_user_ids` |

**Экран организатора:** «Мои события» в `/app` показывается только при наличии назначений. Там список назначенных событий и подтверждение посещений; доступа к остальной админке нет.

## 6. Этапы (каждый — отдельное подтверждение)
| # | Этап | Файлы / объекты | Приёмка | Rollback |
|---|---|---|---|---|
| E0 | Контур БД | `supabase/config.toml` | ref = КЭМП; Amvera env сверен | вернуть строку |
| E1 | Бронь и платные события | миграция полей, `book_event`, триггер-блок, `claim_payment_web`, `admin_booking_action`, cron hold; `WebScheduleView`, `EventPaymentCard`, `ClubScheduleManagement`, deep-link | бесплатная запись без изменений; гонка за последнее место — 1 победитель; обход старым callback отклонён | DOWN: удалить триггер, функции, колонки |
| E2 | TG-подтверждение | Edge `notify-payment-claim`, `confirm_payment`, токены; документ `docs/tg-bot-contract.md` | чужой TG ID — отказ; повторный клик ничего не меняет; просроченный токен отклонён | отключить функцию |
| E3 | Посещения | `event_attendance`, `event_organizers`, RPC; «Отметки», «Посещаемость», «Мои события» | организатор видит только свои события; самоотметка не начисляет | DOWN таблиц |
| E4 | Начисления | ledger, rules, week_stats, `apply_resident_rewards`, новые `coin_rules`, сторно | 4-я тренировка без баллов; 3/3 → +10/+70 ровно один раз; серия на 4/8/12 неделе; интенсив без изменений | деактивировать правила, ledger сохраняется |
| E5 | Рейтинг | `get_resident_leaderboard_web(period)`, вкладки | чужие коины не отдаются RPC | удалить RPC |
| E6 | Мой путь и звания | ranks, badges, `WebResidentPathView`, модалка | звание не раньше 3 мес.; старые тотемы и Закал не меняются | DOWN |
| E7 | Коины и награды | сужение `admin_adjust_coins`, `grant_special_totem`, флаги `rewards`, проверка в `purchase_reward_web` | старые товары и заказы работают как раньше; мерч закрыт до 6 мес. + 24 недель | вернуть прежнее тело функции (снимок) |
| E8 | Сквозные тесты | `sql/resident-path/*.sql`, vitest, Deno-тесты, Playwright | сценарий «запись → оплатил → TG → посещение → баллы → коины» | — |

**Контракт для внешнего бота** (`kempclubpro-telegram-server`, меняется отдельно, в Lovable интеграция не изображается):
1. На `book_event` вызывать только RPC `book_schedule_session`. Если ответ `payment_required`, отправлять кнопку-URL на `deep_link`.
2. Обрабатывать callback `pay:<token>:ok|no`: вызвать `confirm_payment` с сервисной ролью и `from.id`, затем answerCallbackQuery и editMessageReplyMarkup (убрать кнопки).
3. Не писать в `schedule_participants` напрямую.
4. До обновления бота серверный триггер всё равно блокирует обход оплаты.

## 7. Блокеры безопасного старта (ответы не придуманы)
1. **Письменное подтверждение контура:** КЭМП = `wfjvjvbjjxcgkaolkgdq`, и какой ref использует Amvera. Без этого ни одной миграции.
2. **Telegram ID основателя (или нескольких)** для подтверждения оплат и ID аккаунта, которому доступны особые тотемы. Блокирует E2 и E7.
3. **Согласие на сужение `admin_adjust_coins` до super_admin.** Это изменение доступа для текущих админов. Блокирует E7.
4. **Список званий** (названия и пороги) и цифровых знаков. Блокирует E6; макет можно сделать на заглушках.

Остальное (hold 2 ч, проверка 24 ч, организатор-резидент, серия на 4/8/12 неделе) идёт по дефолтам раздела 2 до вашего решения.

**Безопасно делать первыми после E0:** E1 (без включения платных событий — флаг `is_paid` по умолчанию false), E3 и вёрстка «Отметок» и «Мой путь» на чтении. Они не меняют существующие начисления и не требуют бота.
