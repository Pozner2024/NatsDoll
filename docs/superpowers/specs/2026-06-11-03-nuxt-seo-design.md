# Спек 3: SEO-обвес

Дата: 2026-06-11. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спеки 1–2 выполнены).

## Цель

Каждая публичная страница отдаёт в server-HTML полный SEO-набор: title,
description, OG-теги, canonical; товар — дополнительно JSON-LD `Product`.
Сайт отдаёт `robots.txt` и динамический `sitemap.xml` со всеми товарами,
категориями и статичными страницами. Всё видно в `curl`-ответе без выполнения JS.

## Базовый URL сайта

В `nuxt.config.ts` добавляется `runtimeConfig.public.siteUrl` с дефолтом
`https://natsdoll.com` (переопределение — стандартный Nuxt-механизм
`NUXT_PUBLIC_SITE_URL`, в dev не обязателен). Из него строятся canonical,
`og:url` и URL внутри sitemap.

## Меты страниц

Меты статичных страниц живут в обёртках `app/pages/*` (слой `src` не трогается);
меты товара — в `ProductPageWidget.vue`, потому что данные товара уже загружены
там через `useAsyncData`, а поднимать их в обёртку — хрупко из-за порядка setup
родителя и ребёнка.

Каждая страница задаёт: `title`, `description`, `ogTitle`, `ogDescription`,
`ogImage`, `ogUrl`, `ogType`, `twitterCard: 'summary_large_image'` (через
`useSeoMeta`) и `<link rel="canonical">` (через `useHead`).

| Страница | title | description | og:image |
|----------|-------|-------------|----------|
| `/` | `NatsDoll — Handmade Polymer Clay Dolls & Gifts` | Unique handmade art dolls and personalized gifts sculpted from polymer clay. One-of-a-kind pieces made with love by Natalia. | дефолтная константа |
| `/gallery` | `The Gallery — NatsDoll` | Explore collections of handmade polymer clay art dolls and miniatures — every piece is one of a kind, sculpted and painted by hand. | дефолтная константа |
| `/shop` | `The Shop — NatsDoll` | Browse handmade polymer clay dolls, birthday gifts, Christmas ornaments and personalized keepsakes. Worldwide shipping. | дефолтная константа |
| `/shop/<категория>` | `<Имя категории> — NatsDoll` | Handmade polymer clay <имя категории в нижнем регистре> by NatsDoll. Every piece is sculpted and painted by hand. | дефолтная константа |
| `/product/<slug>` | `<Имя товара> — NatsDoll` | описание товара: HTML-теги вырезаны, пробелы схлопнуты, обрезка до 160 символов по границе слова | первое фото товара |

Тексты для статичных страниц утверждены пользователем (формулировки выше —
финальные; правки формулировок при ревью спека допустимы).

Детали:

- Имя категории для `/shop/<slug>` берётся из `categoryStore` — он уже
  гидратирован layout'ом (спек 2). Если slug не найден в сторе (несуществующая
  категория) — fallback на меты `/shop` без категории.
- Canonical везде = `siteUrl + route.path` — без query. `?sort=` и `?page=` —
  дубликаты одного контента, Google должен индексировать чистый URL.
- Дефолтный `og:image` — константа `DEFAULT_OG_IMAGE` в `@/shared` с URL
  существующего фото из Яндекс Object Storage (конкретное фото выбирается при
  реализации из home-галереи; решение пользователя — использовать существующее
  фото, не создавать новый ассет).
- `og:image` товара — абсолютный URL (фото в Object Storage уже абсолютные).

## JSON-LD Product

На странице товара (`ProductPageWidget.vue`) через
`useHead({ script: [{ type: 'application/ld+json', textContent: ... }] })`:

```json
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "<имя>",
  "description": "<очищенное описание, как в meta description>",
  "image": ["<все фото>"],
  "offers": {
    "@type": "Offer",
    "price": "<salePrice ?? price>",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock | OutOfStock",
    "url": "<canonical товара>"
  }
}
```

Минимум по roadmap: без `brand`, `aggregateRating`, `review` (отзывы не в SSR —
добавятся, когда/если переедут).

