# Shipping Cost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить стоимость доставки к заказу ($12 за первый товар + $1 за каждый последующий), хранить в поле `shippingCost` на модели `Order`, показывать разбивку Subtotal / Shipping / Total на чекауте, в подтверждении заказа и в деталях заказа.

**Architecture:** Формула `calcShipping(totalItemCount) = 12 + (totalItemCount - 1) * 1` живёт в shared-утилите на обеих сторонах. Бэкенд считает и сохраняет `shippingCost` при создании заказа; `totalAmount` = subtotal + shippingCost. Фронт вычисляет предварительную стоимость доставки из корзины без доп. запросов.

**Tech Stack:** Prisma, Hono, TypeScript, Vue 3, Pinia, Vitest.

---

## Карта файлов

- Create: `apps/api/src/shared/lib/shipping.ts`
- Create: `apps/api/prisma/migrations/20260531120000_add_shipping_cost/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`
- Modify: `apps/api/src/features/orders/types.ts`
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.test.ts`
- Create: `apps/web/src/shared/lib/shipping.ts`
- Modify: `apps/web/src/shared/index.ts`
- Modify: `apps/web/src/entities/order/types.ts`
- Modify: `apps/web/src/entities/order/orderApi.ts`
- Modify: `apps/web/src/widgets/checkout-form/CheckoutForm.vue`
- Modify: `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue`
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`

---

## Task 1: Shipping utility + Prisma migration

**Files:**
- Create: `apps/api/src/shared/lib/shipping.ts`
- Create: `apps/api/prisma/migrations/20260531120000_add_shipping_cost/migration.sql`
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Шаг 1.1: Написать failing-тест для calcShipping**

Создать `apps/api/src/shared/lib/shipping.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { calcShipping } from './shipping'

describe('calcShipping', () => {
  it('returns 12 for 1 item', () => {
    expect(calcShipping(1)).toBe(12)
  })

  it('returns 13 for 2 items', () => {
    expect(calcShipping(2)).toBe(13)
  })

  it('returns 21 for 10 items', () => {
    expect(calcShipping(10)).toBe(21)
  })
})
```

- [ ] **Шаг 1.2: Запустить тест — убедиться что падает**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/shared/lib/shipping.test.ts --reporter=basic
```

Ожидаемо: FAIL — `Cannot find module './shipping'`

- [ ] **Шаг 1.3: Создать shipping.ts (бэк)**

Создать `apps/api/src/shared/lib/shipping.ts`:

```ts
export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(totalItemCount: number): number {
  return SHIPPING_BASE + (totalItemCount - 1) * SHIPPING_PER_EXTRA_ITEM
}
```

- [ ] **Шаг 1.4: Запустить тест — убедиться что проходит**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/shared/lib/shipping.test.ts --reporter=basic
```

Ожидаемо: PASS (3 теста)

- [ ] **Шаг 1.5: Добавить shippingCost в schema.prisma**

В `apps/api/prisma/schema.prisma` в модели `Order` добавить после строки `orderNumber Int @unique @default(autoincrement())`:

```prisma
  shippingCost    Decimal     @db.Decimal(10, 2) @default(0)
```

- [ ] **Шаг 1.6: Создать файл миграции**

Создать директорию `apps/api/prisma/migrations/20260531120000_add_shipping_cost/` и файл `migration.sql`:

```sql
-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingCost" DECIMAL(10,2) NOT NULL DEFAULT 0;
```

- [ ] **Шаг 1.7: Применить миграцию**

```bash
cd apps/api && DATABASE_URL="postgresql://user:password@localhost:5432/natsdoll" npx prisma migrate deploy
```

Ожидаемо: `All migrations have been successfully applied.`

- [ ] **Шаг 1.8: Регенерировать Prisma client**

```bash
cd apps/api && DATABASE_URL="postgresql://user:password@localhost:5432/natsdoll" npx prisma generate
```

- [ ] **Шаг 1.9: Коммит**

```bash
git add apps/api/src/shared/lib/shipping.ts apps/api/src/shared/lib/shipping.test.ts apps/api/prisma/
git commit -m "feat(api): add calcShipping utility and shippingCost DB column"
```

---

## Task 2: Backend — update types, repository, createOrder

