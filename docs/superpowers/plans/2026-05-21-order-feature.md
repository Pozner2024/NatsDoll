# Order Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow authenticated users to place an order from their cart by entering a shipping address, then view the order confirmation.

**Architecture:** Backend follows 3-layer clean architecture (application use-cases + infrastructure repository + presentation routes), wired in `app.ts`. Frontend uses FSD: `entities/order` for data, `widgets/checkout-form` and `widgets/order-confirmation` for UI, `pages/CheckoutPage` and `pages/OrderConfirmationPage` as entry points. Order creation is transactional: stock check → snapshot prices → decrement stock → clear cart → create order.

**Tech Stack:** Hono + Prisma (backend), Vue 3 + Pinia + Zod (frontend), Vitest (tests), TypeScript throughout.

---

## File Map

**Create (backend):**
- `apps/api/prisma/migrations/<timestamp>_add_message_to_order_item/migration.sql`
- `apps/api/src/features/orders/types.ts`
- `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- `apps/api/src/features/orders/application/createOrder.ts`
- `apps/api/src/features/orders/application/createOrder.test.ts`
- `apps/api/src/features/orders/application/getMyOrders.ts`
- `apps/api/src/features/orders/application/getMyOrders.test.ts`
- `apps/api/src/features/orders/application/getOrder.ts`
- `apps/api/src/features/orders/application/getOrder.test.ts`
- `apps/api/src/features/orders/presentation/orderRoutes.ts`
- `apps/api/src/features/orders/presentation/orderRoutes.test.ts`
- `apps/api/src/features/orders/index.ts`

**Modify (backend):**
- `apps/api/src/app.ts` — wire order feature

**Create (frontend):**
- `apps/web/src/entities/order/types.ts`
- `apps/web/src/entities/order/orderApi.ts`
- `apps/web/src/entities/order/store.ts`
- `apps/web/src/entities/order/store.test.ts`
- `apps/web/src/entities/order/index.ts`
- `apps/web/src/widgets/checkout-form/CheckoutForm.vue`
- `apps/web/src/widgets/checkout-form/index.ts`
- `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue`
- `apps/web/src/widgets/order-confirmation/index.ts`
- `apps/web/src/pages/CheckoutPage.vue`
- `apps/web/src/pages/OrderConfirmationPage.vue`

**Modify (frontend):**
- `apps/web/src/router/index.ts` — add /checkout and /orders/:id routes
- `apps/web/src/widgets/cart-page/CartPageWidget.vue` — enable Checkout button

---

## Task 1: DB Migration — add message to OrderItem

The `OrderItem` model in schema.prisma is missing a `message` field. Personalized messages from cart items must be preserved in the order history.

**Files:**
- Modify: `apps/api/prisma/schema.prisma`
- Create: migration SQL file

- [ ] **Step 1: Add message field to OrderItem in schema.prisma**

In `apps/api/prisma/schema.prisma`, find the `OrderItem` model and add `message` after `price`:

```prisma
model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  productId String
  quantity  Int
  price     Decimal @db.Decimal(10, 2)
  message   String?

  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  product   Product @relation(fields: [productId], references: [id], onDelete: Restrict)

  @@index([orderId])
  @@index([productId])
}
```

- [ ] **Step 2: Generate migration SQL**

Run from `apps/api`:
```bash
cd apps/api
npx prisma migrate diff \
  --from-url "$DATABASE_URL" \
  --to-schema-datamodel prisma/schema.prisma \
  --script > prisma/migrations/20260521120000_add_message_to_order_item/migration.sql
```

Check the generated SQL — it should contain:
```sql
ALTER TABLE "OrderItem" ADD COLUMN "message" TEXT;
```

- [ ] **Step 3: Apply migration**

```bash
npx prisma migrate deploy
```

Expected output: `1 migration applied.`

- [ ] **Step 4: Regenerate Prisma client**

```bash
npx prisma generate
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add message field to OrderItem schema"
```

---

## Task 2: Backend types + order repository

**Files:**
- Create: `apps/api/src/features/orders/types.ts`
- Create: `apps/api/src/features/orders/infrastructure/orderRepository.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// apps/api/src/features/orders/types.ts

export type ShippingAddress = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type OrderItemView = {
  id: string
  productId: string
  productSlug: string
  productName: string
  productImage: string | null
  quantity: number
  price: number
  subtotal: number
  message: string | null
}

export type OrderDetail = {
  id: string
  status: string
  totalAmount: number
  shippingAddress: ShippingAddress
  createdAt: string
  items: OrderItemView[]
}

export type OrderSummary = {
  id: string
  status: string
  totalAmount: number
  itemCount: number
  createdAt: string
  firstItemImage: string | null
}

export type CartItemForCheckout = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  productPrice: number
  productStock: number
  productIsAvailable: boolean
  quantity: number
  message: string | null
}

export type CreateOrder = (userId: string, shippingAddress: ShippingAddress) => Promise<OrderDetail>
export type GetMyOrders = (userId: string) => Promise<OrderSummary[]>
export type GetOrder = (userId: string, orderId: string) => Promise<OrderDetail>

export interface OrderRepository {
  getCartItemsForCheckout(userId: string): Promise<CartItemForCheckout[]>
  createOrderFromCart(
    userId: string,
    items: CartItemForCheckout[],
    totalAmount: number,
    shippingAddress: ShippingAddress,
  ): Promise<OrderDetail>
  getMyOrders(userId: string): Promise<OrderSummary[]>
  getOrderById(orderId: string): Promise<OrderDetail | null>
}
```

- [ ] **Step 2: Create orderRepository.ts**

```typescript
// apps/api/src/features/orders/infrastructure/orderRepository.ts
import type { PrismaClient } from '@prisma/client'
import type { OrderRepository, CartItemForCheckout, OrderDetail, OrderSummary, ShippingAddress, OrderItemView } from '../types'

