# Guest Checkout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Позволить покупателю оформить и оплатить заказ без регистрации — ввод email + адреса создаёт гостевой аккаунт и сессию, после чего работает существующий путь оплаты.

**Architecture:** Подход A из спека. Новый эндпоинт `POST /orders/guest` (без `requireAuth`): пересчитывает корзину на сервере, find-or-create `User` по email с развилкой «умеет ли аккаунт входить», создаёт заказ, выдаёт обычную сессию (`issueTokensForUser`). Платёжный путь не меняется. Две точечные правки в auth (`googleAuth`, `requestPasswordReset`) обеспечивают «присвоение» гостевого аккаунта. Гостевая корзина на фронте — localStorage.

**Tech Stack:** Hono, Prisma, Zod, Vitest (api + web), Vue 3 / Pinia, TypeScript.

## Global Constraints

- TDD: тест → провал → минимальная реализация → проход → коммит. Каждый шаг — один глагол.
- Запрет `any`; на границах — `unknown` + Zod. Запрет комментариев, если не просили. Существующие комментарии не удалять.
- Тесты api: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic <path>`
- Тесты web: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic <path>`
- Typecheck api: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
- Сумма заказа считается ТОЛЬКО на сервере; цены из клиента игнорируются (security-инвариант).
- Сессия = refresh-token в cookie (`setCookie(c, COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS)`) + accessToken в теле ответа — как в существующих auth-роутах.
- Ветка: `feat/guest-checkout` (spec уже закоммичен туда). Не пушить в main без явной команды.

---

## File Structure

**Backend (api):**
- Modify `apps/api/src/features/auth/infrastructure/authRepository.ts` — `+ createGuestUser`.
- Modify `apps/api/src/features/auth/application/googleAuth.ts` — link (не replace) для passwordless гостя.
- Modify `apps/api/src/features/auth/application/requestPasswordReset.ts` — passwordless без googleId → reset-ссылка.
- Create `apps/api/src/features/orders/application/guestCheckout.ts` — use-case.
- Modify `apps/api/src/features/orders/types.ts` — типы guest checkout + новый repo-метод.
- Modify `apps/api/src/features/orders/infrastructure/orderRepository.ts` — `+ createOrderFromItems`.
- Modify `apps/api/src/features/orders/presentation/orderRoutes.ts` — `POST /orders/guest` (+ rate-limit).
- Modify `apps/api/src/features/orders/index.ts` — экспорт `makeGuestCheckout`.
- Modify `apps/api/src/app.ts` — wiring guestCheckout + проброс в orderRouter.

**Frontend (web):**
- Modify `apps/web/src/entities/cart/store.ts` — гостевой режим (localStorage), `replaceForGuest`.
- Create `apps/web/src/widgets/cart-page/guestCheckoutApi.ts` — вызов `/orders/guest`.
- Modify `apps/web/src/widgets/cart-page/CartPageWidget.vue` — поле Email для гостя + развилка в подготовке заказа.
- Modify `apps/web/src/widgets/cart-page/usePendingOrder.ts` — гостевая ветка создания заказа.

---

## Task 1: authRepository.createGuestUser

**Files:**
- Modify: `apps/api/src/features/auth/infrastructure/authRepository.ts`
- Test: `apps/api/src/features/auth/infrastructure/authRepository.test.ts` (создать, если нет — см. шаг)

**Interfaces:**
- Produces: `createGuestUser(data: { name: string; email: string }): Promise<User>` — создаёт `User` с `passwordHash: null`, `googleId: null`, `emailVerified: false`.

- [ ] **Step 1: Добавить сигнатуру в тип `AuthRepository`**

В `authRepository.ts` в `export type AuthRepository = {` рядом с `createUser`:
```typescript
  /** Создаёт гостевого пользователя без пароля и без Google (passwordless). */
  createGuestUser(data: { name: string; email: string }): Promise<User>
```

- [ ] **Step 2: Реализовать метод**

В объекте `makeAuthRepository` рядом с `createUser`:
```typescript
    createGuestUser: (data) => prisma.user.create({ data }),
```
(`passwordHash`/`googleId` не передаются → `null` по умолчанию; `emailVerified` → `false` по умолчанию из схемы.)

