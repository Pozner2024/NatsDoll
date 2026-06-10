# Спек 2: Публичные страницы с SSR

Дата: 2026-06-10. Родитель: `2026-06-10-nuxt-ssr-roadmap.md`. Базируется на ветке
`feat/nuxt-skeleton` (спек 1 выполнен).

## Цель

Главная, магазин, страница товара и галерея рендерятся на сервере с реальными
данными из API: Google и любой краулер видят контент без выполнения JS.
Клиентская SPA-навигация между страницами сохраняется.

## Маршруты

`app/pages` — тонкие обёртки, импортирующие существующие страницы из `src/pages`
(ФСД-слои не двигаются, как решено в спеке 1):

| Nuxt-файл                    | Старый маршрут     | Контент            |
|------------------------------|--------------------|--------------------|
| `app/pages/index.vue`        | `/`                | `HomePage.vue` (заглушка спека 1 заменяется) |
| `app/pages/gallery.vue`      | `/gallery`         | `GalleryPage.vue`  |
| `app/pages/shop/[[category]].vue` | `/shop/:category?` | `ShopPage.vue` |
| `app/pages/product/[slug].vue`    | `/product/:slug`   | `ProductPage.vue` |

## Каркас (layout)

Содержимое `src/App.vue` переезжает в `app/layouts/default.vue`:
skip-link, `AppHeader`, `<main id="main">`, `AppFooter`, `ContactModal`,
`AuthModal`, `CartPromptModal`. Сам `src/App.vue` при этом НЕ удаляется —
он остаётся до спека 4 вместе с `src/router` (удалять их будем одним движением,
когда auth переедет).

Переход страниц: `app.pageTransition: { name: 'page', mode: 'out-in' }` в
`nuxt.config.ts`; CSS-классы `.page-enter-*`/`.page-leave-*` переезжают в layout.
Спец-логика key для admin/account из старого App.vue в спек 2 не переносится
(понадобится в спеках 5–6).

`initAuth()` НЕ подключается (спек 4). До спека 4 пользователь на Nuxt-страницах
всегда выглядит анонимным — приемлемо: прод живёт на SPA, security-инварианты
не затронуты.

## Изоморфный apiFetch

Единственная правка `src/shared/lib/apiClient.ts`: база URL вместо константы
`'/api'` вычисляется по окружению:

- сервер (`import.meta.server`): `process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'` —
  запрос идёт напрямую в API без префикса `/api` (эквивалент старого vite-rewrite);
- браузер: `'/api'` как сейчас (dev — nitro devProxy, прод — Caddy);
- vitest: `import.meta.server` falsy → `'/api'`, тесты без изменений.

В `docker-compose.yml` сервису `web` добавляется `NUXT_API_INTERNAL_URL: http://api:3000`.

## Миграция загрузки данных — 4 точки

Паттерн един: Nuxt `useAsyncData` поверх СУЩЕСТВУЮЩИХ fetch-функций, возвращаемый
интерфейс композаблов сохраняется (`{ data, isLoading, hasError }` — адаптер из
`status`/`error` Nuxt), чтобы компоненты-потребители не менялись.

| Точка | Сейчас | Станет |
|-------|--------|--------|
| `widgets/gallery-grid/useGalleryGrid` | shared `useAsyncData` (onMounted) | `useAsyncData('home-gallery', () => fetchHomeGallery())` |
| `widgets/collection-section/useCollectionSection` | shared `useAsyncData` | `useAsyncData('collections', () => fetchCollections())` |
| `widgets/shop-catalog/useShopCatalog` | ручной watch + abort | `useAsyncData` с `watch` по category/sort/page из route; категории фильтра — тоже SSR-safe загрузка |
| `widgets/product-page/ProductPageWidget` | watch по slug + fetchProduct | `useAsyncData` по slug; товар не найден → `createError({ statusCode: 404 })` |

Ручная отмена через AbortSignal в мигрируемых точках убирается — дедупликацию
и жизненный цикл берёт на себя Nuxt. Сигнатуры fetch-функций не меняются
(параметр `signal` опционален).

Hero-слайдер, FAQ, отзывы — статичный контент, миграции не требуют.
`shared/lib/useAsyncData.ts` (onMounted-версия) остаётся для непубличных виджетов.

## Обработка ошибок

- Товар не найден → серверный HTTP 404 (стандартная Nuxt-страница ошибки).
- Ошибка API при SSR → страница рендерится с текущими error-состояниями виджетов
  («Failed to load …»), HTTP 200. Поведение идентично сегодняшнему клиентскому.
- Неизвестная категория в `/shop/<x>` → пустой каталог, как сейчас.

## Риски

- **Hydration mismatch**: компоненты, читающие `window`/`matchMedia`/`localStorage`
  при первом рендере (слайдеры, бейдж корзины в шапке), проверяются; при
  необходимости — `<ClientOnly>` или guard `import.meta.client`.
- **Имя-двойник**: в `@/shared` есть собственный `useAsyncData`; в мигрируемых
  файлах используется Nuxt-версия (автоимпорт), импорт из `@/shared` удаляется —
  не перепутать при ревью.

## Тестирование

- Unit-тесты 4 мигрируемых композаблов адаптируются под Nuxt `useAsyncData`
  (моки через `mockNuxtImport` из `@nuxt/test-utils` либо эквивалент); смысл
  проверок сохраняется. Остальные тестовые файлы не меняются.
- Смоук SSR: `curl` каждой из 4 страниц при работающем локальном API с посеянной
  БД — в HTML видны реальные названия товаров/коллекций без выполнения JS.
- `curl -o /dev/null -w "%{http_code}" /product/nonexistent-slug` → `404`.

## Критерии приёмки

1. `curl` каждой из 4 страниц возвращает HTML с данными из БД (предусловие:
   локальный API + `prisma db seed`).
2. `curl /product/<несуществующий>` → HTTP 404.
3. Клиентская навигация между страницами работает (проверка в браузере: переходы
   без полной перезагрузки).
4. Все unit-тесты проходят (адаптированные — с сохранённым смыслом проверок).
5. Typecheck, lint (`eslint app` чистый; `src` — не хуже текущего), build — зелёные.

## Вне scope

SEO-меты/sitemap/robots (спек 3), auth-плагин, удаление `src/router` и
`src/App.vue` (спек 4), кабинет/корзина (спек 5), админка (спек 6),
деплой/Dockerfile/Caddy (спек 7), кэширование, кастомный error.vue.
