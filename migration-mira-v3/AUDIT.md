# AUDIT.md — аудит структуры действующей базы КЭМП

**Источник:** действующий Supabase-проект, к которому подключён `kempclub.pro` (ref `wfjvjvbjjxcgkaolkgdq`).
**Метод:** только чтение системных каталогов (`pg_class`, `pg_policies`, `pg_proc`, `pg_trigger`, `information_schema`) через read-only SQL.
**Дата снятия среза:** 09.08.2026.

> ⚠️ Ни один SQL-оператор изменения не выполнялся. База КЭМП не изменялась.
> Файл `migration_export.sql` в корне репозитория **устарел и не использовался** (он неполный и содержит рабочие INSERT).

---

## 1. Сводная статистика

| Объект | Количество |
|---|---|
| Таблицы (schema `public`) | 80 |
| VIEW / MATERIALIZED VIEW | 0 |
| ENUM-типы | 13 |
| Функции (`public`) | 92 |
| — из них `SECURITY DEFINER` | 90 |
| Триггеры (`public`) | 53 |
| Ограничения (PK/UNIQUE/CHECK/FK) | 204 |
| — из них FOREIGN KEY | 79 |
| — из них FK на `auth.users` | 31 |
| Дополнительные индексы | 63 |
| Таблицы с включённым RLS | 80 из 80 (100 %) |
| RLS-политики (`public`) | 194 |
| RLS-политики (`storage.objects`) | 38 |
| Storage-бакеты | 8 |
| Cron-задачи (`pg_cron`) | 4 |
| Edge-функции | 17 |

---

## 2. Таблицы (80)

Сгруппированы по назначению.

**Ядро / пользователи**
`profiles`, `public_profiles`, `user_roles`, `participant_notes`, `participant_status_history`, `participant_tags`, `profile_tags`, `admin_sessions`, `notifications`

**Потоки и расписание**
`streams`, `intensive_streams`, `schedules`, `schedule_participants`, `training_programs`, `training_sessions`, `trainers`, `lectures`, `tactical_sessions`

**Геймификация**
`achievements`, `achievement_types`, `user_achievements`, `activities`, `user_activities`, `activity_checkins`, `leaderboard`, `user_points`, `totems`, `user_totems`, `pyramid_levels`, `challenges`, `challenge_entries`, `user_challenges`, `crash_tests`, `hero_races`, `cooper_test_results`

**Экономика (коины и награды)**
`coin_rules`, `coin_transactions`, `rewards`, `reward_requests`

**Аскезы и привычки**
`ascetic_types`, `ascetic_activities`, `participant_habits`, `habit_progress`, `аскезы_участников`

**Ежедневник**
`journal_prompts`, `journal_entries`, `journal_answers`, `journal_emotions`, `weekly_summaries`

**Домашние задания и мастермайнд**
`homework_assignments`, `homework_submissions`, `mastermind_groups`, `mastermind_members`, `mastermind_tasks`, `mastermind_entries`

**CRM / заявки / рефералы**
`contact_submissions`, `contact_rate_limit`, `application_notes`, `application_reminders`, `referral_leads`, `referral_settings`, `telegram_leads`

**Контент и коммуникации**
`content_blocks`, `materials`, `moments`, `testimonials`, `public_testimonials`, `broadcasts`, `broadcast_messages`, `broadcast_responses`, `telegram_bot_logs`, `telegram_bot_sessions`

**Договоры**
`contracts`, `contract_data`

**Аудит и безопасность**
`audit_log`, `admin_access_log`, `role_audit_log`

**Легаси (кириллические имена)**
`участники`, `кэмп_активности`, `тотемы_участников`

---

## 3. ENUM-типы (13)

`activity_type`, `activity_type_new`, `app_role`, `journal_day_type`, `lecture_subtype`, `participant_status_type`, `reward_type`, `schedule_type`, `shram_subtype`, `totem_type`, `training_subtype`, `user_role`, `zakal_subtype`

⚠️ Дублирование: одновременно живут `activity_type` / `activity_type_new` и `app_role` / `user_role`. Перенесены как есть, чтобы функции и политики скомпилировались.

---

## 4. Функции (92)

- 90 из 92 — `SECURITY DEFINER`.
- Без `SECURITY DEFINER`: `generate_referral_code`, `normalize_phone`.
- **Без `SET search_path`: `generate_referral_code`** — потенциальный риск подмены search_path (см. раздел «Риски»).

