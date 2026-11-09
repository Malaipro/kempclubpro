# Аудит READ-ONLY: кнопка «Записаться» в группе КЭМП

Ничего не менялось. Секреты не читались. Код, БД, Supabase, DNS, Amvera, webhook и BotFather не затрагивались. Выполнен один запрос к БД только на чтение: ограничения таблицы `schedule_participants`.

## Цепочка по коду

```text
BroadcastManagement.tsx --invoke('send-to-group')--> [Edge Function, исходника нет в репо]
   --> tg.kempclub.pro  state.ts action=send_to_group --> sendMessage (inline_keyboard, callback_data "gc:<schedule_id>:book_event")
Нажатие --> Telegram --> webhook URL --> webhook.ts (проверка secret) --> onGroupCallbackQuery --> insert schedule_participants --> answerCallbackQuery
```

## Диагностическая таблица

| # | Пункт | Статус | Доказательство / путь |
|---|---|---|---|
| 1 | Админка передаёт `group_buttons` с `type: book_event`, `schedule_id = target_id` (UUID события клуба) | Подтверждено | `src/components/admin/BroadcastManagement.tsx` стр. 230–255 |
| 2 | Исходника Edge Function `send-to-group` в репозитории нет (нет `supabase/functions/send-to-group`); она вызывается, но развёрнута отдельно. Как она передаёт кнопки в TG, по коду не проверить | Подтверждено отсутствие / требуется проверка | `supabase/functions/` (есть только send-broadcast, send-admin-reminders и др.) |
| 3 | Клавиатура формируется в TG-сервере: `callback_data = 'gc:' + schedule_id + ':' + type`; длина ~50 байт (лимит 64) — формат корректен | Подтверждено (код репо) | `telegram-server/src/api/state.ts` стр. 1500–1570 |
| 4 | Webhook распознаёт `gc:` и вызывает `onGroupCallbackQuery`; каждая ветка, включая ошибки, вызывает `answerCallbackQuery` | Подтверждено (код репо) | `telegram-server/src/bot/webhook.ts` стр. 52–75; `telegram-server/src/bot/handlers/onCallbackQuery.ts` стр. 161–207 |
| 5 | **Симптом «нет вообще никакого уведомления»** означает, что обработчик не получил нажатие. Если бы получил, Telegram показал бы хотя бы «Профиль не найден», «Ошибка записи» или «Вы записаны» | Вывод из кода | то же |
| 6 | **Инструкция по регистрации webhook задаёт `allowed_updates: ["message"]`** — с такой настройкой Telegram НЕ присылает `callback_query`, и кнопка молчит. Это ровно наблюдаемый симптом | **Вероятная причина №1** | `telegram-server/deployment/deploy.md` стр. 163–171 |
| 7 | Webhook указывает на старый адрес/хост (до смены DNS) или не установлен — нажатия не доходят до сервера | Вероятная причина №2 | требуется getWebhookInfo |
| 8 | Секрет `TELEGRAM_WEBHOOK_SECRET` в Amvera не совпадает с `secret_token` в webhook → сервер отвечает 403, обработчик не вызывается | Вероятная причина №3 | `webhook.ts` стр. 53–57 |
| 9 | Сообщение отправлено одним ботом, а webhook/сервер работает с другим токеном (другим ботом) | Возможная, требуется проверка | `config.ts` стр. 13; бот-отправитель виден в группе |
| 10 | БД: `UNIQUE(schedule_id, user_id)`, FK на `schedules(id)` и `auth.users(id)`; поиск профиля по `profiles.telegram_id` как строке — совместимо | Подтверждено | запрос к ограничениям `schedule_participants` |
| 11 | Запись из группы — прямой `insert` в `schedule_participants`, без `register_for_event_web` и `book_schedule_session`: не проверяются статус `club_resident`, approved и лимит мест. Это отличается от записи в ЛК | Обнаруженная проблема (не причина симптома) | `onCallbackQuery.ts` стр. 183–186 |
| 12 | Участники без привязанного `telegram_id` получат «Профиль не найден» — но это было бы видимое уведомление | Не причина симптома | `onCallbackQuery.ts` стр. 172–181 |
| 13 | Код в репозитории и запущенный в Amvera сервер могут отличаться (версия сборки) | Требуется проверка в Amvera | — |

## Что показала бы каждая причина в getWebhookInfo

- `allowed_updates: ["message"]` → причина №1 подтверждена.
- `url` пустой или не `https://tg.kempclub.pro/webhook` → причина №2.
- `last_error_message` = «403 Forbidden» → причина №3 (секрет).
- `last_error_message` с ошибкой SSL или таймаутом → сервер недоступен для Telegram.
- Всё корректно, ошибок нет и `pending_update_count = 0` → проверить №9 (другой бот) и №13 (версия кода в Amvera).

## Первоочередной безопасный шаг

После перевыпуска токена владелец сам выполняет **только чтение** `getWebhookInfo` (метод ничего не меняет) с компьютера или телефона, где Telegram API доступен (не с REG.RU VPS — оттуда api.telegram.org блокируется): открыть в браузере `https://api.telegram.org/bot<НОВЫЙ_ТОКЕН>/getWebhookInfo` и посмотреть поля `url`, `allowed_updates`, `last_error_message`, `pending_update_count`. Токен в чат не присылать — достаточно этих четырёх полей.

Исправление (например, добавить `callback_query` в `allowed_updates`) не предлагается до получения этого результата.