## robots.txt

Статичный файл `apps/web/public/robots.txt`:

```
User-agent: *
Disallow: /account
Disallow: /cart
Disallow: /admin
Disallow: /auth
Disallow: /verify-email
Disallow: /reset-password
Disallow: /orders

Sitemap: https://natsdoll.com/sitemap.xml
```

Домен в файле захардкожен — он стабилен; динамика не нужна.

## sitemap.xml

Nitro server-route `apps/web/server/routes/sitemap.xml.ts`. Источники данных
(база API: `process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'` —
тот же механизм, что в изоморфном `apiFetch` из спека 2):

- статичные URL: `/`, `/gallery`, `/shop` — без `lastmod`;
- категории: существующий `GET /categories` → `/shop/<slug>` — без `lastmod`;
- товары: новый эндпоинт `GET /products/sitemap-data` → `/product/<slug>`
  с `lastmod` из `updatedAt` (формат `YYYY-MM-DD`).

Ответ — `Content-Type: application/xml`, стандартный `<urlset>`. Без
кэширования: каждый запрос свежий (как SSR-страницы; трафик 1–200/день).
Ошибка API при генерации → HTTP 500 (краулер повторит позже; пустой sitemap
вреднее честной ошибки).

Sitemap закрывает обнаружение категорий из спека 2: ссылки на `/shop/<slug>`
не видны в SSR HTML (меню за `v-if`), теперь Google получает их из sitemap.

## Новый эндпоинт API

`GET /products/sitemap-data` в `apps/api`, стандартные 3 слоя:

- **Application**: `listProductsForSitemap.ts` — возвращает `{ slug, updatedAt }[]`
  всех товаров по тем же правилам видимости, что листинг (если листинг ничего
  не скрывает — то просто все товары).
- **Infrastructure**: метод репозитория, `select` только `slug` и `updatedAt`,
  без пагинации.
- **Presentation**: маршрут в `productRoutes.ts`, публичный, без авторизации.
  Регистрируется ДО `/:slug`-маршрута, чтобы `sitemap-data` не матчился как slug.

## Vitest

Глобальный мок `nuxt/app` в `apps/web/vitest.setup.ts` дополняется no-op
заглушками: `useSeoMeta`, `useHead`, `useRuntimeConfig`
(возвращает `{ public: { siteUrl: 'https://natsdoll.com' } }`).
Существующие тесты не меняются.

## Тестирование

- Unit (web): хелпер очистки описания (strip HTML + truncate 160) — отдельная
  функция в `@/shared` с тестами; JSON-LD-формирование, если выделено в функцию.
- Unit (api): use-case `listProductsForSitemap` + route-тест эндпоинта.
- Смоук (curl, локальный API с посеянной БД):
  - каждая публичная страница: `<title>`, `meta description`, `og:*`, canonical
    в HTML;
  - `/product/<slug>`: JSON-LD со всеми полями;
  - `/robots.txt`: отдаётся, содержит `Sitemap:`;
  - `/sitemap.xml`: валидный XML, содержит товары с `lastmod`, категории,
    статичные страницы.

## Критерии приёмки

1. `curl` каждой публичной страницы (`/`, `/gallery`, `/shop`,
   `/shop/<категория>`, `/product/<slug>`) показывает title, description,
   OG-теги и canonical без выполнения JS.
2. `curl /product/<slug>` содержит валидный JSON-LD `Product` с ценой, валютой,
   наличием и фото.
3. `curl /robots.txt` отдаёт файл со строкой `Sitemap:`.
4. `curl /sitemap.xml` отдаёт валидный XML со всеми товарами (`lastmod`),
   категориями и статичными страницами.
5. Все unit-тесты (web + api), typecheck, lint изменённых файлов, build — зелёные.

## Вне scope

Отправка sitemap в Google Search Console (спек 7, после деплоя), SEO-меты
приватных страниц (они `noindex` через robots.txt-disallow), `aggregateRating`
в JSON-LD, OG-теги для пагинации (`?page=N` не каноничны), hreflang (сайт
одноязычный), видимые ссылки на категории в HTML (отдельное решение про UX
меню, не SEO-спек).
