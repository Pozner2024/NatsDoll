# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать рабочий дашборд в админ-панели: 4 карточки статистики и 2 панели с последними заказами и сообщениями, с данными из базы через один API endpoint.

**Architecture:** Новый feature-slice `admin` на бэкенде (types → repository → use-case → routes), защищённый middleware `requireAdmin`. Фронтенд composable `useDashboard()` делает один fetch при монтировании и передаёт данные в `AdminDashboard.vue`.

**Tech Stack:** Hono, Prisma, Zod, Vue 3, TypeScript

---

## File Map

**Backend — создать:**
- `apps/api/src/features/admin/types.ts`
- `apps/api/src/features/admin/infrastructure/adminRepository.ts`
- `apps/api/src/features/admin/application/getDashboard.ts`
- `apps/api/src/features/admin/application/getDashboard.test.ts`
- `apps/api/src/features/admin/presentation/adminRoutes.ts`
- `apps/api/src/features/admin/presentation/adminRoutes.test.ts`
- `apps/api/src/features/admin/index.ts`
- `apps/api/src/shared/middleware/requireAdmin.ts`

**Backend — изменить:**
- `apps/api/prisma/schema.prisma` — добавить `isReadByAdmin` в `Message`
- `apps/api/src/shared/middleware/index.ts` — добавить экспорт `requireAdmin`
- `apps/api/src/app.ts` — подключить admin routes

**Frontend — создать:**
- `apps/web/src/widgets/admin-panel/adminDashboardApi.ts`

**Frontend — изменить:**
- `apps/web/src/widgets/admin-panel/components/AdminDashboard.vue`

---

## Task 1: Prisma — добавить `isReadByAdmin` в `Message`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Шаг 1: Добавить поле в схему**

В `apps/api/prisma/schema.prisma` найти модель `Message` и добавить поле после `text`:

```prisma
model Message {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId   String?
  order     Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  text      String
  isReadByAdmin Boolean @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([orderId])
}
```

- [ ] **Шаг 2: Создать и применить миграцию**

```bash
cd apps/api
npx prisma migrate dev --name add_message_is_read_by_admin
```

Ожидаемый вывод:
```
✔ Generated Prisma Client (...)
The following migration(s) have been created and applied from new schema changes:
migrations/..._add_message_is_read_by_admin/migration.sql
```

- [ ] **Шаг 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(admin): add isReadByAdmin field to Message"
```

---

## Task 2: Backend types

**Files:**
- Create: `apps/api/src/features/admin/types.ts`

- [ ] **Шаг 1: Создать файл типов**

```typescript
// apps/api/src/features/admin/types.ts

export type DashboardStats = {
  ordersToday: number
  revenueToday: number
  revenueMonth: number
  newMessages: number
  activeListings: number
}

export type RecentOrder = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  createdAt: string
  userName: string
}

export type RecentMessage = {
  id: string
  text: string
  createdAt: string
  userName: string
  orderNumber: number | null
  isReadByAdmin: boolean
}

export type DashboardResponse = {
  stats: DashboardStats
  recentOrders: RecentOrder[]
  recentMessages: RecentMessage[]
}

export interface AdminRepository {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
}

