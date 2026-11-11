# E2 — контракт Telegram для платных броней (НЕ реализовано, НЕ развёрнуто)

Бот `Malaipro/kempclubpro-telegram-server` в рамках E1 не менялся. До обновления бота защита держится на БД:
триггер `schedule_participants_paid_guard` отклоняет любой INSERT/UPDATE записи на платное событие без
подтверждённой основателем брони — в т.ч. от `service_role`, `server_register_for_event`, кнопок `bc:`/`gc:`.
Старая кнопка на платном событии получит ошибку `paid_event_requires_verified_booking` (бот должен показать текст).

## 1. Кнопки событий
- Бесплатное событие: `bc:`/`gc:` без изменений.
- Платное (`schedules.booking_mode='paid'`): вместо callback — URL-кнопка
  `https://kemp-app.ru/app?section=schedule&event=<schedule_id>` (проверяется `safeAppReturnLink`, сохраняется через вход).

## 2. Уведомление основателю на «Я оплатил»
- Источник: строка `paid_booking_ledger.kind='prepay_reported'` (outbox; отдельная service-only claim-таблица
  `paid_booking_notifications(booking_id, kind, claimed_at, sent_at)` с UNIQUE(booking_id, kind) — по образцу mastermind_task_reminders).
- Получатель: только Telegram ID, привязанный к `profiles.telegram_id` аккаунта `is_kemp_founder`. Не из payload.
- Текст: участник, событие, сумма предоплаты, «проверьте поступление в банке». Без реквизитов.
- Inline: `pb:<booking_id>:ok` «Подтвердить поступление», `pb:<booking_id>:no` «Не поступил».

## 3. Callback (сервер)
1. Принимать только при `allowed_updates` с `callback_query` (сейчас в инструкции деплоя — только `message`; менять webhook — отдельный шаг владельца).
2. `from.id` сравнивается на сервере с telegram_id основателя; иначе `answerCallbackQuery` «Нет доступа», без вызова RPC.
3. Вызов новой service-only RPC (подготовить в E2, сейчас её нет):
   `paid_booking_decide_by_telegram(p_telegram_id bigint, p_booking_id uuid, p_received boolean, p_callback_id text)`
   — SECURITY DEFINER, `GRANT EXECUTE TO service_role` only; внутри повторно резолвит основателя по telegram_id →
   user_id, проверяет `is_kemp_founder`, хранит `p_callback_id` UNIQUE (одноразовость) и выполняет ту же логику, что
   `paid_booking_decide` (повтор → `already_processed`).
4. После ответа — `editMessageReplyMarkup` убирает кнопки.

## 4. Критерий готовности E2
Реальный тест: тестовое платное событие, резидент-тестировщик, «Я оплатил», сообщение пришло основателю, двойное
нажатие → одно подтверждение, нажатие чужим аккаунтом → отказ. До этого E2 не считается работающим.
