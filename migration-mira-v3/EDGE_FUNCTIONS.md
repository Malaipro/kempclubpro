# EDGE_FUNCTIONS.md — edge-функции КЭМП и их перенос в МИРА

Все функции лежат в `supabase/functions/` и **едут вместе с кодом при Remix** — вручную копировать не нужно.
Нужно только: (1) задать секреты в новом проекте, (2) перенастроить внешние вебхуки, (3) пересоздать cron.

Общий каталог: `supabase/functions/_shared/cors.ts` — общие CORS-заголовки.

## Таблица функций

| Функция | verify_jwt | Секреты / ENV | Назначение | Нужна в МИРА |
|---|---|---|---|---|
| `submit-application` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_ID` | Приём заявки с сайта → `contact_submissions` + уведомление админу в Telegram | да |
| `phone-signin` | false | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Вход в ЛК по номеру телефона (нормализация + выдача сессии) | да |
| `create-user` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Создание участника из админки (email необязателен) | да |
| `delete-user` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Удаление пользователя из админки | да |
| `reset-user-password` | (default) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Сброс пароля супер-админом | да |
| `setup-super-admin` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Разовое создание первого супер-админа | да (запустить один раз, затем отключить) |
| `send-broadcast` | true | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BROADCAST_SECRET` | Рассылка по сегментам через telegram-server | да |
| `send-admin-reminders` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` | Cron каждые 5 мин: напоминания по заявкам админу | да |
| `send-journal-reminders` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `MINI_APP_URL` | Cron 06:30 / 18:00: напоминания заполнить ежедневник | да |
| `weekly-journal-summary` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN`, `ANTHROPIC_API_KEY` | Cron пн 05:00: LLM-сводка недели по ежедневнику | да (или перевести на Lovable AI Gateway) |
| `send-weekly-summary` | true | `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `TELEGRAM_BOT_TOKEN` | Отправка утверждённой сводки участнику в Telegram | да |
| `calendar-feed` | false | `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Публичный iCal-фид расписания | да |
| `mcp` | false | — | MCP-сервер приложения (`src/lib/mcp/*`) | опционально |
| `enhanced-security-webhook` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Логирование событий безопасности | опционально |
| `bitrix-referral-webhook` | false | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BITRIX_WEBHOOK_SECRET` | Приём подтверждений рефералов из Битрикс24 | только если у МИРА будет Битрикс24 |
| `nodul-webhook` | false | — | Легаси-интеграция Nodul | нет (легаси) |
| `zapier-webhook` | false | — | Легаси-интеграция Zapier | нет (легаси) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` подставляются платформой автоматически — вручную задавать не нужно.

## Секреты, которые нужно задать в МИРА вручную

| Секрет | Где взять | Обязателен |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | @BotFather, **новый** бот для МИРА | да |
| `ADMIN_TELEGRAM_CHAT_ID` | chat_id администратора МИРА | да |
| `MINI_APP_URL` | URL Mini App нового проекта, напр. `https://mira-club.pro/telegram` | да |
| `BROADCAST_SECRET` | `openssl rand -hex 32`, тот же в `.env` telegram-server | да |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | для разового `setup-super-admin` | да (разово) |
| `ANTHROPIC_API_KEY` | console.anthropic.com | если нужны LLM-сводки |
| `BITRIX_WEBHOOK_SECRET` | Битрикс24 МИРА | если нужен Битрикс |

⚠️ Значения секретов КЭМП **не переносятся**. Бот, чат и ключи у МИРА свои.

## Cron-задачи (пересоздать вручную)

| Задача | Расписание | Вызывает |
|---|---|---|
| `journal-morning` | `30 6 * * *` | `send-journal-reminders` |
| `journal-evening` | `0 18 * * *` | `send-journal-reminders` |
| `weekly-journal-summary` | `0 5 * * 1` | `weekly-journal-summary` |
| `send-admin-reminders-every-5-min` | `*/5 * * * *` | `send-admin-reminders` |

Требуются расширения `pg_cron` и `pg_net` (включены в `01_extensions_and_types.sql`). В теле задачи будут URL и ключ нового проекта — поэтому в SQL-экспорт они не включены.