**Files:**
- Modify: `apps/api/src/features/orders/types.ts`
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.test.ts`

- [ ] **Шаг 2.1: Обновить types.ts — добавить shippingCost**

В `apps/api/src/features/orders/types.ts`:

Добавить `shippingCost: number` в `OrderDetail` (после `totalAmount`):

```ts
export type OrderDetail = {
  id: string
  orderNumber: number
  userId: string
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  createdAt: string
  items: OrderItemView[]
}
```

Добавить `shippingCost: number` в сигнатуру `createOrderFromCart` в `OrderRepository`:

```ts
export interface OrderRepository {
  getCartItemsForCheckout(userId: string): Promise<CartItemForCheckout[]>
  createOrderFromCart(
    userId: string,
    items: CartItemForCheckout[],
    totalAmount: number,
    shippingCost: number,
    shippingAddress: ShippingAddress,
  ): Promise<OrderDetail>
  getMyOrders(userId: string): Promise<OrderSummary[]>
  getOrderById(orderId: string): Promise<OrderDetail | null>
}
```

- [ ] **Шаг 2.2: Обновить createOrder.ts**

Заменить полностью `apps/api/src/features/orders/application/createOrder.ts`:

```ts
import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib/shipping'
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

    const subtotal = items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0)
    const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)
    const shippingCost = calcShipping(totalItemCount)
    const totalAmount = subtotal + shippingCost

    return repo.createOrderFromCart(userId, items, totalAmount, shippingCost, shippingAddress)
  }
}
```

- [ ] **Шаг 2.3: Обновить createOrder.test.ts**

Заменить полностью `apps/api/src/features/orders/application/createOrder.test.ts`:

```ts
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

  it('calls createOrderFromCart with totalAmount = subtotal + shipping', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 15, productStock: 10, productIsAvailable: true, quantity: 2, message: null },
      { id: 'ci-2', productId: 'p2', productName: 'B', productImage: null,
        productPrice: 20, productStock: 5, productIsAvailable: true, quantity: 1, message: 'Hi' },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 64, shippingCost: 14,
      shippingAddress: address, createdAt: new Date().toISOString(), items: [],
    })
    const createOrder = makeCreateOrder(repo)
    await createOrder('u1', address)
    // subtotal = 15*2 + 20*1 = 50, totalItemCount = 3, shipping = 12 + 2 = 14, total = 64
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 64, 14, address)
  })

  it('calculates shipping correctly for 1 item', async () => {
    const items = [
      { id: 'ci-1', productId: 'p1', productName: 'A', productImage: null,
        productPrice: 10, productStock: 5, productIsAvailable: true, quantity: 1, message: null },
    ]
    vi.mocked(repo.getCartItemsForCheckout).mockResolvedValue(items)
    vi.mocked(repo.createOrderFromCart).mockResolvedValue({
      id: 'order-1', orderNumber: 1, userId: 'u1', status: 'PENDING',
      totalAmount: 22, shippingCost: 12,
      shippingAddress: address, createdAt: '2026-05-31T00:00:00.000Z', items: [],
    })
    const createOrder = makeCreateOrder(repo)
    await createOrder('u1', address)
    // subtotal = 10, shipping = 12, total = 22
    expect(repo.createOrderFromCart).toHaveBeenCalledWith('u1', items, 22, 12, address)
  })
})
```

- [ ] **Шаг 2.4: Запустить тесты createOrder**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/orders/application/createOrder.test.ts --reporter=basic
```

Ожидаемо: FAIL — `createOrderFromCart` вызывается без `shippingCost`

- [ ] **Шаг 2.5: Обновить orderRepository.ts — добавить shippingCost**

В `apps/api/src/features/orders/infrastructure/orderRepository.ts`:

**1.** Изменить сигнатуру `createOrderFromCart`:

```ts
async createOrderFromCart(
  userId: string,
  items: CartItemForCheckout[],
  totalAmount: number,
  shippingCost: number,
  shippingAddress: ShippingAddress,
): Promise<OrderDetail> {
```

**2.** В `tx.order.create` добавить `shippingCost` в `data`:

```ts
const created = await tx.order.create({
  data: {
    userId,
    totalAmount,
    shippingCost,
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
```

**3.** Добавить `shippingCost: true` в select `createOrderFromCart` (после `orderNumber: true`):

```ts
select: {
  id: true,
  orderNumber: true,
  shippingCost: true,
  userId: true,
  ...
```

**4.** Добавить `shippingCost: true` в select `getOrderById` (после `orderNumber: true`):

