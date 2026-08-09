# migration-mira-v2 — структурный перенос базы КЭМП → МИРА

Полный структурный экспорт **фактически действующей** базы проекта `kempclub.pro`, подготовленный для накатки в **чистый** Supabase-проект «МИРА» (женский КЭМП).

> ⛔ **Ничего из этой папки ещё не применялось.** База КЭМП не изменялась, база МИРА не трогалась.
> Накатка выполняется только после отдельного разрешения.

## Состав

```
migration-mira-v2/
├── README.md                     ← этот файл, порядок накатки
├── AUDIT.md                      ← инвентаризация объектов, риски, подтверждения
├── EDGE_FUNCTIONS.md             ← 17 edge-функций, секреты, cron
├── INTEGRATIONS.md               ← Telegram, аналитика, CRM, домены
├── schema-structure-only.sql     ← всё одним файлом (без справочников)
└── migrations/
    ├── 01_extensions_and_types.sql
    ├── 02_tables_and_constraints.sql
    ├── 03_indexes.sql
    ├── 04_functions.sql
    ├── 05_triggers.sql
    ├── 06_views.sql               (пустой: VIEW в базе нет)
    ├── 07_grants.sql
    ├── 08_rls_policies.sql
    ├── 09_reference_data.sql      ← единственный файл с INSERT
    └── 10_storage.sql
```

## Порядок накатки в МИРА

Строго по номерам, каждый файл — отдельной транзакцией, с проверкой результата:

1. `01_extensions_and_types.sql` — расширения + 13 enum
2. `02_tables_and_constraints.sql` — 80 таблиц + 204 ограничения
3. `03_indexes.sql` — 63 индекса
4. `04_functions.sql` — 92 функции
5. `05_triggers.sql` — 53 триггера (зависят от 02 и 04)
6. `06_views.sql` — no-op
7. `07_grants.sql` — привилегии `anon` / `authenticated` / `service_role`
8. `08_rls_policies.sql` — RLS на 80 таблицах + 194 политики
9. `09_reference_data.sql` — коды правил начисления коинов
10. **Создать бакеты** (см. ниже) — до шага 11
11. `10_storage.sql` — 38 политик `storage.objects`

Рекомендуется применять через инструмент миграций Lovable в новом проекте, а не вставкой в SQL Editor: тогда файлы попадут в историю миграций.

## Ручные действия (SQL этого не делает)

**Бакеты Storage (8)** — создать до шага 11:

| Бакет | Публичный |
|---|---|
| `avatars` | да |
| `content` | да |
| `moments` | да |
| `testimonials` | да |
| `broadcasts` | нет |
| `contracts` | нет |
| `homework-files` | нет |
| `pyramid-materials` | нет |

**Секреты** — см. `EDGE_FUNCTIONS.md` (новый `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_ID`, `MINI_APP_URL`, `BROADCAST_SECRET` и т.д.).

**Cron (4 задачи)** — пересоздать вручную, они содержат URL и ключ нового проекта.

**Первый супер-админ** — разовый запуск `setup-super-admin` с `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**Auth** — Site URL и Redirect URLs нового домена; включить нужные провайдеры.

## Проверка после накатки

```sql
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r';                       -- ожидается 80
select count(*) from pg_policies where schemaname='public';        -- ожидается 194
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public';                                         -- ожидается 92
select count(*) from pg_policies where schemaname='storage';       -- ожидается 38
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;  -- ожидается 0
```

Затем прогнать линтер безопасности Supabase и устранить замечания.

## Чего в экспорте нет (намеренно)

- данных участников, заявок, активностей, коинов, договоров;
- пользователей `auth.users` и любых их UUID;
- e-mail, телефонов, Telegram ID;
- значений секретов и ключей;
- контента КЭМП (вопросы ежедневника, уровни Пирамиды, награды, челленджи, тренеры, тексты лендинга) — у МИРА он свой;
- бакетов и cron (создаются вручную);
- легаси-файла `migration_export.sql` из корня репозитория — он неполный и не использовался.

## Риски

Полный список — в `AUDIT.md`, раздел 9. Кратко:
1. `encrypt_phone`/`decrypt_phone` — это Base64, а не шифрование.
2. `generate_referral_code` без `SET search_path`.
3. Полные GRANT'ы для `anon` на всех таблицах — защищает только RLS.
4. 31 FK на `auth.users`: пользователей нет, профили создаются триггером при регистрации.
5. Дублирующие enum'ы (`app_role`/`user_role`, `activity_type`/`activity_type_new`) — легаси.
6. Кириллические имена трёх таблиц — легаси.
7. Часть политик объявлена `TO public` вместо `TO authenticated`.