Ключевые группы:
- доступ и роли: `has_role`, `is_admin`, `is_super_admin`, `is_club_resident`, `is_public_participant`;
- Telegram Mini App (RPC по `telegram_id`): `get_participant_full_state_by_telegram`, `get_profile_for_user`, `get_schedule_for_user`, `get_homework_for_user`, `get_journal_for_user`, `get_rating_for_user`, `get_pyramid_for_user`, `get_ascetic_for_user`, `check_in_activity`, `book_schedule_session`, `submit_homework`, `save_journal_entry`, `take_ascetic`, `checkin_ascetic`;
- server-side действия ЛК: `server_register_for_event`, `server_unregister_from_event`, `server_create_reward_request`, `server_challenge_checkin`, `server_create_mastermind_task`, `server_complete_mastermind_task`, `server_submit_mastermind_entry`;
- экономика: `award_coins_by_rule`, `admin_adjust_coins`, `get_user_coin_balance`, `admin_list_coin_balances`, `create_reward_request`, `review_reward_request`;
- рефералы: `ensure_referral_code`, `validate_referral_code`, `confirm_referral_lead`, `admin_confirm_referral`;
- телефоны: `normalize_phone`, `encrypt_phone`, `decrypt_phone`, `mask_phone_number`, `mask_phone_secure`, `mask_email_secure`, `mask_participant_name`;
- триггерные: `handle_new_user`, `handle_new_user_participant`, `update_updated_at_column`, `sync_public_profiles`, `trigger_update_leaderboard`, `log_role_changes` и др.

Проверка на PII: жёстко зашитых e-mail, телефонов и UUID пользователей в телах функций **не найдено** (grep по шаблонам e-mail / `+7…` / t.me — 0 совпадений).
`encrypt_phone` / `decrypt_phone` реализованы через Base64 — это **не шифрование**, см. «Риски».

---

## 5. RLS

- RLS включён на **всех 80** таблицах.
- 194 политики. Модель: владелец строки по `auth.uid()` + административный обход через `is_admin()` / `is_super_admin()` / `has_role()`.
- `storage.objects` — 38 политик по 8 бакетам.
- Часть политик объявлена `TO public` вместо `TO authenticated` (историческое) — доступ при этом всё равно ограничен предикатом `is_admin(auth.uid())`.

## 6. GRANT'ы

В действующей базе на **всех** таблицах `public` выданы полные привилегии ролям `anon`, `authenticated`, `service_role` (унаследованный дефолт Supabase). Реальное разграничение выполняет RLS. Экспорт воспроизводит это состояние 1:1 (файл `07_grants.sql`), чтобы поведение МИРА совпало с КЭМП. Ужесточение — отдельная задача, см. «Риски».

## 7. Storage-бакеты (8)

`avatars`, `broadcasts`, `content`, `contracts`, `homework-files`, `moments`, `pyramid-materials`, `testimonials`

Бакеты создаются **вручную/инструментом**, не SQL-вставкой (см. README).

## 8. Cron (pg_cron, 4 задачи)

| Задача | Расписание |
|---|---|
| `journal-morning` | `30 6 * * *` |
| `journal-evening` | `0 18 * * *` |
| `weekly-journal-summary` | `0 5 * * 1` |
| `send-admin-reminders-every-5-min` | `*/5 * * * *` |

Не входят в SQL-файлы экспорта: содержат URL проекта и служебный ключ. Пересоздаются вручную в МИРА (README).

---

## 9. Риски и замечания

1. **`encrypt_phone` / `decrypt_phone` — Base64, а не шифрование.** Любой, кто получил значение, восстановит телефон. Для МИРА рекомендуется либо хранить телефон в открытом виде под строгим RLS, либо использовать `pgsodium`/vault.
2. **`generate_referral_code` без `SET search_path`** — рекомендуется добавить `SET search_path = public` при накатке в МИРА.
3. **Полные GRANT'ы для `anon`** на всех таблицах: единственная защита — RLS. Любая новая таблица без политики окажется публично доступной. В МИРА стоит сузить гранты до `SELECT` для `anon` только там, где это нужно.
4. **31 FK на `auth.users`** — порядок накатки важен: `auth` уже существует, но пользователей нет; триггеры `on_auth_user_created` создадут профили при первой регистрации.
5. **Дублирующие ENUM'ы** (`app_role`/`user_role`, `activity_type`/`activity_type_new`) — легаси, перенесены как есть. Чистка возможна только вместе с рефакторингом кода.
6. **Кириллические имена таблиц** (`участники`, `кэмп_активности`, `тотемы_участников`) — легаси, требуют кавычек в SQL; часть кода на них ещё ссылается.
7. **Политики `TO public`** — стоит перевести на `TO authenticated` в МИРА.
8. **Тексты и суммы КЭМП** (вопросы ежедневника, уровни Пирамиды, награды, челленджи) намеренно не перенесены — у женского лагеря контент свой.
9. **Расхождение локальных миграций и факта:** в `supabase/migrations/` 197 файлов, часть объектов создавалась поверх. Источником истины для этого экспорта является **фактическое состояние БД**, а не история миграций.

---

## 10. Подтверждения

- ✅ Никакой SQL к базе МИРА не применялся.
- ✅ Никакой изменяющий SQL к базе КЭМП не выполнялся — только `SELECT` из системных каталогов.
- ✅ Рабочий код приложения не изменялся.
- ✅ Реальные данные, пользователи Auth, PII и значения секретов в экспорт не попали.
- ✅ `migration_export.sql` не использовался.
