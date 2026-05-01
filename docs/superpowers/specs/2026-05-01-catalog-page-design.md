# Spec: Catalog Page (`/shop`)

**Дата:** 2026-05-01
**Тип:** новая фича (frontend + backend + БД-миграция)
**Скоуп:** страница каталога товаров с пилюлями категорий, сортировкой по цене, классической пагинацией. Кнопка «Add to cart» — заглушка (корзина — отдельная задача).

---

## 1. Цель

Заменить заглушку `ShopPage.vue` (`/shop/:category?`) на работающую страницу каталога, через которую покупатель находит товары: фильтрует по категории, сортирует по цене, листает страницы, кликает на карточку для перехода к товару.

## 2. Скоуп

**В скоупе:**
- Страница `/shop` (все товары) и `/shop/:category` (товары в категории)
- Пилюли категорий (mobile-first, горизонтальный скролл на узких экранах)
- Сортировка: новые → старые (default), цена ↑, цена ↓
- Классическая пагинация со страницами в URL (`?page=N`), 12 товаров на страницу
- Карточка товара: фото + название + цена + кнопка «Add to cart» во всю ширину
- Состояния: skeleton, empty («No items here yet — check back soon» + кнопка «Back to shop»), error-bar с retry
- API endpoints `GET /products`, `GET /categories`
- Миграция: добавление `slug String @unique` в `Product`
- Zod-схемы и типы в `packages/shared`
- Unit-тесты + один golden-path e2e

**Вне скоупа:**
- Страница товара `/product/:slug` (отдельная задача — каталог только делает ссылку)
- Корзина и реальный «Add to cart» (отдельная задача — кнопка-заглушка)
- Полнотекстовый поиск
- Фильтры цена-от/до, материал, наличие
- Админка для CRUD товаров и категорий
- Переключение валюты (фиксируем USD)
- SEO-метатеги (если `@unhead/vue` или `@vueuse/head` ещё не подключены — отдельная задача)

## 3. UX-решения (зафиксированы в брейншторме)

| Решение | Значение |
|---|---|
| Раскладка `/shop` | Заголовок «The shop» → пилюли категорий → сортировка → сетка товаров → пагинация |
| Раскладка `/shop/:category` | То же + хлебные крошки `The shop / {Category}`, без отдельного hero-блока |
| Категории | Пилюли (mobile-first, горизонтальный скролл при переполнении) |
| Сортировка | `newest` (default), `price-asc`, `price-desc` |
| Пагинация | Классическая, `?page=N`, 12 товаров на страницу |
| Карточка | Фото + название + цена + кнопка «Add to cart» во всю ширину под ценой |
| Клик по карточке | Переход на `/product/:slug` (фото/название/цена обёрнуты `<router-link>`) |
| Клик по кнопке | Заглушка (`console.log` + опц. toast) |
| Out of stock | Бейдж «Sold out» на фото, кнопка disabled с текстом «Sold out», карточка кликабельна |
| Empty state | Текст + кнопка «Back to shop» (только если `total === 0`) |
| Error state | Алерт-бар над сеткой с кнопкой retry |
| Валюта | USD, формат `$24.00` |
| Mobile-сетка | 1 колонка → 2 (tablet) → 3 → 4 (desktop) через миксины `@include tablet`, `@include desktop` |

## 4. Архитектура

### 4.1 Backend (`apps/api`)

```
features/products/
├── application/
│   ├── listProducts.ts          ← use-case: список с фильтрами и пагинацией
│   └── listCategories.ts        ← use-case: список категорий
├── infrastructure/
│   └── productRepository.ts     ← Prisma findMany + count
├── presentation/
│   └── productRoutes.ts         ← GET /products, GET /categories (Zod-валидация query)
├── types.ts                     ← ProductListItem, ProductListResponse
└── index.ts
```

Регистрация в `app.ts`: `registerProductRoutes(app)` + инжекция `productRepository`.

### 4.2 Frontend (`apps/web`)

