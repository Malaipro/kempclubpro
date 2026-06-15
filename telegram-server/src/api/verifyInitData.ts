import { createHmac } from 'crypto';

// Алгоритм проверки подписи Telegram initData:
// https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
//
// 1. Из initData извлечь hash, удалить его из набора параметров.
// 2. Отсортировать оставшиеся параметры по имени, соединить через \n.
// 3. secret_key = HMAC-SHA256(botToken, "WebAppData")
// 4. expected   = HMAC-SHA256(dataCheckString, secret_key) → hex
// 5. Сравнить expected с hash.

export interface TelegramInitUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// Проверяет HMAC-подпись initData.
// Возвращает true только если подпись верна.
export function verifyInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const receivedHash = params.get('hash');
  if (!receivedHash) return false;

  params.delete('hash');

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const secretKey = createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest();

  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  return expectedHash === receivedHash;
}

// Проверяет, что initData не устарела (по умолчанию — не старше 24 часов).
export function checkAuthDate(initData: string, maxAgeSeconds = 86400): boolean {
  const params = new URLSearchParams(initData);
  const authDate = params.get('auth_date');
  if (!authDate) return false;

  const ageSeconds = Math.floor(Date.now() / 1000) - parseInt(authDate, 10);
  return ageSeconds >= 0 && ageSeconds <= maxAgeSeconds;
}

// Извлекает объект user из initData.
// Возвращает null если поле отсутствует или JSON невалиден.
export function extractTelegramUser(initData: string): TelegramInitUser | null {
  const params = new URLSearchParams(initData);
  const userStr = params.get('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as TelegramInitUser;
  } catch {
    return null;
  }
}
