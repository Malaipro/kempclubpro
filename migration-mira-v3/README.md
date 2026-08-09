# migration-mira-v3 — структурный перенос базы КЭМП → МИРА (безопасный профиль)

То же, что `migration-mira-v2`, но с исправленной моделью доступа: минимальные гранты,
политики без `TO public` там, где они должны быть для авторизованных, закрытые
`SECURITY DEFINER`-функции и индексы под все внешние ключи.
**Функциональность приложения сохранена** — публичный лендинг, форма заявки, ЛК,
админка, Telegram Mini App и edge-функции работают как раньше.

> ⛔ Ничего из этой папки не применялось. База КЭМП не изменялась, база МИРА не трогалась.
> `migration-mira-v2/` оставлена без изменений как исходная версия.

## Состав

```
migration-mira-v3/
├── README.md                     ← этот файл, порядок накатки
├── CHANGELOG_v2_to_v3.md         ← что именно изменено относительно v2
├── AUDIT.md                      ← инвентаризация объектов
├── TABLE_ACCESS_MATRIX.md        ← матрица табличных прав anon/authenticated/service_role
├── FUNCTION_ACCESS_MATRIX.md     ← права EXECUTE по 92 функциям
├── RLS_REVIEW.md                 ← ревизия 194 политик + storage
├── FK_INDEX_AUDIT.md             ← 79 FK и покрывающие индексы
├── EDGE_FUNCTIONS.md             ← 17 edge-функций, секреты, cron
├── INTEGRATIONS.md               ← Telegram, аналитика, CRM, домены
├── schema-structure-only.sql     ← сборка 01–08 + 10 одним файлом (без справочников)
└── migrations/
    ├── 01_extensions_and_types.sql
    ├── 02_tables_and_constraints.sql
    ├── 03_indexes.sql            ← +33 индекса под FK
    ├── 04_functions.sql          ← у всех функций SET search_path = public
    ├── 05_triggers.sql
    ├── 06_views.sql               (пустой: VIEW в базе нет)
    ├── 07_grants.sql             ← переписан: REVOKE ALL + точечные GRANT
    ├── 08_rls_policies.sql       ← 97 политик TO public → TO authenticated, чинён Мастермайнд
    ├── 09_reference_data.sql     ← единственный файл с INSERT (коды coin_rules)
    └── 10_storage.sql            ← 11 политик ужесточено
```

## Порядок накатки в МИРА

Строго по номерам, каждый файл — отдельной транзакцией, с проверкой результата:

1. `01_extensions_and_types.sql` — расширения + 13 enum
2. `02_tables_and_constraints.sql` — 80 таблиц + 204 ограничения
3. `03_indexes.sql` — 63 исходных индекса + 33 новых под FK
4. `04_functions.sql` — 92 функции
5. `05_triggers.sql` — 53 триггера (зависят от 02 и 04)
6. `06_views.sql` — no-op
7. `07_grants.sql` — **накатывать после 04**, т.к. содержит `GRANT EXECUTE` на функции
8. `08_rls_policies.sql` — RLS на 80 таблицах + 194 политики
9. `09_reference_data.sql` — коды правил начисления коинов
10. **Создать бакеты** (см. ниже) — до шага 11
11. `10_storage.sql` — 38 политик `storage.objects`

Рекомендуется применять через инструмент миграций Lovable в новом проекте, а не вставкой
в SQL Editor: тогда файлы попадут в историю миграций.

## Ручные действия (SQL этого не делает)

**Бакеты Storage (8)** — создаются инструментом создания бакетов, не SQL-вставкой:

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

**Секреты** — см. `EDGE_FUNCTIONS.md` (новый `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_ID`,
`MINI_APP_URL`, `BROADCAST_SECRET` и т.д.).

**Cron (4 задачи)** — пересоздать вручную, они содержат URL и ключ нового проекта.

**Первый супер-админ** — разовый запуск `setup-super-admin` с `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

**Auth** — Site URL и Redirect URLs нового домена; включить нужные провайдеры.

## Проверка после накатки

```sql
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r';                        -- 80
select count(*) from pg_policies where schemaname='public';         -- 194
select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public';                                          -- 92
select count(*) from pg_policies where schemaname='storage';        -- 38
select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;   -- 0

-- функции без search_path (должно быть 0)
select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.prokind='f'
   and not exists (select 1 from unnest(coalesce(p.proconfig,'{}')) c where c like 'search_path=%');

-- таблицы, где anon имеет права на запись (должно быть 0)
select table_name, privilege_type from information_schema.role_table_grants
 where grantee='anon' and table_schema='public' and privilege_type <> 'SELECT';
```

Ожидаемый результат последнего запроса — только `INSERT` на `contact_submissions`
и `referral_leads`.

Затем прогнать линтер безопасности Supabase.

## Смоук-тест приложения после накатки

1. Лендинг открывается без авторизации, видны тексты, тренеры, отзывы, галерея.
2. Форма заявки отправляется анонимно, запись появляется в `contact_submissions`.
3. Страница `/join` по реферальной ссылке принимает заявку.
4. Вход в ЛК, профиль читается и сохраняется.
5. Админка: список участников, заявки, начисление коинов, проверка ДЗ.
6. Telegram Mini App: профиль, расписание, отметка, ДЗ, магазин, мастермайнд.

Если что-то упало с `permission denied`, см. раздел 5 в `FUNCTION_ACCESS_MATRIX.md` —
добавляется одна точечная строка `GRANT`, откатывать весь файл не нужно.

## Чего в экспорте нет (намеренно)

Данных участников и заявок, пользователей `auth.users`, e-mail/телефонов/Telegram ID,
значений секретов, контента КЭМП (вопросы ежедневника, Пирамида, награды, челленджи,
тренеры, тексты лендинга), бакетов и cron.

## Известные ограничения

1. `encrypt_phone`/`decrypt_phone` — Base64, а не шифрование (логика не менялась).
2. Дублирующие enum'ы `app_role`/`user_role`, `activity_type`/`activity_type_new` — легаси.
3. Три таблицы с кириллическими именами — легаси, требуют кавычек в SQL.
