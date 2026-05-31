# Shipping Cost — Design Spec

**Date:** 2026-05-31
**Scope:** Calculate and display shipping cost on checkout, order confirmation, and order detail pages.

---

## Formula

```
shippingCost = SHIPPING_BASE + (totalItemCount - 1) × SHIPPING_PER_EXTRA_ITEM
```

Where:
- `SHIPPING_BASE = 12` (USD)
- `SHIPPING_PER_EXTRA_ITEM = 1` (USD)
- `totalItemCount` = sum of `quantity` across all cart items

Examples: 1 item → $12, 3 items → $14, 10 items → $21.

---

## Storage

Add `shippingCost Decimal @db.Decimal(10, 2)` to the `Order` model in Prisma schema.

`totalAmount` = subtotal + shippingCost (grand total paid by customer). `subtotal` is derived: `totalAmount − shippingCost`. Not stored separately.

`OrderSummary` does not expose `shippingCost` — purchases list shows only grand total. `OrderDetail` exposes `shippingCost`.

---

## Backend

**Constants:** `apps/api/src/shared/lib/shipping.ts`
```ts
export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(totalItemCount: number): number {
  return SHIPPING_BASE + (totalItemCount - 1) * SHIPPING_PER_EXTRA_ITEM
}
```

**`createOrder.ts`:**
- Compute `totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0)`
- Compute `shippingCost = calcShipping(totalItemCount)`
- Compute `subtotal = items.reduce((sum, item) => sum + item.productPrice * item.quantity, 0)`
- `totalAmount = subtotal + shippingCost`
- Pass `shippingCost` to `repo.createOrderFromCart`

**`orderRepository.ts`:**
- `createOrderFromCart`: add `shippingCost` param, include in `tx.order.create` data, include `shippingCost: true` in select
- `getOrderById`: add `shippingCost: true` to select
- `toOrderDetail`: add `shippingCost: order.shippingCost.toNumber()`
- `OrderRow` type: add `shippingCost: { toNumber(): number }`

**`types.ts` (backend):**
- `OrderDetail`: add `shippingCost: number`
- `OrderRepository.createOrderFromCart`: add `shippingCost: number` param

---

## Frontend

**`apps/web/src/shared/lib/shipping.ts`:**
```ts
export const SHIPPING_BASE = 12
export const SHIPPING_PER_EXTRA_ITEM = 1

export function calcShipping(totalItemCount: number): number {
  return SHIPPING_BASE + (totalItemCount - 1) * SHIPPING_PER_EXTRA_ITEM
}
```
Export from `apps/web/src/shared/index.ts`.

**`apps/web/src/entities/order/types.ts`:** add `shippingCost: number` to `OrderDetail`.

**`apps/web/src/entities/order/orderApi.ts`:** add `shippingCost: z.number()` to `orderDetailSchema`.

**`CheckoutForm.vue`:** compute `shippingCost` from `cartStore.items` using `calcShipping`. Show below the submit button:
```
Subtotal   $XX.XX
Shipping   $XX.XX
──────────────────
Total      $XX.XX
```

**`OrderConfirmation.vue`:** replace single `Total` row in Summary sidebar with:
```
Subtotal   $XX.XX
Shipping   $XX.XX
Total      $XX.XX
```

**`AccountPurchaseDetail.vue`:** replace `Total` block in footer with same three-line breakdown.

---

## Out of scope

- Free shipping threshold
- Per-country shipping rates
- Admin configurable shipping rates
