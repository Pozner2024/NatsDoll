# Admin Messages Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить заглушку "Coming soon" в AdminMessages.vue полноценным inbox'ом: список переписок по пользователям, просмотр треда, ответ от админа с опциональной привязкой к заказу; пользователь видит ответы в своём кабинете.

**Architecture:** Добавляем поле `fromAdmin: Boolean` в модель `Message`. На бэке — 4 новых use-case + 4 метода репозитория + 4 роута. На фронте — `adminMessagesApi.ts` + рефактор `AdminMessages.vue` с двумя подкомпонентами (`ConversationList`, `ConversationThread`). В `AccountMessages.vue` — визуальное разделение входящих/исходящих.

**Tech Stack:** Prisma (миграция), Hono, Zod, Vitest, Vue 3, SCSS BEM.

---

## File Map

### Backend — новые/изменяемые файлы

| Файл | Действие |
|---|---|
| `apps/api/prisma/schema.prisma` | +`fromAdmin Boolean @default(false)` в модель Message |
| `apps/api/prisma/migrations/…` | автогенерируется `prisma migrate dev` |
| `apps/api/src/features/messages/types.ts` | +`fromAdmin: boolean` в `MessageView` |
| `apps/api/src/features/messages/infrastructure/messageRepository.ts` | `findByUser` — добавить поле в маппинг |
| `apps/api/src/features/admin/types.ts` | +4 типа: `ConversationPreview`, `ConversationMessage`, `ConversationDetail`, `ReplyInput`; +4 сигнатуры в `AdminRepository`; +4 use-case типа |
| `apps/api/src/features/admin/application/listConversations.ts` | новый use-case |
| `apps/api/src/features/admin/application/getConversation.ts` | новый use-case |
| `apps/api/src/features/admin/application/replyToUser.ts` | новый use-case |
| `apps/api/src/features/admin/application/markConversationRead.ts` | новый use-case |
| `apps/api/src/features/admin/infrastructure/adminRepository.ts` | +4 метода |
| `apps/api/src/features/admin/presentation/adminRoutes.ts` | +4 роута, +4 параметра в `makeAdminRouter` |
| `apps/api/src/features/admin/presentation/adminRoutes.test.ts` | +тесты для 4 новых роутов, обновить `makeApp` |
| `apps/api/src/features/admin/index.ts` | экспорт 4 новых use-case |
| `apps/api/src/app.ts` | wire up 4 новых use-case |

### Frontend — новые/изменяемые файлы

| Файл | Действие |
|---|---|
| `apps/web/src/widgets/admin-panel/adminMessagesApi.ts` | новый: composables + API-функции |
| `apps/web/src/widgets/admin-panel/components/AdminMessages.vue` | переписать: layout + логика выбора диалога |
| `apps/web/src/widgets/admin-panel/components/ConversationList.vue` | новый компонент |
| `apps/web/src/widgets/admin-panel/components/ConversationThread.vue` | новый компонент |
| `apps/web/src/widgets/account-page/components/AccountMessages.vue` | визуальное разделение `fromAdmin` |

---

## Task 1: Схема Prisma — добавить поле `fromAdmin`

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Шаг 1: Добавить поле в модель Message**

Найти блок `model Message` и добавить поле перед закрывающей скобкой:

```prisma
model Message {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId       String?
  order         Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  text          String
  isReadByAdmin Boolean  @default(false)
  fromAdmin     Boolean  @default(false)
  createdAt     DateTime @default(now())

  @@index([userId])
  @@index([orderId])
}
```

- [ ] **Шаг 2: Создать миграцию**

```bash
cd apps/api
npx prisma migrate dev --name add_message_from_admin
```

Ожидаемый вывод: `Your database is now in sync with your schema.`

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(db): add fromAdmin field to Message model"
```

---

## Task 2: Обновить `MessageView` и `messageRepository`

**Files:**
- Modify: `apps/api/src/features/messages/types.ts`
- Modify: `apps/api/src/features/messages/infrastructure/messageRepository.ts`

- [ ] **Шаг 1: Добавить `fromAdmin` в `MessageView`**

```typescript
// apps/api/src/features/messages/types.ts
export type MessageView = {
  id: string
  text: string
  orderId: string | null
  orderNumber: number | null
  fromAdmin: boolean
  createdAt: string
}
```

- [ ] **Шаг 2: Обновить маппинг в `findByUser`**

```typescript
// apps/api/src/features/messages/infrastructure/messageRepository.ts
return rows.map((r): MessageView => ({
  id: r.id,
  text: r.text,
  orderId: r.orderId,
  orderNumber: r.order?.orderNumber ?? null,
  fromAdmin: r.fromAdmin,
  createdAt: r.createdAt.toISOString(),
}))
```

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/src/features/messages/types.ts apps/api/src/features/messages/infrastructure/messageRepository.ts
git commit -m "feat(messages): expose fromAdmin in MessageView"
```

---

## Task 3: Новые типы в `admin/types.ts`

