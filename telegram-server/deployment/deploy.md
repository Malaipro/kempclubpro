# Деплой kemp-telegram-server на VPS (REG.RU)

## Требования
- Ubuntu 22.04 LTS (или аналог)
- Домен `tg.kempclub.pro` направлен на IP сервера (A-запись)
- Доступ по SSH с правами sudo

---

## 1. Установить Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # ожидаем v20.x или выше
npm -v
```

---

## 2. Установить PM2

```bash
sudo npm install -g pm2
pm2 -v
```

---

## 3. Установить Nginx

```bash
sudo apt-get install -y nginx
sudo systemctl enable nginx
```

---

## 4. Создать директорию и склонировать репозиторий

```bash
sudo mkdir -p /var/www/kempclubpro
sudo chown $USER:$USER /var/www/kempclubpro

git clone <URL репозитория> /var/www/kempclubpro
```

---

## 5. Перейти в telegram-server и создать .env

```bash
cd /var/www/kempclubpro/telegram-server

cp .env.example .env
nano .env
```

Заполнить все переменные (см. `.env.example`):
- `TELEGRAM_BOT_TOKEN` — токен от @BotFather
- `TELEGRAM_WEBHOOK_SECRET` — случайная строка: `openssl rand -hex 32`
- `SUPABASE_URL` — URL проекта Supabase
- `SUPABASE_SERVICE_ROLE_KEY` — service_role ключ из Supabase Dashboard
- `MINI_APP_URL` — `https://kempclub.pro/telegram`
- `ALLOWED_ORIGIN` — `https://kempclub.pro`
- `PORT` — `3000`
- `NODE_ENV` — `production`

Защитить файл:
```bash
chmod 600 .env
```

---

## 6. Установить зависимости и собрать проект

```bash
cd /var/www/kempclubpro/telegram-server

npm install
npm run build   # tsc → dist/
```

Убедиться, что `dist/index.js` создан:
```bash
ls dist/
```

---

## 7. Создать директорию для логов PM2

```bash
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2
```

---

## 8. Запустить через PM2

```bash
cd /var/www/kempclubpro/telegram-server

pm2 start deployment/ecosystem.config.js
pm2 save
pm2 startup   # выполнить команду, которую выведет PM2
```

Проверить статус:
```bash
pm2 status
pm2 logs kemp-telegram-server --lines 50
```

Проверить healthcheck (до настройки Nginx):
```bash
curl http://127.0.0.1:3000/health
# Ожидаем: {"ok":true,"ts":"..."}
```

---

## 9. Настроить Nginx

```bash
sudo cp /var/www/kempclubpro/telegram-server/deployment/nginx.conf.example \
        /etc/nginx/sites-available/tg.kempclub.pro

sudo ln -s /etc/nginx/sites-available/tg.kempclub.pro \
           /etc/nginx/sites-enabled/tg.kempclub.pro

sudo nginx -t          # проверить конфиг
sudo systemctl reload nginx
```

---

## 10. Получить SSL-сертификат

```bash
sudo apt-get install -y certbot python3-certbot-nginx

sudo certbot --nginx -d tg.kempclub.pro
```

Certbot автоматически обновит `/etc/nginx/sites-available/tg.kempclub.pro` с реальными путями к сертификату.

Проверить автообновление:
```bash
sudo certbot renew --dry-run
```

---

## 11. Зарегистрировать Telegram Webhook

Выполнить один раз после получения SSL. Заменить значения на реальные:

```bash
BOT_TOKEN="<TELEGRAM_BOT_TOKEN>"
WEBHOOK_SECRET="<TELEGRAM_WEBHOOK_SECRET>"

curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"url\": \"https://tg.kempclub.pro/webhook\",
    \"secret_token\": \"${WEBHOOK_SECRET}\",
    \"allowed_updates\": [\"message\"]
  }"
```

Ожидаемый ответ:
```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

Проверить статус webhook:
```bash
curl "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo"
```

---

## 12. Финальная проверка

```bash
# Healthcheck через HTTPS
curl https://tg.kempclub.pro/health
# Ожидаем: {"ok":true,"ts":"..."}

# Статус PM2
pm2 status

# Логи в реальном времени
pm2 logs kemp-telegram-server
```

Открыть бота в Telegram и отправить `/start` — должен прийти ответ с кнопкой «Поделиться телефоном».

---

## Обновление сервера

```bash
cd /var/www/kempclubpro
git pull

cd telegram-server
npm install
npm run build

pm2 restart kemp-telegram-server
pm2 logs kemp-telegram-server --lines 20
```
