# Admin Orders Tab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить заглушку "Coming soon" в `AdminOrders.vue` полноценной двухколоночной вкладкой управления заказами: список, детали, смена статуса, трекинг-номер (email покупателю), внутреннее примечание.

**Architecture:** Добавляем `trackingNumber` и `adminNote` в Prisma-модель `Order`. Три новых use-case + методы репозитория + роуты на бэке. На фронте: `adminOrdersApi.ts` + три компонента (`OrderList`, `OrderDetail`, рефактор `AdminOrders`). Покупатель видит трекинг в `AccountPurchaseDetail.vue`.

**Tech Stack:** Prisma (миграция), Hono, Zod, Resend (email), Vitest, Vue 3, SCSS BEM.

---

## File Map

### Backend

| Файл | Действие |
|---|---|
| `apps/api/prisma/schema.prisma` | +`trackingNumber String?`, +`adminNote String?` в модель `Order` |
| `apps/api/prisma/migrations/…` | автогенерируется |
| `apps/api/src/features/orders/types.ts` | +`trackingNumber: string \| null` в `OrderDetail` |
| `apps/api/src/features/orders/infrastructure/orderRepository.ts` | `getOrderById` — добавить поля в select + `toOrderDetail` |
| `apps/api/src/features/auth/infrastructure/emailService.ts` | +`sendTrackingNotification` в тип + реализацию |
| `apps/api/src/features/admin/types.ts` | +`AdminOrderSummary`, `AdminOrderDetail`, `AdminOrderListParams`, `AdminOrderListResponse`, `UpdateOrderInput`, `ListAdminOrders`, `GetAdminOrder`, `UpdateAdminOrder` + методы в `AdminRepository` |
| `apps/api/src/features/admin/application/listAdminOrders.ts` | новый use-case |
| `apps/api/src/features/admin/application/getAdminOrder.ts` | новый use-case |
| `apps/api/src/features/admin/application/updateAdminOrder.ts` | новый use-case (принимает emailService) |
| `apps/api/src/features/admin/infrastructure/adminRepository.ts` | +3 метода |
| `apps/api/src/features/admin/presentation/adminRoutes.ts` | +3 роута, +3 параметра в `makeAdminRouter` |
| `apps/api/src/features/admin/presentation/adminRoutes.test.ts` | +тесты 3 новых роутов, обновить `makeApp` |
| `apps/api/src/features/admin/index.ts` | +3 экспорта |
| `apps/api/src/app.ts` | wire up 3 use-cases (в т.ч. передать `emailService`) |

### Frontend

| Файл | Действие |
|---|---|
| `apps/web/src/entities/order/types.ts` | +`trackingNumber: string \| null` в `OrderDetail` |
| `apps/web/src/entities/order/orderApi.ts` | +`trackingNumber` в Zod-схему |
| `apps/web/src/widgets/admin-panel/adminOrdersApi.ts` | новый файл |
| `apps/web/src/widgets/admin-panel/components/AdminOrders.vue` | переписать |
| `apps/web/src/widgets/admin-panel/components/OrderList.vue` | новый |
| `apps/web/src/widgets/admin-panel/components/OrderDetail.vue` | новый |
| `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue` | +блок трекинга |

---

## Task 1: Prisma — добавить trackingNumber и adminNote

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Шаг 1: Добавить поля в модель Order**

Найти блок `model Order` и добавить два поля перед строкой `createdAt`:

```prisma
  trackingNumber  String?
  adminNote       String?
```

Итоговая модель (фрагмент):
```prisma
model Order {
  id              String      @id @default(cuid())
  orderNumber     Int         @unique @default(autoincrement())
  userId          String
  status          OrderStatus @default(PENDING)
  totalAmount     Decimal     @db.Decimal(10, 2)
  paypalOrderId   String?     @unique
  shippingAddress Json
  shippingCost    Decimal     @db.Decimal(10, 2) @default(0)
  trackingNumber  String?
  adminNote       String?
  createdAt       DateTime    @default(now())
  updatedAt       DateTime    @updatedAt

  user            User        @relation(fields: [userId], references: [id], onDelete: Restrict)
  items           OrderItem[]
  reviews         Review[]
  messages        Message[]

  @@index([userId])
  @@index([status])
}
```

- [ ] **Шаг 2: Создать миграцию**

```bash
cd D:\Natalia\NatsDoll\apps\api
npx prisma migrate dev --name add_order_tracking_and_note
```

Ожидаемый вывод: `Your database is now in sync with your schema.`

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(db): add trackingNumber and adminNote to Order"
```

---

## Task 2: Обновить orders/types.ts и orderRepository

**Files:**
- Modify: `apps/api/src/features/orders/types.ts`
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`

- [ ] **Шаг 1: Добавить `trackingNumber` в `OrderDetail`**

```typescript
// apps/api/src/features/orders/types.ts
export type OrderDetail = {
  id: string
  orderNumber: number
  userId: string
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  createdAt: string
  items: OrderItemView[]
}
```

- [ ] **Шаг 2: Обновить `getOrderById` в orderRepository.ts**

В `prisma.order.findUnique` select добавить `trackingNumber: true`.

В функции `toOrderDetail` добавить поле в тип `OrderRow` и возвращаемый объект:

Тип `OrderRow`:
```typescript
type OrderRow = {
  id: string
  orderNumber: number
  shippingCost: { toNumber(): number }
  userId: string
  status: string
  totalAmount: { toNumber(): number }
  shippingAddress: unknown
  trackingNumber: string | null
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: { toNumber(): number }
    message: string | null
    product: { id: string; slug: string; name: string; images: string[] }
  }>
}
```

