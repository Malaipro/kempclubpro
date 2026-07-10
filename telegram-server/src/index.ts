import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { webhookRouter } from './bot/webhook';
import { stateRouter } from './api/state';
import { broadcastRouter } from './api/broadcast';

const app = express();

// 15mb — файлы ДЗ из Mini App приходят как base64 в JSON (до 10 МБ бинарно)
app.use(express.json({ limit: '15mb' }));

// Trust Nginx X-Forwarded-For so rate limiting keys by real client IP, not 127.0.0.1
app.set('trust proxy', 1);

// CORS только для /api/* — Mini App фронтенд обращается сюда из браузера.
// /webhook не нуждается в CORS: вызывается серверами Telegram, не браузером.
app.use(
  '/api',
  cors({
    origin: config.server.allowedOrigin,
    methods: ['POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
  })
);

// Healthcheck — для nginx upstream check и PM2 monitoring
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Telegram Bot webhook
app.use('/webhook', webhookRouter);

// Mini App API — rate limited: 30 req/min per IP (Mini App opens ~1x per session)
const stateRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { ok: false, error: 'rate_limit_exceeded' },
});
app.use('/api/state', stateRateLimit, stateRouter);

// Рассылки — вызывается сервером/крон-джобом с секретом, не браузером
app.use('/api/broadcast', broadcastRouter);

app.listen(config.server.port, () => {
  console.log(
    `[server] Running on port ${config.server.port} (${config.server.nodeEnv})`
  );
});
