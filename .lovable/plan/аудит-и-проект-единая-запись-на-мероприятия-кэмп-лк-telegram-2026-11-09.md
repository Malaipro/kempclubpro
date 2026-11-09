# Аудит и проект: единая запись на мероприятия КЭМП (ЛК + Telegram)

Режим только чтение. Ничего не менялось. Секреты не читались. Выполнены только SELECT к схеме БД: колонки, триггеры, RLS, тексты функций и права EXECUTE.

## Резюме

- Сейчас есть **6 разных путей записи**, и правила у них разные. Единую проверку допуска (`club_resident` + `approved`) делает только RLS. Её получают только прямые insert из браузера, а функции SECURITY DEFINER и бот (service role) её обходят.
- Лимит мест нигде не атомарен, кроме `book_schedule_session`. Там есть `FOR UPDATE`, но нет проверки допуска.
- **Платности и статуса оплаты в БД нет вообще.** В `schedule_participants` всего 5 колонок: id, schedule_id, user_id, registered_at, attended. Значит, любая запись сейчас означает «подтверждён».
- **Критично (подтверждено правами БД):** `server_register_for_event(p_user_id, p_schedule_id)`, `server_unregister_from_event` и `book_schedule_session(p_telegram_id, …)` разрешено вызывать роли `anon`. Через открытый API любой может записать или отписать любого пользователя, зная его UUID или Telegram ID. Это нужно закрыть первым, отдельной фазой.

## Текущие потоки (подтверждено кодом и БД)

| # | Откуда | Файл → функция | Как пишет | Допуск | Лимит | Дубль | Ответ |
|---|---|---|---|---|---|---|---|
| 1 | `/app` (веб-кабинет) | `src/components/app-shared/apiAdapter.tsx` `book_session` → RPC `register_for_event_web` → `server_register_for_event` | SECURITY DEFINER insert | только клиентская проверка `schedule_type='club'`; в функции нет проверки статуса и approved | SELECT count без блокировки — гонка | предварительный SELECT, без ON CONFLICT | `ok/error` |
| 2 | ЛК `/dashboard` | `src/components/schedule/ClubScheduleViewer.tsx` `handleRegister` | прямой insert из браузера | RLS: `is_club_resident` (club_resident + approved) или admin | **нет** | UNIQUE → 23505 | «успешно записались» |
| 3 | Админка | `src/components/schedule/ClubScheduleManagement.tsx` стр. 415–440 | прямой insert под ролью admin/trainer | без проверок участника | **нет** | UNIQUE | «Участник добавлен» и upsert в мастермайнд |
| 4 | Mini App `/telegram` | `telegram-server/src/api/state.ts` `book_session` → `book_schedule_session` | SECURITY DEFINER | **нет** проверки статуса и `schedule_type` | `FOR UPDATE` + count — атомарно | ON CONFLICT DO NOTHING | `booked/reason` |
| 5 | Группа TG | `telegram-server/src/bot/handlers/onCallbackQuery.ts` `onGroupCallbackQuery` | прямой insert под service role | **нет** | **нет** | 23505 → «Вы уже записаны» | «✅ Вы записаны» |
| 6 | Личная рассылка TG | тот же файл, `onCallbackQuery` (кнопка `bc:`) | broadcast_responses, затем прямой insert | **нет** | **нет** | 23505 считается **успехом** | «Вы записаны ✅» |

Общее: триггер `trg_notify_booking_change` (AFTER INSERT/DELETE) → `notify_booking_change` → Edge `notify-booking`. Срабатывает на любой путь, уведомление «🟢 Новая запись» приходит всегда, ошибки гасятся (`RAISE WARNING`).

Отмена: `/app` → `unregister_from_event_web`; ЛК — прямой delete (RLS: свой или admin/trainer); Mini App — `cancel_booking`. Дедлайна отмены нигде нет.

Видимость (RLS `schedules`): клубные — только `is_club_resident` или admin; интенсив — публично. Бот и SECURITY DEFINER эту видимость не проверяют.