- [ ] **Step 3: Typecheck**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/auth/infrastructure/authRepository.ts
git commit -m "feat(auth): add createGuestUser repository method"
```

---

## Task 2: googleAuth — link guest account instead of delete

**Problem:** `replaceUnverifiedWithGoogleUser` делает `tx.user.delete` + `create`. У гостя с заказами `Order.userId @relation(onDelete: Restrict)` заблокирует удаление → Google-вход упадёт. Гостевой аккаунт (passwordless) безопасно **связать**, а не вытеснять: войти в него до этого было нельзя (нет пароля).

**Files:**
- Modify: `apps/api/src/features/auth/application/googleAuth.ts:21-29`
- Test: `apps/api/src/features/auth/application/googleAuth.test.ts`

**Interfaces:**
- Consumes: `repo.linkGoogleId`, `repo.replaceUnverifiedWithGoogleUser` (существуют).
- Produces: поведение — passwordless unverified user → `linkGoogleId`; unverified **с паролем** → `replaceUnverifiedWithGoogleUser` (как раньше).

- [ ] **Step 1: Написать падающий тест**

В `googleAuth.test.ts` добавить (мок-repo по образцу существующих тестов файла):
```typescript
it('links Google to a passwordless guest account instead of replacing it', async () => {
  const guest = { id: 'g1', email: 'a@b.com', name: 'A', emailVerified: false, passwordHash: null, googleId: null, role: 'CUSTOMER' }
  const repo = {
    findByGoogleId: vi.fn().mockResolvedValue(null),
    findByEmail: vi.fn().mockResolvedValue(guest),
    linkGoogleId: vi.fn().mockResolvedValue({ ...guest, googleId: 'gid', emailVerified: true }),
    replaceUnverifiedWithGoogleUser: vi.fn(),
    saveRefreshToken: vi.fn().mockResolvedValue(undefined),
    pruneUserSessions: vi.fn().mockResolvedValue(undefined),
  }
  const getProfile = vi.fn().mockResolvedValue({ googleId: 'gid', email: 'a@b.com', name: 'A', emailVerified: true })
  const uc = makeGoogleAuth(repo as never, getProfile as never)
  await uc('code')
  expect(repo.linkGoogleId).toHaveBeenCalledWith('g1', 'gid')
  expect(repo.replaceUnverifiedWithGoogleUser).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/auth/application/googleAuth.test.ts`
Expected: FAIL — текущий код зовёт `replaceUnverifiedWithGoogleUser` (т.к. `!emailVerified`).

- [ ] **Step 3: Поправить условие**

В `googleAuth.ts` заменить блок `if (existing)`:
```typescript
      if (existing) {
        // Вытесняем только unverified аккаунт С ПАРОЛЕМ (атакующий мог заранее задать пароль
        // на чужой email). Passwordless-аккаунт (гость) безопасно связать — войти в него было
        // нельзя, а delete сломал бы FK Restrict у его заказов.
        if (!existing.emailVerified && existing.passwordHash) {
          user = await repo.replaceUnverifiedWithGoogleUser(existing.id, {
            name: profile.name,
            email: profile.email,
            googleId: profile.googleId,
          })
        } else {
          user = await repo.linkGoogleId(existing.id, profile.googleId)
        }
      } else {
```

- [ ] **Step 4: Запустить тесты файла — все зелёные**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/auth/application/googleAuth.test.ts`
Expected: PASS (новый + существующие; existing-verified по-прежнему linkGoogleId, existing-unverified-with-password по-прежнему replace).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/auth/application/googleAuth.ts apps/api/src/features/auth/application/googleAuth.test.ts
git commit -m "fix(auth): link Google to passwordless guest instead of deleting (preserves orders)"
```

---

## Task 3: requestPasswordReset — allow setting first password for guests

**Problem:** Сейчас `if (!user.passwordHash)` → шлёт «account exists» и НЕ создаёт reset-токен. Гость (passwordless, без googleId) должен иметь возможность задать пароль. Google-юзер (passwordless, но с googleId) — оставляем как есть (у него есть вход).

**Files:**
- Modify: `apps/api/src/features/auth/application/requestPasswordReset.ts:25-33`
- Test: `apps/api/src/features/auth/application/requestPasswordReset.test.ts`

**Interfaces:**
- Produces: passwordless без `googleId` → создаётся PasswordReset + reset-email; passwordless с `googleId` → account-exists email (как раньше).

- [ ] **Step 1: Написать падающий тест**

В `requestPasswordReset.test.ts` (по образцу существующих, мок-repo + emailService):
```typescript
it('sends a reset link to a passwordless guest (no googleId) so they can set a first password', async () => {
  const guest = { id: 'g1', email: 'a@b.com', passwordHash: null, googleId: null }
  const repo = { findByEmail: vi.fn().mockResolvedValue(guest), createPasswordReset: vi.fn().mockResolvedValue(undefined) }
  const email = { sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined), sendAccountExistsEmail: vi.fn() }
  const uc = makeRequestPasswordReset(repo as never, email as never)
  await uc('a@b.com')
  expect(repo.createPasswordReset).toHaveBeenCalled()
  expect(email.sendPasswordResetEmail).toHaveBeenCalled()
  expect(email.sendAccountExistsEmail).not.toHaveBeenCalled()
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/auth/application/requestPasswordReset.test.ts`
Expected: FAIL — текущий код для passwordless шлёт account-exists и не зовёт `createPasswordReset`.

- [ ] **Step 3: Поправить ветку passwordless**

В `requestPasswordReset.ts` заменить блок `if (!user.passwordHash)`:
```typescript
    if (!user.passwordHash) {
      // Google-аккаунт (passwordless, но с googleId) — у него есть вход, пароль не задаём.
      if (user.googleId) {
        await hash(`${DUMMY_HASH}${Date.now()}`).catch(() => undefined)
        try {
          await emailService.sendAccountExistsEmail(user.email, FRONTEND_URL)
        } catch (err) {
          console.error('[requestPasswordReset] failed to send account-exists email:', err)
        }
        return { message: GENERIC_MESSAGE }
      }
      // Иначе это гость без пароля и без Google — разрешаем задать первый пароль (продолжаем ниже).
    }
```
(Дальнейший код — создание reset-токена и отправка reset-email — выполнится и для гостя.)

- [ ] **Step 4: Запустить тесты файла — все зелёные**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/auth/application/requestPasswordReset.test.ts`
Expected: PASS (новый + существующие; passwordless-с-googleId по-прежнему account-exists).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/auth/application/requestPasswordReset.ts apps/api/src/features/auth/application/requestPasswordReset.test.ts
git commit -m "feat(auth): let passwordless guests set a first password via reset flow"
```

---

## Task 4: orderRepository.createOrderFromItems

Создаёт заказ из переданных позиций (не из серверной корзины). Цены/скидка пересчитываются внутри (как `createOrderFromCart`), но корзинные `cartItem` не удаляются (у гостя их нет).

**Files:**
- Modify: `apps/api/src/features/orders/types.ts`
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- Test: `apps/api/src/features/orders/infrastructure/orderRepository.test.ts` (создать, если отсутствует)

**Interfaces:**
- Produces: `createOrderFromItems(userId: string, items: GuestOrderItem[], shippingCost: number, shippingAddress: ShippingAddress, sale: ActiveSale | null): Promise<OrderDetail>` где
  `GuestOrderItem = { productId: string; quantity: number; message: string | null; categoryId: string; productName: string }`.

- [ ] **Step 1: Добавить тип и сигнатуру в `types.ts`**

В `apps/api/src/features/orders/types.ts` добавить:
```typescript
export type GuestOrderItem = {
  productId: string
  quantity: number
  message: string | null
  categoryId: string
  productName: string
}
```
И в `interface OrderRepository` добавить:
```typescript
  createOrderFromItems(
    userId: string,
    items: GuestOrderItem[],
    shippingCost: number,
    shippingAddress: ShippingAddress,
    sale: ActiveSale | null,
  ): Promise<OrderDetail>
```

- [ ] **Step 2: Реализовать в `orderRepository.ts`**

Добавить метод (та же логика цен/скидки, что в `createOrderFromCart`, но без `cartItem.deleteMany`):
```typescript
    async createOrderFromItems(userId, items, shippingCost, shippingAddress, sale) {
      const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: { id: true, price: true },
        })
        const priceById = new Map(products.map((p) => [p.id, p.price.toNumber()]))

        const orderItems = items.map((item) => {
          const originalPrice = priceById.get(item.productId)
          if (originalPrice === undefined) {
            throw new AppError(409, `"${item.productName}" is no longer available`)
          }
          let salePrice: number | undefined
          if (sale && saleApplies(sale, item.productId, item.categoryId)) {
            salePrice = applyDiscount(originalPrice, sale.discount)
          }
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: salePrice ?? originalPrice,
            originalPrice: salePrice !== undefined ? originalPrice : null,
            message: item.message,
          }
        })

        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const totalAmount = subtotal + shippingCost

        return tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingCost,
            shippingAddress: shippingAddress as object,
            items: { create: orderItems },
          },
          select: {
            id: true, orderNumber: true, shippingCost: true, userId: true, status: true,
            totalAmount: true, shippingAddress: true, trackingNumber: true, createdAt: true,
            items: {
              select: {
                id: true, quantity: true, price: true, originalPrice: true, message: true,
                product: { select: { id: true, slug: true, name: true, images: true } },
              },
            },
          },
        })
      })
      return toOrderDetail(order)
    },
