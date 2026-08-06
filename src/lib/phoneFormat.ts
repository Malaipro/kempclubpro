// Единый формат телефона для ЛК: всегда +7XXXXXXXXXX
// 8XXXXXXXXXX / 7XXXXXXXXXX / 9XXXXXXXXX -> +7XXXXXXXXXX

export const formatPhoneRu = (raw: string): string => {
  if (!raw) return '';

  let digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // 8 (Россия, междугородний) -> 7
  if (digits.startsWith('8')) {
    digits = `7${digits.slice(1)}`;
  } else if (!digits.startsWith('7')) {
    // Номер без кода страны (начинается с 9 и т.п.)
    digits = `7${digits}`;
  }

  // Ограничиваем длину российского номера: 7 + 10 цифр
  digits = digits.slice(0, 11);

  return `+${digits}`;
};

export const isValidPhoneRu = (value: string): boolean =>
  /^\+7\d{10}$/.test(formatPhoneRu(value));
