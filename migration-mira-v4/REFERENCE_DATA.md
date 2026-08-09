# REFERENCE_DATA.md (v4)

Что из справочных данных переносится в МИРА, а что заводится заново.
Файл с INSERT'ами один — `migrations/09_reference_data.sql`.

## 1. Переносится (обязательно)

### `coin_rules` — 12 правил начисления коинов

Переносятся **коды** (`code`), потому что они зашиты в приложении и Edge Functions:
`award_coins_by_rule(p_rule_code => 'homework_submission')` и т.п.
Без совпадающих кодов экономика коинов не работает.

| code | назначение | стартовая сумма |
|---|---|---|
| challenge_win | победа в челлендже | 3 |
| cooper_test | прохождение теста Купера | 3 |
| event_participation | участие в событии | 2 |
| homework_accept | ДЗ принято проверяющим | 2 |
| homework_submission | сдача ДЗ через Mini App | 1 |
| homework_submit | сдача ДЗ через ЛК | 1 |
| invite_participant | приглашение участника | 2 |
| lecture_attendance | посещение лекции | 1 |
| referral_confirmed | подтверждённый реферал | 5 |
| referral_telegram_signup | реферал через Telegram | 10 |
| totem_earned | получение тотема | 5 |
| training_attendance | посещение тренировки | 1 |

**Суммы — стартовые**, меняются в админке (`/dashboard` → Коины → Правила).
`ON CONFLICT (code) DO NOTHING` — повторный запуск безопасен.

## 2. НЕ переносится (создаётся пустым, наполняется через админку МИРА)

| Таблица | Было в КЭМП | Почему заново |
|---|---|---|
| `journal_prompts` | 18 вопросов | тексты ежедневника у женского лагеря свои |
| `pyramid_levels` | 7 уровней | методология «Пирамида КЭМП» |
| `achievement_types` | достижения КЭМП | своя система наград |
| `totems` | символика КЭМП | см. `LEGACY_MODULES.md` |
| `ascetic_types` | список аскез | пересобрать под формат МИРА |
| `activities` | виды активностей | свой набор |
| `content_blocks` | тексты и медиа лендинга | полностью свой контент |
| `materials`, `rewards`, `challenges` | контент потока | наполняется по ходу |
| `trainers` | тренеры КЭМП | свой состав |
| `streams`, `intensive_streams`, `schedules` | потоки и расписание | свои даты |
| `coin_rules.coin_amount` | суммы КЭМП | стартовые, редактируются |

## 3. Никогда не переносится (персональные и рабочие данные)

`profiles`, `contract_data`, `contracts`, `contact_submissions`, `referral_leads`,
`telegram_leads`, `coin_transactions`, `leaderboard`, `public_profiles`,
`homework_*`, `journal_entries`/`journal_answers`/`journal_emotions`,
`mastermind_*`, `cooper_test_results`, `crash_tests`, `user_*`, `participant_*`,
`broadcast_*`, `audit_log`, `admin_*`, `telegram_bot_*`, `notifications`,
`testimonials`/`public_testimonials`, `moments`.

Причина: персональные данные участников КЭМП, согласия на обработку получены
для КЭМП и на МИРА не распространяются.

## 4. Порядок наполнения МИРА после миграции

1. Применить `01`–`11` (структура + `coin_rules`).
2. Создать супер-админа (Edge Function `setup-super-admin`).
3. Завести поток: `streams` / `intensive_streams` (один активный).
4. Заполнить `content_blocks` (лендинг), `trainers`.
5. Завести `activities`, `ascetic_types`, `achievement_types`, `totems`, `pyramid_levels`.
6. Завести `journal_prompts` (иначе Ежедневник пуст).
7. Проверить суммы в `coin_rules`, при необходимости изменить в админке.