```

- [ ] **Step 3: Typecheck**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/orders/types.ts apps/api/src/features/orders/infrastructure/orderRepository.ts
git commit -m "feat(orders): add createOrderFromItems for guest checkout"
```

---

## Task 5: guestCheckout use-case

Сердце фичи: валидирует позиции, применяет развилку email, создаёт заказ, выдаёт сессию.

**Files:**
- Create: `apps/api/src/features/orders/application/guestCheckout.ts`
- Create: `apps/api/src/features/orders/application/guestCheckout.test.ts`
- Modify: `apps/api/src/features/orders/types.ts`

**Interfaces:**
- Consumes: `OrderRepository.createOrderFromItems`, `GetActiveSale`, `calcShipping` (`shared/lib`), `AuthRepository.findByEmail`/`createGuestUser`, `issueTokensForUser`, `Product` lookup для валидации/categoryId.
- Produces: `GuestCheckout = (input: GuestCheckoutInput) => Promise<{ order: OrderDetail; tokens: AuthTokensResult }>`
  где `GuestCheckoutInput = { email: string; shippingAddress: ShippingAddress; items: { productId: string; quantity: number; message: string | null }[] }`.
  Бросает `AppError(409, 'An account with this email exists. Please sign in.')` для аккаунта с паролем/google; `AppError(400, 'Cart is empty')`; `AppError(409, ...)` при недоступности/нехватке стока.

