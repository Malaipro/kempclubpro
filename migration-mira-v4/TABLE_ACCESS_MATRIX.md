# TABLE_ACCESS_MATRIX.md — матрица табличных прав (v3)

Принцип: **GRANT никогда не шире, чем разрешает RLS-политика**. Роль `service_role`
получает полный доступ (её используют edge-функции и `telegram-server`), `anon` —
только публичный лендинг и форма заявки, `authenticated` — то, что реально вызывает
ЛК и админка.

Обозначения: S = SELECT, I = INSERT, U = UPDATE, D = DELETE.

## 1. Доступ для `anon` (15 таблиц + 2 представления на чтение, 2 таблицы на запись)

> v4: гранты `anon` на `public_profiles` и `cooper_test_results` сняты — публичные
> результаты отдаются через `public_leaderboard_view` и `public_cooper_results_view`
> (см. `PUBLIC_DATA_EXPOSURE.md`).

| Таблица | anon | Почему |
|---|---|---|
| achievement_types, achievements | S | справочники достижений на публичных страницах |
| activities | S | список активностей |
| ascetic_types | S | только `is_active = true` (RLS) |
| challenges | S | витрина челленджей |
| content_blocks | S | тексты лендинга (CMS) |
| intensive_streams, streams | S | даты и названия потоков |
| leaderboard | S | RLS: только `is_public_participant(user_id)` (v4) |
| public_leaderboard_view | S | **v4**: псевдоним, display_name, баллы, ранг, статус |
| public_cooper_results_view | S | **v4**: псевдоним, display_name, результат, этап, дата |
| moments | S | публичная галерея |
| public_testimonials | S | отзывы |
| referral_settings | S | размер бонуса на странице `/join` |
| schedules | S | RLS отдаёт только `intensive` + `is_active` |
| totems | S | справочник тотемов |
| trainers | S | блок тренеров |
| training_programs | S | описание программ |
| **contact_submissions** | **I** | форма заявки; чтение явно запрещено политикой `Deny public read access` |
| **referral_leads** | **I** | заявка по реферальной ссылке; проверка кода в `WITH CHECK` |

## 2. Таблицы без доступа клиентских ролей (только `service_role`)

`admin_access_log`, `contact_rate_limit`, `telegram_bot_sessions` — служебные,
политик для клиентов нет, значит и грантов быть не должно.

## 3. Доступ для `authenticated`

Выдаётся по объединению команд действующих RLS-политик таблицы. Примеры сужений
относительно v2:

| Таблица | v2 (anon/auth/service) | v3 anon | v3 authenticated |
|---|---|---|---|
| profiles | ALL / ALL / ALL | — | S, I, U, D (RLS: своя строка либо админ) |
| contracts | ALL / ALL / ALL | — | S (запись — только service_role/супер-админ) |
| contract_data | ALL / ALL / ALL | — | S, I, U |
| coin_transactions | ALL / ALL / ALL | — | S, I, U, D |
| user_roles | ALL / ALL / ALL | — | S, I, U, D (RLS: только супер-админ на запись) |
| audit_log, role_audit_log | ALL / ALL / ALL | — | S (+ I у `audit_log`) |
| telegram_leads | ALL / ALL / ALL | — | S, U |
| mastermind_* | ALL / ALL / ALL | — | см. `RLS_REVIEW.md` |
| журналы (`journal_*`), ДЗ, аскезы, привычки | ALL / ALL / ALL | — | по своим политикам |

Полный перечень — в `migrations/07_grants.sql`, по одной строке `GRANT` на таблицу и роль.

## 4. Что это меняет для приложения

- Публичный лендинг, форма заявки и `/join` работают без авторизации, как и раньше.
- ЛК и админка работают под `authenticated`; ограничения по строкам по-прежнему даёт RLS.
- `telegram-server` и edge-функции ходят под `service_role` — для них ничего не изменилось.
- Любая **новая** таблица без явного `GRANT` окажется недоступна клиентам (безопасный дефолт),
  в отличие от v2, где она автоматически была бы открыта `anon`.