```ts
select: {
  id: true,
  orderNumber: true,
  shippingCost: true,
  userId: true,
  ...
```

**5.** Обновить `OrderRow` type — добавить `shippingCost`:

```ts
type OrderRow = {
  id: string
  orderNumber: number
  shippingCost: { toNumber(): number }
  userId: string
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
```

**6.** Обновить `toOrderDetail` — добавить `shippingCost`:

```ts
return {
  id: order.id,
  orderNumber: order.orderNumber,
  userId: order.userId,
  status: order.status,
  totalAmount: order.totalAmount.toNumber(),
  shippingCost: order.shippingCost.toNumber(),
  shippingAddress: order.shippingAddress as ShippingAddress,
  createdAt: order.createdAt.toISOString(),
  items,
}
```

- [ ] **Шаг 2.6: Запустить тесты — убедиться что проходят**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic
```

Ожидаемо: все тесты PASS

- [ ] **Шаг 2.7: Проверить типы**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаемо: 0 ошибок (кроме pre-existing TS6305)

- [ ] **Шаг 2.8: Коммит**

```bash
git add apps/api/src/features/orders/
git commit -m "feat(api): include shippingCost in order creation and response"
```

---

## Task 3: Frontend — типы, API, CheckoutForm

**Files:**
- Create: `apps/web/src/shared/lib/shipping.ts`
- Modify: `apps/web/src/shared/index.ts`
- Modify: `apps/web/src/entities/order/types.ts`
- Modify: `apps/web/src/entities/order/orderApi.ts`
- Modify: `apps/web/src/widgets/checkout-form/CheckoutForm.vue`

- [ ] **Шаг 3.1: Создать shipping.ts (фронт)**

Создать `apps/web/src/shared/lib/shipping.ts`:

```ts
export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(totalItemCount: number): number {
  return SHIPPING_BASE + (totalItemCount - 1) * SHIPPING_PER_EXTRA_ITEM
}
```

- [ ] **Шаг 3.2: Экспортировать из shared/index.ts**

В `apps/web/src/shared/index.ts` добавить:

```ts
export { calcShipping } from './lib/shipping'
```

- [ ] **Шаг 3.3: Обновить frontend types.ts**

В `apps/web/src/entities/order/types.ts` добавить `shippingCost: number` в `OrderDetail`:

```ts
export type OrderDetail = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  createdAt: string
  items: OrderItemView[]
}
```

- [ ] **Шаг 3.4: Обновить orderApi.ts — добавить shippingCost в schema**

В `apps/web/src/entities/order/orderApi.ts` добавить `shippingCost: z.number()` в `orderDetailSchema` (после `totalAmount`):

```ts
const orderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  shippingCost: z.number(),
  shippingAddress: shippingAddressSchema,
  createdAt: z.string(),
  items: z.array(orderItemSchema),
})
```

- [ ] **Шаг 3.5: Обновить CheckoutForm.vue**

В `apps/web/src/widgets/checkout-form/CheckoutForm.vue`:

**1.** Добавить импорты в `<script setup>`:

```ts
import { reactive, ref, onMounted, computed } from 'vue'
import { AppButton, calcShipping, formatPrice } from '@/shared'
import { useOrderStore } from '@/entities/order'
import type { ShippingAddress } from '@/entities/order'
import { useCartStore } from '@/entities/cart'
import { useAddressStore } from '@/entities/address'
```

**2.** После `const addressStore = useAddressStore()` добавить:

```ts
const cartStore = useCartStore()

const totalItemCount = computed(() =>
  cartStore.items.reduce((sum, item) => sum + item.quantity, 0),
)
const shippingCost = computed(() => calcShipping(totalItemCount.value))
const subtotal = computed(() => cartStore.totalAmount)
const grandTotal = computed(() => subtotal.value + shippingCost.value)
```

**3.** В шаблоне — добавить блок разбивки перед закрывающим `</form>`, после `<AppButton>`:

```html
    <div class="checkout-form__summary">
      <div class="checkout-form__summary-row">
        <span>Subtotal</span>
        <span>{{ formatPrice(subtotal) }}</span>
      </div>
      <div class="checkout-form__summary-row">
        <span>Shipping</span>
        <span>{{ formatPrice(shippingCost) }}</span>
      </div>
      <div class="checkout-form__summary-row checkout-form__summary-row--total">
        <span>Total</span>
        <span>{{ formatPrice(grandTotal) }}</span>
      </div>
    </div>
