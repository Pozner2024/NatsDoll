# Админка (спек 6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/admin/**` работает client-only под защитой `admin`-middleware; формы товара/распродажи и загрузчик изображений рендерятся как в SPA.

**Architecture:** Вложенные Nuxt-страницы зеркалят старый роутер; родитель `admin.vue` рендерит виджет `AdminPanel` со слотом `<NuxtPage :transition="false" />`. Каталоги `listings/` и `sales/` с `index.vue` дают плоские sibling-маршруты. Спек: `docs/superpowers/specs/2026-06-11-06-nuxt-admin-design.md`.

**Tech Stack:** Nuxt 4 (nested pages, routeRules), Playwright MCP.

**Контекст для исполнителя без знания проекта:**
- Монорепо npm workspaces, фронтенд `apps/web` (Nuxt 4, ФСД в `src/`, алиас `@` → `src`). Ветка `feat/nuxt-skeleton`. Dev — Docker Compose (web:5173, api:3000).
- **После создания новых файлов в `apps/web` или правки `nuxt.config.ts` — `docker compose restart web`**, дождаться 200 от `http://localhost:5173/`. Если docker CLI завис (известный случай) — перезапустить Docker Desktop.
- НЕ добавлять комментарии в код. Коммиты заканчивать строкой: `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- Тесты web: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
- Креды админа: `ADMIN_EMAIL`/`ADMIN_PASSWORD` в `apps/api/.env` (строки 20–21).
- Middleware `admin` уже существует (`app/middleware/admin.ts`, спек 4).

---

### Task 1: Подготовка виджета admin-panel

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/AdminPanel.vue:13,37`
- Modify: `apps/web/src/widgets/admin-panel/index.ts`

- [ ] **Step 1: `<RouterView />` → `<slot />`**

В `AdminPanel.vue` строку 13:

```html
      <RouterView />
```

заменить на:

```html
      <slot />
```

И строку 37:

```ts
import { RouterLink, RouterView, useRoute } from 'vue-router'
```

заменить на:

```ts
import { RouterLink, useRoute } from 'vue-router'
```

- [ ] **Step 2: Экспорты секций в `index.ts`**

После строки `export { default as AdminPanel } ...` добавить:

```ts
export { default as AdminDashboard } from './components/AdminDashboard.vue'
export { default as AdminListings } from './components/AdminListings.vue'
export { default as AdminOrders } from './components/AdminOrders.vue'
export { default as AdminMessages } from './components/AdminMessages.vue'
export { default as AdminAnalytics } from './components/AdminAnalytics.vue'
export { default as AdminSales } from './components/AdminSales.vue'
```

- [ ] **Step 3: Прогнать все web-тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4`
Expected: 33 файла, 225 passed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/admin-panel
git commit -m "refactor(web): admin panel renders children via slot"
```

### Task 2: Страницы админки

**Files:**
- Create: `apps/web/app/pages/admin.vue`
- Create: `apps/web/app/pages/admin/index.vue`
- Create: `apps/web/app/pages/admin/listings/index.vue`
- Create: `apps/web/app/pages/admin/listings/new.vue`
- Create: `apps/web/app/pages/admin/listings/[id]/edit.vue`
- Create: `apps/web/app/pages/admin/orders.vue`
- Create: `apps/web/app/pages/admin/messages.vue`
- Create: `apps/web/app/pages/admin/analytics.vue`
- Create: `apps/web/app/pages/admin/sales/index.vue`
- Create: `apps/web/app/pages/admin/sales/new.vue`
- Create: `apps/web/app/pages/admin/sales/[id].vue`

- [ ] **Step 1: Родитель `apps/web/app/pages/admin.vue`**

```vue
<template>
  <AdminPanel>
    <NuxtPage :transition="false" />
  </AdminPanel>
</template>

<script setup lang="ts">
import { AdminPanel } from '@/widgets/admin-panel'

definePageMeta({ middleware: 'admin' })
</script>
```

- [ ] **Step 2: Секции-виджеты**

`apps/web/app/pages/admin/index.vue`:

```vue
<template>
  <AdminDashboard />
</template>

<script setup lang="ts">
import { AdminDashboard } from '@/widgets/admin-panel'
</script>
```

`apps/web/app/pages/admin/listings/index.vue`:

```vue
<template>
  <AdminListings />
</template>

<script setup lang="ts">
import { AdminListings } from '@/widgets/admin-panel'
</script>
```

`apps/web/app/pages/admin/orders.vue`:

```vue
<template>
  <AdminOrders />
</template>

<script setup lang="ts">
import { AdminOrders } from '@/widgets/admin-panel'
</script>
```