**Files:**
- Modify: `apps/api/src/features/admin/types.ts`

- [ ] **Шаг 1: Добавить типы после существующих**

Добавить в конец файла `apps/api/src/features/admin/types.ts`:

```typescript
// ── Admin Conversations ───────────────────────────────────────

export type ConversationPreview = {
  userId: string
  userName: string
  userEmail: string
  lastMessageText: string
  lastMessageAt: string
  unreadCount: number
}

export type ConversationMessage = {
  id: string
  text: string
  fromAdmin: boolean
  orderId: string | null
  orderNumber: number | null
  createdAt: string
}

export type ConversationDetail = {
  userId: string
  userName: string
  userEmail: string
  messages: ConversationMessage[]
  userOrders: { id: string; orderNumber: number; createdAt: string }[]
}

export type ReplyInput = {
  userId: string
  text: string
  orderId?: string
}

export type ListConversations = () => Promise<ConversationPreview[]>
export type GetConversation = (userId: string) => Promise<ConversationDetail | null>
export type ReplyToUser = (input: ReplyInput) => Promise<void>
export type MarkConversationRead = (userId: string) => Promise<void>
```

- [ ] **Шаг 2: Расширить интерфейс `AdminRepository`**

Найти `export type AdminRepository = {` и добавить 4 метода перед закрывающей скобкой:

```typescript
export type AdminRepository = {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
  listConversations(): Promise<ConversationPreview[]>
  getConversation(userId: string): Promise<ConversationDetail | null>
  replyToUser(input: ReplyInput): Promise<void>
  markConversationRead(userId: string): Promise<void>
  // products
  listProducts(params: AdminProductListParams): Promise<{ items: AdminProductListItem[]; total: number }>
  createProduct(input: AdminProductInput): Promise<{ id: string }>
  updateProduct(id: string, input: AdminProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  togglePublish(id: string): Promise<{ isPublished: boolean }>
  // categories
  listCategoriesWithCount(): Promise<AdminCategoryItem[]>
  createCategory(name: string, slug: string): Promise<{ id: string }>
  updateCategory(id: string, name: string, slug: string): Promise<void>
  deleteCategory(id: string): Promise<void>
  getProduct(id: string): Promise<AdminProductDetail | null>
}
```

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/src/features/admin/types.ts
git commit -m "feat(admin): add conversation types to admin types"
```

---

## Task 4: Новые use-cases

**Files:**
- Create: `apps/api/src/features/admin/application/listConversations.ts`
- Create: `apps/api/src/features/admin/application/getConversation.ts`
- Create: `apps/api/src/features/admin/application/replyToUser.ts`
- Create: `apps/api/src/features/admin/application/markConversationRead.ts`

- [ ] **Шаг 1: `listConversations.ts`**

```typescript
// apps/api/src/features/admin/application/listConversations.ts
import type { AdminRepository, ListConversations } from '../types'

export function makeListConversations(repo: AdminRepository): ListConversations {
  return () => repo.listConversations()
}
```

- [ ] **Шаг 2: `getConversation.ts`**

```typescript
// apps/api/src/features/admin/application/getConversation.ts
import type { AdminRepository, GetConversation } from '../types'

export function makeGetConversation(repo: AdminRepository): GetConversation {
  return (userId) => repo.getConversation(userId)
}
```

- [ ] **Шаг 3: `replyToUser.ts`**

```typescript
// apps/api/src/features/admin/application/replyToUser.ts
import type { AdminRepository, ReplyToUser, ReplyInput } from '../types'

export function makeReplyToUser(repo: AdminRepository): ReplyToUser {
  return (input: ReplyInput) => repo.replyToUser(input)
}
```

- [ ] **Шаг 4: `markConversationRead.ts`**

```typescript
// apps/api/src/features/admin/application/markConversationRead.ts
import type { AdminRepository, MarkConversationRead } from '../types'

export function makeMarkConversationRead(repo: AdminRepository): MarkConversationRead {
  return (userId) => repo.markConversationRead(userId)
}
```

- [ ] **Шаг 5: Коммит**

```bash
git add apps/api/src/features/admin/application/listConversations.ts apps/api/src/features/admin/application/getConversation.ts apps/api/src/features/admin/application/replyToUser.ts apps/api/src/features/admin/application/markConversationRead.ts
git commit -m "feat(admin): add conversation use-cases"
```

---

## Task 5: Методы репозитория

**Files:**
- Modify: `apps/api/src/features/admin/infrastructure/adminRepository.ts`

- [ ] **Шаг 1: Добавить 4 метода в объект репозитория**

После метода `markAllMessagesRead` и перед `listProducts` добавить:

```typescript
async listConversations() {
  const messages = await prisma.message.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      userId: true,
      text: true,
      createdAt: true,
      fromAdmin: true,
      isReadByAdmin: true,
      user: { select: { name: true, email: true } },
    },
  })

  const seen = new Map<string, typeof messages[0]>()
  const unreadCount = new Map<string, number>()

  for (const msg of messages) {
    if (!seen.has(msg.userId)) {
      seen.set(msg.userId, msg)
    }
    if (!msg.fromAdmin && !msg.isReadByAdmin) {
      unreadCount.set(msg.userId, (unreadCount.get(msg.userId) ?? 0) + 1)
    }
  }

  return Array.from(seen.values()).map((msg) => ({
    userId: msg.userId,
    userName: msg.user.name,
    userEmail: msg.user.email,
    lastMessageText: msg.text,
    lastMessageAt: msg.createdAt.toISOString(),
    unreadCount: unreadCount.get(msg.userId) ?? 0,
  }))
},