## Выявленные расхождения

1. **Утечка прав (High):** `anon` может выполнять `server_register_for_event`, `server_unregister_from_event`, `book_schedule_session`.
2. Пути 3, 5 и 6 не проверяют лимит. Путь 1 проверяет его с гонкой. При параллельных нажатиях возможен перебор мест.
3. Пути 1, 4, 5 и 6 не проверяют `club_resident`/`approved`. Неодобренный или выбывший участник с привязанным Telegram записывается из группы.
4. Пути 4, 5 и 6 не проверяют `schedule_type`, `is_active` и время начала. Можно записаться на прошедшее или отключённое событие. В пути 5 неверный id даёт «Ошибка записи».
5. Путь 6: если пользователь «уже записан», бот отвечает «Вы записаны ✅». Ответ формально верен, но при будущей платности он сообщит успех без оплаты.
6. Нет модели «ожидает оплаты / оплачено / подтверждено»: бот и ЛК преждевременно сообщают окончательную запись. Платный процесс сейчас невозможен без новой схемы.
7. Уведомление основателю приходит на каждую вставку, в том числе потенциально недопустимую.
8. Код Mini App и бота в этом репо может не совпадать с `Malaipro/kempclubpro-telegram-server` на Amvera. Пункты 4–6 доказаны только для локальной копии.

## Целевая схема

```text
ЛК (/app, /dashboard) ─ RPC book_event(p_schedule_id)  [auth.uid()]
Mini App / группа / личная рассылка (TG Amvera, service role)
   ─ RPC server_book_event(p_telegram_id, p_schedule_id, p_source)
                     │
                     ▼
     book_event_core(user_id, schedule_id, source)  — схема booking_private, не доступна через API
       1. SELECT schedules ... FOR UPDATE (атомарность лимита)
       2. проверки: is_active, будущее, schedule_type, допуск по правилам
       3. INSERT ... ON CONFLICT (schedule_id,user_id) DO NOTHING → идемпотентно
       4. статус: free → confirmed; paid → pending_payment (+ срок)
       5. возвращает {result: booked|pending_payment|already|full|not_allowed|closed|not_linked}
Оплата: participant «Оплатил» → payment_reported → уведомление основателю
        основатель «Подтвердить» (admin RPC) → confirmed
```

Оценка вариантов:
- **RPC SECURITY DEFINER (рекомендуется):** одна транзакция, лимит и уникальность в БД, работает и из ЛК, и из TG без нового сервиса. Публичная обёртка для ЛК берёт только `auth.uid()`. Серверная (по Telegram ID) доступна только `service_role`.
- Edge endpoint: добавляет сетевой переход и ещё одно место развёртывания. Атомарность всё равно нужна в БД. Имеет смысл только как обёртка для оплаты/QR.

Принципы: права EXECUTE отозваны у `anon`/`authenticated` для серверных функций; связь Telegram ID → user ID только на сервере; бот формулирует ответ строго по `result`; уведомление основателю шлётся из RPC по результату, а не триггером на любой insert (или триггер фильтрует по статусу); прямые insert из ЛК, бота и админки заменяются вызовами RPC (у админки своя admin-RPC с явным обходом допуска и отметкой источника).

## Матрица сценариев и тестов

| Сценарий | Ожидание |
|---|---|
| Резидент, бесплатное, есть места (ЛК / группа / личка / Mini App) | booked, одна строка, одно уведомление |
| Повторное нажатие / дубль из двух каналов | already, без второго уведомления |
| 2–N параллельных записей на последнее место | ровно одна booked, остальные full |
| Неодобренный (`approved=false`) / не резидент / inactive | not_allowed, строки нет |
| Telegram не привязан | not_linked, понятная подсказка |
| Событие прошло / `is_active=false` / несуществующий id | closed / not_found |
| Платное: запись | pending_payment, бот не пишет «записаны» |
| Платное: «Оплатил» → основатель «Подтвердить» | payment_reported → confirmed, уведомления на каждом шаге |
| Платное: срок оплаты истёк | место освобождается (если владелец так решит) |
| Отмена свободного / платного | по правилам владельца (оргсбор невозвратный) |
| Вызов серверной RPC ролью anon/authenticated | permission denied |
| Админ добавляет участника | проходит с источником `admin`, лимит по решению владельца |
| Сбой уведомления | запись не откатывается, ошибка в логе |

