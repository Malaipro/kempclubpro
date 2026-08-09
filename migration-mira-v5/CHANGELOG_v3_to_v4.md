# CHANGELOG_v3_to_v4.md

Что изменено в `migration-mira-v4` относительно `migration-mira-v3`.
Схема таблиц и колонок **не менялась**. Изменены: тела трёх функций (добавлены
проверки прав), гранты, три RLS-политики, добавлены бакеты и два представления.

## 1. Блокеры безопасности (SECURITY DEFINER + EXECUTE)

`04_functions.sql`:

| Функция | Правка |
|---|---|
| `update_participant_status` | добавлен `RAISE EXCEPTION`, если вызывающий не админ |
| `get_user_coin_balance` | переписана на plpgsql; только свой баланс или админ |
| `update_user_leaderboard` | только свой `user_id` или админ |

Шаблон проверки не ломает вызовы из триггеров, cron и `service_role`
(`auth.uid() IS NULL` / `current_user IN ('service_role','postgres','supabase_admin')`).

`07_grants.sql`: отозван `EXECUTE` у `authenticated` на `decrypt_phone`,
`mask_email_secure`, `mask_phone_secure`, `mask_phone_number`, `mask_participant_name`.
Подробности и обоснование — `SECURITY_NOTES.md`.

## 2. `REVOKE CREATE ON SCHEMA public`

Добавлено в начало `07_grants.sql` для `PUBLIC, anon, authenticated`.

## 3. Storage buckets

`10_storage.sql`: восемь бакетов создаются идемпотентно
(`INSERT ... ON CONFLICT (id) DO UPDATE`) до политик — `avatars`, `content`,
`moments`, `testimonials` (публичные), `pyramid-materials`, `homework-files`,
`broadcasts`, `contracts` (приватные), с лимитами размера и списками MIME,
выведенными из фактического кода загрузок. 38 политик не изменились.

## 4. Публичные персональные результаты

- Новый файл-содержимое `06_views.sql`: `public_leaderboard_view` и
  `public_cooper_results_view` — безопасные проекции без `user_id`, ФИО, возраста,
  пола и заметок; вместо `user_id` — псевдоним `participant_key`.
- `07_grants.sql`: сняты гранты `anon` на `public_profiles` и `cooper_test_results`,
  выданы гранты на два представления.
- `08_rls_policies.sql`: три «публичные» политики Купера заменены одной
  (`TO authenticated`, `verified = true AND is_public_participant(user_id)`);
  политика `public_profiles` переведена на `TO authenticated`;
  anon-политика `leaderboard` больше не читает `public_profiles` напрямую, а вызывает
  `is_public_participant` (ей выдан `EXECUTE` для `anon`).
- Требуемая адаптация фронтенда перечислена в `PUBLIC_DATA_EXPOSURE.md` §4.

## 5. Документация

Добавлены `PUBLIC_DATA_EXPOSURE.md`, `SECURITY_NOTES.md`, `LEGACY_MODULES.md`,
`REFERENCE_DATA.md`, этот changelog. Обновлены `README.md`,
`TABLE_ACCESS_MATRIX.md`, `FUNCTION_ACCESS_MATRIX.md`.

## 6. Осознанно не менялось

- base64-«шифрование» телефона (замена требует правок в коде авторизации);
- дублирующие enum'ы и кириллические таблицы (`LEGACY_MODULES.md`);
- логика остальных 89 функций и все триггеры.