async getConversation(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  })
  if (!user) return null

  const [messages, orders] = await Promise.all([
    prisma.message.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        text: true,
        fromAdmin: true,
        orderId: true,
        createdAt: true,
        order: { select: { orderNumber: true } },
      },
    }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true, createdAt: true },
    }),
  ])

  return {
    userId,
    userName: user.name,
    userEmail: user.email,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      fromAdmin: m.fromAdmin,
      orderId: m.orderId,
      orderNumber: m.order?.orderNumber ?? null,
      createdAt: m.createdAt.toISOString(),
    })),
    userOrders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: o.createdAt.toISOString(),
    })),
  }
},

async replyToUser(input: ReplyInput) {
  if (input.orderId) {
    const order = await prisma.order.findUnique({ where: { id: input.orderId } })
    if (!order || order.userId !== input.userId) {
      throw new AppError(403, 'Order not found')
    }
  }
  await prisma.message.create({
    data: {
      userId: input.userId,
      text: input.text,
      orderId: input.orderId ?? null,
      fromAdmin: true,
      isReadByAdmin: true,
    },
  })
},

async markConversationRead(userId: string) {
  await prisma.message.updateMany({
    where: { userId, fromAdmin: false, isReadByAdmin: false },
    data: { isReadByAdmin: true },
  })
},
```

Также добавить импорт `ReplyInput` в шапку файла:

```typescript
import type { AdminRepository, DashboardResponse, AdminProductListParams, AdminProductInput, ReplyInput } from '../types'
```

И импорт `AppError`:

```typescript
import { AppError } from '../../../shared/errors'
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/api/src/features/admin/infrastructure/adminRepository.ts
git commit -m "feat(admin): add conversation methods to adminRepository"
```

---

## Task 6: Роуты и тесты роутов

**Files:**
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.test.ts`

- [ ] **Шаг 1: Написать тесты для новых роутов**

Добавить в конец `adminRoutes.test.ts`. Сначала обновить импорты и `makeApp`:

```typescript
// обновить импорт типов
import type {
  GetDashboard, MarkAllMessagesRead, DashboardResponse,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  AdminProductListResponse, AdminCategoryItem,
  GetAdminProduct, AdminProductDetail,
  ListConversations, GetConversation, ReplyToUser, MarkConversationRead,
  ConversationPreview, ConversationDetail,
} from '../types'
```

Обновить сигнатуру `makeApp` — добавить 4 параметра:

```typescript
function makeApp(overrides: {
  getDashboard?: GetDashboard
  markAllMessagesRead?: MarkAllMessagesRead
  listAdminProducts?: ListAdminProducts
  createProduct?: CreateProduct
  updateProduct?: UpdateProduct
  deleteProduct?: DeleteProduct
  togglePublish?: TogglePublish
  listCategoriesWithCount?: ListCategoriesWithCount
  createCategory?: CreateCategory
  updateCategory?: UpdateCategory
  deleteCategory?: DeleteCategory
  getAdminProduct?: GetAdminProduct
  listConversations?: ListConversations
  getConversation?: GetConversation
  replyToUser?: ReplyToUser
  markConversationRead?: MarkConversationRead
} = {}) {
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('auth', { userId: 'u1', role: 'ADMIN' }); await next() })
  app.route('/admin', makeAdminRouter(
    overrides.getDashboard ?? vi.fn().mockResolvedValue(mockDashboard),
    overrides.markAllMessagesRead ?? vi.fn().mockResolvedValue(undefined),
    overrides.listAdminProducts ?? vi.fn().mockResolvedValue(mockProductList),
    overrides.createProduct ?? vi.fn().mockResolvedValue({ id: 'p1' }),
    overrides.updateProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.togglePublish ?? vi.fn().mockResolvedValue({ isPublished: false }),
    overrides.listCategoriesWithCount ?? vi.fn().mockResolvedValue(mockCategories),
    overrides.createCategory ?? vi.fn().mockResolvedValue({ id: 'c1' }),
    overrides.updateCategory ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteCategory ?? vi.fn().mockResolvedValue(undefined),
    overrides.getAdminProduct ?? vi.fn().mockResolvedValue(null),
    overrides.listConversations ?? vi.fn().mockResolvedValue([]),
    overrides.getConversation ?? vi.fn().mockResolvedValue(null),
    overrides.replyToUser ?? vi.fn().mockResolvedValue(undefined),
    overrides.markConversationRead ?? vi.fn().mockResolvedValue(undefined),
  ))
  return app
}
```

