# E1 — платные мероприятия с бронями: отчёт (2026-11-11)

Статус: код и SQL подготовлены, **ничего не применено к production**, Edge Functions/бот/публикация не трогались,
реальных платежей и рассылок нет. Блок «Отметки + Push» (`sql/READINESS-2026-11-11.md`) не изменён.

## Что сделано
| Часть | Файлы |
|---|---|
| SQL UP / DOWN / мягкий откат | `sql/paid-bookings/up.sql`, `down.sql`, `disable.sql` |
| Изолированные проверки | `isolated-test.sql`, `down-test.sql`, `run-isolated.sh` (локальная пустая PostgreSQL) |
| Модель и флаг | `src/components/web-app/paidBooking.ts` (+ `paidBooking.test.ts`) |
| Карточка резидента | `src/components/web-app/PaidBookingCard.tsx`, `WebScheduleView.tsx` |
| Ссылка на событие | `appLinks.ts` (`safeAppReturnLink`), `AppLogin.tsx`, `WebAppShell.tsx` |
| Вызовы | `src/components/app-shared/apiAdapter.tsx` (только web, Telegram-путь не менялся) |
| Админка основателя | `ClubScheduleManagement.tsx`, `PaidEventSettingsFields.tsx`, `PaidBookingsPanel.tsx` |
| Контракт E2 | `E2-telegram-contract.md` |

## Модель
- `schedules`: `booking_mode` (default `free`), цена, предоплата, наличные (= цена − предоплата), лимит, срок оплаты (default 120), условия, QR/ссылка основателя. CHECK цен; менять может только `is_kemp_founder` (триггер).
- `paid_bookings`: `booking_status` (hold → pending_review → confirmed / rejected / cancelled / expired) отдельно от `payment_status` (unpaid/reported/verified/not_received/refund_pending/refunded). Одна активная бронь на user+event, ключ идемпотентности. Удаление запрещено.
- `paid_booking_ledger`: append-only журнал; «Я оплатил» пишется без суммы (не поступление). Суммы — только при подтверждении основателем, наличных, возврате.
- Инвариант: триггер на `schedule_participants` для платного события требует `paid_booking_id` подтверждённой брони, решение по которой принял основатель. Работает для любой роли. `service_role` имеет только SELECT на брони — подделать нельзя. Legacy-записи сохраняются и занимают места.
- Места: блокировка строки события `FOR UPDATE`; считаются записи + живые hold + pending_review.
- Доступ: резидент = `is_club_resident` (club_resident AND approved); основатель = `is_kemp_founder` (конкретный UUID + super_admin, без approved). Зависит от `sql/resident-checkins/up.sql` (применять первым).
- Баллы/коины/рейтинг за оплату не начисляются; оплата не ставит посещение.

## Проверки (выполнены в этом ходе)
- `bash sql/paid-bookings/run-isolated.sh`: 74 проверки OK, включая: free без изменений; доступ резидента/не одобренного/интенсива; отказ прямого INSERT `service_role`, `server_register_for_event`, `register_for_event_web`, UPDATE-переноса; 2 конкурентных hold на последнее место → 1; истечение hold; «Я оплатил» ≠ confirmed; подтверждает только основатель (не admin, не другой super_admin); двойной callback идемпотентен; наличные отдельно; отмена/возврат в журнале; проверки цен; интенсив нельзя сделать платным; DOWN отказывает при наличии истории; disable.sql.
- `bun test`: 47 pass (до доработки).
- **Не проверено**: полный DOWN на пустой таблице броней; работа на реальной схеме Supabase (RLS других политик, `notify_booking_change` при подтверждении — пошлёт основателю обычное уведомление о записи); Playwright-прогон экрана с включённым флагом (RPC на сервере нет); загрузка QR как изображения с сайта банка.

## Флаг
`VITE_PAID_BOOKINGS_ENABLED` не задан → приложение не вызывает новые RPC и не показывает новые поля: поведение прежнее.

## Маршрут включения
1. Владелец: APPROVE production для `resident-checkins` (если ещё нет) и затем `paid-bookings`.
2. Применить `resident-checkins/up.sql`, затем `paid-bookings/up.sql` через миграцию Lovable к ref `wfjvjvbjjxcgkaolkgdq` (НЕ `supabase db push` — `config.toml` указывает на MIRA).
3. Read-only сверка: все события `free`, число записей не изменилось.
4. Включить `VITE_PAID_BOOKINGS_ENABLED=true`, публикация.
5. Тест: одно тестовое платное событие на 1 место, QR основателя, резидент-тестировщик, проверка hold/«Я оплатил»/подтверждения/наличных/отмены.
6. E2 (бот) — отдельно по `E2-telegram-contract.md` после реального теста.