- [ ] **Step 1: Добавить типы в `types.ts`**

```typescript
export type GuestCheckoutInput = {
  email: string
  shippingAddress: ShippingAddress
  items: { productId: string; quantity: number; message: string | null }[]
}
```
(Тип возврата опишем через `import type` в самом use-case, чтобы не тянуть auth-типы в orders/types.)

- [ ] **Step 2: Написать падающие тесты**

`guestCheckout.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeGuestCheckout } from './guestCheckout'

const product = { id: 'p1', name: 'Doll', price: 16, stock: 5, isPublished: true, deletedAt: null, categoryId: 'c1' }
const address = { fullName: 'Anna', line1: '1 St', city: 'NY', country: 'US', postalCode: '10001' }
const order = { id: 'o1', orderNumber: 7, userId: 'u1', status: 'PENDING', totalAmount: 28, shippingCost: 12, shippingAddress: address, trackingNumber: null, createdAt: '2026-06-27T00:00:00Z', items: [] }

function deps() {
  return {
    orderRepo: { createOrderFromItems: vi.fn().mockResolvedValue(order) },
    getActiveSale: vi.fn().mockResolvedValue(null),
    getProductsForCheckout: vi.fn().mockResolvedValue([product]),
    authRepo: {
      findByEmail: vi.fn().mockResolvedValue(null),
      createGuestUser: vi.fn().mockResolvedValue({ id: 'u1', name: 'Anna', email: 'a@b.com', role: 'CUSTOMER' }),
      saveRefreshToken: vi.fn(), pruneUserSessions: vi.fn(),
    },
    issueTokens: vi.fn().mockResolvedValue({ accessToken: 'AT', refreshToken: 'RT', user: { id: 'u1', name: 'Anna', email: 'a@b.com', role: 'CUSTOMER' } }),
  }
}
function make(d: ReturnType<typeof deps>) {
  return makeGuestCheckout(d.orderRepo as never, d.getActiveSale as never, d.getProductsForCheckout as never, d.authRepo as never, d.issueTokens as never)
}

describe('guestCheckout', () => {
  it('creates a guest user, an order, and issues a session', async () => {
    const d = deps()
    const res = await make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })
    expect(d.authRepo.createGuestUser).toHaveBeenCalledWith({ name: 'Anna', email: 'a@b.com' })
    expect(d.orderRepo.createOrderFromItems).toHaveBeenCalled()
    expect(res.tokens.accessToken).toBe('AT')
  })

  it('rejects with 409 when the email belongs to a real account (has password)', async () => {
    const d = deps()
    d.authRepo.findByEmail.mockResolvedValue({ id: 'u9', email: 'a@b.com', passwordHash: 'h', googleId: null })
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
  })

  it('reuses an existing passwordless guest account', async () => {
    const d = deps()
    d.authRepo.findByEmail.mockResolvedValue({ id: 'u1', email: 'a@b.com', name: 'Anna', passwordHash: null, googleId: null })
    await make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 1, message: null }] })
    expect(d.authRepo.createGuestUser).not.toHaveBeenCalled()
    expect(d.orderRepo.createOrderFromItems).toHaveBeenCalled()
  })

  it('rejects an empty cart', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [] })).rejects.toThrow()
  })

  it('rejects when stock is insufficient', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'p1', quantity: 99, message: null }] })).rejects.toThrow()
    expect(d.orderRepo.createOrderFromItems).not.toHaveBeenCalled()
  })

  it('ignores unknown products in the request', async () => {
    const d = deps()
    await expect(make(d)({ email: 'a@b.com', shippingAddress: address, items: [{ productId: 'ghost', quantity: 1, message: null }] })).rejects.toThrow()
  })
})
```

