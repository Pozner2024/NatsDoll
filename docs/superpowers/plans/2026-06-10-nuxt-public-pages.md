# Публичные страницы с SSR (спек 2) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Главная, магазин, товар и галерея рендерятся на сервере с данными из API; несуществующий товар отдаёт HTTP 404.

**Architecture:** Тонкие обёртки в `app/pages` импортируют существующие страницы из `src/pages`. Четыре точки загрузки данных переводятся на Nuxt `useAsyncData` (импорт из `'nuxt/app'`, НЕ автоимпорт — так тесты могут мокать модуль) с сохранением возвращаемых интерфейсов композаблов. `apiFetch` становится изоморфным. Категории навигации гидратируются через Pinia-payload. Спек: `docs/superpowers/specs/2026-06-10-02-nuxt-public-pages-design.md`.

**Tech Stack:** Nuxt 4 (useAsyncData, createError, pageTransition), @pinia/nuxt (сериализация состояния в payload), Vitest 2 (глобальный мок `nuxt/app` в setup-файле).

**Контекст для исполнителя без знания проекта:**
- Монорепо npm workspaces, фронтенд `apps/web` (Nuxt 4 + ФСД-слои в `src/`, алиас `@` → `src`), API (Hono) — `apps/api`, локально на `:3000`. Ветка `feat/nuxt-skeleton`.
- Команды запускать из корня репо (Bash tool). НЕ добавлять комментарии в код. НЕ трогать файлы вне списка задачи. НЕ удалять тестовые сценарии — только адаптировать упавшие с сохранением смысла.
- Каждое сообщение коммита заканчивать строкой: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Уже проверено экспериментально: `RouterLink`, импортированный из `'vue-router'` в src-компонентах, корректно работает в Nuxt SSR (двойная копия vue-router в npm-дереве безвредна — Nuxt унифицирует резолв).
- Юнит-тесты гонять командой: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic` (без `--root` будет ложное падение всех .vue).

---

### Task 1: Изоморфный apiFetch

**Files:**
- Modify: `apps/web/src/shared/lib/apiClient.ts:3`
- Modify: `docker-compose.yml` (сервис `web`, секция `environment`)

- [ ] **Step 1: Заменить константу API_BASE**

В `apps/web/src/shared/lib/apiClient.ts` строку:

```ts
const API_BASE = '/api'
```

заменить на:

```ts
const API_BASE = import.meta.server
  ? process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'
  : '/api'
```

Пояснение: на сервере запрос идёт в API напрямую и БЕЗ префикса `/api` (так же, как старый vite-rewrite срезал префикс). В браузере — `/api` как раньше. В vitest `import.meta.server` undefined → falsy → `/api`, тесты не замечают изменения.

- [ ] **Step 2: Добавить env-переменную в dev-compose**

В `docker-compose.yml`, сервис `web`, в `environment` рядом с `NUXT_DEV_PROXY_TARGET` добавить строку:

```yaml
      NUXT_API_INTERNAL_URL: http://api:3000
```

- [ ] **Step 3: Прогнать юнит-тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: `33 passed`, `227 passed`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/shared/lib/apiClient.ts docker-compose.yml
git commit -m "feat(web): isomorphic api base for ssr"
```

### Task 2: Глобальный мок nuxt/app для vitest

**Files:**
- Modify: `apps/web/vitest.setup.ts` (добавить в конец файла)

- [ ] **Step 1: Добавить мок в `apps/web/vitest.setup.ts`**

Дописать в конец файла (существующий мок matchMedia не трогать):

