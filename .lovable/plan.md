# КЭМП — аудит текущего устройства для «Пути резидента» (read-only)

Ничего не менялось: код, БД, бот, Amvera, production не трогались. Данные — из кода `src/` и read-only запросов к wfjvjvbjjxcgkaolkgdq.

## 1. Карта: есть сейчас / не реализовано

| Блок | Есть сейчас (файлы, RPC, данные) | Не реализовано |
|---|---|---|
| Клубный календарь (создание) | `src/components/schedule/ClubScheduleManagement.tsx` — прямые insert/update в `schedules`, список записавшихся из `schedule_participants`. Активные клубные события: BJJ 3, Кикбоксинг 2, Мастермайнд 3, Лекции 6, Баня 1, Выездное 7, Встреча клуба 7 и др. Тип хранится в `activity_type` свободным текстом | Нет нормализованного «вида» события для начислений (тренировка/баня/спорт/экскурсия/лекция/ММ/краш-тест); ОФП в клубе не заведена |
| Расписание резидента /app | `WebScheduleView.tsx` + `apiAdapter.tsx` (`get_club_schedule` → `get_schedule_web`, фильтр `schedule_type='club'`), запись `register_for_event_web` / `unregister_from_event_web` | — |
| Подтверждение посещения | В `schedule_participants` есть колонка `attended`, но 0 из 50 записей отмечены; в коде её никто не записывает (только читают `get_schedule_web`/`get_schedule_for_user`). ММ — отдельно `mastermind_attendance` (самоотметка + админ, `MastermindTracksPanel.tsx`) | Экран «Отметить присутствие» у основателя, массовое подтверждение, кто/когда подтвердил |
| «Отметки» | `WebActivitiesView.tsx` → `check_in_activity_web(p_activity_type)` пишет `activity_checkins` (bjj, kickboxing, ofp, nutrition, pyramid, tactics) — это самоотметка интенсива, не привязана к событию | Не годится как основание для начислений резидентам |
| Рейтинг | Интенсив: `get_rating_web`. Резиденты: `get_resident_rating_web` — сортировка по `leaderboard.total_points` всех `club_resident`, имена маскируются, коины не показываются | Периоды месяц/квартал, баллы из подтверждённых посещений |
| Coins / магазин | `coin_transactions` (журнал), `coin_rules` (training_attendance=1, event_participation=2 и др. — суммы не совпадают с новыми правилами), `get_user_coin_balance`, `award_coins_by_rule`, `admin_adjust_coins` (причина обязательна), `get_shop_web`/`purchase_reward_web`, `ParticipantCoinsManager.tsx`, `RewardsShop.tsx` | Правила резидента (+70 за 3/3, +20 за 4 недели, +15 баня/спорт/экскурсия), недельная идемпотентность |
| Жетоны / тотемы / бейджи | `totems`, `user_totems`, `ParticipantTotemsTab.tsx`, `UserTotems.tsx`, `achievements/*`, `SpecialBadges.tsx` | Медведь/Маяк как только-ручные, звания, мерч-пороги (3 мес / 6 мес + 24 недели) |
| Права основателя | `is_admin`, `is_super_admin`, `has_role`; роли admin/super_admin/trainer/captain существуют | Ограничение подтверждений и ручных коинов именно основателем (сейчас `admin_adjust_coins` пускает любого `is_admin`) |
| Telegram рассылки / deep link | `BroadcastManagement.tsx` → `send-to-group`, кнопка «Запись на событие» (только клубные, тема+дата); бот на Amvera, записи через `book_schedule_session` (service_role) | Deep link в `/app?event=<id>` не найден в коде (только в плане E1) |
| «Мой путь» | Нет экрана | Весь блок |
| Платные события | Draft PR #2, не применён | Не трогать |

Статусы: `club_resident` approved 32 / не approved 10; `intensive_active` 12.

## Найденные риски безопасности (не исправлять без отдельного разрешения)
- `check_in_activity(p_telegram_id, p_activity_type)` — SECURITY DEFINER, EXECUTE у `anon`: можно отметить чужого по telegram_id. Нужно проверить, вызывает ли его бот (тогда — service_role only).
- `admin_adjust_coins` — EXECUTE у `anon` (внутри есть проверка `is_admin`, поэтому без входа не сработает), но право шире, чем «только основатель».