В `toOrderDetail` добавить в возвращаемый объект:
```typescript
trackingNumber: order.trackingNumber,
```

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/src/features/orders/types.ts apps/api/src/features/orders/infrastructure/orderRepository.ts
git commit -m "feat(orders): add trackingNumber to OrderDetail"
```

---

## Task 3: Добавить sendTrackingNotification в emailService

**Files:**
- Modify: `apps/api/src/features/auth/infrastructure/emailService.ts`

- [ ] **Шаг 1: Добавить в тип `EmailService`**

```typescript
export type EmailService = {
  sendVerificationEmail(to: string, verificationUrl: string): Promise<void>
  sendMessageNotification(adminEmail: string, fromName: string, fromEmail: string, text: string, orderNumber?: number): Promise<void>
  sendTrackingNotification(to: string, name: string, orderNumber: number, trackingNumber: string): Promise<void>
}
```

- [ ] **Шаг 2: Добавить реализацию в `makeEmailService()`**

После метода `sendMessageNotification` добавить:

```typescript
async sendTrackingNotification(to, name, orderNumber, trackingNumber) {
  await getResend().emails.send({
    from: 'noreply@natsdoll.com',
    to,
    subject: `Your order #${orderNumber} has been shipped — NatsDoll`,
    html: `
      <p>Hi ${escapeHtml(name)},</p>
      <p>Your order <strong>#${orderNumber}</strong> has been shipped!</p>
      <p>Tracking number: <strong>${escapeHtml(trackingNumber)}</strong></p>
      <p>You can track your order using this number with your shipping carrier.</p>
      <p>You can also view your order details in your <a href="${process.env.FRONTEND_URL ?? 'https://natsdoll.com'}/account/purchases">account cabinet</a>.</p>
    `,
  })
},
```

- [ ] **Шаг 3: Обновить мок в register.test.ts**

В файле `apps/api/src/features/auth/application/register.test.ts` добавить в `mockEmailService`:

```typescript
const mockEmailService: EmailService = {
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendMessageNotification: vi.fn().mockResolvedValue(undefined),
  sendTrackingNotification: vi.fn().mockResolvedValue(undefined),
}
```

- [ ] **Шаг 4: Запустить тесты**

```bash
cd D:\Natalia\NatsDoll\apps\api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic src/features/auth/application/register.test.ts
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 5: Коммит**

```bash
git add apps/api/src/features/auth/infrastructure/emailService.ts apps/api/src/features/auth/application/register.test.ts
git commit -m "feat(email): add sendTrackingNotification"
```

---

## Task 4: Новые типы в admin/types.ts

**Files:**
- Modify: `apps/api/src/features/admin/types.ts`

- [ ] **Шаг 1: Добавить импорт из orders**

В начало файла добавить импорт (если нет):
```typescript
import type { OrderItemView, ShippingAddress } from '../orders/types'
```

- [ ] **Шаг 2: Добавить типы в конец файла**

```typescript
// ── Admin Orders ──────────────────────────────────────────────

export type AdminOrderSummary = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  userName: string
  userEmail: string
  itemCount: number
  createdAt: string
}

export type AdminOrderDetail = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  adminNote: string | null
  createdAt: string
  userName: string
  userEmail: string
  items: OrderItemView[]
}

export type AdminOrderListParams = {
  status?: string
  search?: string
  page: number
  limit: number
}

export type AdminOrderListResponse = {
  items: AdminOrderSummary[]
  total: number
  page: number
  totalPages: number
}

export type UpdateOrderInput = {
  status: string
  trackingNumber: string | null
  adminNote: string | null
}

export type ListAdminOrders = (params: AdminOrderListParams) => Promise<AdminOrderListResponse>
export type GetAdminOrder = (orderId: string) => Promise<AdminOrderDetail | null>
export type UpdateAdminOrder = (orderId: string, input: UpdateOrderInput) => Promise<void>
```

- [ ] **Шаг 3: Расширить `AdminRepository`**

Добавить 3 новых метода в `AdminRepository` после `markConversationRead`:

```typescript
export type AdminRepository = {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
  listConversations(): Promise<ConversationPreview[]>
  getConversation(userId: string): Promise<ConversationDetail | null>
  replyToUser(input: ReplyInput): Promise<void>
  markConversationRead(userId: string): Promise<void>
  listAdminOrders(params: AdminOrderListParams): Promise<{ items: AdminOrderSummary[]; total: number }>
  getAdminOrder(orderId: string): Promise<AdminOrderDetail | null>
  updateAdminOrder(orderId: string, input: UpdateOrderInput): Promise<{ userEmail: string; userName: string; orderNumber: number; trackingNumber: string } | null>
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

- [ ] **Шаг 4: Коммит**

```bash
git add apps/api/src/features/admin/types.ts
git commit -m "feat(admin): add order types to admin types"
```

---

## Task 5: Новые use-cases

**Files:**
- Create: `apps/api/src/features/admin/application/listAdminOrders.ts`
- Create: `apps/api/src/features/admin/application/getAdminOrder.ts`
- Create: `apps/api/src/features/admin/application/updateAdminOrder.ts`

- [ ] **Шаг 1: `listAdminOrders.ts`**

```typescript
// apps/api/src/features/admin/application/listAdminOrders.ts
import type { AdminRepository, ListAdminOrders, AdminOrderListParams, AdminOrderListResponse } from '../types'

export function makeListAdminOrders(repo: AdminRepository): ListAdminOrders {
  return async (params: AdminOrderListParams): Promise<AdminOrderListResponse> => {
    const LIMIT = params.limit
    const { items, total } = await repo.listAdminOrders(params)
    return {
      items,
      total,
      page: params.page,
      totalPages: Math.ceil(total / LIMIT),
    }
  }
}
```

- [ ] **Шаг 2: `getAdminOrder.ts`**

```typescript
// apps/api/src/features/admin/application/getAdminOrder.ts
import type { AdminRepository, GetAdminOrder } from '../types'