- [ ] **Step 3: Запустить — убедиться, что падает (модуль не найден)**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/orders/application/guestCheckout.test.ts`
Expected: FAIL (Cannot find module).

- [ ] **Step 4: Реализовать use-case**

`guestCheckout.ts`:
```typescript
import { AppError } from '../../../shared/errors'
import { calcShipping } from '../../../shared/lib'
import type { OrderRepository, GuestCheckoutInput, GuestOrderItem, OrderDetail } from '../types'
import type { GetActiveSale } from '../../admin/types'
import type { AuthRepository } from '../../auth/infrastructure/authRepository'
import type { issueTokensForUser, AuthTokensResult } from '../../auth/application/issueTokens'

export type CheckoutProduct = {
  id: string; name: string; price: number; stock: number
  isPublished: boolean; deletedAt: Date | null; categoryId: string
}
export type GetProductsForCheckout = (productIds: string[]) => Promise<CheckoutProduct[]>
export type GuestCheckout = (input: GuestCheckoutInput) => Promise<{ order: OrderDetail; tokens: AuthTokensResult }>

export function makeGuestCheckout(
  orderRepo: Pick<OrderRepository, 'createOrderFromItems'>,
  getActiveSale: GetActiveSale,
  getProductsForCheckout: GetProductsForCheckout,
  authRepo: Pick<AuthRepository, 'findByEmail' | 'createGuestUser' | 'saveRefreshToken' | 'pruneUserSessions'>,
  issueTokens: typeof issueTokensForUser,
): GuestCheckout {
  return async (input) => {
    if (input.items.length === 0) {
      throw new AppError(400, 'Cart is empty')
    }

    const products = await getProductsForCheckout(input.items.map((i) => i.productId))
    const byId = new Map(products.map((p) => [p.id, p]))

    const orderItems: GuestOrderItem[] = input.items.map((item) => {
      const product = byId.get(item.productId)
      if (!product || !product.isPublished || product.deletedAt !== null) {
        throw new AppError(409, 'One of the items is no longer available')
      }
      if (product.stock < item.quantity) {
        throw new AppError(409, `Not enough stock for "${product.name}"`)
      }
      return {
        productId: product.id,
        quantity: item.quantity,
        message: item.message,
        categoryId: product.categoryId,
        productName: product.name,
      }
    })

    const existing = await authRepo.findByEmail(input.email)
    if (existing && (existing.passwordHash || existing.googleId)) {
      throw new AppError(409, 'An account with this email exists. Please sign in.')
    }
    const user = existing
      ? { id: existing.id, name: existing.name, email: existing.email, role: existing.role }
      : await authRepo.createGuestUser({ name: input.shippingAddress.fullName, email: input.email })

    const totalItemCount = orderItems.reduce((sum, i) => sum + i.quantity, 0)
    const shippingCost = calcShipping(totalItemCount)
    const sale = await getActiveSale()

    const order = await orderRepo.createOrderFromItems(user.id, orderItems, shippingCost, input.shippingAddress, sale)
    const tokens = await issueTokens(authRepo as never, user as never)
    return { order, tokens }
  }
}
```

- [ ] **Step 5: Запустить тесты — все зелёные**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/orders/application/guestCheckout.test.ts`
Expected: PASS (6 тестов).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/orders/application/guestCheckout.ts apps/api/src/features/orders/application/guestCheckout.test.ts apps/api/src/features/orders/types.ts
git commit -m "feat(orders): guestCheckout use-case (find-or-create user + order + session)"
```

---

## Task 6: getProductsForCheckout in orderRepository

`guestCheckout` зависит от `GetProductsForCheckout`. Реализуем как метод репозитория.

**Files:**
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- Modify: `apps/api/src/features/orders/types.ts`

**Interfaces:**
- Produces: `getProductsForCheckout(productIds: string[]): Promise<CheckoutProduct[]>` (тот же `CheckoutProduct`, что в Task 5).

- [ ] **Step 1: Добавить сигнатуру в `OrderRepository`**

В `types.ts` импортировать/объявить `CheckoutProduct` (переиспользовать из guestCheckout через реэкспорт или продублировать тип в types.ts — поместить определение `CheckoutProduct` в `types.ts` и импортировать его в `guestCheckout.ts` оттуда, чтобы избежать дубля). Действие: **перенести** `CheckoutProduct`/`GetProductsForCheckout` объявления в `types.ts`, в `guestCheckout.ts` импортировать их из `../types`.

В `interface OrderRepository`:
```typescript
  getProductsForCheckout(productIds: string[]): Promise<CheckoutProduct[]>