```
pages/
└── ShopPage.vue                 ← тонкая, читает route, рендерит ShopCatalog

widgets/shop-catalog/
├── ShopCatalog.vue              ← композитный виджет (заголовок, хлебные крошки, дочерние)
├── components/
│   ├── CategoryPills.vue
│   ├── SortControl.vue
│   ├── ProductsGrid.vue
│   ├── ShopPagination.vue
│   ├── EmptyState.vue
│   ├── ErrorBar.vue
│   └── ShopCatalogSkeleton.vue
├── useShopCatalog.ts            ← composable: URL → params → fetch + state
├── shopCatalogStore.ts          ← Pinia: кэш категорий между переходами
├── shopCatalog.test.ts
└── index.ts

entities/product/
├── ProductCard.vue              ← переиспользуемая карточка
├── productApi.ts                ← fetchProducts(params)
├── types.ts                     ← Product, ProductListResponse, ProductListParams
└── index.ts

entities/category/
├── categoryApi.ts               ← fetchCategories()
├── types.ts                     ← Category
└── index.ts

shared/lib/
└── formatPrice.ts               ← новая утилита: number → '$24.00'
```

### 4.3 Shared (`packages/shared`)

```
schemas/products.ts              ← productListParamsSchema, productListItemSchema, productListResponseSchema
schemas/categories.ts            ← categoryListResponseSchema
types/product.ts, types/category.ts
```

Бэк валидирует входящие query через `productListParamsSchema`. Типы `ProductListItem` и `Category` — единый источник истины фронт ↔ бэк.

### 4.4 БД-миграция

Добавить `slug String @unique` в `Product`:

```prisma
model Product {
  ...
  slug String @unique
  ...
}
```

Миграция: `add_product_slug`. Бэкфилл существующих записей через `slugify(name)` (стандартная npm-библиотека `slugify`) + уникальный суффикс `-1`, `-2`, ... при коллизиях. `seed.ts` обновляется: генерируем slug на этапе создания товара. Если в БД сейчас нет товаров (только что после `prisma migrate reset`) — бэкфилл no-op, миграция применяется чисто.

## 5. Контракты API

### 5.1 `GET /products`

**Query params (Zod-валидация):**

| Параметр | Тип | По умолчанию | Описание |
|---|---|---|---|
| `category` | `string?` (непустая) | — | Slug категории. Пустая строка отбрасывается как «без фильтра» |
| `sort` | `'newest' \| 'price-asc' \| 'price-desc'` | `'newest'` | Сортировка |
| `page` | `number ≥ 1` | `1` | Номер страницы |
| `limit` | `number 1..48` | `12` | Размер страницы |

**Невалидные параметры → 400.** Несуществующая категория → `200 { items: [], total: 0 }` (не 404).

**Ответ (200):**
```ts
{
  items: ProductListItem[],
  total: number,
  page: number,
  totalPages: number  // ceil(total / limit)
}
```

**ProductListItem:**
```ts
{
  id: string,
  slug: string,
  name: string,
  price: number,        // в USD, число (Decimal → number на бэке)
  image: string | null, // первое из images[]; null если пусто
  stock: number
}
```

**Repository-логика:**
- `where: { isPublished: true, deletedAt: null, category: { slug } если category }`
- `orderBy:` `newest → createdAt desc`, `price-asc → price asc`, `price-desc → price desc`
- `select`: только нужные поля (без `description` — экономим payload)
- `take: limit, skip: (page - 1) * limit`
- Параллельно `prisma.product.count(where)` для `total`

### 5.2 `GET /categories`

**Параметры:** нет.
**Ответ:** `Category[]`, отсортирован по `name`.

```ts
{ id: string, slug: string, name: string }[]
```

Без счётчика товаров (избыточный join, выгода маленькая).

## 6. Поток данных

### 6.1 Источник истины — URL

Состояние каталога живёт в URL, не в Pinia:

| URL | category | sort | page |
|---|---|---|---|
| `/shop` | — | `newest` | 1 |
| `/shop/animals` | `animals` | `newest` | 1 |
| `/shop/animals?sort=price-asc&page=3` | `animals` | `price-asc` | 3 |

`useShopCatalog()` читает URL через `useRoute()` и возвращает реактивные `category`, `sort`, `page`.