```ts
import { ref, watch, isRef } from 'vue'
import { vi } from 'vitest'

type FakeAsyncDataOptions = {
  default?: () => unknown
  watch?: Parameters<typeof watch>[0][]
  lazy?: boolean
}

vi.mock('nuxt/app', () => {
  function useAsyncData(keyOrHandler: unknown, maybeHandler?: unknown, maybeOptions?: unknown) {
    const hasKey = typeof keyOrHandler === 'string' || isRef(keyOrHandler)
    const key = hasKey ? keyOrHandler : undefined
    const handler = (hasKey ? maybeHandler : keyOrHandler) as () => Promise<unknown>
    const options = ((hasKey ? maybeOptions : maybeHandler) ?? {}) as FakeAsyncDataOptions

    const data = ref(options.default?.() ?? null)
    const status = ref<'idle' | 'pending' | 'success' | 'error'>('pending')
    const error = ref<unknown>(null)

    async function execute(): Promise<void> {
      status.value = 'pending'
      error.value = null
      try {
        data.value = await handler()
        status.value = 'success'
      } catch (e) {
        error.value = e
        status.value = 'error'
      }
    }

    const initial = execute()
    if (isRef(key)) watch(key, () => { void execute() })
    if (options.watch) watch(options.watch, () => { void execute() })

    const result = {
      data,
      status,
      error,
      refresh: execute,
      execute,
      clear: () => {},
      then: (onFulfilled: (value: unknown) => unknown) => initial.then(() => onFulfilled(result)),
    }
    return result
  }

  return {
    useAsyncData,
    useLazyAsyncData: (a: unknown, b?: unknown, c?: unknown) => useAsyncData(a, b, c),
    createError: (input: { statusCode?: number; statusMessage?: string }) =>
      Object.assign(new Error(input.statusMessage ?? 'Error'), input),
  }
})
```

Зачем: исходники будут импортировать `useAsyncData`/`createError` из `'nuxt/app'` явно. В vitest реальный `nuxt/app` не работает (нет Nuxt-контекста), мок эмулирует контракт: data/status/error, перезапуск по watch и по реактивному ключу, thenable для `await useAsyncData(...)`.

- [ ] **Step 2: Прогнать юнит-тесты (мок пока никем не используется — ничего не должно сломаться)**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: `33 passed`, `227 passed`.

- [ ] **Step 3: Commit**

```bash
git add apps/web/vitest.setup.ts
git commit -m "test(web): global nuxt/app mock for vitest"
```

### Task 3: Layout с шапкой/подвалом и SSR-категориями навигации

**Files:**
- Modify: `apps/web/app/layouts/default.vue` (полная замена)
- Modify: `apps/web/nuxt.config.ts` (добавить pageTransition)
- Modify: `apps/web/src/entities/category/store.ts:13` (guard от повторного фетча после гидратации)

- [ ] **Step 1: Заменить содержимое `apps/web/app/layouts/default.vue`**

Переносится разметка из `src/App.vue` (сам `src/App.vue` НЕ трогать — удалится в спеке 4). `initAuth()` из старого App.vue НЕ переносится (спек 4). Транзишен-обёртку `<RouterView v-slot>` заменяет Nuxt pageTransition (Step 2), поэтому здесь только слот:

```vue
<template>
  <div class="app-shell">
    <a
      class="skip-link"
      href="#main"
    >Skip to content</a>
    <AppHeader />
    <main
      id="main"
      tabindex="-1"
    >
      <slot />
    </main>
    <AppFooter />
    <ContactModal />
    <AuthModal />
    <CartPromptModal />
  </div>
</template>

<script setup lang="ts">
import { useAsyncData } from 'nuxt/app'
import { AppHeader } from '@/widgets/app-header'
import { AppFooter } from '@/widgets/app-footer'
import { ContactModal } from '@/features/contact-modal'
import { AuthModal } from '@/features/auth-modal'
import { CartPromptModal } from '@/features/cart-prompt-modal'
import { useCategoryStore } from '@/entities/category'

const categoryStore = useCategoryStore()
useAsyncData('nav-categories', async () => {
  await categoryStore.load()
  return true
})
</script>

<style>
main {
  min-height: calc(100dvh - var(--header-height));
}

.skip-link {
  position: absolute;
  top: -100px;
  left: 0;
  z-index: var(--z-lightbox);
  padding: 0.5rem 1rem;
  background: var(--color-text);
  color: var(--color-bg);
  text-decoration: none;
}

.skip-link:focus {
  top: 0;
}

.page-enter-active {
  transition: opacity 0.4s ease-out, transform 0.4s ease-out;
}

.page-leave-active {
  transition: opacity 0.2s ease-in;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(14px);
}

.page-leave-to {
  opacity: 0;
}
</style>
```