```

**4.** Добавить стили в `<style scoped lang="scss">` (в конец, перед закрывающим `}`):

```scss
  &__summary {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding-top: 1rem;
    border-top: 1px solid var(--color-border);
  }

  &__summary-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.9rem;
    color: var(--color-text-muted);

    &--total {
      font-size: 1rem;
      font-weight: 600;
      color: var(--color-text);
      margin-top: 0.25rem;
    }
  }
```

- [ ] **Шаг 3.6: Проверить типы фронта**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 3.7: Коммит**

```bash
git add apps/web/src/shared/lib/shipping.ts apps/web/src/shared/index.ts apps/web/src/entities/order/ apps/web/src/widgets/checkout-form/CheckoutForm.vue
git commit -m "feat(web): add shipping cost breakdown to checkout form"
```

---

## Task 4: Frontend — Order Confirmation + Purchase Detail

**Files:**
- Modify: `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue`
- Modify: `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue`

- [ ] **Шаг 4.1: Обновить OrderConfirmation.vue — Summary разбивка**

В `apps/web/src/widgets/order-confirmation/OrderConfirmation.vue` заменить блок Summary (строки с `Total`):

Было:
```html
          <p class="order-confirmation__summary-row order-confirmation__summary-row--total">
            <span>Total</span>
            <span>{{ formatPrice(order.totalAmount) }}</span>
          </p>
```

Стало:
```html
          <p class="order-confirmation__summary-row">
            <span>Subtotal</span>
            <span>{{ formatPrice(order.totalAmount - order.shippingCost) }}</span>
          </p>
          <p class="order-confirmation__summary-row">
            <span>Shipping</span>
            <span>{{ formatPrice(order.shippingCost) }}</span>
          </p>
          <p class="order-confirmation__summary-row order-confirmation__summary-row--total">
            <span>Total</span>
            <span>{{ formatPrice(order.totalAmount) }}</span>
          </p>
```

- [ ] **Шаг 4.2: Обновить AccountPurchaseDetail.vue — Total разбивка**

В `apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue` найти и заменить блок `purchase-detail__total`:

Было:
```html
        <div class="purchase-detail__total">
          <span class="purchase-detail__total-label">Total</span>
          <span class="purchase-detail__total-value">{{ formatPrice(order.totalAmount) }}</span>
        </div>
```

Стало:
```html
        <div class="purchase-detail__totals">
          <div class="purchase-detail__totals-row">
            <span class="purchase-detail__totals-label">Subtotal</span>
            <span class="purchase-detail__totals-value">{{ formatPrice(order.totalAmount - order.shippingCost) }}</span>
          </div>
          <div class="purchase-detail__totals-row">
            <span class="purchase-detail__totals-label">Shipping</span>
            <span class="purchase-detail__totals-value">{{ formatPrice(order.shippingCost) }}</span>
          </div>
          <div class="purchase-detail__totals-row purchase-detail__totals-row--grand">
            <span class="purchase-detail__totals-label">Total</span>
            <span class="purchase-detail__totals-value purchase-detail__totals-value--grand">{{ formatPrice(order.totalAmount) }}</span>
          </div>
        </div>
```

Добавить стили в `<style scoped lang="scss">` вместо старых `&__total`, `&__total-label`, `&__total-value`:

```scss
  &__totals {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    flex-shrink: 0;
  }

  &__totals-row {
    display: flex;
    justify-content: space-between;
    gap: 2rem;
    font-size: 0.9rem;

    &--grand {
      margin-top: 0.25rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--color-border);
    }
  }

  &__totals-label {
    color: var(--color-text-muted);

    .purchase-detail__totals-row--grand & {
      font-weight: 600;
      color: var(--color-text);
    }
  }

  &__totals-value {
    color: var(--color-text);

    &--grand {
      font-size: 1.25rem;
      font-weight: 600;
    }
  }
```

- [ ] **Шаг 4.3: Проверить типы**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаемо: 0 ошибок

- [ ] **Шаг 4.4: Финальный прогон всех тестов**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic
```

Ожидаемо: все тесты PASS

- [ ] **Шаг 4.5: Коммит**

```bash
git add apps/web/src/widgets/order-confirmation/OrderConfirmation.vue apps/web/src/widgets/account-page/components/AccountPurchaseDetail.vue
git commit -m "feat(web): show shipping cost breakdown in order confirmation and detail"
```