export type GetDashboard = () => Promise<DashboardResponse>
export type MarkAllMessagesRead = () => Promise<void>
```

- [ ] **Шаг 2: Commit**

```bash
git add apps/api/src/features/admin/types.ts
git commit -m "feat(admin): add admin types"
```

---

## Task 3: `requireAdmin` middleware

**Files:**
- Create: `apps/api/src/shared/middleware/requireAdmin.ts`
- Modify: `apps/api/src/shared/middleware/index.ts`

- [ ] **Шаг 1: Создать middleware**

```typescript
// apps/api/src/shared/middleware/requireAdmin.ts
import type { MiddlewareHandler } from 'hono'

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const { role } = c.get('auth')
  if (role !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
```

- [ ] **Шаг 2: Экспортировать из index**

В `apps/api/src/shared/middleware/index.ts` добавить строку:

```typescript
export { requireAuth } from './requireAuth'
export { createRateLimiter } from './rateLimit'
export { requireAdmin } from './requireAdmin'
```

- [ ] **Шаг 3: Commit**

```bash
git add apps/api/src/shared/middleware/requireAdmin.ts apps/api/src/shared/middleware/index.ts
git commit -m "feat(admin): add requireAdmin middleware"
```

---

## Task 4: `adminRepository`

**Files:**
- Create: `apps/api/src/features/admin/infrastructure/adminRepository.ts`

- [ ] **Шаг 1: Создать репозиторий**

```typescript
// apps/api/src/features/admin/infrastructure/adminRepository.ts
import type { PrismaClient } from '@prisma/client'
import type { AdminRepository, DashboardResponse } from '../types'

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

export function makeAdminRepository(prisma: PrismaClient): AdminRepository {
  return {
    async getDashboardData(): Promise<DashboardResponse> {
      const now = new Date()

      const startOfToday = new Date(now)
      startOfToday.setUTCHours(0, 0, 0, 0)

      const startOfMonth = new Date(now)
      startOfMonth.setUTCDate(1)
      startOfMonth.setUTCHours(0, 0, 0, 0)

      const [
        ordersToday,
        revenueTodayResult,
        revenueMonthResult,
        newMessages,
        activeListings,
        recentOrdersRaw,
        recentMessagesRaw,
      ] = await prisma.$transaction([
        prisma.order.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            status: { in: PAID_STATUSES },
            createdAt: { gte: startOfToday },
          },
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            status: { in: PAID_STATUSES },
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.message.count({ where: { isReadByAdmin: false } }),
        prisma.product.count({ where: { isPublished: true, deletedAt: null } }),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        }),
        prisma.message.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            text: true,
            createdAt: true,
            isReadByAdmin: true,
            user: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
        }),
      ])

      return {
        stats: {
          ordersToday,
          revenueToday: Number(revenueTodayResult._sum.totalAmount ?? 0),
          revenueMonth: Number(revenueMonthResult._sum.totalAmount ?? 0),
          newMessages,
          activeListings,
        },
        recentOrders: recentOrdersRaw.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          createdAt: o.createdAt.toISOString(),
          userName: o.user.name,
        })),
        recentMessages: recentMessagesRaw.map((m) => ({
          id: m.id,
          text: m.text,
          createdAt: m.createdAt.toISOString(),
          userName: m.user.name,
          orderNumber: m.order?.orderNumber ?? null,
          isReadByAdmin: m.isReadByAdmin,
        })),
      }
    },

    async markAllMessagesRead(): Promise<void> {
      await prisma.message.updateMany({ data: { isReadByAdmin: true } })
    },
  }
}
```

- [ ] **Шаг 2: Commit**

```bash
git add apps/api/src/features/admin/infrastructure/adminRepository.ts
git commit -m "feat(admin): add adminRepository"
```

---

## Task 5: `getDashboard` use-case + тест

**Files:**
- Create: `apps/api/src/features/admin/application/getDashboard.ts`
- Create: `apps/api/src/features/admin/application/getDashboard.test.ts`

- [ ] **Шаг 1: Написать failing тест**

```typescript
// apps/api/src/features/admin/application/getDashboard.test.ts
import { describe, it, expect, vi } from 'vitest'
import { makeGetDashboard } from './getDashboard'
import type { AdminRepository, DashboardResponse } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
  }
}

const mockResponse: DashboardResponse = {
  stats: {
    ordersToday: 3,
    revenueToday: 150.5,
    revenueMonth: 2400,
    newMessages: 2,
    activeListings: 12,
  },
  recentOrders: [],
  recentMessages: [],
}