Зачем `useAsyncData('nav-categories', ...)`: категории навигации (DesktopNav/BurgerMenu) сейчас грузятся в `onMounted` — на сервере их не было бы, и Google не видел бы ссылки на `/shop/<категория>`. Обёртка ждёт загрузку при SSR; @pinia/nuxt сериализует состояние стора в payload, клиент гидратируется без рефетча.

- [ ] **Step 2: Добавить pageTransition в `apps/web/nuxt.config.ts`**

В объект `app` (рядом с `head`) добавить:

```ts
    pageTransition: { name: 'page', mode: 'out-in' },
```

- [ ] **Step 3: Guard в category store**

В `apps/web/src/entities/category/store.ts` строку:

```ts
    if (loaded || loading.value) return
```

заменить на:

```ts
    if (loaded || loading.value || categories.value.length > 0) return
```

Зачем: флаг `loaded` — переменная замыкания, в Pinia-payload не сериализуется. После гидратации `categories` уже заполнены, но `loaded === false`, и `onMounted`-вызовы в навигации сделали бы лишний рефетч.

- [ ] **Step 4: Прогнать юнит-тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: все проходят. Если упал тест category store на повторную загрузку — адаптировать ожидание под новый guard (смысл «не фетчит повторно, когда данные уже есть» сохраняется).

- [ ] **Step 5: Смоук шапки в SSR**

Предусловие: запущен локальный API (`npm run dev -w apps/api`; нужен Postgres — если не поднят: `docker compose up -d postgres`).

Run (background): `npm run dev -w apps/web`, подождать ~20 с.
Run: `curl -s http://localhost:5173/ | grep -c "skip-link"` → Expected: `1` и больше нуля.
Run: `curl -s http://localhost:5173/ | grep -o 'href="/shop/[a-z-]*"' | head -3` → Expected: ссылки на категории из БД (подтверждение SSR-навигации).
Остановить dev-сервер.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/layouts/default.vue apps/web/nuxt.config.ts apps/web/src/entities/category/store.ts
git commit -m "feat(web): app shell layout with ssr nav categories"
```

### Task 4: Миграция gallery-grid

**Files:**
- Modify: `apps/web/src/widgets/gallery-grid/useGalleryGrid.ts` (полная замена)
- Test: `apps/web/src/widgets/gallery-grid/useGalleryGrid.test.ts` (адаптация только при падении)

- [ ] **Step 1: Заменить содержимое `useGalleryGrid.ts`**

```ts
import { computed } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { fetchHomeGallery, type HomeGallery } from './galleryApi'

const EMPTY_GALLERY: HomeGallery = { preview: [], pool: [] }

export function useGalleryGrid() {
  const { data, status } = useAsyncData<HomeGallery>(
    'home-gallery',
    () => fetchHomeGallery(),
    { default: () => EMPTY_GALLERY },
  )
  const preview = computed(() => data.value.preview)
  const pool = computed(() => data.value.pool)
  const isLoading = computed(() => status.value === 'pending')
  const hasError = computed(() => status.value === 'error')
  return { preview, pool, isLoading, hasError }
}
```

Импорт `useAsyncData` из `@/shared` удаляется. `fetchHomeGallery` теряет параметр signal — отменой управляет Nuxt. Интерфейс `{ preview, pool, isLoading, hasError }` сохранён — `GalleryGrid.vue` не меняется.

- [ ] **Step 2: Прогнать тесты виджета**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/gallery-grid 2>&1 | tail -6`
Expected: проходят без правок (мок из Task 2 воспроизводит контракт: pending при старте, default-значение, success/error). Если падают — адаптировать ТОЛЬКО упавшие ожидания, сценарии не удалять.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/widgets/gallery-grid
git commit -m "feat(web): gallery-grid via nuxt useAsyncData"
```

### Task 5: Миграция collection-section + страница галереи

**Files:**
- Modify: `apps/web/src/widgets/collection-section/useCollectionSection.ts` (полная замена)
- Create: `apps/web/app/pages/gallery.vue`
- Test: `apps/web/src/widgets/collection-section/useCollectionSection.test.ts` (адаптация только при падении)

- [ ] **Step 1: Заменить содержимое `useCollectionSection.ts`**

```ts
import { computed } from 'vue'
import { useAsyncData } from 'nuxt/app'
import { fetchCollections, type Collection } from './collectionsApi'