Добавить тест-кейсы в конец файла:

```typescript
describe('GET /admin/messages/conversations', () => {
  it('returns conversation list', async () => {
    const mockConvos: ConversationPreview[] = [{
      userId: 'u2', userName: 'Alice', userEmail: 'alice@example.com',
      lastMessageText: 'Hello', lastMessageAt: '2026-06-02T10:00:00.000Z', unreadCount: 1,
    }]
    const app = makeApp({ listConversations: vi.fn().mockResolvedValue(mockConvos) })
    const res = await app.request('/admin/messages/conversations')
    expect(res.status).toBe(200)
    const body = await res.json() as ConversationPreview[]
    expect(body).toHaveLength(1)
    expect(body[0].userName).toBe('Alice')
    expect(body[0].unreadCount).toBe(1)
  })
})

describe('GET /admin/messages/conversations/:userId', () => {
  it('returns 404 when user not found', async () => {
    const app = makeApp({ getConversation: vi.fn().mockResolvedValue(null) })
    const res = await app.request('/admin/messages/conversations/u999')
    expect(res.status).toBe(404)
  })

  it('returns conversation detail', async () => {
    const mockDetail: ConversationDetail = {
      userId: 'u2', userName: 'Alice', userEmail: 'alice@example.com',
      messages: [{ id: 'm1', text: 'Hi', fromAdmin: false, orderId: null, orderNumber: null, createdAt: '2026-06-01T10:00:00.000Z' }],
      userOrders: [],
    }
    const app = makeApp({ getConversation: vi.fn().mockResolvedValue(mockDetail) })
    const res = await app.request('/admin/messages/conversations/u2')
    expect(res.status).toBe(200)
    const body = await res.json() as ConversationDetail
    expect(body.userName).toBe('Alice')
    expect(body.messages).toHaveLength(1)
  })
})

describe('POST /admin/messages/reply', () => {
  it('calls replyToUser and returns 201', async () => {
    const reply = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ replyToUser: reply })
    const res = await app.request('/admin/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u2', text: 'Hello back' }),
    })
    expect(res.status).toBe(201)
    expect(reply).toHaveBeenCalledWith({ userId: 'u2', text: 'Hello back', orderId: undefined })
  })

  it('returns 422 when text is missing', async () => {
    const app = makeApp()
    const res = await app.request('/admin/messages/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u2' }),
    })
    expect(res.status).toBe(422)
  })
})

describe('PATCH /admin/messages/conversations/:userId/mark-read', () => {
  it('calls markConversationRead and returns 200', async () => {
    const mark = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ markConversationRead: mark })
    const res = await app.request('/admin/messages/conversations/u2/mark-read', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(mark).toHaveBeenCalledWith('u2')
  })
})
```

- [ ] **Шаг 2: Запустить тесты — убедиться что падают**

```bash
cd apps/api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic src/features/admin/presentation/adminRoutes.test.ts
```

Ожидаемый вывод: ошибки компиляции или FAIL по новым тест-кейсам.

- [ ] **Шаг 3: Обновить `makeAdminRouter` — добавить 4 параметра и роуты**

```typescript
// apps/api/src/features/admin/presentation/adminRoutes.ts

// Добавить импорты типов:
import type {
  GetDashboard, MarkAllMessagesRead,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  GetAdminProduct,
  ListConversations, GetConversation, ReplyToUser, MarkConversationRead,
} from '../types'

// Добавить Zod-схему для reply:
const replyBodySchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(2000),
  orderId: z.string().optional(),
})

// Обновить сигнатуру функции:
export function makeAdminRouter(
  getDashboard: GetDashboard,
  markAllMessagesRead: MarkAllMessagesRead,
  listAdminProducts: ListAdminProducts,
  createProduct: CreateProduct,
  updateProduct: UpdateProduct,
  deleteProduct: DeleteProduct,
  togglePublish: TogglePublish,
  listCategoriesWithCount: ListCategoriesWithCount,
  createCategory: CreateCategory,
  updateCategory: UpdateCategory,
  deleteCategory: DeleteCategory,
  getAdminProduct: GetAdminProduct,
  listConversations: ListConversations,
  getConversation: GetConversation,
  replyToUser: ReplyToUser,
  markConversationRead: MarkConversationRead,
) {
```

Добавить роуты после `router.patch('/messages/mark-all-read', ...)`:

```typescript
router.get('/messages/conversations', async (c) => {
  const data = await listConversations()
  return c.json(data)
})

router.get('/messages/conversations/:userId', async (c) => {
  const userId = c.req.param('userId')
  const data = await getConversation(userId)
  if (!data) return c.json({ error: 'Not found' }, 404)
  return c.json(data)
})

router.post('/messages/reply', zValidator('json', replyBodySchema), async (c) => {
  const { userId, text, orderId } = c.req.valid('json')
  await replyToUser({ userId, text, orderId })
  return c.json({ ok: true }, 201)
})

router.patch('/messages/conversations/:userId/mark-read', async (c) => {
  const userId = c.req.param('userId')
  await markConversationRead(userId)
  return c.json({ ok: true })
})
```

