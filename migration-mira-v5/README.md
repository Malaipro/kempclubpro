# migration-mira-v4 — структурный перенос базы КЭМП → МИРА (финальный профиль)

То же, что `migration-mira-v3`, но с закрытыми блокерами: `SECURITY DEFINER`-функции
проверяют права внутри тела, `REVOKE CREATE ON SCHEMA public`, идемпотентное создание
восьми бакетов, публичные результаты — только через безопасные представления.
Ниже — наследие v3: минимальные гранты,
политики без `TO public` там, где они должны быть для авторизованных, закрытые
`SECURITY DEFINER`-функции и индексы под все внешние ключи.
**Функциональность приложения сохранена** — публичный лендинг, форма заявки, ЛК,
админка, Telegram Mini App и edge-функции работают как раньше.

> ⛔ Ничего из этой папки не применялось. База КЭМП не изменялась, база МИРА не трогалась.
> `migration-mira-v2/` и `migration-mira-v3/` оставлены без изменений.

## Состав

```
migration-mira-v3/
├── README.md                     ← этот файл, порядок накатки
├── CHANGELOG_v3_to_v4.md         ← что изменено относительно v3 (читать первым)
├── CHANGELOG_v2_to_v3.md         ← что изменено относительно v2
├── SECURITY_NOTES.md             ← модель угроз, правки функций, известные ограничения
├── PUBLIC_DATA_EXPOSURE.md       ← что видит анонимный посетитель + правки фронтенда
├── LEGACY_MODULES.md             ← что не переносить в МИРА
├── REFERENCE_DATA.md             ← какие справочники переносятся, какие заводить заново
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
    ├── 07_grants.sql             ← v4: + REVOKE CREATE, отзыв decrypt_phone/mask_*
    ├── 08_rls_policies.sql       ← 97 политик TO public → TO authenticated, чинён Мастермайнд
    ├── 09_reference_data.sql     ← единственный файл с INSERT (коды coin_rules)
    └── 10_storage.sql           ← v4: 8 бакетов идемпотентно + 38 политик
```

## Порядок накатки в МИРА

Строго по номерам, каждый файл — отдельной транзакцией, с проверкой результата:

1. `01_extensions_and_types.sql` — расширения + 13 enum
2. `02_tables_and_constraints.sql` — 80 таблиц + 204 ограничения
3. `03_indexes.sql` — 63 исходных индекса + 33 новых под FK
4. `04_functions.sql` — 92 функции
5. `05_triggers.sql` — 53 триггера (зависят от 02 и 04)
6. `06_views.sql` — 2 представления (`public_leaderboard_view`, `public_cooper_results_view`)
7. `07_grants.sql` — **накатывать после 04**, т.к. содержит `GRANT EXECUTE` на функции
8. `08_rls_policies.sql` — RLS на 80 таблицах + 194 политики
9. `09_reference_data.sql` — коды правил начисления коинов
10. `10_storage.sql` — 8 бакетов (идемпотентно) + 38 политик `storage.objects`

Рекомендуется применять через инструмент миграций Lovable в новом проекте, а не вставкой
в SQL Editor: тогда файлы попадут в историю миграций.

## Ручные действия (SQL этого не делает)

**Бакеты Storage (8)** — в v4 создаются самим `10_storage.sql`. Если в проекте МИРА
включена политика, запрещающая SQL-вставку в `storage.buckets`, создайте их
инструментом создания бакетов с теми же параметрами:

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
select count(*) from pg_policies where schemaname='public';         -- 190 (v4: 3 политики Купера → 1)
select count(*) from pg_views where schemaname='public';            -- 2
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

Дополнительно (v4):

```sql
-- anon не должен видеть таблицы с персональными результатами
select * from information_schema.role_table_grants
 where grantee='anon' and table_name in ('public_profiles','cooper_test_results','profiles'); -- 0 строк

-- anon не может создавать объекты
select has_schema_privilege('anon','public','CREATE');   -- false

-- бакеты
select id, public, file_size_limit from storage.buckets order by id;  -- 8 строк
```

Затем прогнать линтер безопасности Supabase.

## Смоук-тест приложения после накатки

1. Лендинг открывается без авторизации, видны тексты, тренеры, отзывы, галерея.
2. Форма заявки отправляется анонимно, запись появляется в `contact_submissions`.
3. Страница `/join` по реферальной ссылке принимает заявку.
4. Вход в ЛК, профиль читается и сохраняется.
5. Админка: список участников, заявки, начисление коинов, проверка ДЗ.
6. Telegram Mini App: профиль, расписание, отметка, ДЗ, магазин, мастермайнд.
7. **v4**: обычный пользователь вызывает `update_participant_status` / чужой
   `get_user_coin_balance` → `access denied`.
8. **v4**: публичные блоки результатов работают только после адаптации фронтенда
   (`PUBLIC_DATA_EXPOSURE.md` §4).

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


---

## v5 (текущая версия)

Исправлена критическая ошибка авторизации v4: `current_user` внутри `SECURITY DEFINER`
равен владельцу функции, а не вызывающему клиенту. Введена схема «internal + wrapper»:
`_internal_*` (только `service_role`) и публичные обёртки, авторизующие по `auth.uid()`.
`public_leaderboard_view` больше не отдаёт `current_stream_id`.

- `CHANGELOG_v4_to_v5.md` — что изменилось;
- `AUTHORIZATION_TESTS.md` — матрица allow/deny и команды проверки.