## 2. Рекомендуемый порядок

Предлагаю начать с **(б) + узкого (а)**, а не с чистого (а):
- Чистый «Мой путь» без (б) покажет пустоту: подтверждённых посещений сейчас 0, самоотметки интенсива не являются фактом.
- Этап 1 (б): основатель отмечает присутствие по существующим клубным событиям (одно событие → список записавшихся → «Пришёл / Не пришёл», массово). Без начислений. Пишется в существующую `attended` + кто/когда.
- Этап 2 (а): read-only «Мой путь» по реальным данным — посещения по направлениям, полные недели 3/3, стрик, дни в клубе. Без званий/мерча/начислений; там, где правило не начислено, писать «скоро».
- Этап 3 (в): начисления баллов/коинов идемпотентно по подтверждённому посещению + рейтинг за периоды.
- Этап 4: звания, мерч, Медведь/Маяк.
- Этап 5 (г): оплаты (E1/E2) после серверных guard и бота.

Платная ветка Supabase не нужна для этапов 1–2: изменения аддитивные и откатываемые; при этом каждое применение в production — только по вашему APPROVE.

## 3. Минимальные изменения (этап 1 + 2)

БД (одна миграция, UP/DOWN):
- `schedule_participants`: добавить `attended_marked_by uuid`, `attended_marked_at timestamptz` (nullable, без изменения старых строк).
- RPC `founder_mark_attendance(p_schedule_id uuid, p_marks jsonb)` — SECURITY DEFINER, проверка «основатель» (`is_super_admin`), только `schedule_type='club'`, только уже записавшиеся, EXECUTE только `authenticated`.
- RPC `get_my_path_web()` — только `auth.uid()`, только `club_resident`, считает из `attended=true` по клубным событиям с маппингом `activity_type` → направление.
- Маппинг видов: функция/таблица `club_activity_kind` (текст `activity_type` → training_bjj/ofp/kick, banya, sport, excursion, lecture, mastermind, crash_test).

Frontend:
- `ClubScheduleManagement.tsx` — кнопка «Отметить присутствие» в карточке события (диалог, массовые галочки).
- Новый `WebMyPathView.tsx` + плитка в `RESIDENT_TILES` (`WebAppShell.tsx`), action `get_my_path` в `apiAdapter.tsx`.

Не трогать: `coin_*`, магазин, `leaderboard`, интенсив, бот, `book_schedule_session`, E1.

Тесты:
- SQL: не-основатель получает отказ; нельзя отметить незаписавшегося; нельзя отметить интенсив-событие; повторная отметка идемпотентна; `anon` без EXECUTE.
- Vitest: маппинг вида события; подсчёт полной недели 3/3 по Пн/Ср/Пт по МСК; стрик сбрасывается при неполной неделе.
- Playwright: основатель отмечает двоих → у резидента в «Моём пути» +1 посещение.

## 4. Вопросы, блокирующие реализацию
1. Кто «основатель» технически — один конкретный аккаунт (нужен его user_id/email) или все `super_admin`? Сейчас роль admin тоже даёт права на коины.
2. «Спорт» и «экскурсия» — какие текущие названия в календаре им соответствуют («Выездное мероприятие», «Встреча клуба», «Выезд на природу», «Совместный ужин»)? Без этого маппинг нельзя сделать честно.
3. 10 резидентов с approved=false — показывать им «Мой путь» или нет?
4. Полная неделя: строго Пн БЖЖ + Ср ОФП + Пт ударка, или любые 3 тренировки за неделю (перенос/замена)?
5. Посещения до запуска (исторические, неотмеченные) — учитывать, если вы отметите их задним числом, или стартуем с даты запуска?
6. `check_in_activity` (anon) — закрыть до service_role в этом же этапе (нужна сверка с ботом)?

Оценка этапов 1+2: ~8–15 кредитов. Для старта: ответы на 1–2 и `APPROVE BREAKING resident-path-1`.
