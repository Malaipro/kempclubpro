# AUTHORIZATION_TESTS.md (v5)

Ручные проверки после накатки миграций. Выполнять с ключами проекта МИРА.
`U1` — обычный участник, `U2` — другой участник, `A` — админ (`user_roles.role='admin'`).

## 1. Матрица ожиданий

| Вызов | anon | U1 (свой uid) | U1 (чужой uid U2) | A (админ) | service_role |
|---|---|---|---|---|---|
| `update_participant_status(uuid, status)` | ❌ permission denied for function | ❌ `access denied: admin role required...` | ❌ access denied | ✅ выполняется | ❌ у обёртки (`auth.uid()` пуст) → использовать `_internal_update_participant_status` ✅ |
| `_internal_update_participant_status(...)` | ❌ permission denied | ❌ permission denied | ❌ permission denied | ❌ permission denied | ✅ |
| `get_user_coin_balance(uuid)` | ❌ permission denied | ✅ свой баланс | ❌ `access denied: own balance or admin role required` | ✅ любой | ❌ обёртка → `_internal_get_user_coin_balance` ✅ |
| `_internal_get_user_coin_balance(uuid)` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `update_user_leaderboard(uuid)` | ❌ permission denied | ✅ свой | ❌ access denied | ✅ любой | ❌ обёртка → `_internal_update_user_leaderboard` ✅ |
| `_internal_update_user_leaderboard(uuid)` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `decrypt_phone(text)` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `/rest/v1/profiles` | ❌ permission denied | только свои строки по RLS | ❌ | ✅ | ✅ |
| `/rest/v1/public_leaderboard_view` | ✅ без `user_id`, без `current_stream_id` | ✅ | ✅ | ✅ | ✅ |
| `/rest/v1/public_cooper_results_view` | ✅ только `verified=true` | ✅ | ✅ | ✅ | ✅ |

> Обёртки намеренно требуют `auth.uid()`. Серверный код (Edge Functions, telegram-server, cron)
> обязан вызывать соответствующую `_internal_*`-функцию — она доступна только `service_role`.

## 2. Команды

```bash
ANON=<anon key>; URL=https://<ref>.supabase.co

# anon не может вызвать обёртку
curl -s -X POST "$URL/rest/v1/rpc/update_participant_status" \
  -H "apikey: $ANON" -H "Content-Type: application/json" \
  -d '{"p_user_id":"00000000-0000-0000-0000-000000000000","p_new_status":"club_resident"}'
# ожидание: permission denied for function update_participant_status

# обычный участник (JWT U1) — повышение себя до резидента
curl -s -X POST "$URL/rest/v1/rpc/update_participant_status" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_U1" -H "Content-Type: application/json" \
  -d '{"p_user_id":"<U1>","p_new_status":"club_resident"}'
# ожидание: access denied: admin role required for update_participant_status

# перебор чужого баланса
curl -s -X POST "$URL/rest/v1/rpc/get_user_coin_balance" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_U1" -H "Content-Type: application/json" \
  -d '{"p_user_id":"<U2>"}'
# ожидание: access denied: own balance or admin role required

# внутренняя функция недоступна клиенту
curl -s -X POST "$URL/rest/v1/rpc/_internal_get_user_coin_balance" \
  -H "apikey: $ANON" -H "Authorization: Bearer $JWT_U1" -H "Content-Type: application/json" \
  -d '{"p_user_id":"<U1>"}'
# ожидание: permission denied
```

## 3. SQL-контроль после накатки

```sql
-- 1. Ни одна функция не авторизует по current_user
select p.proname
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and pg_get_functiondef(p.oid) ilike '%current_user NOT IN%';
-- ожидание: 0 строк

-- 2. У _internal_* нет прав клиентских ролей
select p.proname, r.rolname
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
cross join unnest(array['anon','authenticated']) r(rolname)
where n.nspname='public' and p.proname like '\_internal\_%'
  and has_function_privilege(r.rolname, p.oid, 'EXECUTE');
-- ожидание: 0 строк

-- 3. Публичное представление не отдаёт stream id
select column_name from information_schema.columns
where table_name = 'public_leaderboard_view';
-- ожидание: participant_key, display_name, total_points, rank_position,
--           participant_status, is_active_stream
```
