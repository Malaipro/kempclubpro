# FUNCTION_ACCESS_MATRIX.md — права на функции (v5)

В v2 все 92 функции наследовали `EXECUTE` для `PUBLIC`, то есть их мог вызвать любой
анонимный посетитель. Поскольку 90 из 92 — `SECURITY DEFINER`, это давало обход RLS:
например, `get_profile_for_user('<чужой telegram_id>')` вернул бы чужой профиль.

## Правило v3

```sql
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
```

Далее — точечные `GRANT EXECUTE` по фактическим вызовам в коде
(`src/`, `supabase/functions/`, `telegram-server/src/`).

## 1. `anon` — 2 функции

| Функция | Где нужна |
|---|---|
| `validate_contact_submission(text,text,text,text)` | вызывается внутри `WITH CHECK` политики вставки заявки |
| `validate_referral_code(text)` | страница `/join` до авторизации |
| `is_public_participant(uuid)` | **v4**: предикат anon-политик `leaderboard`, `crash_tests`, `user_totems` (вместо прямого чтения `profiles`/`public_profiles`) |

## 2. `authenticated` — 25 функций

> v4: `decrypt_phone` и четыре `mask_*` отозваны (см. `SECURITY_NOTES.md` §2).
> v5: `update_participant_status`, `get_user_coin_balance`, `update_user_leaderboard`
> остаются доступны `authenticated`, но это тонкие обёртки, авторизующие вызов
> **только по `auth.uid()`**; вся логика ушла в `_internal_*`.

Хелперы RLS (обязательны, иначе политики упадут с ошибкой прав):
`is_admin`, `is_super_admin`, `is_club_resident`, `is_public_participant`, `has_role`.

Личный кабинет:
`ensure_referral_code`, `validate_referral_code`, `get_user_coin_balance`,
`create_reward_request`, `generate_telegram_link_code`, `unlink_telegram_profile`,
`update_user_leaderboard`, `log_security_event`.

Админка (функции сами проверяют роль через `is_admin`/`is_super_admin`):
`admin_adjust_coins`, `admin_confirm_referral`, `admin_set_approval`,
`admin_list_coin_balances`, `confirm_referral_lead`, `enroll_application`,
`review_homework_submission`, `review_reward_request`, `update_participant_status`,
`award_coins_by_rule`, `get_participant_full_state`, `get_participant_timeline`.

Отозвано в v4 (только `service_role`): `decrypt_phone`, `mask_email_secure`,
`mask_phone_secure`, `mask_phone_number`, `mask_participant_name`.

## 3. Только `service_role` — остальные ~60 функций

Сюда попадают:

- **v5: `_internal_*`** — `_internal_update_participant_status`,
  `_internal_update_user_leaderboard`, `_internal_get_user_coin_balance`.
  Содержат привилегированную логику без проверки прав. `EXECUTE` явно отозван
  у `PUBLIC/anon/authenticated`. Именно их вызывают триггеры, cron, Edge Functions
  и telegram-server, где `auth.uid()` пуст.

- **RPC Telegram Mini App по `p_telegram_id`**: `get_profile_for_user`, `get_schedule_for_user`,
  `get_homework_for_user`, `get_journal_for_user`, `get_rating_for_user`, `get_pyramid_for_user`,
  `get_ascetic_for_user`, `get_participant_full_state_by_telegram`, `check_in_activity`,
  `book_schedule_session`, `submit_homework`, `save_journal_entry`, `take_ascetic`,
  `checkin_ascetic`, `update_profile_for_user`, `update_avatar_for_user`,
  `link_or_create_telegram_profile`, `link_telegram_profile`, `link_telegram_lead_to_profile`.
  **Важно:** они идентифицируют пользователя по переданному `telegram_id`, а не по `auth.uid()`,
  поэтому доступ клиентским ролям равнозначен входу под любым участником. Вызываются
  только из `telegram-server` под `service_role` после проверки `initData`.
- **`server_*`** (`server_register_for_event`, `server_unregister_from_event`,
  `server_challenge_checkin`, `server_create_reward_request`, `server_create_mastermind_task`,
  `server_complete_mastermind_task`, `server_submit_mastermind_entry`) — принимают `p_user_id`
  параметром, тот же риск подмены.
- **Крон/служебные**: `cleanup_*`, `auto_*`, `recalculate_all_ranks`, `enhanced_rate_limit_check`,
  `enhanced_contact_rate_limit`, `encrypt_phone`, `log_security_access`, `validate_audit_log_entry`.
- **Триггерные функции** (`handle_new_user`, `sync_public_profiles`, `update_updated_at_column`,
  `log_role_changes`, …) — при срабатывании триггера право `EXECUTE` не проверяется,
  поэтому гранты им не нужны.

## 4. `search_path`

В v2 у `generate_referral_code` не было `SET search_path`. В v3 он проставлен, теперь
**все 92 функции** содержат `SET search_path = public` — защита от подмены схемы при
`SECURITY DEFINER`.

## 5. Если что-то не работает после накатки

Ошибка вида `permission denied for function X` означает, что функция вызывается ролью,
которой её не выдали. Добавьте одну строку в конец `07_grants.sql`:

```sql
GRANT EXECUTE ON FUNCTION public.X(<сигнатура>) TO authenticated;
```

и зафиксируйте причину здесь. Не возвращайте `GRANT ... TO PUBLIC`.
