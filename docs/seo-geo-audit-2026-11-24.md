# КЭМП — технический аудит SEO и GEO

Снимок production за 24–25 ноября 2026, время МСК. Локальная ветка `feature/seo-geo-foundation-20261124`, база `amvera-release@26f121237516a655711ec2be79f51a760a2eef34`.

`CONFIRMED` — наблюдение из HTTP, GitHub или исходников. `VERIFIED_LOG` — подтверждение из журнала интеграции. `UNKNOWN` — недостаточно данных. `CONFLICT` — наблюдения или настройки расходятся.

## Production до изменений

| Факт | Статус и доказательство |
|---|---|
| GitHub и default branch | `CONFIRMED`. [`Malaipro/kempclubpro`](https://github.com/Malaipro/kempclubpro), default `main`, удалённый HEAD `baa4de0f7d37e9a4ae45dc51e3599d9252651361`. |
| Ветка релиза | `VERIFIED_LOG`. GitHub → Amvera, хост `webhook.git.waw0.amvera.ru`. Исторический push `feature/men-path-preview` отклонён фильтром ветки, push `amvera-release` принят. GitHub Actions запусков не показал. |
| Commit production | `UNKNOWN` для точного SHA запущенного артефакта. Кандидат [`26f1212`](https://github.com/Malaipro/kempclubpro/commit/26f121237516a655711ec2be79f51a760a2eef34) подтверждён как HEAD `amvera-release` и SHA принятого push. Commit в 13:44 МСК, HTTP `Last-Modified` в 13:47 МСК. CSS `index-D_uUU7CE.css` совпал по имени с локальной сборкой, JS `index-BYQViRoT.js` отличается от локального baseline `index-I-jwQHSP.js`. Логи успешной публикации Amvera недоступны. |
| Сборка и хостинг | `CONFIRMED` по коду и integration log. React 18, TypeScript, Vite 5 и React Router `BrowserRouter`. `bun run build` вызывает `vite build`. `amvera.yml` задаёт `static_web`, Bun 1.2 и `dist/*` в корень. Live HTTP отвечает через `envoy`. |
| Корень и canonical host | `CONFIRMED`. `https://kempclub.pro/` отвечает `200 text/html`. Проверенные `http://kempclub.pro/` и `https://www.kempclub.pro/` приводят к этому URL. В initial HTML один self-canonical. |
| Начальный HTML | `CONFIRMED` через `curl` с Mozilla, Googlebot и YandexBot. Все три User-Agent получили `200`, те же `ETag` и размер 7 963 байта, пустой `<div id="root"></div>`, без H1 и видимого описания клуба. Идентификаторы User-Agent имитируют запросы роботов. Фактическое содержимое их индекса требует проверки в кабинетах. |
| Метаданные | `CONFLICT`. Статический title про дисциплину, выносливость и братство, description с упором на тренировки, список `meta keywords`, `robots=index, follow`, OG и Twitter large image. React переписывал title и добавлял второй description и viewport. В raw HTML `/` и HTTP-заголовке нет `noindex`. |
| Schema.org | `CONFLICT`. Три раздельных JSON-LD блока `SportsClub`, `Organization`, `WebSite` без связей. `SportsClub` сужает позиционирование. В `sameAs` был личный контакт. |
| `robots.txt` и `sitemap.xml` | `CONFIRMED`. `200 text/plain` и `200 text/xml`. Корень разрешён, закрыты только `/dashboard`, `/auth`, `/admin/`. Яндекс имеет отдельную группу с `Clean-param`. `CONFLICT`: sitemap включает `/join` и `/club-residents`, которые объявляют `noindex` после запуска React. `/join` — по приглашению, `/club-residents` — список резидентов. |
| SPA fallback | `CONFLICT`. `/auth`, `/join`, `/club-residents` и заведомо отсутствующий путь отвечают `200 text/html`. React Router обрабатывает прямые переходы. Неизвестный маршрут получает компоненты «Страница не найдена» при HTTP 200. Хостинг-правила для настоящего HTTP 404 и отдельных SEO-заголовков `UNKNOWN`. |
| Яндекс | `CONFIRMED`. В HTML тег `yandex-verification` и счётчик Метрики `105195673`. Файл подтверждения отвечает `200 text/html`. Права владельца, подключение счётчика к Вебмастеру, текущая индексация и регион в кабинете `UNKNOWN`. |
| Google, Bing и производительность | `CONFIRMED`. Статические robots/sitemap и картинка OG `200 image/png`. Hero уже имеет preload. Права Search Console, выбранный Google canonical, выдача и полевые CWV `UNKNOWN`. Наличие JSON-LD не обещает rich result или цитирование в AI. |

## Реализация в ветке

- Vite пререндерит Hero и «Коротко о КЭМП» непосредственно в `dist/index.html`. Источник контента общий для initial HTML и React. Пользователь без JavaScript видит описание и рабочий якорь. Существующие интерактивные секции подхватывает SPA. Исходники лендинга сохраняют один H1. Новый блок использует H2 и четыре H3. Заголовок видимой Пирамиды приведён к H3 и каноническим шести уровням.
- Title, description, canonical `https://kempclub.pro/`, robots, Open Graph и Twitter Card берутся из общего компонента для HTML и React. JSON-LD содержит `Organization`, `WebSite`, `WebPage` и `Service` с постоянными `@id`, связями и рабочим якорем описания услуги. BreadcrumbList для единственной индексируемой страницы не нужен. В разметке только публичные факты и действующая графика. Цены, конкретные адреса, даты, результаты и рейтинги в новых данных отсутствуют.
- Sitemap содержит единственный индексируемый URL `/`. Robots оставляет его и ресурсы открытыми, ограничивает обход технических маршрутов и сохраняет `Clean-param`. `/join` и `/club-residents` оставлены доступными для обхода `noindex` в рендере. `robots.txt` управляет обходом, а не доступом или гарантированным удалением из индекса.
- Текущий static host использует общий HTML для SPA. При запуске JavaScript вне `/` и на `kemp-app.ru` пререндер главной удаляется, метаданные заменяются на маршрутные. Для роботов и клиентов без JavaScript общий HTTP fallback по-прежнему содержит HTML главной. Перед релизом отдельной проверкой подтвердить правила хостинга: индексируемый HTML отдавать только для главной, для известных SPA-маршрутов отдавать shell с `X-Robots-Tag: noindex` или raw meta `noindex`, для неизвестных путей — HTTP 404. Файлы, OAuth, Telegram и deep links должны сохранить свою маршрутизацию. Эта работа относится к хостингу, конфигурация `amvera.yml` в PR прежняя. [Документация Google по JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics)
- Самостоятельная ссылка из статической версии ведёт к `#kemp-overview`. В SPA есть якоря `#about`, `#journey`, `#program`, `#contact`. Основные публичные изображения имеют alt, логотип-ссылка использует полное название, повтор логотипа внутри H1 декоративный. Бизнес-логика CTA и подача заявки прежние.
- Метрика, Top.Mail.Ru и верификация Яндекса сохранены. Vite в существующей конфигурации локально регенерирует bundle MCP при сборке. Сгенерированный diff исключён из изменений. Выкладка статических файлов в этой задаче не выполняется.

## Карта поисковых интентов

| Query intent | Целевая страница сейчас | Возможная будущая страница | Статус |
|---|---|---|---|
| КЭМП, КЭМП Казань, Клуб КЭМП, Клуб Эффективного Мужского Прогресса | `/`, вводный экран и `#kemp-overview` | `/` | `IMPLEMENTED` |
| Мужской клуб Казань, мужской клуб для развития, мужское сообщество Казань | `/`, `#kemp-overview` и `#about` | Отдельная страница о клубе, если появится самостоятельный материал и спрос | `IMPLEMENTED` |
| Мужской клуб для предпринимателей Казань | `/` как общий ответ о мужском сообществе | Страница для предпринимателей только при подтверждении отдельной аудитории и предложения | `UNKNOWN` для узкой аудитории. Формулировка на сайте не добавлялась. |
| Мужской интенсив Казань, 60-дневный интенсив для мужчин, единоборства и развитие для мужчин | `/`, `#intensive` и `#program` | Страница программы при наличии самостоятельного содержания | `IMPLEMENTED` |

Якоря помогают попасть в соответствующий раздел и не считаются отдельными страницами sitemap.

## Локальные проверки

- `bun install --frozen-lockfile --offline --ignore-scripts` и `bun run build` прошли. Сборка сохраняет прежние предупреждения Vite о большом чанке, смешанном импорте ContactForm и возрасте базы Browserslist. JS основного чанка в локальном baseline ≈214,22 кБ gzip, в этой сборке ≈215,52 кБ gzip. HTML 2,71 → 4,34 кБ gzip. Из этих размеров нельзя сделать вывод о полевых CWV.
- `bun test src` — 78 из 78. `deno test --no-prompt supabase/functions/mastermind-push/policy_test.ts` — 11 из 11. Единый `bun test` неприменим к внешнему URL-импорту Deno в существующем тесте.
- `tsc --noEmit -p tsconfig.node.json` и `tsc --noEmit -p tsconfig.app.json` прошли. `git diff --check` и `xmllint --noout dist/sitemap.xml` прошли.
- В raw `dist/index.html` проверены один H1, title, canonical, description, robots, viewport. JSON-LD разбирается, все четыре типа и ссылки `@id` проверены. В HTML присутствуют Казань, длительность интенсива, GEO-блок и полная последовательность Пирамиды. Sitemap содержит только канонический URL. `robots.txt` проверен через локальный HTTP.
- Playwright на локальном preview проверил главную с JavaScript и без него, мобильную ширину 390 px, отсутствие дублей в head, ссылку статического блока и возврат SPA с `/join`. На отрисованной главной не найдено пропущенных уровней заголовков или изображений без атрибута `alt`. `/join`, `/club-residents`, `/auth`, `/app/login` и неизвестный путь получили `noindex` в браузере и не унаследовали canonical или JSON-LD главной. При имитации `kemp-app.ru` через локальный preview корень привёл к `/app/login` с `noindex`. Внешние запросы браузера заблокированы, отправки заявок и доступ к данным не выполнялись.

## Действия владельца после согласованного релиза

1. Проверить `200` для `/`, `robots.txt`, `sitemap.xml` и изображения OG, оба редиректа на canonical host, H1 и текст клуба через `curl` с обычным и поисковыми User-Agent. Проверить `noindex` на служебных URL и HTTP 404 на неизвестном пути с учётом ограничений SPA. Прогнать live URL через [Schema.org Validator](https://validator.schema.org/).
2. Яндекс — первый приоритет. В Вебмастере открыть или подтвердить `https://kempclub.pro/`, проверить robots, sitemap и диагностику главной. Добавить `https://kempclub.pro/sitemap.xml` в «Индексирование → Файлы Sitemap». Убедиться, что доступен нужный счётчик Метрики `105195673` и корректна привязка. Отправить главную на [переобход в Яндекс Вебмастере](https://yandex.ru/support/webmaster/ru/robot-workings/site-reindex).
3. Google. После отдельного согласования владельцем открыть или подтвердить property, отправить тот же sitemap в отчёте Sitemaps, проверить главную в URL Inspection (Live Test) и запросить индексирование. После обработки сверить Google-selected canonical и полевые CWV, если данных достаточно. [Проверка URL в Search Console](https://support.google.com/webmasters/answer/9012289)
4. После переобхода проверить выдачу из Казани по «КЭМП Казань», полному названию и запросу «мужской клуб Казань». Сверить URL, название, описание и карточку при отправке ссылки. Сниппеты формируются поисковиками, поэтому полезно зафиксировать разные запросы и даты наблюдений. Bing использует ту же основу. Отдельная доработка не предусмотрена.

Статусы ветки на момент отчёта: `IMPLEMENTED` · `VERIFIED_LOCAL` · `NOT MERGED` · `NOT DEPLOYED`. Точный production SHA, правила HTTP fallback, кабинеты поиска, полевые CWV и узкий интент для предпринимателей остаются отдельными пунктами проверки.