export function makeGetAdminOrder(repo: AdminRepository): GetAdminOrder {
  return (orderId) => repo.getAdminOrder(orderId)
}
```

- [ ] **Шаг 3: `updateAdminOrder.ts`**

```typescript
// apps/api/src/features/admin/application/updateAdminOrder.ts
import type { AdminRepository, UpdateAdminOrder, UpdateOrderInput } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'

export function makeUpdateAdminOrder(repo: AdminRepository, emailService: EmailService): UpdateAdminOrder {
  return async (orderId: string, input: UpdateOrderInput): Promise<void> => {
    const result = await repo.updateAdminOrder(orderId, input)
    if (result) {
      await emailService.sendTrackingNotification(
        result.userEmail,
        result.userName,
        result.orderNumber,
        result.trackingNumber,
      )
    }
  }
}
```

- [ ] **Шаг 4: Коммит**

```bash
git add apps/api/src/features/admin/application/listAdminOrders.ts apps/api/src/features/admin/application/getAdminOrder.ts apps/api/src/features/admin/application/updateAdminOrder.ts
git commit -m "feat(admin): add order use-cases"
```

---

## Task 6: Методы репозитория

**Files:**
- Modify: `apps/api/src/features/admin/infrastructure/adminRepository.ts`

- [ ] **Шаг 1: Добавить импорт типов**

Обновить строку импорта:
```typescript
import type { AdminRepository, DashboardResponse, AdminProductListParams, AdminProductInput, ReplyInput, AdminOrderListParams, AdminOrderSummary, AdminOrderDetail, UpdateOrderInput } from '../types'
```

- [ ] **Шаг 2: Добавить 3 метода после `markConversationRead`**

```typescript
async listAdminOrders(params: AdminOrderListParams) {
  const { page, limit, status, search } = params
  const where: Prisma.OrderWhereInput = {
    ...(status ? { status: status as Prisma.EnumOrderStatusFilter } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { equals: isNaN(Number(search)) ? undefined : Number(search) } },
            { user: { name: { contains: search, mode: 'insensitive' } } },
          ],
        }
      : {}),
  }
  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    }),
    prisma.order.count({ where }),
  ])
  const items: AdminOrderSummary[] = rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    totalAmount: Number(o.totalAmount),
    userName: o.user.name,
    userEmail: o.user.email,
    itemCount: o._count.items,
    createdAt: o.createdAt.toISOString(),
  }))
  return { items, total }
},

async getAdminOrder(orderId: string): Promise<AdminOrderDetail | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      totalAmount: true,
      shippingCost: true,
      shippingAddress: true,
      trackingNumber: true,
      adminNote: true,
      createdAt: true,
      user: { select: { name: true, email: true } },
      items: {
        select: {
          id: true,
          quantity: true,
          price: true,
          message: true,
          product: { select: { id: true, slug: true, name: true, images: true } },
        },
      },
    },
  })
  if (!order) return null
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    totalAmount: Number(order.totalAmount),
    shippingCost: Number(order.shippingCost),
    shippingAddress: order.shippingAddress as import('../orders/types').ShippingAddress,
    trackingNumber: order.trackingNumber,
    adminNote: order.adminNote,
    createdAt: order.createdAt.toISOString(),
    userName: order.user.name,
    userEmail: order.user.email,
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.product.id,
      productSlug: item.product.slug,
      productName: item.product.name,
      productImage: item.product.images[0] ?? null,
      quantity: item.quantity,
      price: Number(item.price),
      subtotal: Number(item.price) * item.quantity,
      message: item.message,
    })),
  }
},

async updateAdminOrder(orderId: string, input: UpdateOrderInput) {
  const current = await prisma.order.findUnique({
    where: { id: orderId },
    select: { trackingNumber: true, orderNumber: true, user: { select: { name: true, email: true } } },
  })
  if (!current) throw new AppError(404, 'Order not found')

  await prisma.order.update({
    where: { id: orderId },
    data: {
      status: input.status as 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED',
      trackingNumber: input.trackingNumber,
      adminNote: input.adminNote,
    },
  })

  const wasNull = current.trackingNumber === null
  const isNowSet = input.trackingNumber !== null && input.trackingNumber !== undefined && input.trackingNumber !== ''
  if (wasNull && isNowSet) {
    return {
      userEmail: current.user.email,
      userName: current.user.name,
      orderNumber: current.orderNumber,
      trackingNumber: input.trackingNumber as string,
    }
  }
  return null
},
```

Также убедиться что `Prisma` импортирован в начале файла (он уже должен быть):
```typescript
import type { PrismaClient, Prisma } from '@prisma/client'
```

- [ ] **Шаг 3: Коммит**

```bash
git add apps/api/src/features/admin/infrastructure/adminRepository.ts
git commit -m "feat(admin): add order methods to adminRepository"
```

---

## Task 7: Роуты и тесты

**Files:**
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.test.ts`

- [ ] **Шаг 1: Написать новые тесты** (сначала — TDD)

В `adminRoutes.test.ts`:

a) Обновить импорт типов — добавить:
```typescript
import type {
  GetDashboard, MarkAllMessagesRead, DashboardResponse,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  AdminProductListResponse, AdminCategoryItem,
  GetAdminProduct, AdminProductDetail,
  ListConversations, GetConversation, ReplyToUser, MarkConversationRead,
  ConversationPreview, ConversationDetail,
  ListAdminOrders, GetAdminOrder, UpdateAdminOrder,
  AdminOrderListResponse, AdminOrderDetail,
} from '../types'
```

