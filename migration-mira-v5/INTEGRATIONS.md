# INTEGRATIONS.md — внешние интеграции и что менять для МИРА

## 1. Telegram

**Бот.** Новый бот у @BotFather → новый `TELEGRAM_BOT_TOKEN`. Токен КЭМП не переиспользовать.

**telegram-server** (`telegram-server/`, Node + Express, деплой на VPS через PM2, см. `telegram-server/deployment/`):
- отдельный деплой на своём поддомене (например `tg.mira-club.pro`);
- свой `.env` (шаблон `telegram-server/.env.example`):
  `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (нового проекта), `MINI_APP_URL`, `ALLOWED_ORIGIN`, `BROADCAST_SECRET`, `PORT`;
- зарегистрировать webhook: `setWebhook` на `https://tg.<домен>/telegram/webhook` с `secret_token`;
- Mini App URL прописать в @BotFather (Menu Button / Web App).

**Mini App.** Фронтенд `src/pages/TelegramApp.tsx` + `src/components/telegram-app/*`. Обращается к `${SERVER_URL}/api/state` и к RPC по `telegram_id`. Поменять только адрес сервера/домена.

⚠️ `SUPABASE_SERVICE_ROLE_KEY` используется **только** на сервере, никогда во фронтенде.

## 2. Аналитика

- **Яндекс.Метрика** — счётчик КЭМП `105195673` (вебвизор). Для МИРА завести **новый** счётчик и заменить ID в `index.html`; цели («заявка отправлена») настроить заново.
- **Top.Mail.Ru** — счётчик КЭМП `3754900`. Аналогично — новый ID.
- Файл верификации `public/yandex_84c7b86a43e29ab1.html` — удалить, положить свой.

## 3. UTM / атрибуция

`src/lib/utmCapture.ts` (6 UTM + `yclid`, Last non-empty, TTL 30 дней) и `src/lib/refCapture.ts` работают без внешних ключей — переносятся как есть. Данные пишутся в `contact_submissions.utm_data`.

## 4. CRM

- Основная CRM — **внутренняя**, в админке (`ApplicationsManagement.tsx`, таблицы `contact_submissions`, `application_notes`, `application_reminders`). Внешних ключей не требует.
- **Битрикс24** — только опциональный вебхук подтверждения рефералов (`bitrix-referral-webhook` + `BITRIX_WEBHOOK_SECRET`). Если у МИРА Битрикса нет — функцию можно удалить.
- **Zapier / Nodul** — легаси, в МИРА не переносить.

## 5. Договоры (Подпислон)

Интеграция подписания договоров по SMS. Таблицы `contracts`, `contract_data`, приватный бакет `contracts`. Требует отдельного договора/аккаунта у провайдера и своих ключей. Если МИРА стартует без электронных договоров — раздел можно отключить в админке, схема при этом останется.

## 6. Почта

Ранее использовался Resend (`RESEND_API_KEY`) для приветственных писем — в текущем коде активных почтовых функций нет, вход переведён на телефон. Для МИРА подключать только при необходимости.

## 7. Домены и публикация

- Свой домен (например `mira-club.pro`) подключается в настройках нового проекта Lovable.
- В Supabase → Authentication → URL Configuration указать Site URL и Redirect URLs нового домена.
- Обновить `public/robots.txt` и `public/sitemap.xml` под новый домен.
- Ссылки на контакты КЭМП (`t.me/Dmitriy116` и пр.) в компонентах лендинга заменить на контакты МИРА.

## 8. Чек-лист «что точно поменять в коде МИРА»

- [ ] ID счётчиков аналитики в `index.html`
- [ ] `SERVER_URL` Telegram Mini App
- [ ] Контакты/ссылки Telegram на лендинге
- [ ] Тексты, фото, тренеры, программа (`src/components/*`)
- [ ] `robots.txt`, `sitemap.xml`, `<title>` / `<meta description>` в `index.html`
- [ ] Даты старта потока (`ContactForm.tsx`, `CountdownTimer.tsx`)