```

- [ ] **Step 2: Реализовать в `orderRepository.ts`**

```typescript
    async getProductsForCheckout(productIds) {
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: { id: true, name: true, price: true, stock: true, isPublished: true, deletedAt: true, categoryId: true },
      })
      return products.map((p) => ({ ...p, price: p.price.toNumber() }))
    },
```

- [ ] **Step 3: Typecheck**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/orders/infrastructure/orderRepository.ts apps/api/src/features/orders/application/guestCheckout.ts apps/api/src/features/orders/types.ts
git commit -m "feat(orders): getProductsForCheckout for server-side guest validation"
```

---

## Task 7: POST /orders/guest route (no auth, rate-limited, sets cookie)

**Files:**
- Modify: `apps/api/src/features/orders/presentation/orderRoutes.ts`
- Modify: `apps/api/src/features/orders/presentation/orderRoutes.test.ts`

**Interfaces:**
- Consumes: `GuestCheckout` (Task 5), `createRateLimiter` (`shared/middleware`), `setCookie` + `COOKIE_NAME` + `REFRESH_COOKIE_OPTIONS` (взять те же значения, что в `auth/presentation/authRoutes.ts:66-70` — вынести в общий импорт или продублировать опции локально с тем же содержимым).
- Produces: `POST /orders/guest` → `201 { order, accessToken }`, ставит refresh-cookie. Без `requireAuth`.

- [ ] **Step 1: Написать падающий тест**

