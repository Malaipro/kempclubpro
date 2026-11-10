# Блок Б — Рассылки и Push

Статус: интерфейс и отдельный серверный исходник подготовлены, но НЕ развёрнуты. Реальных отправок не было. Текущую рабочую send-push-notification не исправляли автоматически.

## Изменённые / добавленные файлы
- `src/components/admin/BroadcastManagement.tsx`: три независимых канала, Push отдельно, тема группы, аудитории, заголовок/текст/раздел, серверный счётчик подписчиков, отдельные результаты. Без доступного защищённого endpoint отправка заблокирована, возврата к старой default-all отправке нет.
- `src/components/web-app/appLinks.ts`, `appLinks.test.ts`: только существующие разделы, запрет внешних и несуществующих event links.
- `src/components/web-app/WebAppShell.tsx`, `src/pages/WebApp.tsx`, `src/pages/AppLogin.tsx`: сохранение раздела при переходе на вход и открытие после входа.
- `src/components/web-app/WebPushControls.tsx`: инструкции iPhone/Android; добровольная подписка сохранена.
- `public/sw.js`: стабильный notification tag, same-origin переход. Worker остаётся только для сообщений, без offline cache (использован skill PWA).
- `sql/notification-release/index.ts`, `policy.ts`, `dispatch.ts`: изолированный исходник будущего `dispatch-club-notification`, вне `supabase/functions`.
- `sql/notification-release/send-push-notification.ts`: отдельно подготовленная замена существующей функции; запрещает отсутствие аудитории/request_id и произвольные user_ids. Её НЕ развёртывали.
- `sql/notification-release/policy.test.ts`, `dispatch.test.ts`, `isolated-test.sql`, `up.sql`, `down.sql`, этот отчёт.

## Серверное поведение
- JWT проверяется через Supabase Auth; допуск: конкретный существующий аккаунт + super_admin + approved, не только роль.
- Сервер читает аудиторию approved; resident и intensive раздельно, all — все approved. Произвольные user_ids отклоняются строгой схемой.
- Пагинация profiles/subscriptions исключает silent 1000-row cutoff. Возвращаются только агрегаты, не push-ключи.
- Пустая аудитория Push/личного Telegram отклоняется; пустой список Telegram IDs никогда не передаётся legacy bot (у него fallback на всех).
- Persistent request fingerprint и service-only unique per-channel claims защищают повторы/параллельные запросы. Timeout/неопределённая доставка не пересылаются автоматически: требуется ручная проверка.
- Push использует существующие push_subscriptions, web-push и VAPID env, без новой системы подписок или платных ресурсов.
- Telegram использует существующие send-broadcast/send-to-group, бот не меняется. Это не доказывает founder-only защиту прямого вызова старых endpoint; это отдельная обязательная зависимость включения.
- Сохраняются агрегированные результаты в новых service-only claims; форма показывает текущий отчёт. История Push в существующей таблице рассылок пока не интегрирована, claims доступны серверу.
- «Принято Push-службой» — не прочитано и не гарантированно показано устройством. Telegram числа возвращаются legacy endpoint и не являются независимым доказательством доставки.

## Подготовленные SQL
`notification_dispatches` и `notification_channel_claims`: service-only grants, RLS, без клиентских политик. UP/DOWN только подготовлены. Новых аккаунтов, проектов и платных ресурсов Supabase не создано.

## Проверки
- 13 policy/dispatch тестов + 2 appLinks теста: прошли. Вместе с блоком А и прежними регрессиями: **31 passed, 0 failed**.
- 4 локальных SQL-проверки claims: client deny, уникальность, независимость каналов, UP/DOWN — прошли.
- `deno check` обоих staged entrypoint прошёл без развёртывания.
- Browser изолированно: Push без Telegram, группа + Push, отображение отчёта; desktop/mobile без горизонтального переполнения. Автоматическая сборка preview: build OK.
- Переход неавторизованного на login сохранил `section=schedule`. Реальный вход с дальнейшим переходом, системный клик по Push и реальное принятие Push-службой НЕ проверены.

## Незакрытые зависимости — НЕ считать готовым к production
1. Подтверждение владельца существующего founder UUID, наличие и совпадение VAPID_PUBLIC_KEY с браузером и VAPID_PRIVATE_KEY на KEMP. Секреты не читались/не выводились; никаких secret updates не выполнялось.
2. Исходник текущей развёрнутой send-push-notification отсутствует здесь: перед её заменой экспортировать текущую версию и проверить все служебные callers. Подготовленный строгий wrapper ломает старые default-all/user_ids вызовы намеренно; без их сверки не развёртывать.
3. Прямые вызовы send-broadcast/send-to-group должны пройти ту же founder-проверку. Локальный send-broadcast сейчас проверяет is_admin; send-to-group исходник отсутствует. Нельзя закрыть обход оркестратора без отдельной подготовки/проверки этих endpoint. Работающий бот сохраняется, webhook/Amvera не менять.
4. Внешний Supabase: авторизованные end-to-end проверки здесь недоступны. После отдельного разрешения необходим ограниченный тест только основателю/одному выделенному тестовому получателю. Массовые тесты запрещены.
5. Прямые ссылки на карточку события не готовы: доступны только реальные разделы (расписание и прочие); фиктивных карточек не добавлено.
6. При больших аудиториях синхронная функция может упереться в runtime budget. Не делать повтор с новым request_id после таймаута; сначала сверить claims. Фоновые очереди в этот этап не добавлены.

## Порядок включения (только после отдельного согласования)
1. Снять резервные исходники всех трёх старых sender endpoint и ACL/schema snapshot; подтвердить target KEMP вручную, не брать MIRA из config.toml.
2. Закрыть зависимости caller inventory / founder-only checks / VAPID, проверить на изолированном стенде.
3. Отдельно утвердить SQL UP. Применять migration tool, не `supabase db push`.
4. Только после разрешения перенести index.ts, policy.ts, dispatch.ts в ОДНУ функцию `dispatch-club-notification`; staged send-push-notification.ts — согласованная замена существующего endpoint. Все local imports внутри функции. До этого ни один файл в supabase/functions не менялся.
5. Сначала серверный preview без отправки, затем разрешённый тест одному аккаунту. В текущем API нет произвольного user_ids: ограниченный тест требует изолированного стенда или отдельно подготовленного серверного test allowlist, не браузерной подмены аудитории.
6. Отдельно подтвердить публикацию UI. Массовые отправки — самостоятельное разрешение владельца.

## Откат
Остановить unified sender, вернуть старые UI/worker версии и сохранённые endpoint исходники согласованным release. Сначала экспортировать dispatch claims; `down.sql` удаляет только две новые таблицы. Не удалять push_subscriptions и не менять работающего Telegram-бота. Не возвращать опасную default-all отправку как автоматический fallback; старый sender включать только после проверки его безопасности.
## Финальная проверка
Финальный прогон расширен: **39 тестов, 0 ошибок**, включая mastermind/club-broadcast регрессии. Последний автоматический сигнал 2026-11-10 12:50:02 UTC — build OK. Для устранения выявленных общей проверкой ошибок типов минимально изменены `tsconfig.app.json`, `src/components/admin/MastermindManagement.tsx`, `src/components/admin/participant/QuickStatusActions.tsx`, `src/services/participantService.ts`; это уточнение типов, без изменения бизнес-логики.