export function useCollectionSection() {
  const { data, status } = useAsyncData<Collection[]>(
    'collections',
    () => fetchCollections(),
    { default: () => [] },
  )
  const isLoading = computed(() => status.value === 'pending')
  const hasError = computed(() => status.value === 'error')
  return { collections: data, isLoading, hasError }
}
```

- [ ] **Step 2: Создать `apps/web/app/pages/gallery.vue`**

```vue
<template>
  <GalleryPage />
</template>

<script setup lang="ts">
import GalleryPage from '@/pages/GalleryPage.vue'
</script>
```

- [ ] **Step 3: Тесты виджета**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/collection-section 2>&1 | tail -6`
Expected: проходят; при падении адаптировать только упавшие ожидания.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/collection-section apps/web/app/pages/gallery.vue
git commit -m "feat(web): gallery page with ssr collections"
```

### Task 6: Миграция shop-catalog + страница магазина

**Files:**
- Modify: `apps/web/src/widgets/shop-catalog/useShopCatalog.ts` (полная замена)
- Create: `apps/web/app/pages/shop/[[category]].vue`
- Test: `apps/web/src/widgets/shop-catalog/useShopCatalog.test.ts`, `apps/web/src/widgets/shop-catalog/shopCatalog.test.ts` (адаптация при падении)

- [ ] **Step 1: Заменить содержимое `useShopCatalog.ts`**

Каркас (parseSort/parsePage/PAGE_SIZE/VALID_SORTS) сохраняется дословно; ручной watch+abort заменяет `useAsyncData` с реактивным ключом; категории остаются в categoryStore (его SSR-загрузку уже делает layout, Task 3):

```ts
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAsyncData } from 'nuxt/app'
import { fetchProducts, type ProductSortOrder } from '@/entities/product'
import { useCategoryStore } from '@/entities/category'

export const PAGE_SIZE = 12
const VALID_SORTS: ProductSortOrder[] = ['newest', 'price-asc', 'price-desc']