В `orderRoutes.test.ts` добавить (мок `guestCheckout`):
```typescript
it('POST /orders/guest — публичный, создаёт заказ и ставит refresh-cookie', async () => {
  const guest = vi.fn().mockResolvedValue({ order: { id: 'o1', orderNumber: 7 }, tokens: { accessToken: 'AT', refreshToken: 'RT', user: {} } })
  const app = new Hono()
  app.route('/', makeOrderRouter(vi.fn() as never, vi.fn() as never, vi.fn() as never, guest as never))
  const res = await app.request('/orders/guest', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'a@b.com', shippingAddress: { fullName: 'A', line1: '1', city: 'NY', country: 'US', postalCode: '10001' }, items: [{ productId: 'p1', quantity: 1 }] }),
  })
  expect(res.status).toBe(201)
  expect(res.headers.get('set-cookie')).toContain('refresh')
  expect(guest).toHaveBeenCalled()
})
```
(Имя cookie — значение `COOKIE_NAME`; в ассерте подставить реальную подстроку имени cookie из `shared/lib`.)

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/orders/presentation/orderRoutes.test.ts`
Expected: FAIL — `makeOrderRouter` ещё не принимает 4-й аргумент / нет роута.

- [ ] **Step 3: Добавить роут**

В `orderRoutes.ts`:
```typescript
import { setCookie } from 'hono/cookie'
import { createRateLimiter } from '../../../shared/middleware'
import { COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '../../../shared/lib'
import type { GuestCheckout } from '../application/guestCheckout'

const guestItemSchema = z.object({ productId: z.string().min(1), quantity: z.number().int().positive(), message: z.string().max(500).nullable().optional() })
const guestCheckoutSchema = z.object({
  email: z.string().email().max(200),
  shippingAddress: shippingAddressSchema,
  items: z.array(guestItemSchema).min(1),
})
const guestLimiter = createRateLimiter({ max: 10, windowMs: 60_000 })
const REFRESH_COOKIE_OPTIONS = { httpOnly: true, secure: true, sameSite: 'Strict', path: '/', maxAge: REFRESH_TOKEN_TTL_SECONDS } as const
```
В `makeOrderRouter` добавить параметр `guestCheckout: GuestCheckout` и роут (без `requireAuth`):
```typescript
  router.post('/orders/guest', guestLimiter.middleware, zValidator('json', guestCheckoutSchema), async (c) => {
    const body = c.req.valid('json')
    const { order, tokens } = await guestCheckout({
      email: body.email,
      shippingAddress: body.shippingAddress,
      items: body.items.map((i) => ({ productId: i.productId, quantity: i.quantity, message: i.message ?? null })),
    })
    setCookie(c, COOKIE_NAME, tokens.refreshToken, REFRESH_COOKIE_OPTIONS)
    return c.json({ order, accessToken: tokens.accessToken }, 201)
  })
```
(Сверить точные `REFRESH_COOKIE_OPTIONS` с `authRoutes.ts` — `sameSite='Strict'` для refresh-cookie это security-инвариант проекта; значения должны совпадать.)

- [ ] **Step 4: Запустить тесты файла — зелёные**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic src/features/orders/presentation/orderRoutes.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/orders/presentation/orderRoutes.ts apps/api/src/features/orders/presentation/orderRoutes.test.ts
git commit -m "feat(orders): POST /orders/guest (public, rate-limited, issues session cookie)"
```

---

## Task 8: Wire guestCheckout in app.ts + export

**Files:**
- Modify: `apps/api/src/features/orders/index.ts`
- Modify: `apps/api/src/app.ts`

**Interfaces:**
- Consumes: `makeGuestCheckout`, `makeOrderRouter` (now 4 args), существующие `orderRepo`, `getActiveSale`, `authRepo`, `issueTokensForUser`.

- [ ] **Step 1: Экспортировать use-case**

В `orders/index.ts` добавить:
```typescript
export { makeGuestCheckout } from './application/guestCheckout'
```

- [ ] **Step 2: Собрать в app.ts**

Найти секцию orders в `app.ts`. Добавить (рядом с созданием `createOrder`):
```typescript
  const guestCheckout = makeGuestCheckout(orderRepo, getActiveSale, orderRepo.getProductsForCheckout, authRepo, issueTokensForUser)
```
(`orderRepo`, `getActiveSale`, `authRepo` уже существуют в composition root; `issueTokensForUser` импортируется из auth feature — добавить в import, если ещё нет.)
И передать 4-м аргументом в `makeOrderRouter(createOrder, getMyOrders, getOrder, guestCheckout)`.

- [ ] **Step 3: Typecheck + полный прогон api-тестов**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic`
Expected: typecheck 0; все тесты зелёные.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/orders/index.ts apps/api/src/app.ts
git commit -m "feat(orders): wire guest checkout into app"
```

---

## Task 9: Prisma migration note (no schema change)

Схема БД не меняется (гость = `User` без credentials). **Миграция не нужна.** Этот «task» — только подтверждение: проверить `git status`, что в `apps/api/prisma/` нет изменений. Если есть — откатить. Без коммита.

- [ ] **Step 1:** `git status apps/api/prisma` → должно быть чисто.

---

## Task 10: Frontend — guest cart store (localStorage)

**Files:**
- Modify: `apps/web/src/entities/cart/store.ts`
- Test: `apps/web/src/entities/cart/store.test.ts`

**Interfaces:**
- Produces: store умеет «гостевой режим» — когда пользователь не залогинен, корзина читается/пишется в `localStorage` (ключ `natsdoll_guest_cart`), а не через `/api/cart`. Публичный API store не ломается. Добавить геттер `guestItems` или признак, по которому `CartPageWidget` соберёт payload для `/orders/guest`.

- [ ] **Step 1: Написать падающий тест** — гость добавляет товар, он сохраняется в localStorage и переживает «перезагрузку» store. (Тест по образцу `store.test.ts`; мокать `isLoggedIn` через auth store / параметр.)

- [ ] **Step 2:** Запустить — убедиться, что падает.

- [ ] **Step 3:** Реализовать гостевой режим в store: при `!isLoggedIn` методы `add/update/remove` пишут в `localStorage`-структуру `{ productId, quantity, message }[]` и пересчитывают `itemCount`/`totalAmount` из локальных данных (цена для отображения берётся из снапшота товара при добавлении; **итоговая сумма всё равно пересчитается на сервере**). При `isLoggedIn` — текущее серверное поведение без изменений.

- [ ] **Step 4:** Запустить тесты `store.test.ts` — зелёные.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/cart/store.ts apps/web/src/entities/cart/store.test.ts
git commit -m "feat(cart): guest cart persisted in localStorage"
```

> Реализатору: это самая нетривиальная фронт-задача. Если store разрастается — выделить guest-логику в отдельный модуль `entities/cart/guestCart.ts` и подключить из store. Держать публичный API store неизменным для остальных потребителей.

---

## Task 11: Frontend — guest checkout API client

**Files:**
- Create: `apps/web/src/widgets/cart-page/guestCheckoutApi.ts`

**Interfaces:**
- Produces: `createGuestOrder(input: { email: string; shippingAddress: ShippingAddress; items: { productId: string; quantity: number; message: string | null }[] }): Promise<{ orderId: string; orderNumber: number; accessToken: string }>`. Бросает типизированную ошибку с `status` (для `409 → форма входа`).

- [ ] **Step 1:** Создать файл с `apiFetch` (без auth) на `POST /payments?...` — нет: на `POST /orders/guest`. Распарсить ответ Zod-схемой `{ order: { id, orderNumber }, accessToken }`. На `409` бросить ошибку с распознаваемым признаком (например `class GuestEmailTakenError`).
- [ ] **Step 2:** Сохранить `accessToken` в auth-store (тот же механизм, что после логина) — чтобы последующие платёжные запросы шли авторизованно.
- [ ] **Step 3: Commit**

```bash
git add apps/web/src/widgets/cart-page/guestCheckoutApi.ts
git commit -m "feat(cart): guest checkout API client"
```

> Реализатору: посмотреть, как `login`/`googleAuth` на фронте кладут accessToken в auth-store, и переиспользовать тот же путь — после guest-checkout пользователь должен стать «залогиненным» в смысле фронта.

---

## Task 12: Frontend — email field + guest branch in CartPageWidget

**Files:**
- Modify: `apps/web/src/widgets/cart-page/CartPageWidget.vue`
- Modify: `apps/web/src/widgets/cart-page/usePendingOrder.ts`
- Test: `apps/web/src/widgets/cart-page/CartPageWidget.test.ts`

**Interfaces:**
- Consumes: `createGuestOrder` (Task 11), guest cart (Task 10), `useAuthStore` (признак `isLoggedIn`).
- Produces: для гостя — поле Email (обязательное) + `prepareOrder` зовёт `createGuestOrder`; при успехе пользователь становится залогинен и продолжается обычная оплата; при `GuestEmailTakenError` — сообщение «у вас есть аккаунт, войдите» + переход/показ формы входа.

- [ ] **Step 1: Написать падающий тест** — для незалогиненного: видно поле Email; сабмит без email блокируется; при заполненном email `prepareOrder` зовёт `createGuestOrder` с правильным payload. (По образцу `CartPageWidget.test.ts`.)
- [ ] **Step 2:** Запустить — падает.
- [ ] **Step 3:** Реализовать: `v-if="!isLoggedIn"` поле Email (BEM, `<style scoped>`), валидация; в `usePendingOrder`/`prepareOrder` ветка гостя (`createGuestOrder` вместо `POST /orders`); обработка `409` (сообщение + ссылка/модалка входа из существующего `cart-prompt-modal`, если подходит).
- [ ] **Step 4:** Запустить тесты + eslint:
  - `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic src/widgets/cart-page`
  - `cd apps/web && npx eslint app src --max-warnings=0`
- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/cart-page/CartPageWidget.vue apps/web/src/widgets/cart-page/usePendingOrder.ts apps/web/src/widgets/cart-page/CartPageWidget.test.ts
git commit -m "feat(cart): guest checkout — email field and guest order branch"
```

---

## Task 13: Full verification + review

- [ ] **Step 1:** Полный прогон:
  - `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api` → 0
  - `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic` → все зелёные
  - `cd apps/web && npx nuxt typecheck` → 0
  - `cd apps/web && npx eslint app src --max-warnings=0` → 0
  - `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic` → все зелёные
- [ ] **Step 2:** `code-reviewer` на всём диффе ветки (фокус: захват аккаунта по email, серверный пересчёт суммы, что googleAuth/passwordReset правки не ослабили безопасность). Critical/high блокируют.
- [ ] **Step 3:** e2e (опционально, как для webhook): гость оформляет и оплачивает sandbox-покупателем; проверить заказ → PAID и привязку к гостевому аккаунту.

---

## Self-review notes (для исполнителя)

- **Безопасность развилки** (Task 5): тест на `409` для аккаунта с паролем — обязателен и не должен «зеленеть» случайно.
- **FK Restrict** (Task 2): без правки googleAuth Google-вход гостя с заказами упадёт — не пропускать Task 2.
- **Cookie sameSite='Strict'** (Task 7): значение refresh-cookie должно совпадать с auth-роутами (security-инвариант проекта); не ослаблять до `Lax`.
- **Сумма на сервере** (Task 4–6): клиентские цены нигде не используются для расчёта `totalAmount`.