export function makeOrderRepository(prisma: PrismaClient): OrderRepository {
  return {
    async getCartItemsForCheckout(userId: string): Promise<CartItemForCheckout[]> {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        select: {
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              quantity: true,
              message: true,
              product: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                  price: true,
                  stock: true,
                  isPublished: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      })
      if (!cart) return []
      return cart.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0] ?? null,
        productPrice: item.product.price.toNumber(),
        productStock: item.product.stock,
        productIsAvailable: item.product.isPublished && item.product.deletedAt === null,
        quantity: item.quantity,
        message: item.message,
      }))
    },

    async createOrderFromCart(
      userId: string,
      items: CartItemForCheckout[],
      totalAmount: number,
      shippingAddress: ShippingAddress,
    ): Promise<OrderDetail> {
      const cartItemIds = items.map((i) => i.id)

      const order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingAddress: shippingAddress as object,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.productPrice,
                message: item.message,
              })),
            },
          },
          select: {
            id: true,
            status: true,
            totalAmount: true,
            shippingAddress: true,
            createdAt: true,
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

        for (const item of items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.quantity } },
          })
        }

        await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } })

        return created
      })

      return toOrderDetail(order)
    },

    async getMyOrders(userId: string): Promise<OrderSummary[]> {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: {
            take: 1,
            orderBy: { id: 'asc' },
            select: {
              quantity: true,
              product: { select: { images: true } },
            },
          },
          _count: { select: { items: true } },
        },
      })

      return orders.map((o) => ({
        id: o.id,
        status: o.status,
        totalAmount: o.totalAmount.toNumber(),
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
        firstItemImage: o.items[0]?.product.images[0] ?? null,
      }))
    },

    async getOrderById(orderId: string): Promise<OrderDetail | null> {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          shippingAddress: true,
          createdAt: true,
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
      return toOrderDetail(order)
    },
  }
}

type OrderRow = {
  id: string
  status: string
  totalAmount: { toNumber(): number }
  shippingAddress: unknown
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: { toNumber(): number }
    message: string | null
    product: { id: string; slug: string; name: string; images: string[] }
  }>
}

function toOrderDetail(order: OrderRow): OrderDetail {
  const items: OrderItemView[] = order.items.map((item) => {
    const price = item.price.toNumber()
    return {
      id: item.id,
      productId: item.product.id,
      productSlug: item.product.slug,
      productName: item.product.name,
      productImage: item.product.images[0] ?? null,
      quantity: item.quantity,
      price,
      subtotal: price * item.quantity,
      message: item.message,
    }
  })

  return {
    id: order.id,
    status: order.status,
    totalAmount: order.totalAmount.toNumber(),
    shippingAddress: order.shippingAddress as import('../types').ShippingAddress,
    createdAt: order.createdAt.toISOString(),
    items,
  }
}
```

- [ ] **Step 3: Run typecheck to verify no errors**

```bash
cd apps/api
node --max-old-space-size=8192 ../../node_modules/typescript/bin/tsc --noEmit
```

Expected: no errors in new files.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/orders/
git commit -m "feat: scaffold order types and repository"
```

---

## Task 3: createOrder use-case

**Files:**
- Create: `apps/api/src/features/orders/application/createOrder.ts`
- Create: `apps/api/src/features/orders/application/createOrder.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/features/orders/application/createOrder.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeCreateOrder } from './createOrder'
import type { OrderRepository, ShippingAddress } from '../types'

const address: ShippingAddress = {
  fullName: 'Natasha',
  line1: '123 Main St',
  city: 'New York',
  country: 'US',
  postalCode: '10001',
}

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('createOrder', () => {
  let repo: OrderRepository

  beforeEach(() => {
    repo = makeRepo()
  })

  it('throws 400 when cart is empty', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 400 })
  })

  it('throws 409 when a product is unavailable', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: false, quantity: 1, message: null },
    ])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('throws 409 when stock is insufficient', async () => {
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue([
      { id: 'ci-1', productId: 'p1', productName: 'Doll', productImage: null,
        productPrice: 10, productStock: 2, productIsAvailable: true, quantity: 5, message: null },
    ])
    const createOrder = makeCreateOrder(repo)
    await expect(createOrder('u1', address)).rejects.toMatchObject({ statusCode: 409 })
  })

  it('calls createOrderFromCart with correct totalAmount', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 15, productStock: 10, productIsAvailable: true, quantity: 2, message: null },
      { id: 'ci-2', productId: 'p2', productName: 'B', productImage: null,
        productPrice: 20, productStock: 5, productIsAvailable: true, quantity: 1, message: 'Hi' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', status: 'PENDING', totalAmount: 50,
      shippingAddress: address, createdAt: new Date().toISOString(), items: [],
    })
    const createOrder = makeCreateOrder(repo)
    await createOrder('u1', address)
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 50, address)
  })

  it('returns the order detail from repository', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null },
    ]
    const orderDetail = {
      id: 'order-1', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, createdAt: '2026-05-21T00:00:00.000Z',
      items: [],
    }
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue(orderDetail)
    const createOrder = makeCreateOrder(repo)
    const result = await createOrder('u1', address)
    expect(result).toEqual(orderDetail)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/createOrder.test.ts --reporter=basic
```

Expected: FAIL — "Cannot find module './createOrder'"

- [ ] **Step 3: Implement createOrder.ts**