`apps/web/app/pages/admin/messages.vue`:

```vue
<template>
  <AdminMessages />
</template>

<script setup lang="ts">
import { AdminMessages } from '@/widgets/admin-panel'
</script>
```

`apps/web/app/pages/admin/analytics.vue`:

```vue
<template>
  <AdminAnalytics />
</template>

<script setup lang="ts">
import { AdminAnalytics } from '@/widgets/admin-panel'
</script>
```

`apps/web/app/pages/admin/sales/index.vue`:

```vue
<template>
  <AdminSales />
</template>

<script setup lang="ts">
import { AdminSales } from '@/widgets/admin-panel'
</script>
```

- [ ] **Step 3: Формы (src/pages)**

`apps/web/app/pages/admin/listings/new.vue`:

```vue
<template>
  <AdminProductFormPage />
</template>

<script setup lang="ts">
import AdminProductFormPage from '@/pages/AdminProductFormPage.vue'
</script>
```

`apps/web/app/pages/admin/listings/[id]/edit.vue`:

```vue
<template>
  <AdminProductFormPage />
</template>

<script setup lang="ts">
import AdminProductFormPage from '@/pages/AdminProductFormPage.vue'
</script>
```

`apps/web/app/pages/admin/sales/new.vue`:

```vue
<template>
  <AdminSaleFormPage />
</template>

<script setup lang="ts">
import AdminSaleFormPage from '@/pages/AdminSaleFormPage.vue'
</script>
```

`apps/web/app/pages/admin/sales/[id].vue`:

```vue
<template>
  <AdminSaleFormPage />
</template>

<script setup lang="ts">
import AdminSaleFormPage from '@/pages/AdminSaleFormPage.vue'
</script>
```

- [ ] **Step 4: Lint**

Run: `cd apps/web && npx eslint app/pages/admin.vue app/pages/admin --max-warnings=0; cd ../..`
Expected: exit 0.

- [ ] **Step 5: Commit**

```bash
git add apps/web/app/pages/admin.vue apps/web/app/pages/admin
git commit -m "feat(web): client-only admin pages with nested routing"
```

### Task 3: routeRules + смоук

**Files:**
- Modify: `apps/web/nuxt.config.ts` (routeRules)

- [ ] **Step 1: routeRules**

К объекту `routeRules` добавить:

```ts
    '/admin/**': { ssr: false },
```

- [ ] **Step 2: Смоук**

Run: `docker compose restart web`, дождаться 200. Затем:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5173/admin
curl -s http://localhost:5173/admin | grep -c "admin-panel" || true
```

Expected: 200; grep = 0 (контент не SSR-ится).

- [ ] **Step 3: Commit**

```bash
git add apps/web/nuxt.config.ts
git commit -m "feat(web): admin routes client-only"
```

### Task 4: Полная проверка

**Files:** нет изменений (если всё зелёное).

- [ ] **Step 1: Тесты, typecheck, lint, build**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic 2>&1 | tail -4
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck; cd ../..
cd apps/web && npx eslint app --max-warnings=0; cd ../..
npm run build -w apps/web
```

Expected: 225 passed; typecheck 0; lint 0; build 0. (Перед build проверить
свободное место на C: — известный случай нехватки; `npm cache clean --force`
при необходимости.)

- [ ] **Step 2: Живые сценарии (Playwright MCP, viewport 1400×900)**

1. Без логина `/admin` → молча на `/` (без auth-модалки — middleware `admin`).
2. Логин админом (Email/Password из `apps/api/.env`) → `/admin`: заголовок
   «Dashboard», табы Home/Listings/Orders/Messages/More.
3. Пройти табы Listings → Orders → Messages → Analytics: контент меняется,
   каркас не перемонтируется (refs табов стабильны).
4. `/admin/sales` открывается (список распродаж).
5. `/admin/listings/new` — форма товара, `AdminImageUploader` в DOM
   (искать в снапшоте элемент загрузки изображений). Реальный аплоад НЕ делать,
   товар НЕ сохранять.
6. Из `/admin/listings` открыть редактирование первого товара
   (`/admin/listings/<id>/edit`) — форма с заполненными данными.

Expected: все сценарии соответствуют. Расхождение — стоп и разбор.

- [ ] **Step 3: Отчёт**

Статус 4 критериев приёмки спека с выводами команд.

---

## Вне scope

Деплой (спек 7); реальный аплоад в S3; мёртвая ссылка `/admin/orders/<id>` в AdminDashboard (предсуществующая).
