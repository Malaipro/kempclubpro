# CHANGELOG v4 → v5

v5 = v4 + исправление **caller authorization** в `SECURITY DEFINER`-функциях.
Базы и папки v2/v3/v4 не изменялись. SQL не применялся.

## 1. Корневая ошибка v4

Внутри `SECURITY DEFINER` `current_user` — это **владелец функции** (обычно `postgres`),
а не роль вызывающего клиента. Поэтому условие

```sql
AND current_user NOT IN ('service_role','postgres','supabase_admin')
```

всегда было ложным при вызове из PostgREST, то есть **вся проверка прав пропускалась**.
Любой залогиненный пользователь мог вызвать `update_participant_status` и стать `club_resident`.

## 2. Новая модель: internal + wrapper

| Функция | v5 |
|---|---|
| `_internal_update_participant_status(uuid, participant_status_type)` | логика без проверок, `EXECUTE` только `service_role` |
| `update_participant_status(uuid, participant_status_type)` | обёртка: `auth.uid()` обязателен + `public.is_admin(auth.uid())`, иначе `RAISE EXCEPTION` |
| `_internal_update_user_leaderboard(uuid)` | логика без проверок, `EXECUTE` только `service_role` |
| `update_user_leaderboard(uuid)` | обёртка: свой `auth.uid()` или админ |
| `_internal_get_user_coin_balance(uuid)` | логика без проверок, `EXECUTE` только `service_role` |
| `get_user_coin_balance(uuid)` | обёртка: свой `auth.uid()` или админ |

`current_user` для авторизации **не используется нигде** (0 вхождений `current_user NOT IN` в `04_functions.sql`).

Все внутренние вызовы переведены на `_internal_*`, чтобы триггеры, cron, Edge Functions
и telegram-server (где `auth.uid()` пуст) продолжали работать:

- `_internal_get_user_coin_balance` ← `admin_adjust_coins`, `admin_confirm_referral`,
  `confirm_referral_lead`, `enroll_application`, `get_participant_full_state`, `create_reward_request`.
- `_internal_update_user_leaderboard` ← `trigger_update_leaderboard`, `update_leaderboard_on_ascetic`,
  `review_homework_submission`, `_internal_update_participant_status`, `award_coins_by_rule`.

## 3. Гранты (`07_grants.sql`)

- `REVOKE EXECUTE` на все три `_internal_*` у `PUBLIC, anon, authenticated`, `GRANT` только `service_role`.
- Публичные обёртки остаются доступны `authenticated` — они безопасны.
- `decrypt_phone` и `mask_*` по-прежнему только `service_role`.

## 4. Представление (`06_views.sql`)

`public_leaderboard_view` больше не отдаёт `current_stream_id`.
Вместо него — булев `is_active_stream` (участник в текущем активном потоке).
Оба представления теперь пересоздаются через `DROP VIEW IF EXISTS` + `CREATE VIEW`
(смена набора колонок несовместима с `CREATE OR REPLACE`).

**Правка фронтенда:** в `src/components/participants/RegisteredParticipants.tsx`
фильтр `.in('current_stream_id', activeStreamIds)` заменить на `.eq('is_active_stream', true)`
при переходе на представление.

## 5. Проверка

См. `AUTHORIZATION_TESTS.md` — матрица allow/deny для anon, обычного участника,
админа и service_role.
