# FK_INDEX_AUDIT.md — внешние ключи и индексы (v3)

Проверены все **79** внешних ключей схемы `public`: для каждого искался индекс,
у которого колонки FK являются префиксом. Postgres автоматически индексирует только
сторону первичного ключа, поэтому непокрытый FK означает seq scan при join'ах
и блокировки при удалении родительской строки.

## Итог

| | v2 | v3 |
|---|---|---|
| FK всего | 79 | 79 |
| Покрыты индексом | 46 | 79 |
| Без индекса | 33 | 0 |

## Добавлено в `03_indexes.sql` (33 индекса)

Все — `CREATE INDEX IF NOT EXISTS`, идемпотентны, повторный прогон безопасен.

| Таблица (колонка FK) | Индекс |
|---|---|
| `аскезы_участников`(participant_id) | `idx_ascezy_uchastnikov_participant` |
| `кэмп_активности`(participant_id) | `idx_kemp_aktivnosti_participant` |
| `тотемы_участников`(participant_id) | `idx_totemy_uchastnikov_participant` |
| `участники`(stream_id) | `idx_uchastniki_stream` |
| `activity_checkins`(stream_id) | `idx_activity_checkins_stream` |
| `application_reminders`(submission_id) | `idx_application_reminders_submission` |
| `ascetic_activities`(ascetic_type_id, user_id) | `idx_ascetic_activities_type`, `idx_ascetic_activities_user` |
| `challenge_entries`(user_id) | `idx_challenge_entries_user_id` |
| `coin_transactions`(rule_id) | `idx_coin_transactions_rule` |
| `contact_submissions`(referrer_user_id, stream_id) | `idx_contact_submissions_referrer`, `idx_contact_submissions_stream` |
| `crash_tests`(user_id) | `idx_crash_tests_user` |
| `hero_races`(user_id) | `idx_hero_races_user` |
| `homework_submissions`(user_id) | `idx_homework_submissions_user` |
| `journal_answers`(prompt_id) | `idx_journal_answers_prompt` |
| `journal_emotions`(entry_id) | `idx_journal_emotions_entry` |
| `lectures`(user_id) | `idx_lectures_user` |
| `mastermind_members`(group_id) | `idx_mm_members_group` |
| `mastermind_tasks`(created_by) | `idx_mm_tasks_created_by` |
| `notifications`(user_id) | `idx_notifications_user` |
| `public_profiles`(current_stream_id) | `idx_public_profiles_stream` |
| `reward_requests`(reward_id) | `idx_reward_requests_reward` |
| `schedule_participants`(user_id) | `idx_schedule_participants_user` |
| `schedules`(instructor_id) | `idx_schedules_instructor` |
| `tactical_sessions`(user_id) | `idx_tactical_sessions_user` |
| `training_sessions`(program_id, trainer_id, user_id) | `idx_training_sessions_program`, `idx_training_sessions_trainer`, `idx_training_sessions_user` |
| `user_achievements`(achievement_id) | `idx_user_achievements_achievement` |
| `user_activities`(activity_id, user_id) | `idx_user_activities_activity`, `idx_user_activities_user` |
| `user_challenges`(challenge_id) | `idx_user_challenges_challenge` |

## Не добавлялись

Колонки `verified_by`, `reviewed_by`, `assigned_by`, `processed_by`, `created_by`
(кроме `mastermind_tasks`) — служебные ссылки на `auth.users`, по ним не строятся
выборки и родительские строки не удаляются. При росте объёма их можно добавить позже.

Проверка после накатки:

```sql
select conrelid::regclass, conname from pg_constraint c
join pg_namespace n on n.oid = c.connamespace
where c.contype = 'f' and n.nspname = 'public'
  and not exists (
    select 1 from pg_index i where i.indrelid = c.conrelid
      and (i.indkey::smallint[])[0:array_length(c.conkey,1)-1] = c.conkey);
-- ожидается 0 строк
```