describe('getDashboard', () => {
  it('delegates to repo.getDashboardData', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getDashboardData).mockResolvedValue(mockResponse)
    const getDashboard = makeGetDashboard(repo)
    const result = await getDashboard()
    expect(result).toEqual(mockResponse)
    expect(repo.getDashboardData).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Шаг 2: Запустить тест, убедиться что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application/getDashboard.test.ts --reporter=basic
```

Ожидаемый вывод: `FAIL` — `Cannot find module './getDashboard'`

- [ ] **Шаг 3: Написать use-case**

```typescript
// apps/api/src/features/admin/application/getDashboard.ts
import type { AdminRepository, GetDashboard } from '../types'

export function makeGetDashboard(repo: AdminRepository): GetDashboard {
  return () => repo.getDashboardData()
}
```

- [ ] **Шаг 4: Запустить тест, убедиться что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application/getDashboard.test.ts --reporter=basic
```

Ожидаемый вывод: `PASS`

- [ ] **Шаг 5: Commit**

```bash
git add apps/api/src/features/admin/application/getDashboard.ts apps/api/src/features/admin/application/getDashboard.test.ts
git commit -m "feat(admin): add getDashboard use-case"
```

---

## Task 6: Admin routes + тест

**Files:**
- Create: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Create: `apps/api/src/features/admin/presentation/adminRoutes.test.ts`

- [ ] **Шаг 1: Написать failing тест**

```typescript
// apps/api/src/features/admin/presentation/adminRoutes.test.ts
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeAdminRouter } from './adminRoutes'
import type { GetDashboard, MarkAllMessagesRead, DashboardResponse } from '../types'

const mockDashboard: DashboardResponse = {
  stats: {
    ordersToday: 1,
    revenueToday: 50,
    revenueMonth: 200,
    newMessages: 3,
    activeListings: 8,
  },
  recentOrders: [
    {
      id: 'o1',
      orderNumber: 42,
      status: 'PAID',
      totalAmount: 50,
      createdAt: '2026-06-01T10:00:00.000Z',
      userName: 'Anna',
    },
  ],
  recentMessages: [],
}

function makeApp(getDashboard: GetDashboard, markAllMessagesRead: MarkAllMessagesRead) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', { userId: 'u1', role: 'ADMIN' })
    await next()
  })
  app.route('/admin', makeAdminRouter(getDashboard, markAllMessagesRead))
  return app
}

describe('GET /admin/dashboard', () => {
  it('returns dashboard data', async () => {
    const getDashboard = vi.fn().mockResolvedValue(mockDashboard)
    const app = makeApp(getDashboard, vi.fn())
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(200)
    const body = await res.json() as DashboardResponse
    expect(body.stats.ordersToday).toBe(1)
    expect(body.recentOrders[0].userName).toBe('Anna')
    expect(getDashboard).toHaveBeenCalledOnce()
  })

  it('returns 403 when role is not ADMIN', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('auth', { userId: 'u1', role: 'CUSTOMER' })
      await next()
    })
    app.route('/admin', makeAdminRouter(vi.fn(), vi.fn()))
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(403)
  })
})

describe('PATCH /admin/messages/mark-all-read', () => {
  it('returns 200 and calls markAllMessagesRead', async () => {
    const markAll = vi.fn().mockResolvedValue(undefined)
    const app = makeApp(vi.fn(), markAll)
    const res = await app.request('/admin/messages/mark-all-read', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(markAll).toHaveBeenCalledOnce()
  })
})
```

- [ ] **Шаг 2: Запустить тест, убедиться что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/presentation/adminRoutes.test.ts --reporter=basic
```

Ожидаемый вывод: `FAIL` — `Cannot find module './adminRoutes'`

- [ ] **Шаг 3: Написать routes**

```typescript
// apps/api/src/features/admin/presentation/adminRoutes.ts
import { Hono } from 'hono'
import { requireAdmin } from '../../../shared/middleware'
import type { GetDashboard, MarkAllMessagesRead } from '../types'

export function makeAdminRouter(
  getDashboard: GetDashboard,
  markAllMessagesRead: MarkAllMessagesRead,
) {
  const router = new Hono()

  router.use('*', requireAdmin)

  router.get('/dashboard', async (c) => {
    const data = await getDashboard()
    return c.json(data)
  })

  router.patch('/messages/mark-all-read', async (c) => {
    await markAllMessagesRead()
    return c.json({ ok: true })
  })

  return router
}
```

- [ ] **Шаг 4: Запустить тест, убедиться что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/presentation/adminRoutes.test.ts --reporter=basic
```

Ожидаемый вывод: `PASS`

- [ ] **Шаг 5: Commit**

```bash
git add apps/api/src/features/admin/presentation/adminRoutes.ts apps/api/src/features/admin/presentation/adminRoutes.test.ts
git commit -m "feat(admin): add admin routes"
```

---

## Task 7: `index.ts` + подключение в `app.ts`

**Files:**
- Create: `apps/api/src/features/admin/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1: Создать index.ts**

```typescript
// apps/api/src/features/admin/index.ts
export { makeAdminRepository } from './infrastructure/adminRepository'
export { makeGetDashboard } from './application/getDashboard'
export { makeAdminRouter } from './presentation/adminRoutes'
```

Также добавить `makeMarkAllMessagesRead`:

```typescript
// apps/api/src/features/admin/application/markAllMessagesRead.ts
import type { AdminRepository, MarkAllMessagesRead } from '../types'

export function makeMarkAllMessagesRead(repo: AdminRepository): MarkAllMessagesRead {
  return () => repo.markAllMessagesRead()
}
```

Обновить `index.ts`:

```typescript
// apps/api/src/features/admin/index.ts
export { makeAdminRepository } from './infrastructure/adminRepository'
export { makeGetDashboard } from './application/getDashboard'
export { makeMarkAllMessagesRead } from './application/markAllMessagesRead'
export { makeAdminRouter } from './presentation/adminRoutes'
```

- [ ] **Шаг 2: Добавить в `app.ts`**

В `apps/api/src/app.ts` добавить import после блока messages:

```typescript
import {
  makeAdminRepository,
  makeGetDashboard,
  makeMarkAllMessagesRead,
  makeAdminRouter,
} from './features/admin'
```

В тело `createApp()` добавить секцию после Messages:

```typescript
  // Admin
  const adminRepo = makeAdminRepository(prisma)
  const getDashboard = makeGetDashboard(adminRepo)
  const markAllMessagesRead = makeMarkAllMessagesRead(adminRepo)
  app.use('/admin/*', requireAuth)
  app.route('/admin', makeAdminRouter(getDashboard, markAllMessagesRead))
```

- [ ] **Шаг 3: Проверить typecheck**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемый вывод: без ошибок.

- [ ] **Шаг 4: Commit**

```bash
git add apps/api/src/features/admin/ apps/api/src/app.ts
git commit -m "feat(admin): wire up admin routes in app"
```

---

## Task 8: Frontend — `adminDashboardApi.ts`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/adminDashboardApi.ts`

- [ ] **Шаг 1: Создать файл**

```typescript
// apps/web/src/widgets/admin-panel/adminDashboardApi.ts
import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const DashboardStatsSchema = z.object({
  ordersToday: z.number(),
  revenueToday: z.number(),
  revenueMonth: z.number(),
  newMessages: z.number(),
  activeListings: z.number(),
})

const RecentOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  createdAt: z.string(),
  userName: z.string(),
})

const RecentMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
  userName: z.string(),
  orderNumber: z.number().nullable(),
  isReadByAdmin: z.boolean(),
})

const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  recentOrders: z.array(RecentOrderSchema),
  recentMessages: z.array(RecentMessageSchema),
})

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>
export type RecentOrder = z.infer<typeof RecentOrderSchema>
export type RecentMessage = z.infer<typeof RecentMessageSchema>

export function useDashboard() {
  const data = ref<DashboardResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/dashboard')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load dashboard data')
        return
      }
      data.value = DashboardResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load dashboard data'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(refresh)

  return { data, isLoading, error, refresh }
}
```

- [ ] **Шаг 2: Typecheck фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемый вывод: без ошибок.

- [ ] **Шаг 3: Commit**

```bash
git add apps/web/src/widgets/admin-panel/adminDashboardApi.ts
git commit -m "feat(admin): add useDashboard composable"
```

---

## Task 9: Frontend — `AdminDashboard.vue`

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/components/AdminDashboard.vue`

- [ ] **Шаг 1: Заменить содержимое компонента**

```vue
<!-- apps/web/src/widgets/admin-panel/components/AdminDashboard.vue -->
<template>
  <div class="admin-dashboard">
    <AdminTopbar
      title="Dashboard"
      subtitle="Overview for today"
    />

    <div
      v-if="error"
      class="admin-dashboard__error"
    >
      <span>{{ error }}</span>
      <button
        class="admin-dashboard__retry"
        @click="refresh"
      >
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-dashboard__content"
    >
      <div class="admin-dashboard__stats">
        <div class="stat-card">
          <div class="stat-card__label">Orders today</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : data?.stats.ordersToday }}
          </div>
          <div class="stat-card__hint">
            Any status
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Revenue today</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : formatMoney(data?.stats.revenueToday ?? 0) }}
          </div>
          <div class="stat-card__hint">
            Month total: {{ isLoading ? '—' : formatMoney(data?.stats.revenueMonth ?? 0) }}
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">New messages</div>
          <div class="stat-card__value stat-card__value--accent">
            {{ isLoading ? '—' : data?.stats.newMessages }}
          </div>
          <div class="stat-card__hint">Unread by admin</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__label">Active listings</div>
          <div class="stat-card__value">
            {{ isLoading ? '—' : data?.stats.activeListings }}
          </div>
          <div class="stat-card__hint">Published products</div>
        </div>
      </div>

      <div class="admin-dashboard__grid">
        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">Recent Orders</span>
            <RouterLink
              to="/admin/orders"
              class="admin-panel-card__link"
            >
              View all →
            </RouterLink>
          </div>
          <div
            v-if="isLoading || !data?.recentOrders.length"
            class="admin-panel-card__body admin-panel-card__body--empty"
          >
            {{ isLoading ? 'Loading…' : 'No orders yet' }}
          </div>
          <table
            v-else
            class="orders-table"
          >
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="order in data.recentOrders"
                :key="order.id"
                class="orders-table__row"
              >
                <td>
                  <RouterLink
                    :to="`/admin/orders/${order.id}`"
                    class="orders-table__link"
                  >
                    #{{ order.orderNumber }}
                  </RouterLink>
                </td>
                <td>{{ order.userName }}</td>
                <td>{{ formatMoney(order.totalAmount) }}</td>
                <td>
                  <span
                    class="status-badge"
                    :class="`status-badge--${order.status.toLowerCase()}`"
                  >{{ order.status }}</span>
                </td>
                <td class="orders-table__date">{{ formatDate(order.createdAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="admin-panel-card">
          <div class="admin-panel-card__head">
            <span class="admin-panel-card__title">New Messages</span>
            <RouterLink
              to="/admin/messages"
              class="admin-panel-card__link"
            >
              View all →
            </RouterLink>
          </div>
          <div
            v-if="isLoading || !data?.recentMessages.length"
            class="admin-panel-card__body admin-panel-card__body--empty"
          >
            {{ isLoading ? 'Loading…' : 'No messages yet' }}
          </div>
          <ul
            v-else
            class="messages-list"
          >
            <li
              v-for="msg in data.recentMessages"
              :key="msg.id"
              class="messages-list__item"
            >
              <div class="messages-list__meta">
                <span class="messages-list__name">{{ msg.userName }}</span>
                <span
                  v-if="msg.orderNumber"
                  class="messages-list__order"
                >#{{ msg.orderNumber }}</span>
                <span class="messages-list__date">{{ formatDate(msg.createdAt) }}</span>
              </div>
              <p class="messages-list__text">{{ truncate(msg.text, 80) }}</p>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import { useDashboard } from '../adminDashboardApi'

const { data, isLoading, error, refresh } = useDashboard()

function formatMoney(value: number): string {
  return `$${value.toFixed(2)}`
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

function truncate(text: string, maxLen: number): string {
  return text.length <= maxLen ? text : `${text.slice(0, maxLen)}…`
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-dashboard {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  &__retry {
    font-size: 0.8rem;
    padding: 6px 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
  }

  &__content {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    @include tablet {
      padding: 28px 32px;
      gap: 24px;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @include tablet {
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 16px;

    @include tablet {
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }
  }
}

.stat-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;

  @include tablet {
    padding: 20px;
  }

  &__label {
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    margin-bottom: 8px;
  }

  &__value {
    font-size: 1.8rem;
    font-weight: 600;
    color: var(--color-text);
    line-height: 1;

    &--accent {
      color: var(--color-accent);
    }
  }

  &__hint {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    margin-top: 6px;
    font-style: italic;
  }
}

.admin-panel-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__head {
    padding: 14px 20px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__title {
    font-size: 0.82rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-text);
  }

  &__link {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
    text-decoration: none;

    &:hover {
      color: var(--color-accent-hover);
    }
  }

  &__body {
    padding: 16px 20px;

    &--empty {
      font-size: 0.82rem;
      color: var(--color-text-muted);
      font-style: italic;
      text-align: center;
      padding: 32px 20px;
    }
  }
}

.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;

  th {
    text-align: left;
    padding: 8px 12px;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
  }

  td {
    padding: 10px 12px;
    color: var(--color-text);
    border-bottom: 1px solid var(--color-border);
  }

  tr:last-child td {
    border-bottom: none;
  }

  &__row:hover td {
    background: var(--color-bg);
  }

  &__link {
    color: var(--color-accent);
    text-decoration: none;
    font-weight: 600;

    &:hover {
      text-decoration: underline;
    }
  }

  &__date {
    white-space: nowrap;
    color: var(--color-text-muted);
    font-size: 0.75rem;
  }
}

.status-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;

  &--pending   { background: rgb(148 163 184 / 0.2); color: #64748b; }
  &--paid      { background: rgb(34 197 94 / 0.15);  color: #16a34a; }
  &--processing { background: rgb(234 179 8 / 0.15); color: #ca8a04; }
  &--shipped   { background: rgb(59 130 246 / 0.15); color: #2563eb; }
  &--delivered { background: rgb(21 128 61 / 0.15);  color: #15803d; }
  &--cancelled { background: rgb(239 68 68 / 0.15);  color: #dc2626; }
  &--refunded  { background: rgb(239 68 68 / 0.15);  color: #dc2626; }
}

.messages-list {
  list-style: none;
  padding: 0;
  margin: 0;

  &__item {
    padding: 12px 20px;
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
  }

  &__name {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__order {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
  }

  &__date {
    margin-left: auto;
    font-size: 0.72rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__text {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    margin: 0;
    line-height: 1.4;
  }
}
</style>
```

- [ ] **Шаг 2: Typecheck фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемый вывод: без ошибок.

- [ ] **Шаг 3: Commit**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminDashboard.vue
git commit -m "feat(admin): wire up AdminDashboard with real data"
```

---

## Task 10: Финальный прогон тестов

- [ ] **Шаг 1: Запустить все тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаемый вывод: все тесты `PASS`, в том числе новые `getDashboard.test.ts` и `adminRoutes.test.ts`.

- [ ] **Шаг 2: Финальный typecheck API**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемый вывод: без ошибок.
