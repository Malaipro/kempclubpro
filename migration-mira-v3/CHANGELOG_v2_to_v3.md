# CHANGELOG_v2_to_v3.md

Что изменено в `migration-mira-v3` относительно `migration-mira-v2`.
Схема (таблицы, колонки, ограничения, триггеры, enum'ы) **не менялась** — отличия только
в правах, политиках, индексах и `search_path`.

## 1. `07_grants.sql` — переписан полностью

**Было:** 239 строк вида
`GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON <table> TO anon;`
для всех 80 таблиц и всех трёх ролей + `EXECUTE` для `PUBLIC` на 92 функции.
Любая таблица без RLS-политики оказалась бы полностью открыта анониму.

**Стало:**
- `REVOKE ALL ... FROM anon, authenticated` + сброс default privileges;
- точечные `GRANT` по матрице (`TABLE_ACCESS_MATRIX.md`): `anon` — чтение 18 публичных
  таблиц и вставка в `contact_submissions` / `referral_leads`; `authenticated` — только
  команды, разрешённые его RLS-политиками; `service_role` — полный доступ;
- `REVOKE EXECUTE ... FROM PUBLIC` на все функции, затем 2 гранта для `anon`,
  30 для `authenticated`, остальное — `service_role` (`FUNCTION_ACCESS_MATRIX.md`);
- три служебные таблицы (`admin_access_log`, `contact_rate_limit`, `telegram_bot_sessions`)
  клиентским ролям не выдаются вовсе.

## 2. `08_rls_policies.sql`

- 97 политик переведены с `TO public` на `TO authenticated`. Публичными остались только
  SELECT-политики лендинга и INSERT формы заявки.
- Исправлены 6 политик Мастермайнда: `mm_entries_insert` (`WITH CHECK (true)`) и
  `mm_tasks_update` (`USING (true)`) позволяли анониму писать и править чужие данные.
  Теперь — проверка членства в `mastermind_members` либо `is_admin(auth.uid())`.

## 3. `04_functions.sql`

- `generate_referral_code` получила `SET search_path = public`. Теперь все 92 функции
  имеют фиксированный `search_path` — обязательное условие для `SECURITY DEFINER`.

## 4. `03_indexes.sql`

- Добавлено 33 индекса `IF NOT EXISTS` под внешние ключи, которые не были покрыты
  (`FK_INDEX_AUDIT.md`). Покрытие FK: 46/79 → 79/79.

## 5. `10_storage.sql`

- 11 политик переведены с `TO public` на `TO authenticated`. Публичными остались
  четыре SELECT-политики публичных бакетов: `avatars`, `content`, `moments`, `testimonials`.

## 6. Документация

Добавлены `TABLE_ACCESS_MATRIX.md`, `FUNCTION_ACCESS_MATRIX.md`, `RLS_REVIEW.md`,
`FK_INDEX_AUDIT.md`, этот changelog; README дополнен проверками и смоук-тестом.
`schema-structure-only.sql` пересобран из актуальных файлов `migrations/`.

## 7. Что осознанно не трогали

- Base64-«шифрование» телефона (`encrypt_phone`/`decrypt_phone`) — замена требует правок в коде.
- Дублирующие enum'ы и кириллические имена таблиц — легаси, завязано на код приложения.
- Логика функций и триггеров — ни одно тело функции по существу не изменено.