b) Обновить `makeApp` — добавить 3 параметра в overrides и вызов:
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
  listAdminOrders?: ListAdminOrders
  getAdminOrder?: GetAdminOrder
  updateAdminOrder?: UpdateAdminOrder
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
    overrides.listAdminOrders ?? vi.fn().mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 }),
    overrides.getAdminOrder ?? vi.fn().mockResolvedValue(null),
    overrides.updateAdminOrder ?? vi.fn().mockResolvedValue(undefined),
  ))
  return app
}
```

Обновить тест `returns 403 when not ADMIN` — теперь 19 `vi.fn()`:
```typescript
app.route('/admin', makeAdminRouter(
  vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
  vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
))
```

c) Добавить новые тест-кейсы в конец файла:
```typescript
describe('GET /admin/orders', () => {
  it('returns order list', async () => {
    const mockList: AdminOrderListResponse = {
      items: [{ id: 'o1', orderNumber: 1, status: 'PENDING', totalAmount: 30, userName: 'Alice', userEmail: 'a@test.com', itemCount: 2, createdAt: '2026-06-01T00:00:00.000Z' }],
      total: 1, page: 1, totalPages: 1,
    }
    const app = makeApp({ listAdminOrders: vi.fn().mockResolvedValue(mockList) })
    const res = await app.request('/admin/orders')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminOrderListResponse
    expect(body.items).toHaveLength(1)
    expect(body.items[0].orderNumber).toBe(1)
  })
})

describe('GET /admin/orders/:id', () => {
  it('returns 404 when not found', async () => {
    const app = makeApp({ getAdminOrder: vi.fn().mockResolvedValue(null) })
    const res = await app.request('/admin/orders/nonexistent')
    expect(res.status).toBe(404)
  })

  it('returns order detail', async () => {
    const mockDetail: AdminOrderDetail = {
      id: 'o1', orderNumber: 1, status: 'PENDING', totalAmount: 30, shippingCost: 5,
      shippingAddress: { fullName: 'Alice', line1: '1 St', city: 'NY', country: 'US', postalCode: '10001' },
      trackingNumber: null, adminNote: null, createdAt: '2026-06-01T00:00:00.000Z',
      userName: 'Alice', userEmail: 'a@test.com', items: [],
    }
    const app = makeApp({ getAdminOrder: vi.fn().mockResolvedValue(mockDetail) })
    const res = await app.request('/admin/orders/o1')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminOrderDetail
    expect(body.orderNumber).toBe(1)
    expect(body.adminNote).toBeNull()
  })
})

describe('PATCH /admin/orders/:id', () => {
  it('calls updateAdminOrder and returns 200', async () => {
    const update = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ updateAdminOrder: update })
    const res = await app.request('/admin/orders/o1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'SHIPPED', trackingNumber: 'TRACK123', adminNote: null }),
    })
    expect(res.status).toBe(200)
    expect(update).toHaveBeenCalledWith('o1', { status: 'SHIPPED', trackingNumber: 'TRACK123', adminNote: null })
  })

  it('returns 422 when status is invalid', async () => {
    const app = makeApp()
    const res = await app.request('/admin/orders/o1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'INVALID_STATUS' }),
    })
    expect(res.status).toBe(422)
  })
})
```

- [ ] **Шаг 2: Запустить тесты — убедиться что падают**

```bash
cd D:\Natalia\NatsDoll\apps\api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic src/features/admin/presentation/adminRoutes.test.ts
```

Ожидаемый вывод: ошибки компиляции (новые параметры ещё не добавлены в `makeAdminRouter`).

- [ ] **Шаг 3: Обновить `adminRoutes.ts`**

a) Добавить импорты типов:
```typescript
import type {
  GetDashboard, MarkAllMessagesRead,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  GetAdminProduct,
  ListConversations, GetConversation, ReplyToUser, MarkConversationRead,
  ListAdminOrders, GetAdminOrder, UpdateAdminOrder,
} from '../types'
```

b) Добавить Zod-схемы:
```typescript
const orderListQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

const orderUpdateBodySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().nullable().optional(),
  adminNote: z.string().nullable().optional(),
})
```

c) Обновить сигнатуру `makeAdminRouter` — добавить 3 параметра после `markConversationRead`:
```typescript
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
  listAdminOrders: ListAdminOrders,
  getAdminOrder: GetAdminOrder,
  updateAdminOrder: UpdateAdminOrder,
) {
```

d) Добавить 3 новых роута в конец (перед `return router`):
```typescript
router.get('/orders', zValidator('query', orderListQuerySchema), async (c) => {
  const params = c.req.valid('query')
  const result = await listAdminOrders(params)
  return c.json(result)
})

router.get('/orders/:id', async (c) => {
  const id = c.req.param('id')
  const order = await getAdminOrder(id)
  if (!order) return c.json({ error: 'Not found' }, 404)
  return c.json(order)
})

router.patch('/orders/:id', zValidator('json', orderUpdateBodySchema, (result, c) => {
  if (!result.success) return c.json({ error: 'Validation failed' }, 422)
}), async (c) => {
  const id = c.req.param('id')
  const { status, trackingNumber, adminNote } = c.req.valid('json')
  await updateAdminOrder(id, {
    status,
    trackingNumber: trackingNumber ?? null,
    adminNote: adminNote ?? null,
  })
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
git commit -m "feat(admin): add order routes"
```

---

## Task 8: Wire up в index.ts и app.ts

**Files:**
- Modify: `apps/api/src/features/admin/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1: Добавить экспорты в `index.ts`**

```typescript
export { makeListAdminOrders } from './application/listAdminOrders'
export { makeGetAdminOrder } from './application/getAdminOrder'
export { makeUpdateAdminOrder } from './application/updateAdminOrder'
```

- [ ] **Шаг 2: Обновить импорт admin в `app.ts`**

```typescript
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
  makeListAdminOrders,
  makeGetAdminOrder,
  makeUpdateAdminOrder,
  makeAdminRouter,
} from './features/admin'
```

- [ ] **Шаг 3: Обновить секцию `// Admin` в `app.ts`**

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
const listAdminOrders = makeListAdminOrders(adminRepo)
const getAdminOrder = makeGetAdminOrder(adminRepo)
const updateAdminOrder = makeUpdateAdminOrder(adminRepo, emailService)
app.use('/admin/*', requireAuth)
app.route('/admin', makeAdminRouter(
  getDashboard, markAllMessagesRead,
  listAdminProducts, createProduct, updateProduct, deleteProduct, togglePublish,
  listCategoriesWithCount, createCategory, updateCategory, deleteCategory,
  getAdminProduct,
  listConversations, getConversation, replyToUser, markConversationRead,
  listAdminOrders, getAdminOrder, updateAdminOrder,
))
```

- [ ] **Шаг 4: Запустить все тесты API**

```bash
cd D:\Natalia\NatsDoll\apps\api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 5: Typecheck API**

```bash
cd D:\Natalia\NatsDoll\apps\api
node --max-old-space-size=8192 ../../node_modules/typescript/bin/tsc --noEmit
```

Ожидаемый вывод: нет ошибок.

- [ ] **Шаг 6: Коммит**

```bash
git add apps/api/src/features/admin/index.ts apps/api/src/app.ts
git commit -m "feat(admin): wire up order use-cases in app"
```

---

## Task 9: `adminOrdersApi.ts` — фронтенд composables

**Files:**
- Create: `apps/web/src/widgets/admin-panel/adminOrdersApi.ts`

- [ ] **Шаг 1: Создать файл**

```typescript
// apps/web/src/widgets/admin-panel/adminOrdersApi.ts
import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const OrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  userName: z.string(),
  userEmail: z.string(),
  itemCount: z.number(),
  createdAt: z.string(),
})

const OrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  quantity: z.number(),
  price: z.number(),
  subtotal: z.number(),
  message: z.string().nullable(),
})

const ShippingAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
})

const OrderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  shippingCost: z.number(),
  shippingAddress: ShippingAddressSchema,
  trackingNumber: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  items: z.array(OrderItemSchema),
})

const OrderListResponseSchema = z.object({
  items: z.array(OrderSummarySchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

export type AdminOrderSummary = z.infer<typeof OrderSummarySchema>
export type AdminOrderDetail = z.infer<typeof OrderDetailSchema>
export type AdminOrderListResponse = z.infer<typeof OrderListResponseSchema>
export type UpdateOrderInput = {
  status: string
  trackingNumber: string | null
  adminNote: string | null
}

export type AdminOrderFilters = {
  status: string
  search: string
  page: number
}

export function useAdminOrders() {
  const data = ref<AdminOrderListResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<AdminOrderFilters>({ status: '', search: '', page: 1 })

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(filters.value.page))
      params.set('limit', '20')
      if (filters.value.status) params.set('status', filters.value.status)
      if (filters.value.search) params.set('search', filters.value.search)

      const res = await authFetch(`/admin/orders?${params}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load orders')
        return
      }
      data.value = OrderListResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load orders'
    } finally {
      isLoading.value = false
    }
  }

  function setFilter(patch: Partial<AdminOrderFilters>) {
    if (patch.status !== undefined || patch.search !== undefined) {
      filters.value = { ...filters.value, ...patch, page: 1 }
    } else {
      filters.value = { ...filters.value, ...patch }
    }
  }

  watch(filters, refresh, { deep: true })

  return { data, isLoading, error, filters, setFilter, refresh }
}

export function useAdminOrderDetail(orderId: Ref<string | null>) {
  const order = ref<AdminOrderDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/orders/${id}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load order')
        return
      }
      order.value = OrderDetailSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load order'
    } finally {
      isLoading.value = false
    }
  }

  watch(orderId, (id) => {
    if (id) load(id)
    else order.value = null
  })

  return { order, isLoading, error, reload: () => orderId.value ? load(orderId.value) : Promise.resolve() }
}