## Откат
- Без потери истории: флаг выключить + `disable.sql` (новые брони закрыты, решения основателя и журнал остаются).
- Полный `down.sql` — только при 0 броней (иначе отказывает).

## Блокеры / решения владельца
- QR/ссылка из банка — вводит основатель.
- Текст условий отмены/возврата — юридическая проверка (слово «невозвратно» не используется по умолчанию).
- Уведомление основателю о «Я оплатил» — сейчас только в веб-админке; Telegram — E2.
- Привязка Telegram ID основателя и `allowed_updates` с `callback_query` — для E2.

---
# Доработка после приёмки (2026-11-11, вторая итерация)

Production не менялся (таблицы `paid_bookings` там нет), функции не развёртывались, бот, платежи и публикация не трогались.

| Пункт | Исправление | Проверка |
|---|---|---|
| P0-1 fail-closed | `paid_events_web` возвращает `modes` — режим КАЖДОГО активного события клуба. `bookingGate()` в `WebScheduleView`: при загрузке, ошибке, ответе без `modes`, событии без режима или платном событии без данных кнопки записи нет, показывается причина. Бесплатный `register_for_event_web` вызывается только для явно `free`. При выключенном флаге всё как раньше | 8 unit + 2 SQL |
| P0-2 атомарность | Новая founder-only RPC `paid_event_save`: событие и оплата одной командой INSERT/UPDATE. UI использует её для платных и бывших платных событий; бесплатные — прежним путём. «Сохранить» заблокирована, пока настройки события не загружены или загрузка не удалась (default free не перетрёт paid) | SQL: ошибка цены → событие не создано, правка не применена частично; интенсив отклонён; 6 unit |
| P0-3 идемпотентность | Тот же ключ + то же событие → тот же результат (истёкшая бронь возвращается как `expired`, без новой). Другое событие → `idempotency_conflict`. В карточке ключ привязан к циклу брони (`holdKeyScope`): ретраи одного нажатия используют тот же ключ, новый цикл после истечения или отмены — новый | 2 SQL + 3 unit |
| P0-4 сверка | Участник не может отменить `pending_review` (`under_review`, кнопка убрана). Новая founder-only `paid_booking_record_late_payment` для cancelled, rejected и expired: записывает сумму, ставит `refund_pending`, бронь и место не восстанавливает, автоматического возврата нет; причина и одноразовый `request_key` обязательны | 5 SQL |
| P0-5 возвраты | Поступления считаются только по журналу (`prepay_verified` + `late_prepay_received` + `cash_received`). Возврат ≤ поступления − уже возвращённое, причина обязательна, частичный возврат ведёт в `partially_refunded`. `founder_cancel` ставит `refund_pending` только при подтверждённых деньгах; «со слов участника» возврат не создаёт | over-refund, partial, double-click, «reported» ≠ received |
| P1-6 наличные | Выбраны частичные суммы: остаток = `cash_rub` − получено, каждая сумма в журнале, повтор кнопки по `request_key` ничего не меняет, сверх остатка нельзя | 5 SQL |
| P1-7 документация | `E2-telegram-contract.md`: `callback_query` уже включён (по аудиту от 09.11), устаревшая инструкция отмечена. Webhook не менялся, E2 не реализован | — |

Изменённые сигнатуры: `paid_booking_mark_cash(uuid,int,text)`, `paid_booking_mark_refunded(uuid,int,text,text)`; новые — `paid_booking_record_late_payment`, `paid_event_save`, `paid_booking_money` (только для внутреннего использования). `paid_event_settings_save` оставлена, UI её не использует.

**Результаты:** локальная SQL-регрессия — 99 OK, 0 FAIL (прежние 74 сохранены или ужесточены, плюс новые). `bun test` — 64 pass. Typecheck без ошибок.

**Не проверено:** реальная схема Supabase. Экран с включённым флагом в браузере: серверных функций нет. Гонка, при которой ответ загрузки настроек приходит после закрытия формы (сохранение всё равно уходит атомарно или блокируется). Полный DOWN на пустой БД.

STOP: применение к production — только после `APPROVE BREAKING paid-bookings-e1`.