```typescript
// apps/api/src/features/orders/application/createOrder.ts
import { AppError } from '../../../shared/errors'
import type { OrderRepository, CreateOrder, ShippingAddress } from '../types'

export function makeCreateOrder(repo: OrderRepository): CreateOrder {
  return async function createOrder(userId: string, shippingAddress: ShippingAddress) {
    const items = await repo.getCartItemsForCheckout(userId)

    if (items.length === 0) {
      throw new AppError(400, 'Cart is empty')
    }

    for (const item of items) {
      if (!item.productIsAvailable) {
        throw new AppError(409, `"${item.productName}" is no longer available`)
      }
      if (item.productStock < item.quantity) {
        throw new AppError(409, `Not enough stock for "${item.productName}"`)
      }
    }

    const totalAmount = items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0)

    return repo.createOrderFromCart(userId, items, totalAmount, shippingAddress)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/createOrder.test.ts --reporter=basic
```

Expected: 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/orders/application/
git commit -m "feat: implement createOrder use-case"
```

---

## Task 4: getMyOrders use-case

**Files:**
- Create: `apps/api/src/features/orders/application/getMyOrders.ts`
- Create: `apps/api/src/features/orders/application/getMyOrders.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/features/orders/application/getMyOrders.test.ts
import { describe, it, expect, vi } from 'vitest'
import { makeGetMyOrders } from './getMyOrders'
import type { OrderRepository } from '../types'

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('getMyOrders', () => {
  it('delegates to repo.getMyOrders', async () => {
    const repo = makeRepo()
    const expected = [
      { id: 'o1', status: 'PENDING', totalAmount: 30, itemCount: 2,
        createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null },
    ]
    vi.mocked(repo.getMyOrders).mockResolvedValue(expected)
    const getMyOrders = makeGetMyOrders(repo)
    const result = await getMyOrders('u1')
    expect(result).toEqual(expected)
    expect(repo.getMyOrders).toHaveBeenCalledWith('u1')
  })

  it('returns empty array when user has no orders', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getMyOrders).mockResolvedValue([])
    const getMyOrders = makeGetMyOrders(repo)
    const result = await getMyOrders('u1')
    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/getMyOrders.test.ts --reporter=basic
```

Expected: FAIL — "Cannot find module './getMyOrders'"

- [ ] **Step 3: Implement getMyOrders.ts**

```typescript
// apps/api/src/features/orders/application/getMyOrders.ts
import type { OrderRepository, GetMyOrders } from '../types'

export function makeGetMyOrders(repo: OrderRepository): GetMyOrders {
  return (userId: string) => repo.getMyOrders(userId)
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/getMyOrders.test.ts --reporter=basic
```

Expected: 2 tests passed.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/orders/application/getMyOrders.ts apps/api/src/features/orders/application/getMyOrders.test.ts
git commit -m "feat: implement getMyOrders use-case"
```

---

## Task 5: getOrder use-case

**Files:**
- Create: `apps/api/src/features/orders/application/getOrder.ts`
- Create: `apps/api/src/features/orders/application/getOrder.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// apps/api/src/features/orders/application/getOrder.test.ts
import { describe, it, expect, vi } from 'vitest'
import { makeGetOrder } from './getOrder'
import type { OrderRepository, ShippingAddress } from '../types'

const address: ShippingAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

function makeRepo(): OrderRepository {
  return {
    getCartItemsForCheckout: vi.fn(),
    createOrderFromCart: vi.fn(),
    getMyOrders: vi.fn(),
    getOrderById: vi.fn(),
  }
}

describe('getOrder', () => {
  it('throws 404 when order not found', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getOrderById).mockResolvedValue(null)
    const getOrder = makeGetOrder(repo)
    await expect(getOrder('u1', 'order-999')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('throws 403 when order belongs to different user', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getOrderById).mockResolvedValue({
      id: 'order-1', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, createdAt: '2026-05-21T00:00:00.000Z',
      items: [], userId: 'other-user',
    } as any)
    const getOrder = makeGetOrder(repo)
    await expect(getOrder('u1', 'order-1')).rejects.toMatchObject({ statusCode: 403 })
  })

  it('returns order when userId matches', async () => {
    const repo = makeRepo()
    const order = {
      id: 'order-1', status: 'PENDING', totalAmount: 10,
      shippingAddress: address, createdAt: '2026-05-21T00:00:00.000Z',
      items: [], userId: 'u1',
    }
    vi.mocked(repo.getOrderById).mockResolvedValue(order as any)
    const getOrder = makeGetOrder(repo)
    const result = await getOrder('u1', 'order-1')
    expect(result.id).toBe('order-1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/getOrder.test.ts --reporter=basic
```

Expected: FAIL

- [ ] **Step 3: Update types.ts — add userId to OrderDetail for ownership check**

In `apps/api/src/features/orders/types.ts`, add `userId: string` to `OrderDetail`:

```typescript
export type OrderDetail = {
  id: string
  userId: string
  status: string
  totalAmount: number
  shippingAddress: ShippingAddress
  createdAt: string
  items: OrderItemView[]
}
```

Also update `toOrderDetail` helper in `orderRepository.ts` to include `userId`. Add `userId: true` to the Prisma select in `getOrderById` and `createOrderFromCart`, and add `userId: order.userId` in `toOrderDetail`:

In `orderRepository.ts`, the `OrderRow` type and Prisma selects need `userId: string`. Add to the Prisma select:
```typescript
select: {
  id: true,
  userId: true,       // ← add this
  status: true,
  ...
}
```

And in `toOrderDetail`:
```typescript
return {
  id: order.id,
  userId: order.userId,   // ← add this
  status: order.status,
  ...
}
```

The `OrderRow` type needs `userId: string`:
```typescript
type OrderRow = {
  id: string
  userId: string    // ← add this
  status: string
  ...
}
```

- [ ] **Step 4: Implement getOrder.ts**

```typescript
// apps/api/src/features/orders/application/getOrder.ts
import { AppError } from '../../../shared/errors'
import type { OrderRepository, GetOrder, OrderDetail } from '../types'

export function makeGetOrder(repo: OrderRepository): GetOrder {
  return async function getOrder(userId: string, orderId: string): Promise<OrderDetail> {
    const order = await repo.getOrderById(orderId)
    if (!order) throw new AppError(404, 'Order not found')
    if (order.userId !== userId) throw new AppError(403, 'Forbidden')
    return order
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/application/getOrder.test.ts --reporter=basic
```

Expected: 3 tests passed.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/orders/
git commit -m "feat: implement getOrder use-case with ownership check"
```

---

## Task 6: Order routes + wire in app.ts

**Files:**
- Create: `apps/api/src/features/orders/presentation/orderRoutes.ts`
- Create: `apps/api/src/features/orders/presentation/orderRoutes.test.ts`
- Create: `apps/api/src/features/orders/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write failing route tests**

```typescript
// apps/api/src/features/orders/presentation/orderRoutes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeOrderRouter } from './orderRoutes'
import type { CreateOrder, GetMyOrders, GetOrder } from '../types'

const mockAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

const mockOrderDetail = {
  id: 'order-1', userId: 'u1', status: 'PENDING', totalAmount: 10,
  shippingAddress: mockAddress, createdAt: '2026-05-21T00:00:00.000Z', items: [],
}

function makeApp(
  createOrder: CreateOrder,
  getMyOrders: GetMyOrders,
  getOrder: GetOrder,
) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', { userId: 'u1' })
    await next()
  })
  app.route('/', makeOrderRouter(createOrder, getMyOrders, getOrder))
  return app
}

describe('POST /orders', () => {
  it('returns 200 with order detail on valid input', async () => {
    const createOrder = vi.fn().mockResolvedValue(mockOrderDetail)
    const app = makeApp(createOrder, vi.fn(), vi.fn())
    const res = await app.request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: mockAddress }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('order-1')
    expect(createOrder).toHaveBeenCalledWith('u1', mockAddress)
  })

  it('returns 400 when shippingAddress is missing fullName', async () => {
    const app = makeApp(vi.fn(), vi.fn(), vi.fn())
    const res = await app.request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: { line1: '123', city: 'NY', country: 'US', postalCode: '10001' } }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /orders', () => {
  it('returns list of order summaries', async () => {
    const summary = [{ id: 'o1', status: 'PENDING', totalAmount: 10, itemCount: 1,
      createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null }]
    const getMyOrders = vi.fn().mockResolvedValue(summary)
    const app = makeApp(vi.fn(), getMyOrders, vi.fn())
    const res = await app.request('/orders')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(summary)
    expect(getMyOrders).toHaveBeenCalledWith('u1')
  })
})

describe('GET /orders/:id', () => {
  it('returns order detail', async () => {
    const getOrder = vi.fn().mockResolvedValue(mockOrderDetail)
    const app = makeApp(vi.fn(), vi.fn(), getOrder)
    const res = await app.request('/orders/order-1')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.id).toBe('order-1')
    expect(getOrder).toHaveBeenCalledWith('u1', 'order-1')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/presentation/orderRoutes.test.ts --reporter=basic
```

Expected: FAIL — "Cannot find module './orderRoutes'"

- [ ] **Step 3: Implement orderRoutes.ts**

```typescript
// apps/api/src/features/orders/presentation/orderRoutes.ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import type { CreateOrder, GetMyOrders, GetOrder } from '../types'

const shippingAddressSchema = z.object({
  fullName: z.string().min(1),
  line1: z.string().min(1),
  line2: z.string().optional(),
  city: z.string().min(1),
  country: z.string().min(1),
  postalCode: z.string().min(1),
})

const createOrderBodySchema = z.object({
  shippingAddress: shippingAddressSchema,
})

export function makeOrderRouter(
  createOrder: CreateOrder,
  getMyOrders: GetMyOrders,
  getOrder: GetOrder,
) {
  const router = new Hono()

  router.post('/orders', zValidator('json', createOrderBodySchema), async (c) => {
    const { userId } = c.get('auth')
    const { shippingAddress } = c.req.valid('json')
    const order = await createOrder(userId, shippingAddress)
    return c.json(order)
  })

  router.get('/orders', async (c) => {
    const { userId } = c.get('auth')
    const orders = await getMyOrders(userId)
    return c.json(orders)
  })

  router.get('/orders/:id', async (c) => {
    const { userId } = c.get('auth')
    const orderId = c.req.param('id')
    const order = await getOrder(userId, orderId)
    return c.json(order)
  })

  return router
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run src/features/orders/presentation/orderRoutes.test.ts --reporter=basic
```

Expected: 4 tests passed.

- [ ] **Step 5: Create index.ts**

```typescript
// apps/api/src/features/orders/index.ts
export { makeOrderRepository } from './infrastructure/orderRepository'
export { makeCreateOrder } from './application/createOrder'
export { makeGetMyOrders } from './application/getMyOrders'
export { makeGetOrder } from './application/getOrder'
export { makeOrderRouter } from './presentation/orderRoutes'
```

- [ ] **Step 6: Wire in app.ts**

In `apps/api/src/app.ts`, add the import after cart imports:

```typescript
import {
  makeOrderRepository,
  makeCreateOrder,
  makeGetMyOrders,
  makeGetOrder,
  makeOrderRouter,
} from './features/orders'
```

Add after the Cart block (before `return app`):

```typescript
  // Orders
  const orderRepo = makeOrderRepository(prisma)
  const createOrder = makeCreateOrder(orderRepo)
  const getMyOrders = makeGetMyOrders(orderRepo)
  const getOrder = makeGetOrder(orderRepo)
  app.use('/orders/*', requireAuth)
  app.route('/', makeOrderRouter(createOrder, getMyOrders, getOrder))
```

- [ ] **Step 7: Run all API tests**

```bash
cd apps/api
node --max-old-space-size=4096 ../../node_modules/vitest/vitest.mjs run --reporter=basic
```

Expected: all tests pass (including previous 116 + new order tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/features/orders/ apps/api/src/app.ts
git commit -m "feat: add order routes and wire in composition root"
```

---

## Task 7: Frontend order entity

**Files:**
- Create: `apps/web/src/entities/order/types.ts`
- Create: `apps/web/src/entities/order/orderApi.ts`
- Create: `apps/web/src/entities/order/store.ts`
- Create: `apps/web/src/entities/order/store.test.ts`
- Create: `apps/web/src/entities/order/index.ts`

- [ ] **Step 1: Create types.ts**

```typescript
// apps/web/src/entities/order/types.ts

export type ShippingAddress = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type OrderItemView = {
  id: string
  productId: string
  productSlug: string
  productName: string
  productImage: string | null
  quantity: number
  price: number
  subtotal: number
  message: string | null
}

export type OrderDetail = {
  id: string
  status: string
  totalAmount: number
  shippingAddress: ShippingAddress
  createdAt: string
  items: OrderItemView[]
}

export type OrderSummary = {
  id: string
  status: string
  totalAmount: number
  itemCount: number
  createdAt: string
  firstItemImage: string | null
}
```

- [ ] **Step 2: Create orderApi.ts**

```typescript
// apps/web/src/entities/order/orderApi.ts
import { z } from 'zod'
import { authFetch } from '@/shared'
import type { ShippingAddress, OrderDetail, OrderSummary } from './types'

const orderItemSchema = z.object({
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

const shippingAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
})

const orderDetailSchema = z.object({
  id: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  shippingAddress: shippingAddressSchema,
  createdAt: z.string(),
  items: z.array(orderItemSchema),
})

const orderSummarySchema = z.object({
  id: z.string(),
  status: z.string(),
  totalAmount: z.number(),
  itemCount: z.number(),
  createdAt: z.string(),
  firstItemImage: z.string().nullable(),
})

export async function placeOrder(shippingAddress: ShippingAddress): Promise<OrderDetail> {
  const res = await authFetch('/orders', {
    method: 'POST',
    json: { shippingAddress },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as any).error ?? 'Failed to place order')
  }
  return orderDetailSchema.parse(await res.json())
}

export async function fetchMyOrders(): Promise<OrderSummary[]> {
  const res = await authFetch('/orders')
  if (!res.ok) throw new Error('Failed to fetch orders')
  return z.array(orderSummarySchema).parse(await res.json())
}

export async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const res = await authFetch(`/orders/${orderId}`)
  if (!res.ok) throw new Error('Order not found')
  return orderDetailSchema.parse(await res.json())
}
```

- [ ] **Step 3: Create store.ts**

```typescript
// apps/web/src/entities/order/store.ts
import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { OrderDetail, OrderSummary, ShippingAddress } from './types'
import { placeOrder, fetchMyOrders, fetchOrder } from './orderApi'
import { useCartStore } from '@/entities/cart'

export const useOrderStore = defineStore('order', () => {
  const currentOrder = ref<OrderDetail | null>(null)
  const myOrders = ref<OrderSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function create(shippingAddress: ShippingAddress): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const order = await placeOrder(shippingAddress)
      currentOrder.value = order
      useCartStore().reset()
      return order.id
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to place order'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function loadMyOrders(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      myOrders.value = await fetchMyOrders()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load orders'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(orderId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      currentOrder.value = await fetchOrder(orderId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Order not found'
    } finally {
      loading.value = false
    }
  }

  return {
    currentOrder: readonly(currentOrder),
    myOrders: readonly(myOrders),
    loading: readonly(loading),
    error: readonly(error),
    create,
    loadMyOrders,
    loadOrder,
  }
})
```

- [ ] **Step 4: Write store tests**

```typescript
// apps/web/src/entities/order/store.test.ts
import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from './store'
import * as api from './orderApi'

vi.mock('./orderApi')

const mockAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

const mockOrder = {
  id: 'order-1', status: 'PENDING', totalAmount: 20,
  shippingAddress: mockAddress, createdAt: '2026-05-21T00:00:00.000Z', items: [],
}

describe('useOrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state is empty', () => {
    const store = useOrderStore()
    expect(store.currentOrder).toBeNull()
    expect(store.myOrders).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('create() places order and returns orderId', async () => {
    vi.mocked(api.placeOrder).mockResolvedValue(mockOrder)
    const store = useOrderStore()
    const id = await store.create(mockAddress)
    expect(id).toBe('order-1')
    expect(store.currentOrder?.id).toBe('order-1')
  })

  it('create() throws and sets error on failure', async () => {
    vi.mocked(api.placeOrder).mockRejectedValue(new Error('Cart is empty'))
    const store = useOrderStore()
    await expect(store.create(mockAddress)).rejects.toThrow('Cart is empty')
    expect(store.error).toBe('Cart is empty')
  })

  it('loadOrder() sets currentOrder', async () => {
    vi.mocked(api.fetchOrder).mockResolvedValue(mockOrder)
    const store = useOrderStore()
    await store.loadOrder('order-1')
    expect(store.currentOrder?.id).toBe('order-1')
  })

  it('loadMyOrders() sets myOrders', async () => {
    vi.mocked(api.fetchMyOrders).mockResolvedValue([
      { id: 'o1', status: 'PENDING', totalAmount: 20, itemCount: 1,
        createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null },
    ])
    const store = useOrderStore()
    await store.loadMyOrders()
    expect(store.myOrders).toHaveLength(1)
  })
})
```

- [ ] **Step 5: Run tests**

```bash
cd apps/web
node ../../node_modules/vitest/vitest.mjs run src/entities/order/store.test.ts --reporter=basic
```

Expected: 5 tests passed.

- [ ] **Step 6: Create index.ts**

```typescript
// apps/web/src/entities/order/index.ts
export { useOrderStore } from './store'
export type { OrderDetail, OrderSummary, ShippingAddress, OrderItemView } from './types'
```

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/entities/order/
git commit -m "feat: add order entity (types, api client, pinia store)"
```

---

## Task 8: CheckoutForm widget

**Files:**
- Create: `apps/web/src/widgets/checkout-form/CheckoutForm.vue`
- Create: `apps/web/src/widgets/checkout-form/index.ts`

- [ ] **Step 1: Create CheckoutForm.vue**

```vue
<!-- apps/web/src/widgets/checkout-form/CheckoutForm.vue -->
<template>
  <form class="checkout-form" novalidate @submit.prevent="handleSubmit">
    <h2 class="checkout-form__title">Shipping address</h2>

    <div class="checkout-form__field">
      <label class="checkout-form__label" for="cf-name">Full name</label>
      <input
        id="cf-name"
        v-model="form.fullName"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.fullName }"
        type="text"
        autocomplete="name"
      >
      <span v-if="errors.fullName" class="checkout-form__error">{{ errors.fullName }}</span>
    </div>

    <div class="checkout-form__field">
      <label class="checkout-form__label" for="cf-line1">Address line 1</label>
      <input
        id="cf-line1"
        v-model="form.line1"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.line1 }"
        type="text"
        autocomplete="address-line1"
      >
      <span v-if="errors.line1" class="checkout-form__error">{{ errors.line1 }}</span>
    </div>

    <div class="checkout-form__field">
      <label class="checkout-form__label" for="cf-line2">Address line 2 <span class="checkout-form__optional">(optional)</span></label>
      <input
        id="cf-line2"
        v-model="form.line2"
        class="checkout-form__input"
        type="text"
        autocomplete="address-line2"
      >
    </div>

    <div class="checkout-form__row">
      <div class="checkout-form__field">
        <label class="checkout-form__label" for="cf-city">City</label>
        <input
          id="cf-city"
          v-model="form.city"
          class="checkout-form__input"
          :class="{ 'checkout-form__input--error': errors.city }"
          type="text"
          autocomplete="address-level2"
        >
        <span v-if="errors.city" class="checkout-form__error">{{ errors.city }}</span>
      </div>

      <div class="checkout-form__field">
        <label class="checkout-form__label" for="cf-postal">Postal code</label>
        <input
          id="cf-postal"
          v-model="form.postalCode"
          class="checkout-form__input"
          :class="{ 'checkout-form__input--error': errors.postalCode }"
          type="text"
          autocomplete="postal-code"
        >
        <span v-if="errors.postalCode" class="checkout-form__error">{{ errors.postalCode }}</span>
      </div>
    </div>

    <div class="checkout-form__field">
      <label class="checkout-form__label" for="cf-country">Country</label>
      <input
        id="cf-country"
        v-model="form.country"
        class="checkout-form__input"
        :class="{ 'checkout-form__input--error': errors.country }"
        type="text"
        autocomplete="country-name"
      >
      <span v-if="errors.country" class="checkout-form__error">{{ errors.country }}</span>
    </div>

    <p v-if="submitError" class="checkout-form__error checkout-form__error--global">
      {{ submitError }}
    </p>

    <AppButton type="submit" :disabled="isSubmitting" class="checkout-form__submit">
      {{ isSubmitting ? 'Placing order…' : 'Place order' }}
    </AppButton>
  </form>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { AppButton } from '@/shared'
import { useOrderStore } from '@/entities/order'
import type { ShippingAddress } from '@/entities/order'

const emit = defineEmits<{
  success: [orderId: string]
}>()

const orderStore = useOrderStore()

const form = reactive<ShippingAddress>({
  fullName: '',
  line1: '',
  line2: '',
  city: '',
  country: '',
  postalCode: '',
})

const errors = reactive({
  fullName: '',
  line1: '',
  city: '',
  country: '',
  postalCode: '',
})

const isSubmitting = ref(false)
const submitError = ref('')

function validate(): boolean {
  errors.fullName = form.fullName.trim() ? '' : 'Required'
  errors.line1 = form.line1.trim() ? '' : 'Required'
  errors.city = form.city.trim() ? '' : 'Required'
  errors.country = form.country.trim() ? '' : 'Required'
  errors.postalCode = form.postalCode.trim() ? '' : 'Required'
  return !errors.fullName && !errors.line1 && !errors.city && !errors.country && !errors.postalCode
}

async function handleSubmit() {
  if (!validate()) return
  isSubmitting.value = true
  submitError.value = ''
  try {
    const address: ShippingAddress = { ...form }
    if (!address.line2) delete address.line2
    const orderId = await orderStore.create(address)
    emit('success', orderId)
  } catch (e) {
    submitError.value = e instanceof Error ? e.message : 'Something went wrong'
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.checkout-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__title {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.25rem;
    color: var(--color-text);
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  &__label {
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--color-text);
  }

  &__optional {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: var(--color-text-muted);
  }

  &__input {
    border: 1px solid var(--color-border);
    padding: 0.6rem 0.75rem;
    font-size: var(--fs-base);
    font-family: inherit;
    color: var(--color-text);
    background: var(--color-white);
    width: 100%;

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }

    &--error {
      border-color: var(--color-error);
    }
  }

  &__error {
    font-size: var(--fs-xs);
    color: var(--color-error);

    &--global {
      text-align: center;
    }
  }

  &__submit {
    align-self: flex-start;
    margin-top: 0.5rem;
  }
}
</style>
```

- [ ] **Step 2: Create index.ts**

```typescript
// apps/web/src/widgets/checkout-form/index.ts
export { default as CheckoutForm } from './CheckoutForm.vue'
```

- [ ] **Step 3: Run typecheck**

```bash
cd apps/web
node --max-old-space-size=4096 ../../node_modules/vue-tsc/bin/vue-tsc.js --noEmit 2>&1 | grep "error TS" | grep -v "TS6305"
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/widgets/checkout-form/
git commit -m "feat: add CheckoutForm widget"
```

---

## Task 9: CheckoutPage + router + enable Checkout button

**Files:**
- Create: `apps/web/src/pages/CheckoutPage.vue`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/widgets/cart-page/CartPageWidget.vue`

- [ ] **Step 1: Create CheckoutPage.vue**

```vue
<!-- apps/web/src/pages/CheckoutPage.vue -->
<template>
  <main class="checkout-page">
    <h1 class="checkout-page__title">Checkout</h1>

    <div class="checkout-page__layout">
      <section class="checkout-page__form-section">
        <CheckoutForm @success="onOrderPlaced" />
      </section>

      <aside class="checkout-page__summary">
        <h2 class="checkout-page__summary-title">Order summary</h2>
        <ul class="checkout-page__summary-items">
          <li
            v-for="item in items"
            :key="item.id"
            class="checkout-page__summary-item"
          >
            <span class="checkout-page__item-name">{{ item.productName }}</span>
            <span class="checkout-page__item-qty">×{{ item.quantity }}</span>
            <span class="checkout-page__item-price">{{ formatPrice(item.subtotal) }}</span>
          </li>
        </ul>
        <p class="checkout-page__total">
          <span>Total</span>
          <span>{{ formatPrice(totalAmount) }}</span>
        </p>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatPrice } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { CheckoutForm } from '@/widgets/checkout-form'

const router = useRouter()
const cartStore = useCartStore()

const items = computed(() => cartStore.items)
const totalAmount = computed(() => cartStore.totalAmount)

function onOrderPlaced(orderId: string) {
  router.push({ name: 'order-confirmation', params: { id: orderId } })
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.checkout-page {
  padding: 1.5rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;

  @include tablet {
    padding: 2rem;
  }

  &__title {
    font-size: 1.5rem;
    font-weight: 500;
    margin-bottom: 1.5rem;
    color: var(--color-text);

    @include tablet {
      font-size: 2rem;
    }
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__form-section {
    flex: 1;
  }

  &__summary {
    background: rgb(var(--btn-gradient-light) / 0.4);
    padding: 1rem;
    border-radius: 6px;

    @include tablet {
      width: 320px;
      flex-shrink: 0;
    }
  }

  &__summary-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
  }

  &__summary-items {
    list-style: none;
    padding: 0;
    margin: 0 0 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__summary-item {
    display: flex;
    gap: 0.5rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__item-name {
    flex: 1;
  }

  &__item-qty {
    color: var(--color-text-muted);
  }

  &__item-price {
    font-weight: 500;
    color: var(--color-text);
  }

  &__total {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    border-top: 1px solid var(--color-border);
    padding-top: 0.75rem;
    margin: 0;
  }
}
</style>
```

- [ ] **Step 2: Add /checkout route to router/index.ts**

Find the `/cart` route block in `apps/web/src/router/index.ts` and add the checkout route after it:

```typescript
  {
    path: '/checkout',
    name: 'checkout',
    component: () => import('@/pages/CheckoutPage.vue'),
    meta: { requiresAuth: true },
  },
```

- [ ] **Step 3: Enable Checkout button in CartPageWidget.vue**

In `apps/web/src/widgets/cart-page/CartPageWidget.vue`, add `useRouter` import and replace the disabled button with a working one.

Replace the `<script setup>` import block — add `useRouter`:

```typescript
import { onMounted, computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { AppButton, formatPrice } from '@/shared'
import { useCartStore } from '@/entities/cart'
import { useAuthStore } from '@/entities/user'
import CartLineItem from './components/CartLineItem.vue'

const cartStore = useCartStore()
const authStore = useAuthStore()
const router = useRouter()
```

Replace the Checkout button in the template:

```html
<AppButton
  type="button"
  class="cart-page__checkout"
  :disabled="itemCount === 0"
  @click="router.push({ name: 'checkout' })"
>
  Checkout
</AppButton>
```

- [ ] **Step 4: Run typecheck**

```bash
cd apps/web
node --max-old-space-size=4096 ../../node_modules/vue-tsc/bin/vue-tsc.js --noEmit 2>&1 | grep "error TS" | grep -v "TS6305"
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/CheckoutPage.vue apps/web/src/router/index.ts apps/web/src/widgets/cart-page/CartPageWidget.vue
git commit -m "feat: add CheckoutPage and enable Checkout button in cart"
```

---

## Task 10: OrderConfirmationPage

**Files:**
- Create: `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue`
- Create: `apps/web/src/widgets/order-confirmation/index.ts`
- Create: `apps/web/src/pages/OrderConfirmationPage.vue`
- Modify: `apps/web/src/router/index.ts`

- [ ] **Step 1: Create OrderConfirmation.vue**

```vue
<!-- apps/web/src/widgets/order-confirmation/OrderConfirmation.vue -->
<template>
  <div class="order-confirmation">
    <div v-if="loading" class="order-confirmation__loading">Loading…</div>

    <div v-else-if="error" class="order-confirmation__error">{{ error }}</div>

    <template v-else-if="order">
      <div class="order-confirmation__header">
        <h1 class="order-confirmation__title">Order placed!</h1>
        <p class="order-confirmation__subtitle">
          Thank you for your order. We'll start working on it right away.
        </p>
        <p class="order-confirmation__id">Order #{{ order.id }}</p>
      </div>

      <div class="order-confirmation__layout">
        <section class="order-confirmation__items">
          <h2 class="order-confirmation__section-title">Items</h2>
          <ul class="order-confirmation__list">
            <li
              v-for="item in order.items"
              :key="item.id"
              class="order-confirmation__item"
            >
              <img
                v-if="item.productImage"
                :src="item.productImage"
                :alt="item.productName"
                class="order-confirmation__item-image"
              >
              <div class="order-confirmation__item-info">
                <RouterLink
                  :to="`/product/${item.productSlug}`"
                  class="order-confirmation__item-name"
                >
                  {{ item.productName }}
                </RouterLink>
                <p v-if="item.message" class="order-confirmation__item-message">
                  "{{ item.message }}"
                </p>
                <p class="order-confirmation__item-meta">
                  {{ item.quantity }} × {{ formatPrice(item.price) }}
                </p>
              </div>
              <span class="order-confirmation__item-subtotal">{{ formatPrice(item.subtotal) }}</span>
            </li>
          </ul>
        </section>

        <aside class="order-confirmation__summary">
          <h2 class="order-confirmation__section-title">Summary</h2>
          <p class="order-confirmation__summary-row">
            <span>Status</span>
            <span class="order-confirmation__status">{{ order.status }}</span>
          </p>
          <p class="order-confirmation__summary-row order-confirmation__summary-row--total">
            <span>Total</span>
            <span>{{ formatPrice(order.totalAmount) }}</span>
          </p>

          <h2 class="order-confirmation__section-title order-confirmation__section-title--mt">Shipping to</h2>
          <address class="order-confirmation__address">
            <span>{{ order.shippingAddress.fullName }}</span>
            <span>{{ order.shippingAddress.line1 }}</span>
            <span v-if="order.shippingAddress.line2">{{ order.shippingAddress.line2 }}</span>
            <span>{{ order.shippingAddress.city }}, {{ order.shippingAddress.postalCode }}</span>
            <span>{{ order.shippingAddress.country }}</span>
          </address>
        </aside>
      </div>

      <RouterLink to="/shop" class="order-confirmation__continue">
        Continue shopping
      </RouterLink>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'

const props = defineProps<{ orderId: string }>()

const orderStore = useOrderStore()
const order = computed(() => orderStore.currentOrder)
const loading = computed(() => orderStore.loading)
const error = computed(() => orderStore.error)

onMounted(() => {
  if (!order.value || order.value.id !== props.orderId) {
    orderStore.loadOrder(props.orderId)
  }
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.order-confirmation {
  padding: 1.5rem 1rem 3rem;
  max-width: 1100px;
  margin: 0 auto;

  @include tablet {
    padding: 2rem;
  }

  &__loading,
  &__error {
    text-align: center;
    padding: 3rem;
    color: var(--color-text-muted);
  }

  &__header {
    text-align: center;
    margin-bottom: 2rem;
  }

  &__title {
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__subtitle {
    color: var(--color-text-muted);
    margin-bottom: 0.25rem;
  }

  &__id {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__layout {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;

    @include tablet {
      flex-direction: row;
      align-items: flex-start;
    }
  }

  &__items {
    flex: 1;
  }

  &__section-title {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;

    &--mt {
      margin-top: 1.25rem;
    }
  }

  &__list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  &__item {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
  }

  &__item-image {
    width: 60px;
    height: 60px;
    object-fit: cover;
    border-radius: 4px;
    flex-shrink: 0;
  }

  &__item-info {
    flex: 1;
    min-width: 0;
  }

  &__item-name {
    font-weight: 500;
    color: var(--color-text);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__item-message {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    font-style: italic;
    margin: 0.2rem 0 0;
  }

  &__item-meta {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin: 0.2rem 0 0;
  }

  &__item-subtotal {
    font-weight: 600;
    flex-shrink: 0;
  }

  &__summary {
    background: rgb(var(--btn-gradient-light) / 0.4);
    padding: 1rem;
    border-radius: 6px;

    @include tablet {
      width: 280px;
      flex-shrink: 0;
    }
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    padding: 0.4rem 0;
    color: var(--color-text-muted);
    margin: 0;

    &--total {
      font-weight: 700;
      color: var(--color-text);
      border-top: 1px solid var(--color-border);
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }
  }

  &__status {
    font-weight: 500;
    color: var(--color-text);
    text-transform: lowercase;
  }

  &__address {
    font-style: normal;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    line-height: 1.5;
  }

  &__continue {
    display: inline-block;
    margin-top: 2rem;
    color: var(--color-accent);
    text-decoration: underline;
    font-size: var(--fs-sm);
  }
}
</style>
```

- [ ] **Step 2: Create index.ts**

```typescript
// apps/web/src/widgets/order-confirmation/index.ts
export { default as OrderConfirmation } from './OrderConfirmation.vue'
```

- [ ] **Step 3: Create OrderConfirmationPage.vue**

```vue
<!-- apps/web/src/pages/OrderConfirmationPage.vue -->
<template>
  <OrderConfirmation :order-id="orderId" />
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router'
import { OrderConfirmation } from '@/widgets/order-confirmation'

const route = useRoute()
const orderId = route.params.id as string
</script>
```

- [ ] **Step 4: Add /orders/:id route to router/index.ts**

Find the `/checkout` route and add after it:

```typescript
  {
    path: '/orders/:id',
    name: 'order-confirmation',
    component: () => import('@/pages/OrderConfirmationPage.vue'),
    meta: { requiresAuth: true },
  },
```

- [ ] **Step 5: Run typecheck**

```bash
cd apps/web
node --max-old-space-size=4096 ../../node_modules/vue-tsc/bin/vue-tsc.js --noEmit 2>&1 | grep "error TS" | grep -v "TS6305"
```

Expected: no errors.

- [ ] **Step 6: Run all web tests**

```bash
cd apps/web
node ../../node_modules/vitest/vitest.mjs run --reporter=basic
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/widgets/order-confirmation/ apps/web/src/pages/OrderConfirmationPage.vue apps/web/src/router/index.ts
git commit -m "feat: add OrderConfirmationPage and complete order flow"
```