export async function updateAdminOrder(id: string, payload: UpdateOrderInput): Promise<void> {
  const res = await authFetch(`/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await apiErrorMessage(res, 'Failed to update order')
    throw new Error(msg)
  }
}
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/adminOrdersApi.ts
git commit -m "feat(admin): add adminOrdersApi composables"
```

---

## Task 10: `OrderList.vue`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/OrderList.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<template>
  <div class="order-list">
    <div class="order-list__filters">
      <select
        :value="filters.status"
        class="order-list__select"
        @change="$emit('filter-change', { status: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="PAID">Paid</option>
        <option value="PROCESSING">Processing</option>
        <option value="SHIPPED">Shipped</option>
        <option value="DELIVERED">Delivered</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REFUNDED">Refunded</option>
      </select>
      <input
        :value="filters.search"
        class="order-list__search"
        placeholder="Search #N or name…"
        @input="onSearch(($event.target as HTMLInputElement).value)"
      >
    </div>

    <div
      v-if="orders.length === 0"
      class="order-list__empty"
    >
      No orders found
    </div>

    <div
      v-for="order in orders"
      :key="order.id"
      class="order-list__item"
      :class="{ 'order-list__item--active': order.id === selectedId }"
      @click="$emit('select', order.id)"
    >
      <div class="order-list__item-header">
        <span class="order-list__item-number">#{{ order.orderNumber }}</span>
        <span
          class="order-list__item-badge"
          :class="`order-list__item-badge--${order.status.toLowerCase()}`"
        >{{ order.status }}</span>
      </div>
      <div class="order-list__item-sub">
        <span class="order-list__item-name">{{ order.userName }}</span>
        <span class="order-list__item-total">{{ formatPrice(order.totalAmount) }}</span>
      </div>
      <span class="order-list__item-date">{{ formatDate(order.createdAt) }}</span>
    </div>

    <div
      v-if="totalPages > 1"
      class="order-list__pagination"
    >
      <button
        class="order-list__page-btn"
        :disabled="filters.page <= 1"
        @click="$emit('page-change', filters.page - 1)"
      >
        ← Prev
      </button>
      <span class="order-list__page-info">{{ filters.page }} / {{ totalPages }}</span>
      <button
        class="order-list__page-btn"
        :disabled="filters.page >= totalPages"
        @click="$emit('page-change', filters.page + 1)"
      >
        Next →
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { formatPrice, formatDate } from '@/shared'
import type { AdminOrderSummary, AdminOrderFilters } from '../adminOrdersApi'

defineProps<{
  orders: AdminOrderSummary[]
  selectedId: string | null
  totalPages: number
  filters: AdminOrderFilters
}>()

const emit = defineEmits<{
  select: [id: string]
  'filter-change': [patch: Partial<AdminOrderFilters>]
  'page-change': [page: number]
}>()

const searchTimeout = ref<ReturnType<typeof setTimeout> | null>(null)

function onSearch(value: string) {
  if (searchTimeout.value) clearTimeout(searchTimeout.value)
  searchTimeout.value = setTimeout(() => {
    emit('filter-change', { search: value })
  }, 300)
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;

  &__filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-shrink: 0;
  }

  &__select,
  &__search {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.45rem 0.75rem;
    font-size: 0.82rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;
    width: 100%;

    &:focus {
      border-color: var(--color-accent);
    }
  }

  &__empty {
    padding: 2rem 1rem;
    text-align: center;
    font-size: 0.88rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--color-border);
    transition: background 0.12s;
    overflow-y: auto;

    &:hover {
      background: rgb(var(--btn-gradient-light) / 0.06);
    }

    &--active {
      background: rgb(var(--btn-gradient-light) / 0.1);
      border-left: 3px solid var(--color-accent);
      padding-left: calc(1rem - 3px);
    }
  }

  &__item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.2rem;
  }

  &__item-number {
    font-size: 0.9rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__item-badge {
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 999px;

    &--pending {
      background: rgb(212 160 23 / 0.15);
      color: var(--color-gold);
    }

    &--paid,
    &--processing {
      background: rgb(0 120 200 / 0.1);
      color: #0078c8;
    }

    &--shipped,
    &--delivered {
      background: rgb(39 174 96 / 0.12);
      color: #1a7a42;
    }

    &--cancelled,
    &--refunded {
      background: rgb(192 57 43 / 0.1);
      color: var(--color-error);
    }
  }

  &__item-sub {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.15rem;
  }

  &__item-name {
    font-size: 0.8rem;
    color: var(--color-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 55%;
  }

  &__item-total {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__item-date {
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__pagination {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.6rem 0.75rem;
    border-top: 1px solid var(--color-border);
    flex-shrink: 0;
    margin-top: auto;
  }

  &__page-btn {
    background: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.25rem 0.6rem;
    font-size: 0.78rem;
    color: var(--color-text);

    &:disabled {
      opacity: 0.4;
    }

    &:not(:disabled):hover {
      background: var(--color-border);
    }
  }

  &__page-info {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }
}
</style>
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/components/OrderList.vue
git commit -m "feat(admin): add OrderList component"
```

---

## Task 11: `OrderDetail.vue`

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/OrderDetail.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<template>
  <div class="order-detail">
    <div
      v-if="!order"
      class="order-detail__empty"
    >
      Select an order
    </div>

    <template v-else>
      <div class="order-detail__header">
        <button
          class="order-detail__back"
          @click="$emit('back')"
        >
          ←
        </button>
        <div class="order-detail__meta">
          <div class="order-detail__title-row">
            <span class="order-detail__number">Order #{{ order.orderNumber }}</span>
            <span
              class="order-detail__badge"
              :class="`order-detail__badge--${order.status.toLowerCase()}`"
            >{{ order.status }}</span>
          </div>
          <span class="order-detail__date">{{ formatDate(order.createdAt) }}</span>
          <span class="order-detail__customer">{{ order.userName }} · {{ order.userEmail }}</span>
        </div>
      </div>

      <div class="order-detail__body">
        <section class="order-detail__section">
          <h3 class="order-detail__section-title">Items</h3>
          <div
            v-for="item in order.items"
            :key="item.id"
            class="order-detail__item"
          >
            <div class="order-detail__item-img">
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
              >
              <span
                v-else
                class="order-detail__item-img-placeholder"
              >?</span>
            </div>
            <div class="order-detail__item-info">
              <span class="order-detail__item-name">{{ item.productName }}</span>
              <span
                v-if="item.message"
                class="order-detail__item-msg"
              >"{{ item.message }}"</span>
              <span class="order-detail__item-qty">× {{ item.quantity }}</span>
            </div>
            <span class="order-detail__item-subtotal">{{ formatPrice(item.subtotal) }}</span>
          </div>
        </section>

        <section class="order-detail__section order-detail__section--row">
          <div class="order-detail__address">
            <h3 class="order-detail__section-title">Shipping address</h3>
            <p>{{ order.shippingAddress.fullName }}</p>
            <p>{{ order.shippingAddress.line1 }}</p>
            <p v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}</p>
            <p>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</p>
            <p>{{ order.shippingAddress.country }}</p>
          </div>

          <div class="order-detail__totals">
            <div class="order-detail__totals-row">
              <span>Shipping</span>
              <span>{{ formatPrice(order.shippingCost) }}</span>
            </div>
            <div class="order-detail__totals-row order-detail__totals-row--grand">
              <span>Total</span>
              <span>{{ formatPrice(order.totalAmount) }}</span>
            </div>
          </div>
        </section>

        <form
          class="order-detail__form"
          @submit.prevent="handleSave"
        >
          <h3 class="order-detail__section-title">Edit order</h3>

          <div class="order-detail__field">
            <label class="order-detail__label">Status</label>
            <select
              v-model="draft.status"
              class="order-detail__select"
            >
              <option value="PENDING">PENDING</option>
              <option value="PAID">PAID</option>
              <option value="PROCESSING">PROCESSING</option>
              <option value="SHIPPED">SHIPPED</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REFUNDED">REFUNDED</option>
            </select>
          </div>

          <div class="order-detail__field">
            <label class="order-detail__label">
              Tracking number
              <span class="order-detail__hint-inline">— visible to customer</span>
            </label>
            <input
              v-model="draft.trackingNumber"
              class="order-detail__input"
              placeholder="e.g. 1Z999AA10123456784"
            >
            <span class="order-detail__hint">Customer receives an email when tracking is first added.</span>
          </div>

          <div class="order-detail__field">
            <label class="order-detail__label">
              Admin note
              <span class="order-detail__hint-inline">— only you see this</span>
            </label>
            <textarea
              v-model="draft.adminNote"
              class="order-detail__textarea"
              rows="3"
              placeholder="Internal notes…"
            />
          </div>

          <p
            v-if="saveError"
            class="order-detail__error"
          >
            {{ saveError }}
          </p>

          <AppButton
            type="submit"
            :disabled="!isDirty || saving"
          >
            {{ saving ? 'Saving…' : 'Save changes' }}
          </AppButton>
        </form>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { AppButton, formatPrice, formatDate } from '@/shared'
import type { AdminOrderDetail, UpdateOrderInput } from '../adminOrdersApi'

const props = defineProps<{
  order: AdminOrderDetail | null
  saving: boolean
}>()

const emit = defineEmits<{
  save: [payload: UpdateOrderInput]
  back: []
}>()

type Draft = { status: string; trackingNumber: string; adminNote: string }

const draft = ref<Draft>({ status: '', trackingNumber: '', adminNote: '' })
const saveError = ref('')

watch(() => props.order, (o) => {
  if (o) {
    draft.value = {
      status: o.status,
      trackingNumber: o.trackingNumber ?? '',
      adminNote: o.adminNote ?? '',
    }
    saveError.value = ''
  }
}, { immediate: true })

const isDirty = computed(() => {
  if (!props.order) return false
  return (
    draft.value.status !== props.order.status ||
    (draft.value.trackingNumber || null) !== props.order.trackingNumber ||
    (draft.value.adminNote || null) !== props.order.adminNote
  )
})

function handleSave() {
  saveError.value = ''
  emit('save', {
    status: draft.value.status,
    trackingNumber: draft.value.trackingNumber.trim() || null,
    adminNote: draft.value.adminNote.trim() || null,
  })
}

function setError(msg: string) {
  saveError.value = msg
}

defineExpose({ setError })
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-detail {
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
    align-items: flex-start;
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
    flex-shrink: 0;

    &:hover { background: var(--color-border); }

    @include tablet { display: none; }
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  &__title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__number {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__badge {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2rem 0.55rem;
    border-radius: 999px;

    &--pending { background: rgb(212 160 23 / 0.15); color: var(--color-gold); }
    &--paid, &--processing { background: rgb(0 120 200 / 0.1); color: #0078c8; }
    &--shipped, &--delivered { background: rgb(39 174 96 / 0.12); color: #1a7a42; }
    &--cancelled, &--refunded { background: rgb(192 57 43 / 0.1); color: var(--color-error); }
  }

  &__date {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  &__customer {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  &__section {
    &-title {
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.75rem;
    }

    &--row {
      display: flex;
      flex-direction: column;
      gap: 1rem;

      @include tablet {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }
    }
  }

  &__item {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 0.6rem 0;
    border-bottom: 1px solid var(--color-border);
  }

  &__item-img {
    width: 52px;
    height: 52px;
    border-radius: 6px;
    overflow: hidden;
    background: rgb(var(--btn-gradient-light) / 0.4);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;

    img { width: 100%; height: 100%; object-fit: cover; }
  }

  &__item-img-placeholder {
    font-size: 1.2rem;
    color: var(--color-border);
  }

  &__item-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
  }

  &__item-name {
    font-size: 0.88rem;
    color: var(--color-text);
    font-weight: 500;
  }

  &__item-msg {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__item-qty {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  &__item-subtotal {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text);
    flex-shrink: 0;
  }

  &__address {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.6;
  }

  &__totals {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    flex-shrink: 0;
  }

  &__totals-row {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    font-size: 0.88rem;
    color: var(--color-text-muted);

    &--grand {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
      padding-top: 0.35rem;
      border-top: 1px solid var(--color-border);
      margin-top: 0.15rem;
    }
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-top: 1rem;
    border-top: 2px solid var(--color-border);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__label {
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__hint-inline {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    font-size: 0.75rem;
  }

  &__hint {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__select,
  &__input,
  &__textarea {
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 0.6rem 0.875rem;
    font-size: 0.9rem;
    font-family: var(--font-display);
    color: var(--color-text);
    background: var(--color-white);
    outline: none;

    &:focus { border-color: var(--color-accent); }
  }

  &__textarea {
    resize: vertical;
    min-height: 72px;
  }

  &__error {
    font-size: 0.82rem;
    color: var(--color-error);
  }
}
</style>
```

- [ ] **Шаг 2: Коммит**

```bash
git add apps/web/src/widgets/admin-panel/components/OrderDetail.vue
git commit -m "feat(admin): add OrderDetail component"
```

---

## Task 12: Переписать `AdminOrders.vue`

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/components/AdminOrders.vue`

- [ ] **Шаг 1: Заменить содержимое файла**

```vue
<template>
  <div class="admin-orders">
    <AdminTopbar
      title="Orders"
      subtitle="All customer orders"
    />

    <div
      v-if="ordersError"
      class="admin-orders__error"
    >
      {{ ordersError }}
      <button @click="ordersRefresh">
        Retry
      </button>
    </div>

    <div
      v-else
      class="admin-orders__body"
      :class="{ 'admin-orders__body--detail-open': !!selectedId && isMobile }"
    >
      <div class="admin-orders__sidebar">
        <div
          v-if="ordersLoading && !ordersData"
          class="admin-orders__loading"
        >
          Loading…
        </div>
        <OrderList
          v-else
          :orders="ordersData?.items ?? []"
          :selected-id="selectedId"
          :total-pages="ordersData?.totalPages ?? 1"
          :filters="filters"
          @select="handleSelect"
          @filter-change="setFilter"
          @page-change="(p) => setFilter({ page: p })"
        />
      </div>

      <div class="admin-orders__main">
        <div
          v-if="detailError"
          class="admin-orders__error"
        >
          {{ detailError }}
        </div>
        <div
          v-else-if="detailLoading"
          class="admin-orders__loading"
        >
          Loading…
        </div>
        <OrderDetail
          v-else
          ref="detailRef"
          :order="detail"
          :saving="saving"
          @save="handleSave"
          @back="selectedId = null"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AdminTopbar from './AdminTopbar.vue'
import OrderList from './OrderList.vue'
import OrderDetail from './OrderDetail.vue'
import { useAdminOrders, useAdminOrderDetail, updateAdminOrder } from '../adminOrdersApi'
import type { UpdateOrderInput } from '../adminOrdersApi'

const MOBILE_BREAKPOINT = 768

const selectedId = ref<string | null>(null)
const saving = ref(false)
const isMobile = ref(window.innerWidth < MOBILE_BREAKPOINT)
const detailRef = ref<InstanceType<typeof OrderDetail> | null>(null)

const { data: ordersData, isLoading: ordersLoading, error: ordersError, filters, setFilter, refresh: ordersRefresh } = useAdminOrders()
const { order: detail, isLoading: detailLoading, error: detailError, reload: reloadDetail } = useAdminOrderDetail(selectedId)

function handleSelect(id: string) {
  selectedId.value = id
}

async function handleSave(payload: UpdateOrderInput) {
  if (!selectedId.value) return
  saving.value = true
  try {
    await updateAdminOrder(selectedId.value, payload)
    await reloadDetail()
    await ordersRefresh()
  } catch (e) {
    detailRef.value?.setError(e instanceof Error ? e.message : 'Failed to save')
  } finally {
    saving.value = false
  }
}

function handleResize() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
}

onMounted(() => {
  ordersRefresh()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-orders {
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
    overflow: hidden;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;

    @include tablet {
      width: 280px;
    }
  }

  &__main {
    flex: 1;
    display: none;
    flex-direction: column;
    min-width: 0;
    min-height: 0;

    @include tablet {
      display: flex;
    }
  }

  &__body--detail-open {
    .admin-orders__sidebar { display: none; }
    .admin-orders__main { display: flex; width: 100%; }
  }

  &__loading {
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
git add apps/web/src/widgets/admin-panel/components/AdminOrders.vue
git commit -m "feat(admin): implement AdminOrders inbox with order detail"
```

---

## Task 13: Обновить web order types + AccountPurchaseDetail

**Files:**
- Modify: `apps/web/src/entities/order/types.ts`
- Modify: `apps/web/src/entities/order/orderApi.ts`
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`

- [ ] **Шаг 1: Обновить `types.ts`**

```typescript
// apps/web/src/entities/order/types.ts
export type OrderDetail = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  createdAt: string
  items: OrderItemView[]
}
```

- [ ] **Шаг 2: Обновить Zod-схему в `orderApi.ts`**

В `orderDetailSchema` добавить поле:
```typescript
const orderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  shippingCost: z.number(),
  shippingAddress: shippingAddressSchema,
  trackingNumber: z.string().nullable(),
  createdAt: z.string(),
  items: z.array(orderItemSchema),
})
```

- [ ] **Шаг 3: Добавить блок трекинга в `AccountPurchaseDetail.vue`**

После блока `&__header` (после строки `</div>` закрывающей `purchase-detail__header`) добавить в template:

```vue
<div
  v-if="order.trackingNumber"
  class="purchase-detail__tracking"
>
  <span class="purchase-detail__tracking-label">Tracking number</span>
  <span class="purchase-detail__tracking-value">{{ order.trackingNumber }}</span>
</div>
```

В секцию `<style>` добавить блок:
```scss
&__tracking {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgb(39 174 96 / 0.08);
  border: 1px solid rgb(39 174 96 / 0.2);
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

&__tracking-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #1a7a42;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  flex-shrink: 0;
}

&__tracking-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: monospace;
}
```

- [ ] **Шаг 4: Коммит**

```bash
git add apps/web/src/entities/order/types.ts apps/web/src/entities/order/orderApi.ts apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue
git commit -m "feat(account): show tracking number in purchase detail"
```

---

## Task 14: Typecheck + финальная проверка

- [ ] **Шаг 1: Typecheck web**

```bash
cd D:\Natalia\NatsDoll
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемый вывод: нет ошибок.

- [ ] **Шаг 2: Все тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic --root apps/api
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic --root apps/web
```

Ожидаемый вывод: все тесты PASS.

- [ ] **Шаг 3: Ручная проверка**

Запусти приложение и проверь:
1. Админ → Orders → список заказов отображается
2. Кликнуть заказ → детали открываются справа
3. Изменить статус → Save Changes → статус обновился в списке
4. Добавить трекинг-номер → Save → покупатель получит email (проверить логи)
5. Пользователь → Кабинет → Purchases → деталь заказа → блок с трекинг-номером виден
6. Добавить примечание → Save → оно сохранилось (только в admin detail, не у пользователя)

- [ ] **Шаг 4: Финальный коммит если нужны правки**

```bash
git add -p
git commit -m "fix: address review findings in admin orders"
```