- [ ] **Шаг 4: Запустить тесты — убедиться что проходят**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic src/features/admin/presentation/adminRoutes.test.ts
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add apps/api/src/features/admin/presentation/adminRoutes.ts apps/api/src/features/admin/presentation/adminRoutes.test.ts
git commit -m "feat(admin): add conversation routes"
```

---

## Task 7: Экспорт use-cases + wire up в `app.ts`

**Files:**
- Modify: `apps/api/src/features/admin/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1: Добавить экспорты в `index.ts`**

```typescript
// apps/api/src/features/admin/index.ts — добавить строки:
export { makeListConversations } from './application/listConversations'
export { makeGetConversation } from './application/getConversation'
export { makeReplyToUser } from './application/replyToUser'
export { makeMarkConversationRead } from './application/markConversationRead'
```

- [ ] **Шаг 2: Обновить секцию Admin в `app.ts`**

```typescript
// apps/api/src/app.ts — обновить импорт:
import {
  makeAdminRepository,
  makeGetDashboard,
  makeMarkAllMessagesRead,
  makeListAdminProducts,
  makeCreateProduct,
  makeUpdateProduct,
  makeDeleteProduct,
  makeTogglePublish,
  makeListCategoriesWithCount,
  makeCreateCategory,
  makeUpdateCategory,
  makeDeleteCategory,
  makeGetAdminProduct,
  makeListConversations,
  makeGetConversation,
  makeReplyToUser,
  makeMarkConversationRead,
  makeAdminRouter,
} from './features/admin'
```

Обновить секцию `// Admin`:

```typescript
// Admin
const adminRepo = makeAdminRepository(prisma)
const getDashboard = makeGetDashboard(adminRepo)
const markAllMessagesRead = makeMarkAllMessagesRead(adminRepo)
const listAdminProducts = makeListAdminProducts(adminRepo)
const createProduct = makeCreateProduct(adminRepo)
const updateProduct = makeUpdateProduct(adminRepo)
const deleteProduct = makeDeleteProduct(adminRepo)
const togglePublish = makeTogglePublish(adminRepo)
const listCategoriesWithCount = makeListCategoriesWithCount(adminRepo)
const createCategory = makeCreateCategory(adminRepo)
const updateCategory = makeUpdateCategory(adminRepo)
const deleteCategory = makeDeleteCategory(adminRepo)
const getAdminProduct = makeGetAdminProduct(adminRepo)
const listConversations = makeListConversations(adminRepo)
const getConversation = makeGetConversation(adminRepo)
const replyToUser = makeReplyToUser(adminRepo)
const markConversationRead = makeMarkConversationRead(adminRepo)
app.use('/admin/*', requireAuth)
app.route('/admin', makeAdminRouter(
  getDashboard, markAllMessagesRead,
  listAdminProducts, createProduct, updateProduct, deleteProduct, togglePublish,
  listCategoriesWithCount, createCategory, updateCategory, deleteCategory,
  getAdminProduct,
  listConversations, getConversation, replyToUser, markConversationRead,
))
```

- [ ] **Шаг 3: Запустить все тесты API**

```bash
cd apps/api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 4: Typecheck**

```bash
cd D:/Natalia/NatsDoll
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемый вывод: нет ошибок.

- [ ] **Шаг 5: Коммит**

```bash
git add apps/api/src/features/admin/index.ts apps/api/src/app.ts
git commit -m "feat(admin): wire up conversation use-cases in app"
```

---

## Task 8: `adminMessagesApi.ts` — фронтенд composables

**Files:**
- Create: `apps/web/src/widgets/admin-panel/adminMessagesApi.ts`

- [ ] **Шаг 1: Создать файл**

