# send-to-group — совместимое ограничение (исходник не в репозитории)

Исходник `send-to-group` отсутствует в этом проекте (развёрнут отдельно). Применять вручную в его исходнике после APPROVE:

1. Заменить `rpc('is_admin', { _user_id })` на `rpc('is_super_admin', { _user_id })`.
2. После проверки JWT: `if (!isFounderSender(user.id, isSuperAdmin === true)) return 403 {ok:false,error:'forbidden'}` (логика из `founderGuard.ts`).
3. Не проверять `profiles.approved` отправителя.
4. Тело запроса (`group_text`, `topic_id`, `group_buttons`), вызов `tg.kempclub.pro` и `BROADCAST_SECRET` не менять — бот и формат `gc:<schedule_id>:book_event` остаются совместимы.
5. Поле `audience` в теле не принимать (групповой чат не адресуется по статусу).

Совместимость: в базе ровно один `super_admin` (основатель), ролей `admin` нет — текущие рассылки основателя продолжат работать; Telegram-бот эти функции не вызывает.
Откат: вернуть прежний `is_admin`.