function parseSort(raw: unknown): ProductSortOrder {
  return VALID_SORTS.find((s) => s === raw) ?? 'newest'
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function useShopCatalog() {
  const route = useRoute()
  const categoryStore = useCategoryStore()

  const category = computed(() => {
    const c = route.params.category
    return typeof c === 'string' && c.length > 0 ? c : undefined
  })
  const sort = computed(() => parseSort(route.query.sort))
  const page = computed(() => parsePage(route.query.page))

  const { data, status, error: fetchError, refresh } = useAsyncData(
    computed(() => `shop-products:${category.value ?? 'all'}:${sort.value}:${page.value}`),
    () => fetchProducts({
      category: category.value,
      sort: sort.value,
      page: page.value,
      limit: PAGE_SIZE,
    }),
  )

  void categoryStore.load()

  const products = computed(() => data.value?.items ?? [])
  const total = computed(() => data.value?.total ?? 0)
  const totalPages = computed(() => data.value?.totalPages ?? 0)
  const isLoading = computed(() => status.value === 'pending')
  const error = computed<Error | null>(() => {
    const e = fetchError.value
    if (!e) return null
    return e instanceof Error ? e : new Error(String(e))
  })

  async function retry() {
    await Promise.all([refresh(), categoryStore.load()])
  }

  const activeCategoryName = computed(() => {
    if (!category.value) return null
    return categoryStore.categories.find((c) => c.slug === category.value)?.name ?? null
  })

  return {
    category,
    sort,
    page,
    products,
    total,
    totalPages,
    isLoading,
    error,
    categories: computed(() => categoryStore.categories),
    categoriesError: computed(() => categoryStore.error),
    activeCategoryName,
    retry,
  }
}
```

Возвращаемый интерфейс идентичен старому (имена и типы полей), `ShopCatalog.vue` не меняется. Тип `Product` больше не импортируется (исчез ручной `ref<Product[]>`).

- [ ] **Step 2: Создать `apps/web/app/pages/shop/[[category]].vue`**

Двойные скобки = опциональный параметр (эквивалент старого `/shop/:category?`):

```vue
<template>
  <ShopPage />
</template>

<script setup lang="ts">
import ShopPage from '@/pages/ShopPage.vue'
</script>
```

- [ ] **Step 3: Тесты shop-catalog**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/shop-catalog 2>&1 | tail -10`
Expected: большинство проходит (мок перезапускает handler при смене реактивного ключа, т.е. route-сценарии работают). Упавшие — адаптировать с сохранением смысла: проверки «парсинг sort/page», «параметры fetchProducts», «error-состояние», «retry» должны остаться. Тесты на ручную отмену AbortController, если есть, заменить нечем — такие сценарии помечать как удалённые ТОЛЬКО с пояснением в отчёте (отменой теперь управляет Nuxt).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/shop-catalog apps/web/app/pages/shop
git commit -m "feat(web): shop catalog via nuxt useAsyncData, shop page route"
```

### Task 7: Миграция страницы товара + серверный 404

**Files:**
- Modify: `apps/web/src/widgets/product-page/ProductPageWidget.vue` (только `<script setup>` и две строки шаблона)
- Create: `apps/web/app/pages/product/[slug].vue`

- [ ] **Step 1: Заменить `<script setup>` в `ProductPageWidget.vue`**

Шаблон и стили НЕ трогать, кроме двух правок ниже. Новый `<script setup lang="ts">` целиком:

```ts
import { ref, computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { useAsyncData, createError } from 'nuxt/app'
import { fetchProduct, fetchProducts } from '@/entities/product'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import { useAuthModal, useCartPrompt } from '@/shared'
import ProductGallery from './components/ProductGallery.vue'
import ProductInfo from './components/ProductInfo.vue'
import MoreFromShop from './components/MoreFromShop.vue'
import type { ProductDetail, Product } from '@/entities/product'

const MORE_FROM_SHOP_FETCH_LIMIT = 8
const MORE_FROM_SHOP_DISPLAY_LIMIT = 6

type ProductPageData = { product: ProductDetail | null; more: Product[] }

const route = useRoute()
const slug = computed(() => route.params.slug as string)

const { data, status, error } = await useAsyncData<ProductPageData>(
  computed(() => `product:${slug.value}`),
  async () => {
    const product = await fetchProduct(slug.value)
    if (!product) return { product: null, more: [] }
    let more: Product[] = []
    try {
      const res = await fetchProducts({
        category: product.categorySlug,
        sort: 'newest',
        page: 1,
        limit: MORE_FROM_SHOP_FETCH_LIMIT,
      })
      more = res.items
        .filter((p) => p.slug !== product.slug)
        .slice(0, MORE_FROM_SHOP_DISPLAY_LIMIT)
    } catch {
      more = []
    }
    return { product, more }
  },
)

if (!error.value && data.value?.product === null) {
  throw createError({ statusCode: 404, statusMessage: 'Product not found' })
}

const product = computed(() => data.value?.product ?? null)
const moreProducts = computed(() => data.value?.more ?? [])
const isLoading = computed(() => status.value === 'pending')
const hasError = computed(
  () => status.value === 'error' || (status.value === 'success' && !data.value?.product),
)

const productForFavorite = computed<Product | undefined>(() => {
  const p = product.value
  if (!p) return undefined
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    price: p.price,
    image: p.images[0] ?? null,
    stock: p.stock,
  }
})

const cartStore = useCartStore()
const authStore = useAuthStore()
const authModal = useAuthModal()
const cartPrompt = useCartPrompt()
const productInfoRef = ref<{ resetAdding: () => void } | null>(null)

async function onAddToCart(payload: { quantity: number; message: string | null }): Promise<void> {
  try {
    if (!authStore.isLoggedIn) {
      authModal.open()
      productInfoRef.value?.resetAdding()
      return
    }
    if (!product.value) return
    await cartStore.add({
      productId: product.value.id,
      quantity: payload.quantity,
      message: payload.message,
    })
    cartPrompt.open()
  } catch (e) {
    console.error('Failed to add to cart', e)
  } finally {
    productInfoRef.value?.resetAdding()
  }
}
```

Ключевые моменты: `await useAsyncData` — данные готовы до рендера (SSR и клиентская навигация); товар null без сетевой ошибки → `createError(404)` — сервер отвечает честным 404-статусом; «похожие товары» загружаются в том же handler (их ошибки глушатся — как раньше).

- [ ] **Step 2: Две правки в шаблоне `ProductPageWidget.vue`**

Условие у `MoreFromShop` (исчез `moreLoading`):

```html
    <MoreFromShop
      v-if="moreProducts.length > 0"
      :products="moreProducts"
    />
```

Остальной шаблон без изменений.

- [ ] **Step 3: Создать `apps/web/app/pages/product/[slug].vue`**

```vue
<template>
  <ProductPage />
</template>

<script setup lang="ts">
import ProductPage from '@/pages/ProductPage.vue'
</script>
```

- [ ] **Step 4: Прогнать все юнит-тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -6`
Expected: все проходят. Компонентных тестов самого ProductPageWidget нет (есть только у его детей — они не затронуты), но проверить весь прогон.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/product-page apps/web/app/pages/product
git commit -m "feat(web): ssr product page with server-side 404"
```

### Task 8: Главная страница вместо заглушки

**Files:**
- Modify: `apps/web/app/pages/index.vue` (полная замена)

- [ ] **Step 1: Заменить содержимое `apps/web/app/pages/index.vue`**

```vue
<template>
  <HomePage />
</template>

<script setup lang="ts">
import HomePage from '@/pages/HomePage.vue'
</script>
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/app/pages/index.vue
git commit -m "feat(web): home page replaces skeleton stub"
```

### Task 9: Полная проверка

**Files:** нет изменений (если всё зелёное).

Предусловие: Postgres запущен (`docker compose up -d postgres`), локальный API запущен (`npm run dev -w apps/api`, background), БД посеяна (если пустая: `npx prisma db seed` из `apps/api` с локальным DATABASE_URL).

- [ ] **Step 1: Юнит-тесты целиком**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: 33 файла проходят.

- [ ] **Step 2: SSR-смоук всех 4 страниц**

Run (background): `npm run dev -w apps/web`, подождать ~20 с. Затем:

```bash
curl -s http://localhost:5173/ | grep -c "gallery"            # главная: разметка галереи
curl -s http://localhost:5173/gallery | grep -c "THE GALLERY" # галерея: заголовок
curl -s http://localhost:5173/shop | grep -c "product"        # магазин: карточки
```

Expected: каждый grep > 0. Для товара: взять реальный slug из ответа магазина (`curl -s http://localhost:5173/api/products?sort=newest&page=1&limit=1` → поле `slug`), затем:

```bash
curl -s http://localhost:5173/product/<slug> | grep -c "<имя товара>"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/product/nonexistent-slug-404
```

Expected: имя товара найдено; второй запрос печатает `404`.

- [ ] **Step 3: Typecheck**

Run: `cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck; cd ../..`
Expected: exit 0.

- [ ] **Step 4: Lint новых/изменённых файлов**

Run: `cd apps/web && npx eslint app src/widgets/gallery-grid src/widgets/collection-section src/widgets/shop-catalog src/widgets/product-page src/shared/lib/apiClient.ts src/entities/category --max-warnings=0; cd ../..`
Expected: exit 0 (предсуществующий долг остального `src` не трогаем).

- [ ] **Step 5: Build**

Run: `npm run build -w apps/web`
Expected: exit 0.

- [ ] **Step 6: Отчёт**

Сообщить статус каждого критерия приёмки спека (5 шт.) с выводом команд. Клиентскую навигацию (критерий 3) проверяет контролёр в браузере отдельно — пометить как «передано контролёру».

---

## Вне scope

SEO-меты (спек 3), auth/`initAuth`/удаление `src/router` и `src/App.vue` (спек 4), кабинет/корзина (спек 5), админка (спек 6), деплой (спек 7). `shared/lib/useAsyncData.ts` НЕ удалять — им пользуются непубличные виджеты.
