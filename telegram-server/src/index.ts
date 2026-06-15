import express from 'express';
import cors from 'cors';
import { config } from './config';
import { webhookRouter } from './bot/webhook';
import { stateRouter } from './api/state';

const app = express();

app.use(express.json());

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

// Mini App API
app.use('/api/state', stateRouter);

app.listen(config.server.port, () => {
  console.log(
    `[server] Running on port ${config.server.port} (${config.server.nodeEnv})`
  );
});
