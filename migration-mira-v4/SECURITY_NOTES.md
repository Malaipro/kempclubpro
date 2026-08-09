# SECURITY_NOTES.md (v4)

Модель угроз и принятые решения. Читать вместе с `PUBLIC_DATA_EXPOSURE.md`,
`TABLE_ACCESS_MATRIX.md`, `FUNCTION_ACCESS_MATRIX.md`.

## 1. Базовый принцип

Любой пользователь с anon-ключом может обратиться к PostgREST напрямую и вызвать
**любую** функцию, на которую есть `EXECUTE`, с **любыми** аргументами. Скрытая кнопка
в интерфейсе — не защита. Поэтому в v4 каждая `SECURITY DEFINER`-функция, доступная
роли `authenticated`, обязана проверять права **внутри тела**.

## 2. Исправлено в v4: функции без внутренней проверки

| Функция | Было (v3) | Стало (v4) |
|---|---|---|
| `update_participant_status(uuid, participant_status_type)` | `EXECUTE` для `authenticated`, в теле **нет** проверки роли → любой залогиненный мог сделать себя `club_resident` | в начале тела `IF NOT is_admin(auth.uid()) THEN RAISE EXCEPTION` |
| `get_user_coin_balance(uuid)` | `EXECUTE` для `authenticated`, в теле нет проверки → перебор чужих балансов | разрешено только `p_user_id = auth.uid()` или админу |
| `update_user_leaderboard(uuid)` | `EXECUTE` для `authenticated`, пересчёт для произвольного `user_id` | только свой `user_id` или админ |
| `decrypt_phone(text)` | `EXECUTE` для `authenticated` → расшифровка телефона по строке из БД | `EXECUTE` **отозван**, только `service_role` |
| `mask_email_secure`, `mask_phone_secure`, `mask_phone_number`, `mask_participant_name` | `EXECUTE` для `authenticated`, во фронтенде не вызываются | `EXECUTE` отозван |

Форма проверки (единый шаблон):

```sql
IF auth.uid() IS NOT NULL
   AND current_user NOT IN ('service_role','postgres','supabase_admin')
   AND NOT public.is_admin(auth.uid()) THEN
  RAISE EXCEPTION 'access denied: ...';
END IF;
```

`auth.uid() IS NOT NULL` и список ролей нужны, чтобы не сломать вызовы из
триггеров, cron-задач, Edge Functions и telegram-server (они работают под
`service_role` / владельцем функции, где `auth.uid()` пуст). Роль `anon` при этом
не получает `EXECUTE` на эти функции вовсе.

## 3. Функции, оставшиеся доступными `authenticated`

Проверены поимённо: каждая содержит `is_admin(auth.uid())` / `is_super_admin(auth.uid())`
либо сравнение с `auth.uid()` в теле — `admin_adjust_coins`, `admin_confirm_referral`,
`admin_set_approval`, `admin_list_coin_balances`, `award_coins_by_rule`,
`confirm_referral_lead`, `enroll_application`, `review_homework_submission`,
`review_reward_request`, `create_reward_request`, `generate_telegram_link_code`,
`unlink_telegram_profile`, `ensure_referral_code`, `get_participant_full_state`,
`get_participant_timeline`, `log_security_event`.

Хелперы RLS (`is_admin`, `is_super_admin`, `is_club_resident`, `is_public_participant`,
`has_role`) выдаются `authenticated` намеренно: предикаты политик исполняются от
имени вызывающей роли, без `EXECUTE` политики упадут. Они возвращают только boolean.

`is_public_participant` дополнительно выдан `anon` — он используется в anon-политиках
`leaderboard`, `crash_tests`, `user_totems` вместо прямого подзапроса к
`public_profiles` / `profiles` (у `anon` нет прав на эти таблицы).

## 4. Схема public

```sql
REVOKE CREATE ON SCHEMA public FROM PUBLIC, anon, authenticated;
```

Без этого любая клиентская роль могла бы создать свою таблицу или функцию в `public`
и, например, подменить имя, используемое в `search_path` другого объекта.

Все 92 функции имеют `SET search_path = public` (проверено в v3, сохранено в v4) —
обязательное условие безопасности `SECURITY DEFINER`.

## 5. Известные ограничения (осознанно не исправлены)

| Проблема | Почему оставлено | Что делать в МИРА |
|---|---|---|
| `encrypt_phone` / `decrypt_phone` — это base64, а не шифрование | замена требует переписывания кода авторизации по телефону и миграции данных | либо хранить телефон в открытом виде под RLS, либо использовать `pgsodium`/Vault; **не считать поле «зашифрованным»** |
| `src/hooks/usePhoneDecryption.ts` вызывает `decrypt_phone` с клиента | в v4 грант отозван → хук перестанет работать | вынести расшифровку в админский RPC с проверкой `is_admin` либо в Edge Function на `service_role` |
| Публичные бакеты `avatars`, `moments`, `testimonials` | их URL встроены в лендинг | см. решение владельца в `PUBLIC_DATA_EXPOSURE.md` §5 |
| Дублирующие enum'ы и кириллические таблицы | легаси, завязано на код | см. `LEGACY_MODULES.md` |
| `service_role` имеет полный доступ ко всему | это штатная модель Supabase | ключ `SUPABASE_SERVICE_ROLE_KEY` — только в секретах Edge Functions и на сервере бота, никогда во фронтенде |

## 6. Чек-лист после применения миграций

1. `select count(*) from pg_policies where schemaname='public' and 'anon'=any(roles);` — ожидаемо только публичные SELECT/INSERT из §2 `PUBLIC_DATA_EXPOSURE.md`.
2. Запросить с anon-ключом `/rest/v1/profiles` → `401/permission denied`.
3. Запросить с anon-ключом `/rest/v1/cooper_test_results` → `permission denied`;
   `/rest/v1/public_cooper_results_view` → 200 без `user_id`.
4. Под обычным пользователем вызвать `update_participant_status` → `access denied`.
5. Под обычным пользователем вызвать `get_user_coin_balance` с чужим uuid → `access denied`.
6. `create table public.t(i int);` под anon-ключом → отказ.