```typescript
// apps/web/src/widgets/admin-panel/adminMessagesApi.ts
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const ConversationPreviewSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  lastMessageText: z.string(),
  lastMessageAt: z.string(),
  unreadCount: z.number(),
})

const ConversationMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  fromAdmin: z.boolean(),
  orderId: z.string().nullable(),
  orderNumber: z.number().nullable(),
  createdAt: z.string(),
})

const ConversationDetailSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  messages: z.array(ConversationMessageSchema),
  userOrders: z.array(z.object({
    id: z.string(),
    orderNumber: z.number(),
    createdAt: z.string(),
  })),
})

export type ConversationPreview = z.infer<typeof ConversationPreviewSchema>
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>

export function useConversations() {
  const conversations = ref<ConversationPreview[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/messages/conversations')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load conversations')
        return
      }
      conversations.value = z.array(ConversationPreviewSchema).parse(await res.json())
    } catch {
      error.value = 'Failed to load conversations'
    } finally {
      isLoading.value = false
    }
  }

  return { conversations, isLoading, error, refresh }
}

export function useConversationThread(userId: Ref<string | null>) {
  const thread = ref<ConversationDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/messages/conversations/${id}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load conversation')
        return
      }
      thread.value = ConversationDetailSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load conversation'
    } finally {
      isLoading.value = false
    }
  }

  watch(userId, (id) => {
    if (id) load(id)
    else thread.value = null
  })

  return { thread, isLoading, error, reload: () => userId.value ? load(userId.value) : Promise.resolve() }
}

export async function replyToUser(payload: { userId: string; text: string; orderId?: string }): Promise<void> {
  const res = await authFetch('/admin/messages/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await apiErrorMessage(res, 'Failed to send reply')
    throw new Error(msg)
  }
}

export async function markConversationRead(userId: string): Promise<void> {
  await authFetch(`/admin/messages/conversations/${userId}/mark-read`, { method: 'PATCH' })
}
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/adminMessagesApi.ts
git commit -m "feat(admin): add adminMessagesApi composables"
```

---

## Task 9: `ConversationList.vue`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/ConversationList.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<!-- apps/web/src/widgets/admin-panel/components/ConversationList.vue -->
<template>
  <div class="conv-list">
    <div
      v-for="conv in conversations"
      :key="conv.userId"
      class="conv-list__item"
      :class="{ 'conv-list__item--active': conv.userId === selectedUserId }"
      @click="$emit('select', conv.userId)"
    >
      <div class="conv-list__header">
        <span class="conv-list__name">{{ conv.userName }}</span>
        <span class="conv-list__date">{{ formatDate(conv.lastMessageAt) }}</span>
      </div>
      <div class="conv-list__subheader">
        <span class="conv-list__email">{{ conv.userEmail }}</span>
        <span
          v-if="conv.unreadCount > 0"
          class="conv-list__badge"
        >{{ conv.unreadCount }}</span>
      </div>
      <p class="conv-list__preview">
        {{ conv.lastMessageText }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatDate } from '@/shared'
import type { ConversationPreview } from '../adminMessagesApi'

defineProps<{
  conversations: ConversationPreview[]
  selectedUserId: string | null
}>()

