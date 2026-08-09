# RLS_REVIEW.md — ревизия политик (v3)

Всего 194 политики на 80 таблицах + 38 политик `storage.objects`. RLS включён везде.
Ниже — что изменено относительно v2 и почему.

## 1. `TO public` → `TO authenticated` (97 политик)

В v2 117 политик были объявлены `TO public`, то есть роль `anon` тоже проходила проверку.
Фактический доступ ограничивал предикат (`auth.uid()`, `is_admin(...)`), но при пустом
`auth.uid()` это защита «по стечению обстоятельств», а не по замыслу.

Правило замены: политика остаётся `TO public`, только если она одновременно
(а) относится к таблице из публичного списка (`TABLE_ACCESS_MATRIX.md`, раздел 1),
(б) это `SELECT`, и (в) её предикат не ссылается на `auth.uid()` / `is_admin` / `has_role`.
Плюс отдельное исключение — `contact_submissions` `INSERT` (форма заявки с лендинга).

Остальные 97 переведены на `TO authenticated`. Поведение для залогиненных пользователей
не меняется, для анонимов доступ закрывается на уровне роли, а не предиката.

## 2. Мастермайнд — исправлены политики с предикатом `true` (критично)

| Политика | Было (v2) | Стало (v3) |
|---|---|---|
| `mm_entries_insert` | `TO public WITH CHECK (true)` — любой аноним мог писать отчёты от любого участника | `TO authenticated`, `WITH CHECK` — запись только от своей строки `mastermind_members` |
| `mm_tasks_update` | `TO public USING (true)` — любой мог править чужие задачи | `TO authenticated`, только своя задача или админ |
| `mm_entries_read`, `mm_tasks_read` | `TO public USING (true)` | `TO authenticated`, своя запись или админ |
| `mm_members_read` | `TO public USING (true)` | `TO authenticated`, `user_id = auth.uid()` или админ |
| `mm_groups_read` | `TO public USING (true)` | `TO authenticated`, участник группы или админ |

Мини-апп продолжает работать: он ходит через `telegram-server` под `service_role`
(`server_create_mastermind_task`, `server_complete_mastermind_task`, `server_submit_mastermind_entry`),
а RLS для `service_role` не применяется. Админка работает через ветку `is_admin(auth.uid())`.

## 3. Политики, намеренно оставленные публичными

`achievement_types`, `achievements`, `activities`, `ascetic_types` (`is_active`),
`challenges`, `content_blocks`, `cooper_test_results` (`verified` + публичный профиль),
`intensive_streams`, `leaderboard` (только строки из `public_profiles`), `moments`,
`public_profiles`, `public_testimonials`, `referral_settings`, `schedules`
(`intensive` + `is_active`), `streams`, `totems`, `trainers`, `training_programs` — чтение;
`contact_submissions` — вставка; `referral_leads` — вставка с проверкой кода.

Чтение `contact_submissions` анонимом закрыто отдельной политикой `USING (false)`.

## 4. `storage.objects` (11 политик ужесточено)

`TO public` остался только у четырёх публичных SELECT-политик: `avatars`, `content`,
`moments`, `testimonials` (эти бакеты публичные по назначению). Административные и
пользовательские политики (`contracts`, `homework-files`, `broadcasts`,
`pyramid-materials`, загрузка/удаление медиа) переведены на `TO authenticated`.

## 5. Что осталось на будущее

- `encrypt_phone`/`decrypt_phone` — это Base64, а не шифрование. В МИРА стоит либо хранить
  телефон открыто под строгим RLS, либо перейти на Vault/`pgsodium`. Логику не меняли,
  чтобы не ломать приложение.
- Дублирующие enum'ы (`app_role`/`user_role`, `activity_type`/`activity_type_new`) и три
  таблицы с кириллическими именами перенесены как есть — чистка требует правок в коде.