### 6.2 Pinia store (`shopCatalogStore`)

**Хранит только:**
- `categories: Category[]` — кэш списка категорий (фетч 1 раз за сессию)
- `categoriesLoading: boolean`, `categoriesError: boolean`
- Action `loadCategories()` — идемпотентный

**НЕ хранит** товары, текущую категорию, сортировку, страницу — это в URL.

### 6.3 Загрузка товаров

`useShopCatalog` локально:
```ts
const products = ref<Product[]>([])
const total = ref(0)
const totalPages = ref(0)
const isLoading = ref(false)
const error = ref<Error | null>(null)

watch([category, sort, page], async () => {
  const myId = ++requestId
  isLoading.value = true
  error.value = null
  try {
    const res = await fetchProducts({ category, sort, page, limit: 12 })
    if (myId !== requestId) return  // отбрасываем устаревший ответ
    products.value = res.items
    total.value = res.total
    totalPages.value = res.totalPages
  } catch (e) {
    if (myId !== requestId) return
    error.value = e
    products.value = []
  } finally {
    if (myId === requestId) isLoading.value = false
  }
}, { immediate: true })
```

Race-condition защита — счётчик `requestId` (без AbortController, проще и надёжнее).

### 6.4 Сброс page при смене category/sort

- `CategoryPills`: `<router-link :to="{ name: 'shop', params: { category }, query: { sort: currentSort } }">` — `page` не передаётся = удаляется.
- `SortControl`: `router.replace({ query: { ...currentQuery, sort: newSort } })` после `delete query.page`.

## 7. Состояния UI

Приоритет рендеринга в `ShopCatalog.vue`:

| Условие | Что рендерим |
|---|---|
| `isLoading && products.length === 0` | `ShopCatalogSkeleton` (полная заглушка) |
| `error && products.length === 0` | `ErrorBar` на всю ширину сетки + retry |
| `!isLoading && !error && products.length === 0` | `EmptyState` |
| `products.length > 0` | `ProductsGrid` + (опц.) `ErrorBar` сверху если ошибка после успешной загрузки |
| `totalPages > 1` | `ShopPagination` под сеткой |

**Заголовок и `CategoryPills` рендерятся всегда** — пользователь должен иметь возможность сменить категорию даже при ошибке.
**`SortControl` скрыт при `EmptyState`** (нечего сортировать).

При смене страницы/сортировки **не показываем skeleton** (раздражает). Вместо этого: `opacity: 0.6` overlay на сетке, кнопки disabled, после загрузки overlay убирается. Skeleton — только при первой загрузке (`products.length === 0`).

## 8. Тестирование

### 8.1 Backend (Vitest)

**`listProducts.test.ts`:**
- Возвращает только `isPublished: true` и `deletedAt: null`
- Фильтр `category.slug` ограничивает выборку
- `sort='newest'` → `createdAt desc`; `price-asc` → `price asc`; `price-desc` → `price desc`
- Несуществующая категория → пустой `items`, `total: 0`
- Пагинация: `page=2, limit=12` → `skip: 12, take: 12`
- `total` считается до пагинации
- `totalPages = Math.ceil(total / limit)`

**`listCategories.test.ts`:**
- Возвращает все категории, отсортированные по name
- Пустая БД → пустой массив

**`productRoutes.test.ts`:**
- Невалидный `sort` → 400
- Невалидный `page` (0, отрицательный, строка) → 400
- `limit > 48` → 400
- `category=''` → трактуется как «без фильтра», 200
- Валидные параметры → 200, ответ соответствует Zod-схеме

### 8.2 Frontend (Vitest)

**`shared/lib/formatPrice.test.ts`:**
- `formatPrice(24)` → `'$24.00'`
- `formatPrice(24.5)` → `'$24.50'`
- `formatPrice(0)` → `'$0.00'`
- `formatPrice(1234.56)` → `'$1,234.56'`

**`entities/product/ProductCard.test.ts`:**
- Показывает name, price (`$24.00`), image
- Кнопка disabled и текст «Sold out» если `stock === 0`
- `<router-link>` ведёт на `/product/{slug}`
- Клик на кнопку не триггерит навигацию (event isolation)
- `image: null` → fallback (placeholder с серым фоном)

