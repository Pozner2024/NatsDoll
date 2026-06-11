# Кабинет + корзина (спек 5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/account/**`, `/cart`, `/orders/:id` работают client-only под защитой `auth`-middleware; `/checkout` редиректит на `/cart`.

**Architecture:** Вложенные Nuxt-страницы зеркалят старый роутер; родитель `account.vue` рендерит виджет `AccountPage`, передавая `<NuxtPage :transition="false" />` в слот (в виджете `RouterView` → `slot`). `routeRules: ssr:false` на все приватные маршруты. Спек: `docs/superpowers/specs/2026-06-11-05-nuxt-account-cart-design.md`.

**Tech Stack:** Nuxt 4 (nested pages, routeRules redirect), Playwright MCP.

**Контекст для исполнителя без знания проекта:**
- Монорепо npm workspaces, фронтенд `apps/web` (Nuxt 4, ФСД в `src/`, алиас `@` → `src`). Ветка `feat/nuxt-skeleton`. Dev — Docker Compose (web:5173, api:3000).
- **После создания новых файлов в `apps/web` или правки `nuxt.config.ts` обязателен `docker compose restart web`** (Windows bind mount не доставляет события о новых файлах), затем дождаться 200 от `http://localhost:5173/`.
- НЕ добавлять комментарии в код. Коммиты заканчивать строкой: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Тесты web: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
- Креды админа: `ADMIN_EMAIL`/`ADMIN_PASSWORD` в `apps/api/.env` (строки 20–21).
- Middleware `auth` уже существует (`app/middleware/auth.ts`, спек 4): аноним → auth-модалка + `/`; админ на `/account*` → `/admin`.

---

### Task 1: Подготовка виджета account-page

**Files:**
- Modify: `apps/web/src/widgets/account-page/AccountPage.vue` (2 правки)
- Modify: `apps/web/src/widgets/account-page/index.ts` (1 строка)

- [ ] **Step 1: `<RouterView />` → `<slot />`**

В `AccountPage.vue` строку:

```html
        <RouterView />
```

заменить на:

```html
        <slot />
```

И в `<script setup>` строку:

```ts
import { RouterLink, RouterView } from 'vue-router'
```

заменить на:

```ts
import { RouterLink } from 'vue-router'
```

- [ ] **Step 2: Экспорт AccountPurchaseDetail**

В `apps/web/src/widgets/account-page/index.ts` добавить строку (после экспорта `AccountPurchases`):

```ts
export { default as AccountPurchaseDetail } from './components/AccountPurchaseDetail.vue'
```

- [ ] **Step 3: Прогнать все web-тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: 33 файла, 225 passed (у AccountPage собственных тестов нет).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/account-page
git commit -m "refactor(web): account widget renders children via slot"
```

### Task 2: Страницы кабинета

**Files:**
- Create: `apps/web/app/pages/account.vue`
- Create: `apps/web/app/pages/account/index.vue`
- Create: `apps/web/app/pages/account/profile.vue`
- Create: `apps/web/app/pages/account/purchases.vue`
- Create: `apps/web/app/pages/account/purchases/[id].vue`
- Create: `apps/web/app/pages/account/favorites.vue`
- Create: `apps/web/app/pages/account/addresses.vue`
- Create: `apps/web/app/pages/account/reviews.vue`
- Create: `apps/web/app/pages/account/messages.vue`

- [ ] **Step 1: Родитель `apps/web/app/pages/account.vue`**

```vue
<template>
  <AccountPage>
    <NuxtPage :transition="false" />
  </AccountPage>
</template>

<script setup lang="ts">
import { AccountPage } from '@/widgets/account-page'

definePageMeta({ middleware: 'auth' })
</script>
```

- [ ] **Step 2: Дочерние страницы**

`apps/web/app/pages/account/index.vue`:

```vue
<template>
  <AccountDashboard />
</template>

<script setup lang="ts">
import { AccountDashboard } from '@/widgets/account-page'

definePageMeta({ name: 'account' })
</script>
```

`apps/web/app/pages/account/profile.vue`:

```vue
<template>
  <AccountProfile />
</template>

<script setup lang="ts">
import { AccountProfile } from '@/widgets/account-page'

definePageMeta({ name: 'account-profile' })
</script>
```

`apps/web/app/pages/account/purchases.vue`:

```vue
<template>
  <AccountPurchases />
</template>

<script setup lang="ts">
import { AccountPurchases } from '@/widgets/account-page'

definePageMeta({ name: 'account-purchases' })
</script>
```

`apps/web/app/pages/account/purchases/[id].vue`:

```vue
<template>
  <AccountPurchaseDetail />
</template>

<script setup lang="ts">
import { AccountPurchaseDetail } from '@/widgets/account-page'

definePageMeta({ name: 'account-purchase-detail' })
</script>
```

`apps/web/app/pages/account/favorites.vue`:

```vue
<template>
  <AccountFavorites />
</template>

<script setup lang="ts">
import { AccountFavorites } from '@/widgets/account-page'

