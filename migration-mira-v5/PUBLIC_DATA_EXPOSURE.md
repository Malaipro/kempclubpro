# PUBLIC_DATA_EXPOSURE.md (v4)

Что видит **неавторизованный посетитель** (роль `anon`) после применения v4.

## 1. Таблицы, доступные `anon` на чтение (15)

| Таблица | Что реально видно | Персональные данные |
|---|---|---|
| achievement_types, achievements | справочник достижений | нет |
| activities | справочник активностей | нет |
| ascetic_types | справочник аскез | нет |
| challenges | челленджи (название, даты, условия) | нет |
| content_blocks | тексты/медиа лендинга | нет |
| intensive_streams, streams | потоки: название, даты | нет |
| moments | публичная лента моментов | фото/видео, загруженные админом |
| public_testimonials | отзывы (имя + текст + медиа) | имя и медиа — **по согласию**, поле `consent` |
| referral_settings | размер бонуса реферальной программы | нет |
| schedules | расписание интенсива | нет |
| totems, trainers, training_programs | справочники | фото тренеров |
| crash_tests | только `verified = true` и `is_public_participant(user_id)` | результат + user_id |
| user_totems | только `is_public_participant(user_id)` | тотемы + user_id |
| leaderboard | только `is_public_participant(user_id)` | баллы + user_id |

`is_public_participant` = профиль одобрен (`approved`), `leaderboard_visible = true`,
`profile_private = false`. Т.е. участница может скрыться из публичной выдачи.

## 2. Таблицы, доступные `anon` на запись (2)

| Таблица | Команда | Ограничение |
|---|---|---|
| contact_submissions | INSERT | политика вызывает `validate_contact_submission` (валидация полей, длины, honeypot на фронте); чтение — запрещено RESTRICTIVE-политикой |
| referral_leads | INSERT | только с валидным реферальным кодом (`validate_referral_code`) |

## 3. Изменение v4: персональные результаты — только через представления

В v3 роль `anon` имела `SELECT` на таблицы `public_profiles` и `cooper_test_results`
целиком. Это раскрывало: `user_id`, `first_name`, `last_name`, а по Куперу ещё
`age`, `gender`, `notes`, `verified_by`.

В v4 гранты на эти таблицы для `anon` **сняты**, вместо них — два представления
(`migrations/06_views.sql`):

### `public_leaderboard_view`
`participant_key` (md5-псевдоним вместо user_id), `display_name`, `total_points`,
`rank_position`, `participant_status`, `is_active_stream` (v5: реальный `current_stream_id` больше не публикуется — вместо него булев признак активного потока; фильтр `.in('current_stream_id', activeStreamIds)` в `RegisteredParticipants.tsx` заменить на `.eq('is_active_stream', true)`).
Фильтр: `display_name IS NOT NULL` и статус `intensive_active` / `club_resident`.
**Не отдаёт:** `id`, `user_id`, `first_name`, `last_name`, `created_at`, `updated_at`.

### `public_cooper_results_view`
`participant_key`, `display_name`, `total_time`, `fitness_level`, `test_phase`,
`test_date` (без времени).
Фильтр: `verified = true` и публичный статус участницы.
**Не отдаёт:** `id`, `user_id`, `age`, `gender`, `notes`, `verified`, `verified_by`, `created_at`.

`participant_key = md5(user_id::text || 'mira-public-v4')` — стабильный псевдоним,
позволяет фронтенду сопоставить строки «до/после» одной участницы, не раскрывая UUID.

## 4. Требуемая адаптация фронтенда (обязательно, иначе публичные блоки пустые)

| Файл | Что сейчас | Что нужно |
|---|---|---|
| `src/components/PublicParticipantResults.tsx` | `.from('cooper_test_results').select('user_id, total_time, test_phase, test_date')` и `.from('public_profiles')` | читать `public_cooper_results_view` и `public_leaderboard_view`, группировать по `participant_key` |
| `src/components/participants/RegisteredParticipants.tsx` | `.from('public_profiles').select('user_id, first_name, last_name, ...')` | читать `public_leaderboard_view` (`display_name`, `participant_key`) |
| `src/components/AllParticipantsProgress.tsx` | join `leaderboard` ↔ `public_profiles` по `user_id` для анонимов | для анонимов брать `public_leaderboard_view`; `leaderboard` остаётся доступен, но без имён |
| `src/components/leaderboard/*` (публичный режим) | `public_profiles` | `public_leaderboard_view` |

Колонки под старый фронтенд «временно» не открывались — это осознанное решение:
доступ сужен, адаптация делается один раз при переносе.

## 5. Storage: публично доступные бакеты

| Бакет | public | Содержимое |
|---|---|---|
| avatars | да | аватары (в т.ч. из Telegram) — прямые URL угадываемы по `user_id/имя файла` |
| content | да | медиа лендинга и картинки наград |
| moments | да | фото/видео мероприятий |
| testimonials | да | медиа отзывов |
| pyramid-materials, homework-files, broadcasts, contracts | нет | только по политикам/подписанным URL |

**Решение владельца МИРА:** если публикация аватаров и медиа участниц нежелательна,
переключить бакеты `avatars` / `moments` / `testimonials` в `public = false`
(`migrations/10_storage.sql`) и раздавать через `createSignedUrl`.

## 6. Что `anon` не может в принципе

- читать `profiles` (RESTRICTIVE-политика `Block anonymous access to profiles`);
- читать `contact_submissions`, `referral_leads`, `contract_data`, `coin_transactions`,
  `homework_*`, `journal_*`, `mastermind_*`, `telegram_*`, `admin_*`, `audit_log`;
- вызывать любые функции, кроме `validate_contact_submission`, `validate_referral_code`,
  `is_public_participant`;
- создавать объекты в схеме `public` (`REVOKE CREATE`).
