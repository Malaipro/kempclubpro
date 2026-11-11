# Готовность resident-checkins-push (11.11.2026) — НЕ ПРИМЕНЕНО

## Исправлено
1. Авторизация основателя: `is_kemp_founder` и `requireFounder` = точный аккаунт `bfe3d1f1…` + `super_admin`; `profiles.approved` отправителя не проверяется. Профиль не изменялся (approved=false). Для резидентов/получателей `approved=true` сохранено.
2. Старые отправители: подготовлены `legacy/founderGuard.ts`, `legacy/send-broadcast.ts` (is_admin → основатель), `legacy/send-to-group.PATCH.md` (исходника нет в репо). В БД 1 super_admin, ролей admin нет; бот эти функции не вызывает — совместимо.
3. Группа: только-группа → аудитория скрыта в форме и запрещена сервером (`group_has_no_audience`); для личных/Push аудитория обязательна (`audience_required`).
4. Push (read-only): в коде проекта нет вызовов `send-push-notification`; `mastermind-push` использует `VAPID_PUBLIC_KEY/PRIVATE_KEY`; публичный ключ в `usePushSubscription.ts`. `push_subscriptions`: 9 устройств / 8 пользователей (5 FCM, 4 Apple), поля endpoint/p256dh/auth совместимы. Наличие VAPID-секретов в Supabase и вызовы `send-push-notification` извне (бот/Amvera) НЕ проверены — сверить в панели Supabase до замены.

## Проверки
- 47 unit-тестов: pass (в т.ч. основатель с approved=false допущен; другой super_admin — отказ; аккаунт без роли — отказ; группа с аудиторией — отказ; Push без аудитории — отказ).
- Локальная PostgreSQL: resident-checkins 29 и notification-release 4 проверки — pass (другой super_admin/admin не подтверждают; основатель approved=false подтверждает).

## Порядок включения (после APPROVE)
1. `sql/resident-checkins/up.sql` → проверка → откат `down.sql`.
2. `sql/notification-release/up.sql`, затем одним релизом: `_shared/founderGuard.ts`, `send-broadcast`, патч `send-to-group`, `dispatch-club-notification`.
3. `send-push-notification` заменять последним, после сверки VAPID и внешних вызовов.
Откат: прежние версии функций (is_admin) + `down.sql`.