definePageMeta({ name: 'account-favorites' })
</script>
```

`apps/web/app/pages/account/addresses.vue`:

```vue
<template>
  <AccountAddresses />
</template>

<script setup lang="ts">
import { AccountAddresses } from '@/widgets/account-page'

definePageMeta({ name: 'account-addresses' })
</script>
```

`apps/web/app/pages/account/reviews.vue`:

```vue
<template>
  <AccountReviews />
</template>

<script setup lang="ts">
import { AccountReviews } from '@/widgets/account-page'

definePageMeta({ name: 'account-reviews' })
</script>
```

`apps/web/app/pages/account/messages.vue`:

```vue
<template>
  <AccountMessages />
</template>

<script setup lang="ts">
import { AccountMessages } from '@/widgets/account-page'

definePageMeta({ name: 'account-messages' })
</script>
```

- [ ] **Step 3: Lint**

Run: `cd apps/web && npx eslint app/pages/account.vue app/pages/account --max-warnings=0; cd ../..`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/pages/account.vue apps/web/app/pages/account
git commit -m "feat(web): client-only account pages with nested routing"
```

### Task 3: Корзина, заказ, routeRules

**Files:**
- Create: `apps/web/app/pages/cart.vue`
- Create: `apps/web/app/pages/orders/[id].vue`
- Modify: `apps/web/nuxt.config.ts` (routeRules)

- [ ] **Step 1: `apps/web/app/pages/cart.vue`**

```vue
<template>
  <CartPage />
</template>

<script setup lang="ts">
import CartPage from '@/pages/CartPage.vue'

definePageMeta({ name: 'cart', middleware: 'auth' })
</script>
```

- [ ] **Step 2: `apps/web/app/pages/orders/[id].vue`**

```vue
<template>
  <OrderConfirmationPage />
</template>

<script setup lang="ts">
import OrderConfirmationPage from '@/pages/OrderConfirmationPage.vue'

definePageMeta({ name: 'order-confirmation', middleware: 'auth' })
</script>
```

- [ ] **Step 3: routeRules в `nuxt.config.ts`**

К существующему объекту `routeRules` добавить:

```ts
    '/account/**': { ssr: false },
    '/cart': { ssr: false },
    '/orders/**': { ssr: false },
    '/checkout': { redirect: '/cart' },
```

Важно: `'/account/**'` покрывает и `/account` (родителя) — проверить curl'ом;
если `/account` отдаёт SSR-контент, добавить отдельное правило `'/account': { ssr: false }`.

- [ ] **Step 4: Смоук ssr:false и редиректа**

Run: `docker compose restart web`, дождаться 200. Затем:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/cart
curl -s http://localhost:5173/cart | grep -c "cart-page" || true
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/account
curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:5173/checkout
```

Expected: `/cart` → 200, grep = 0 (контент не SSR-ится); `/account` → 200;
`/checkout` → 3xx с redirect_url на `/cart`.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/pages/cart.vue apps/web/app/pages/orders apps/web/nuxt.config.ts
git commit -m "feat(web): client-only cart and order pages, checkout redirect"
```

### Task 4: Полная проверка

**Files:** нет изменений (если всё зелёное).

Предусловие: docker compose запущен, БД посеяна.

- [ ] **Step 1: Тесты, typecheck, lint, build**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck; cd ../..
cd apps/web && npx eslint app --max-warnings=0; cd ../..
npm run build -w apps/web
```

Expected: 225 passed; typecheck 0; lint 0; build 0.

- [ ] **Step 2: Живые сценарии (Playwright MCP, desktop viewport 1400×900)**

1. Без логина `browser_navigate` на `/account` → auth-модалка видна, URL — `/` (middleware).
2. Без логина на `/account/profile` → то же (наследование middleware детьми).
3. Логин админом (модалка: Email/Password из `apps/api/.env`) → `browser_navigate` на `/account` → URL стал `/admin` (404-страница — норм, проверяется редирект).
4. Разделы кабинета: временно понизить роль админа
   `docker exec natsdoll-db-1 psql -U user -d natsdoll -c "UPDATE \"User\" SET role='CUSTOMER' WHERE email='<ADMIN_EMAIL>'"`,
   перелогиниться (logout → login) → `/account` открывается: сайдбар + dashboard;
   пройти `/account/profile`, `/account/purchases`, `/account/favorites` —
   контент меняется, сайдбар на месте. После проверки вернуть роль:
   `... SET role='ADMIN' ...`.
5. Под тем же юзером: страница товара → Add to cart → бейдж у Cart в шапке = 1;
   `/cart` показывает товар. Удалить товар из корзины (вернуть состояние).
6. `browser_navigate` на `/checkout` → URL стал `/cart`.

Expected: все сценарии соответствуют. Любое расхождение — стоп и разбор
(systematic-debugging), не подгонять проверку под фактическое поведение.

- [ ] **Step 3: Отчёт**

Статус 5 критериев приёмки спека с выводами команд; указать способ проверки
разделов кабинета (понижение роли) и что роль возвращена.

---

## Вне scope

`/admin/**` + `admin`-middleware (спек 6), деплой (спек 7), реальная PayPal-оплата.