Тесты: SQL-регрессия в `sql/booking-unification/` (по аналогии с `sql/stream-<n>`) на тестовой базе, vitest для формулировок ответов бота и ЛК, параллельный тест через несколько соединений.

## Этапы внедрения (только после отдельного APPROVE BREAKING на каждый)

| Фаза | Что | Файлы / миграции | Приёмка | Откат | Риск |
|---|---|---|---|---|---|
| 0 | Сверка версии TG: сравнить `Malaipro/kempclubpro-telegram-server` (то, что запущено на Amvera) с локальным `telegram-server/` | — | известен фактический код путей 4–6 | — | Low |
| 1 | Закрыть права: REVOKE EXECUTE у `anon` (и `authenticated` где не нужно) для `server_register_for_event`, `server_unregister_from_event`, `book_schedule_session`; перед этим проверить, под какой ролью вызывает TG-сервер | миграция M1 (UP: REVOKE / DOWN: GRANT) | anon получает permission denied; Mini App и бот работают | DOWN-миграция | High (RLS/ACL) |
| 2 | Ядро `book_event_core` + обёртки, без платности; статус по умолчанию `confirmed` для существующих строк | M2: новые колонки `status`, `source`, `updated_at` с default (без удаления старых), функции | матрица для бесплатных проходит | DOWN: drop функций/колонок | Med |
| 3 | Перевести ЛК и админку на RPC | `apiAdapter.tsx`, `ClubScheduleViewer.tsx`, `ClubScheduleManagement.tsx` | прямых insert из браузера нет | вернуть прежний код | Med |
| 4 | Перевести бота (группа, личка, Mini App) на `server_book_event` | `telegram-server/src/bot/handlers/onCallbackQuery.ts`, `src/api/state.ts` — в GitHub-репо Amvera | ответы по `result`, нет преждевременного «записаны» | redeploy прежней сборки | Med |
| 5 | Узкий INSERT-доступ: убрать прямой insert из RLS для пользователей (только через RPC) | M3 | прямой insert запрещён | DOWN | High |
| 6 | Платность (E1): поля в `schedules` (цена/оргсбор), статусы оплаты, QR СБП, «Оплатил», подтверждение основателем, таймаут | M4–M5, Edge/бот | платная матрица проходит | DOWN + флаг выключения | High |
| 7 | Уведомления по статусу вместо триггера на любой insert | `notify_booking_change`, `notify-booking` | одно уведомление на событие статуса | вернуть триггер | Med |

Риски: расхождение версий TG; уже существующие 42 резидента, из которых 10 не одобрены, — их текущие записи; роль, под которой TG вызывает RPC (если anon — фаза 1 сломает Mini App, поэтому сначала фаза 0).

## Открытые вопросы владельцу (приоритет)

1. Кто вообще допускается к записи на клубные события: только `club_resident` + `approved`? Выпускники (`alumni`) и активные участники интенсива — да/нет?
2. Как поступать с имеющимися записями неодобренных или не-резидентов: оставить или проверить вручную?
3. Какие события платные и где задаётся сумма оргсбора (на событие / по типу)?
4. Занимает ли место бронь «ожидает оплаты»? Срок оплаты и что происходит по истечении?
5. Отмена: есть ли дедлайн? Платная бронь после оплаты отменяется без возврата — верно?
6. Может ли админ добавлять сверх лимита и без допуска?
7. Нужна ли запись на мероприятия интенсива вообще из бота/группы или только клубные?
8. Нужен ли лист ожидания при заполнении?
9. Telegram ID основателя для подтверждения оплаты (кнопка «Подтвердить» в личке бота или только в ЛК суперадмина)?
