# A0 — read-only аудит прав и статусов (04.11.2026)

Ничего не изменено. Запросы только на чтение.

## [АУДИТ-ACL]
- `user_roles`: 1 × super_admin, 2 × captain; ролей admin нет.
- `admin_adjust_coins` проверяет `is_admin`, а не `is_super_admin`. Фактически сейчас эту функцию может вызвать только единственный super_admin (если `is_admin` включает super_admin) — сужение ACL, вероятно, не нужно; новая функция `is_founder` всё равно рекомендована.

## [АУДИТ-СТАТУС]
- `is_club_resident` = `participant_status='club_resident' AND approved=true`.
- Резидентов: 42, из них 10 с `approved` ≠ true (для системы они НЕ резиденты).
- История `participant_status_history` (колонка `profile_user_id`): 34 записи; запись о переходе в club_resident есть у 26 из 42 текущих резидентов. 16 без даты перехода — для них пороги 3/6 мес. закрыты до ручного ввода основателем.
- Статус проверяется в: `get_schedule_web`, `get_schedule_for_user`, `get_resident_rating_web`, `get_participant_full_state`, `create_reward_request`, `server_create_reward_request`, `get_rules_for_user`, `update_user_leaderboard`, `update_participant_status`; RLS: `schedules`, `schedule_participants` (insert), `rewards`, `materials`, `cooper_test_results`.
- **Пробелы (не содержат проверки статуса в теле):** `register_for_event_web`, `book_schedule_session` (бот, SECURITY DEFINER — обходит RLS), `purchase_reward_web`, `get_shop_web`, `check_in_activity_web`. Закрываются серверной проверкой в E1/E7.