**`CategoryPills.test.ts`:**
- Рендерит «All» + по пилюле на категорию
- `activeSlug` подсвечивает соответствующую пилюлю; «All» подсвечена когда `activeSlug` отсутствует
- `<router-link>` сохраняет `?sort=`, не передаёт `?page=`

**`ShopPagination.test.ts`:**
- 1 страница → не рендерится
- 5 страниц, текущая 1 → `1 2 3 4 5 ›`
- 17 страниц, текущая 1 → `1 2 3 ... 17 ›`
- 17 страниц, текущая 9 → `‹ 1 ... 8 9 10 ... 17 ›`
- 17 страниц, текущая 17 → `‹ 1 ... 15 16 17`
- Каждая ссылка сохраняет `?category` и `?sort`

**`useShopCatalog.test.ts`:**
- При смене URL вызывается `fetchProducts` с правильными параметрами
- При ошибке устанавливается `error`, `products = []`
- Race-condition: два быстрых вызова — применяется только последний результат
- `loadCategories` идемпотентен

**`shopCatalog.test.ts`:**
- Skeleton при первой загрузке
- EmptyState при `total === 0`
- ErrorBar + retry при ошибке (без сетки)
- ErrorBar над сеткой если ошибка после успешной загрузки
- SortControl скрыт при EmptyState
- Заголовок и хлебные крошки работают

### 8.3 E2E (Playwright)

**`tests/e2e/shop.spec.ts`** — golden path:
1. Открыть `/shop` → видим заголовок, пилюли, сетку, пагинацию
2. Кликнуть пилюлю «Animals» → URL = `/shop/animals`, сетка обновилась
3. Сменить сортировку на «Price ↑» → URL содержит `?sort=price-asc`, `?page=` сброшен
4. Перейти на страницу 2 → URL = `/shop/animals?sort=price-asc&page=2`
5. Кликнуть на карточку → переход на `/product/:slug` (заглушка)
6. Назад → состояние каталога восстановлено

Edge cases покрыты unit-тестами.

## 9. Риски и решения

| Риск | Решение |
|---|---|
| Race condition при быстрой смене категории/страницы | Счётчик `requestId`, отбрасываем устаревшие ответы |
| Большой payload (description в каждом товаре) | `select:` только нужные поля в repository |
| Некрасивый URL `/product/{cuid}` | Добавляем `slug` в Product (миграция) |
| Заглушка кнопки сбивает с толку | Только `console.log('add to cart', product.id)` — без toast (нотификационной системы в проекте пока нет, не вводим её в этой задаче) |
| `categories` фетчатся при каждом переходе | Кэш в Pinia, `loadCategories` идемпотентен |
| skeleton при пагинации раздражает | Skeleton только на первой загрузке, далее overlay-затемнение |
| Изменение БД-схемы (slug в Product) ломает существующий seed | Обновить seed с генерацией slug + миграция с бэкфиллом для существующих записей |

## 10. Связанные будущие задачи

После завершения этой задачи естественно следуют:
1. **Страница товара `/product/:slug`** — детали, галерея, отзывы, кнопка «В корзину»
2. **Корзина** — реальная фича `cart`, замена заглушки кнопки на работающее действие
3. **Админка товаров** — CRUD, загрузка фото в Yandex S3
4. **SEO-метатеги** — `@unhead/vue` или `@vueuse/head`, title/description на странице

## 11. Критерий успеха

- `/shop` показывает все опубликованные товары, разбитые на страницы по 12
- Пилюли категорий работают на десктопе и мобильном (горизонтальный скролл при переполнении)
- Сортировка меняет порядок, сохраняется в URL, сбрасывает `?page`
- Пагинация работает, ссылки делятся (открыл `/shop/animals?page=3` напрямую — попал на 3-ю страницу animals)
- Out-of-stock товары видны, но кнопка disabled
- Skeleton/empty/error state — все три рендерятся в правильных условиях
- Все unit-тесты проходят, e2e golden path проходит
- Миграция применяется, существующие товары получают slug
