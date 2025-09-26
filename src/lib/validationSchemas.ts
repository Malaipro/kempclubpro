import { z } from 'zod';

// Contact form validation schema
export const contactFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Имя должно содержать минимум 2 символа')
    .max(100, 'Имя должно содержать максимум 100 символов')
    .regex(/^[А-Яа-яA-Za-z\s\-']+$/, 'Имя может содержать только буквы, пробелы и дефисы')
    .transform(str => str.trim()),
  
  phone: z
    .string()
    .min(10, 'Телефон должен содержать минимум 10 символов')
    .max(20, 'Телефон должен содержать максимум 20 символов')
    .regex(/^[\+\d\s\-\(\)]+$/, 'Некорректный формат телефона')
    .transform(str => str.trim()),
  
  course: z
    .string()
    .min(1, 'Необходимо выбрать курс')
    .max(100, 'Название курса слишком длинное')
    .transform(str => str.trim()),
  
  social: z
    .string()
    .max(200, 'Соц. сети не должны превышать 200 символов')
    .transform(str => str.trim())
    .optional()
});

// Auth validation schemas
export const signUpSchema = z.object({
  email: z
    .string()
    .email('Некорректный формат email')
    .max(255, 'Email слишком длинный')
    .transform(str => str.trim().toLowerCase()),
  
  password: z
    .string()
    .min(8, 'Пароль должен содержать минимум 8 символов')
    .max(128, 'Пароль слишком длинный')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Пароль должен содержать строчные и заглавные буквы, а также цифры'),
  
  firstName: z
    .string()
    .min(1, 'Необходимо указать имя')
    .max(50, 'Имя слишком длинное')
    .regex(/^[А-Яа-яA-Za-z\s\-']+$/, 'Имя может содержать только буквы')
    .transform(str => str.trim()),
  
  lastName: z
    .string()
    .min(1, 'Необходимо указать фамилию')
    .max(50, 'Фамилия слишком длинная')
    .regex(/^[А-Яа-яA-Za-z\s\-']+$/, 'Фамилия может содержать только буквы')
    .transform(str => str.trim())
});

export const signInSchema = z.object({
  email: z
    .string()
    .email('Некорректный формат email')
    .transform(str => str.trim().toLowerCase()),
  
  password: z
    .string()
    .min(1, 'Необходимо ввести пароль')
});

// Profile validation schema
export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Необходимо указать имя')
    .max(50, 'Имя слишком длинное')
    .regex(/^[А-Яа-яA-Za-z\s\-']+$/, 'Имя может содержать только буквы')
    .transform(str => str.trim())
    .optional(),
  
  lastName: z
    .string()
    .min(1, 'Необходимо указать фамилию')
    .max(50, 'Фамилия слишком длинная')
    .regex(/^[А-Яа-яA-Za-z\s\-']+$/, 'Фамилия может содержать только буквы')
    .transform(str => str.trim())
    .optional(),
  
  phone: z
    .string()
    .max(20, 'Телефон слишком длинный')
    .regex(/^[\+\d\s\-\(\)]*$/, 'Некорректный формат телефона')
    .transform(str => str.trim())
    .optional(),
  
  telegram: z
    .string()
    .max(50, 'Telegram слишком длинный')
    .regex(/^@?[\w\d_]+$/, 'Некорректный формат Telegram')
    .transform(str => str.trim())
    .optional()
});

// Security validation utilities
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

export const validateFileUpload = (file: File) => {
  const maxSize = 10 * 1024 * 1024; // 10MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
  
  if (file.size > maxSize) {
    throw new Error('Файл слишком большой. Максимальный размер: 10MB');
  }
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Неподдерживаемый формат файла');
  }
  
  return true;
};

// Rate limiting helper
export class SecurityRateLimiter {
  private attempts = new Map<string, { count: number; lastAttempt: number }>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier);

    if (!userAttempts) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (now - userAttempts.lastAttempt > this.windowMs) {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (userAttempts.count >= this.maxAttempts) {
      return false;
    }

    userAttempts.count++;
    userAttempts.lastAttempt = now;
    return true;
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type ProfileFormData = z.infer<typeof profileSchema>;