defineEmits<{
  select: [userId: string]
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.conv-list {
  overflow-y: auto;
  height: 100%;

  &__item {
    padding: 0.875rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.08);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.12);
      border-left: 3px solid var(--color-accent);
      padding-left: calc(1rem - 3px);
    }
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.2rem;
  }

  &__name {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__date {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__subheader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }

  &__email {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__badge {
    background: var(--color-accent);
    color: var(--color-white);
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 999px;
    padding: 0.1rem 0.45rem;
    flex-shrink: 0;
  }

  &__preview {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/components/ConversationList.vue
git commit -m "feat(admin): add ConversationList component"
```

---

## Task 10: `ConversationThread.vue`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/ConversationThread.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<!-- apps/web/src/widgets/admin-panel/components/ConversationThread.vue -->
<template>
  <div class="conv-thread">
    <div
      v-if="!thread"
      class="conv-thread__empty"
    >
      Select a conversation
    </div>

    <template v-else>
      <div class="conv-thread__header">
        <button
          class="conv-thread__back"
          @click="$emit('back')"
        >
          ←
        </button>
        <div class="conv-thread__user">
          <span class="conv-thread__user-name">{{ thread.userName }}</span>
          <span class="conv-thread__user-email">{{ thread.userEmail }}</span>
        </div>
      </div>

      <div
        ref="messagesEl"
        class="conv-thread__messages"
      >
        <div
          v-for="msg in thread.messages"
          :key="msg.id"
          class="conv-thread__bubble"
          :class="msg.fromAdmin ? 'conv-thread__bubble--admin' : 'conv-thread__bubble--user'"
        >
          <span
            v-if="msg.fromAdmin"
            class="conv-thread__sender"
          >NatsDoll</span>
          <span
            v-if="msg.orderNumber"
            class="conv-thread__order-tag"
          >Re: Order #{{ msg.orderNumber }}</span>
          <p class="conv-thread__text">
            {{ msg.text }}
          </p>
          <span class="conv-thread__time">{{ formatDate(msg.createdAt) }}</span>
        </div>
      </div>

      <form
        class="conv-thread__form"
        @submit.prevent="handleSubmit"
      >
        <div
          v-if="thread.userOrders.length > 0"
          class="conv-thread__field"
        >
          <label
            for="reply-order"
            class="conv-thread__label"
          >Order <span class="conv-thread__optional">(optional)</span></label>
          <select
            id="reply-order"
            v-model="selectedOrderId"
            class="conv-thread__select"
          >
            <option value="">
              Not related to an order
            </option>
            <option
              v-for="order in thread.userOrders"
              :key="order.id"
              :value="order.id"
            >
              Order #{{ order.orderNumber }} — {{ formatDate(order.createdAt) }}
            </option>
          </select>
        </div>

        <div class="conv-thread__field">
          <label
            for="reply-text"
            class="conv-thread__label"
          >Reply</label>
          <textarea
            id="reply-text"
            v-model="replyText"
            class="conv-thread__textarea"
            rows="3"
            placeholder="Write a reply…"
            required
          />
        </div>

        <p
          v-if="formError"
          class="conv-thread__error"
        >
          {{ formError }}
        </p>

        <AppButton
          type="submit"
          :disabled="!replyText.trim() || sending"
        >
          {{ sending ? 'Sending…' : 'Send reply' }}
        </AppButton>
      </form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { AppButton, formatDate } from '@/shared'
import type { ConversationDetail } from '../adminMessagesApi'

const props = defineProps<{
  thread: ConversationDetail | null
  sending: boolean
}>()

const emit = defineEmits<{
  reply: [payload: { text: string; orderId?: string }]
  back: []
}>()

const replyText = ref('')
const selectedOrderId = ref('')
const formError = ref('')
const messagesEl = ref<HTMLElement | null>(null)

watch(() => props.thread?.messages.length, async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
})

function handleSubmit() {
  formError.value = ''
  emit('reply', {
    text: replyText.value.trim(),
    ...(selectedOrderId.value ? { orderId: selectedOrderId.value } : {}),
  })
}

function clearForm() {
  replyText.value = ''
  selectedOrderId.value = ''
  formError.value = ''
}

function setError(msg: string) {
  formError.value = msg
}

defineExpose({ clearForm, setError })
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.conv-thread {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;

  &__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__back {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: var(--color-text-muted);
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    line-height: 1;

    &:hover {
      background: var(--color-border);
    }

    @include tablet {
      display: none;
    }
  }

  &__user {
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__user-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__user-email {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  &__messages {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__bubble {
    max-width: 75%;
    display: flex;
    flex-direction: column;
    gap: 0.2rem;

    &--user {
      align-self: flex-start;
      background: var(--color-white);
      border: 1px solid var(--color-border);
      border-radius: 0 10px 10px 10px;
      padding: 0.6rem 0.875rem;
    }

    &--admin {
      align-self: flex-end;
      background: rgb(var(--btn-gradient-light) / 0.15);
      border: 1px solid rgb(var(--btn-gradient-light) / 0.3);
      border-radius: 10px 0 10px 10px;
      padding: 0.6rem 0.875rem;
    }
  }

  &__sender {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--color-accent);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  &__order-tag {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-accent);
  }

  &__text {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.5;
    white-space: pre-wrap;
  }

  &__time {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    align-self: flex-end;
  }

  &__form {
    border-top: 1px solid var(--color-border);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
  }

  &__select,
  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.6rem 0.875rem;
    font-size: 0.9rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__textarea {
    resize: vertical;
    min-height: 72px;
  }

  &__error {
    font-size: 0.8rem;
    color: var(--color-error);
  }
}
</style>
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/components/ConversationThread.vue
git commit -m "feat(admin): add ConversationThread component"
```

---

## Task 11: Переписать `AdminMessages.vue`

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/components/AdminMessages.vue`

- [ ] **Шаг 1: Заменить содержимое файла**

```vue
<!-- apps/web/src/widgets/admin-panel/components/AdminMessages.vue -->
<template>
  <div class="admin-messages">
    <AdminTopbar
      title="Messages"
      subtitle="Customer conversations"
    />

    <div
      v-if="convsError"
      class="admin-messages__error"
    >
      {{ convsError }}
      <button @click="convsRefresh">
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-messages__body"
      :class="{ 'admin-messages__body--thread-open': !!selectedUserId && isMobile }"
    >
      <div class="admin-messages__sidebar">
        <div
          v-if="convsLoading && conversations.length === 0"
          class="admin-messages__loading"
        >
          Loading…
        </div>
        <div
          v-else-if="conversations.length === 0"
          class="admin-messages__placeholder"
        >
          No messages yet
        </div>
        <ConversationList
          v-else
          :conversations="conversations"
          :selected-user-id="selectedUserId"
          @select="handleSelect"
        />
      </div>

      <div class="admin-messages__main">
        <div
          v-if="threadError"
          class="admin-messages__error"
        >
          {{ threadError }}
        </div>
        <div
          v-else-if="threadLoading"
          class="admin-messages__loading"
        >
          Loading…
        </div>
        <ConversationThread
          v-else
          ref="threadRef"
          :thread="thread"
          :sending="sending"
          @reply="handleReply"
          @back="selectedUserId = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AdminTopbar from './AdminTopbar.vue'
import ConversationList from './ConversationList.vue'
import ConversationThread from './ConversationThread.vue'
import {
  useConversations,
  useConversationThread,
  replyToUser,
  markConversationRead,
} from '../adminMessagesApi'

const MOBILE_BREAKPOINT = 768

const selectedUserId = ref<string | null>(null)
const sending = ref(false)
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const threadRef = ref<InstanceType<typeof ConversationThread> | null>(null)

const { conversations, isLoading: convsLoading, error: convsError, refresh: convsRefresh } = useConversations()
const { thread, isLoading: threadLoading, error: threadError, reload: reloadThread } = useConversationThread(selectedUserId)

async function handleSelect(userId: string) {
  selectedUserId.value = userId
  await markConversationRead(userId)
  const conv = conversations.value.find((c) => c.userId === userId)
  if (conv) conv.unreadCount = 0
}

async function handleReply(payload: { text: string; orderId?: string }) {
  if (!selectedUserId.value) return
  sending.value = true
  try {
    await replyToUser({ userId: selectedUserId.value, ...payload })
    threadRef.value?.clearForm()
    await reloadThread()
    await convsRefresh()
  } catch (e) {
    threadRef.value?.setError(e instanceof Error ? e.message : 'Failed to send reply')
  } finally {
    sending.value = false
  }
}

function handleResize() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

onMounted(() => {
  convsRefresh()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-messages {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;

  &__error {
    padding: 1.5rem;
    color: var(--color-error);
    font-size: 0.9rem;

    button {
      margin-left: 0.75rem;
      background: none;
      border: 1px solid var(--color-error);
      color: var(--color-error);
      border-radius: 4px;
      padding: 0.2rem 0.6rem;
      font-size: 0.8rem;
    }
  }

  &__body {
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__sidebar {
    width: 100%;
    border-right: 1px solid var(--color-border);
    overflow-y: auto;
    flex-shrink: 0;

    @include tablet {
      width: 260px;
    }
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    // на мобильном скрываем, пока не выбран диалог
    display: none;

    @include tablet {
      display: flex;
    }
  }

  // на мобильном при открытом треде: скрыть sidebar, показать main
  &__body--thread-open {
    .admin-messages__sidebar {
      display: none;
    }
    .admin-messages__main {
      display: flex;
      width: 100%;
    }
  }

  &__loading,
  &__placeholder {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-style: italic;
  }
}
</style>
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminMessages.vue
git commit -m "feat(admin): implement AdminMessages inbox with conversation threads"
```

---

## Task 12: Обновить `AccountMessages.vue` — показать ответы от админа

**Files:**
- Modify: `apps/web/src/widgets/account-page/components/AccountMessages.vue`

- [ ] **Шаг 1: Обновить отображение сообщений**

Найти блок `v-for="msg in messages"` (строки ~26–42) и заменить:

```vue
<div
  v-for="msg in messages"
  :key="msg.id"
  class="account-messages__item"
  :class="msg.fromAdmin ? 'account-messages__item--admin' : 'account-messages__item--user'"
>
  <div class="account-messages__item-meta">
    <span
      v-if="msg.fromAdmin"
      class="account-messages__item-sender"
    >NatsDoll</span>
    <span
      v-if="msg.orderNumber"
      class="account-messages__item-order"
    >Re: Order #{{ msg.orderNumber }}</span>
    <span class="account-messages__item-date">{{ formatDate(msg.createdAt) }}</span>
  </div>
  <p class="account-messages__item-text">
    {{ msg.text }}
  </p>
</div>
```

- [ ] **Шаг 2: Добавить стили для `--admin` и `--user` в секцию `&__item`**

Найти `&__item {` в `<style>` и заменить блок:

```scss
&__item {
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 85%;

  &--user {
    align-self: flex-end;
    background: var(--color-white);
  }

  &--admin {
    align-self: flex-start;
    background: rgb(var(--btn-gradient-light) / 0.12);
    border-color: rgb(var(--btn-gradient-light) / 0.25);
  }
}
```

Также обновить `&__list` чтобы поддерживал flex для выравнивания:

```scss
&__list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 2rem;
}
```

Добавить стиль для нового элемента `&__item-sender`:

```scss
&__item-sender {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
```

- [ ] **Шаг 3: Коммит**

```bash
git add apps/web/src/widgets/account-page/components/AccountMessages.vue
git commit -m "feat(account): show admin replies in messages thread"
```

---

## Task 13: Typecheck фронтенда + финальная проверка

- [ ] **Шаг 1: Typecheck web**

```bash
cd D:/Natalia/NatsDoll
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемый вывод: нет ошибок.

- [ ] **Шаг 2: Запустить все тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 3: Запустить приложение и проверить вручную**

```bash
cd apps/api && npm run dev
# отдельный терминал:
cd apps/web && npm run dev
```

Проверить:
1. Войти как пользователь → Кабинет → Messages → отправить сообщение
2. Войти как админ → Admin → Messages → список диалогов отображается
3. Кликнуть диалог → тред открывается, сообщения пользователя слева
4. Ответить с опциональным заказом → ответ появляется в треде справа
5. Выйти и войти как пользователь → ответ от "NatsDoll" виден слева в кабинете

- [ ] **Шаг 4: Финальный коммит (если нужны правки)**

```bash
git add -p
git commit -m "fix: address review findings in admin messages"
```
