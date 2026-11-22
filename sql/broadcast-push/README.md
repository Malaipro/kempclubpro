# broadcast-push — на ревью (не применено, не задеплоено)
1. UP: `alter table public.broadcast_messages add column if not exists push_sent int, add column if not exists push_subscribed int;`
   DOWN: `alter table public.broadcast_messages drop column if exists push_sent, drop column if exists push_subscribed;`
2. Новая функция `broadcast-push`: на вход только `broadcastId`; вызывающий — `is_admin`/`is_kemp_founder`; получатели = `get_broadcast_audience` (как в send-broadcast) ∩ `push_subscriptions`; payload = `pushPayload()` из `src/components/web-app/broadcastPush.ts`; 404/410 → удалить подписку; итог записать в push_sent/push_subscribed.
3. `WebScheduleView`: открыть карточку по `?event=<id>`; запись — существующий `book_schedule_session`.
Запуск только после `APPROVE BREAKING broadcast-push`, в КЭМП wfjvjvbjjxcgkaolkgdq.
