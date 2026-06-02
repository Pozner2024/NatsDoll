# Admin Orders Tab — Design Spec

**Date:** 2026-06-02
**Feature:** Orders tab in the admin panel — list of all orders, detailed view, status change, tracking number (visible to customer + email notification), internal admin note.

---

## Overview

Replaces the "Coming soon" placeholder in `AdminOrders.vue` with a full two-column orders management interface. Admin sees all orders, can update status, add a tracking number (which triggers a customer email), and leave an internal note. The customer sees their tracking number in `AccountPurchaseDetail.vue`.

---

## Schema Changes

Add two optional fields to the `Order` model:

```prisma
model Order {
  // ... existing fields ...
  trackingNumber  String?
  adminNote       String?
}
```

New migration: `prisma migrate dev --name add_order_tracking_and_note`

---

## Backend

### Updated types (`orders/types.ts`)

Add `trackingNumber` and `adminNote` to `OrderDetail`:

```ts
export type OrderDetail = {
  id: string
  orderNumber: number
  userId: string
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  adminNote: string | null
  createdAt: string
  items: OrderItemView[]
}
```

### Updated `orders/infrastructure/orderRepository.ts`

`getOrderById`: add `trackingNumber` and `adminNote` to the Prisma `select` and to `toOrderDetail` mapping.

### New email method (`auth/infrastructure/emailService.ts`)

Add to `EmailService` type and implementation:

```ts
sendTrackingNotification(to: string, name: string, orderNumber: number, trackingNumber: string): Promise<void>
```

Email subject: `Your order #N has been shipped — NatsDoll`
Email body: greeting + tracking number + invitation to check account cabinet.
All user-input fields passed through `escapeHtml`.

### New admin types (`admin/types.ts`)

```ts
type AdminOrderSummary = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  userName: string
  userEmail: string
  itemCount: number
  createdAt: string
}

type AdminOrderDetail = {
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

type AdminOrderListParams = {
  status?: string
  search?: string      // matches orderNumber or userName
  page: number
  limit: number
}

type AdminOrderListResponse = {
  items: AdminOrderSummary[]
  total: number
  page: number
  totalPages: number
}

type UpdateOrderInput = {
  status: string
  trackingNumber: string | null
  adminNote: string | null
}

type ListAdminOrders = (params: AdminOrderListParams) => Promise<AdminOrderListResponse>
type GetAdminOrder = (orderId: string) => Promise<AdminOrderDetail | null>
type UpdateAdminOrder = (orderId: string, input: UpdateOrderInput) => Promise<void>
```

Add to `AdminRepository`:
```ts
listAdminOrders(params: AdminOrderListParams): Promise<{ items: AdminOrderSummary[]; total: number }>
getAdminOrder(orderId: string): Promise<AdminOrderDetail | null>
updateAdminOrder(orderId: string, input: UpdateOrderInput): Promise<{ userEmail: string; userName: string; orderNumber: number; trackingNumber: string } | null>
```

`updateAdminOrder` returns user info when `trackingNumber` was just set (null → value) so the caller can send the email. Returns `null` otherwise.

### New use-cases (`admin/application/`)

| File | Function |
|---|---|
| `listAdminOrders.ts` | `makeListAdminOrders` — delegates to `repo.listAdminOrders` |
| `getAdminOrder.ts` | `makeGetAdminOrder` — delegates to `repo.getAdminOrder` |
| `updateAdminOrder.ts` | `makeUpdateAdminOrder` — calls repo, if result non-null sends tracking email via `emailService` |

`updateAdminOrder` signature:
```ts
export function makeUpdateAdminOrder(repo: AdminRepository, emailService: EmailService): UpdateAdminOrder
```

### New repository methods (`admin/infrastructure/adminRepository.ts`)

**`listAdminOrders`:** `prisma.order.findMany` with optional `where` on `status` and search (`orderNumber` coerced from string, or `user.name` contains). Include `user.name`, `user.email`, `_count.items`. Paginate with skip/take.

**`getAdminOrder`:** `prisma.order.findUnique` — select all fields including `trackingNumber`, `adminNote`, `user.name`, `user.email`, items with product info. Returns `null` if not found.

**`updateAdminOrder`:**
1. `prisma.order.findUnique` to get current `trackingNumber` and `user.email`, `user.name`.
2. `prisma.order.update` with new `status`, `trackingNumber`, `adminNote`.
3. If old `trackingNumber` was null and new `trackingNumber` is non-null → return `{ userEmail, userName, orderNumber, trackingNumber }`.
4. Otherwise return null.

### New routes (`admin/presentation/adminRoutes.ts`)

```
GET   /admin/orders            → listAdminOrders   (query: status?, search?, page, limit)
GET   /admin/orders/:id        → getAdminOrder      → 404 if null
PATCH /admin/orders/:id        → updateAdminOrder   body: { status, trackingNumber?, adminNote? }
```

Zod schema for PATCH body:
```ts
z.object({
  status: z.enum(['PENDING','PAID','PROCESSING','SHIPPED','DELIVERED','CANCELLED','REFUNDED']),
  trackingNumber: z.string().nullable().optional(),
  adminNote: z.string().nullable().optional(),
})
```

All under existing `requireAdmin` middleware.

---

## Frontend

### New file: `adminOrdersApi.ts`

Following `adminListingsApi.ts` / `adminMessagesApi.ts` pattern. Exports:

- `useAdminOrders(filters)` — loads paginated list, exposes `orders`, `isLoading`, `error`, `total`, `totalPages`, `setFilter`, `refresh`
- `useAdminOrderDetail(orderId: Ref<string | null>)` — loads detail when orderId changes
- `updateAdminOrder(id, payload)` — PATCH, throws on error

All with Zod validation at the boundary.

### Updated `AdminOrders.vue`

Two-column layout (identical structure to `AdminMessages.vue`):

```
┌──────────────────────┬────────────────────────────────────┐
│  OrderList           │  OrderDetail                        │
│                      │                                     │
│  [filter + search]   │  Order #42 · Jun 1                 │
│  #42 Alice  $24  ●   │  Alice Smith · alice@example.com    │
│  #41 Bob    $18      │                                     │
│  #40 Carol  $36      │  [items list]                       │
│                      │  [shipping address]                 │
│  < Prev  1  Next >   │  Subtotal / Shipping / Total        │
│                      │  ─────────────────────────────      │
│                      │  Status: [select]                   │
│                      │  Tracking: [input] ⚠ customer sees  │
│                      │  Note: [textarea] 🔒 only you       │
│                      │  [Save Changes]                     │
└──────────────────────┴────────────────────────────────────┘
```

- Left column: `280px` fixed, scrollable
- Right: `flex: 1`, scrollable content + sticky edit form at bottom
- Mobile: one column, list → detail with back button

### `OrderList.vue`

Props: `orders: AdminOrderSummary[]`, `selectedId: string | null`, `totalPages: number`, `page: number`, `filters`
Emits: `select(id)`, `filter-change(patch)`, `page-change(n)`

Each row: `#N`, userName, totalAmount, status badge (color-coded), date.
Status filter select at top. Search input with 300ms debounce.
Prev/Next pagination buttons.

Status badge colors (matching `AccountPurchaseDetail.vue` pattern):
- PENDING → gold
- PAID / PROCESSING → blue
- SHIPPED / DELIVERED → green
- CANCELLED / REFUNDED → red

### `OrderDetail.vue`

Props: `order: AdminOrderDetail | null`, `saving: boolean`
Emits: `save(payload: UpdateOrderInput)`

Sections:
1. Header: `#N`, date, status badge, user name + email
2. Items list: image, name, qty, price, message if present
3. Shipping address block
4. Cost summary: shipping + total
5. Edit form:
   - Status `<select>` (all 7 values)
   - Tracking number `<input>` + hint "Visible to customer. Customer receives email when first added."
   - Admin note `<textarea>` + hint "Only you see this"
   - Save button: disabled if unchanged, shows "Saving…" while `saving`

Local state mirrors `order` props; dirty-check enables Save button.

### Updated `AccountPurchaseDetail.vue`

Add tracking number block after status badge, before items list:

```vue
<div v-if="order.trackingNumber" class="purchase-detail__tracking">
  <span class="purchase-detail__tracking-label">Tracking number</span>
  <span class="purchase-detail__tracking-value">{{ order.trackingNumber }}</span>
</div>
```

`orderApi.ts` / store already uses `OrderDetail` type — no API changes needed beyond adding the field.

---

## Data Flow

```
Admin opens Orders tab
  → AdminOrders mounted
  → useAdminOrders() fetches GET /admin/orders
  → OrderList renders

Admin clicks an order row
  → selectedId set
  → useAdminOrderDetail watches, fetches GET /admin/orders/:id
  → OrderDetail renders with form pre-filled

Admin saves changes
  → PATCH /admin/orders/:id { status, trackingNumber, adminNote }
  → if trackingNumber was just added → API sends tracking email to customer
  → detail refetched, list refreshed (to update status badge in list)
```

---

## Error Handling

- Load failures: inline error + Retry button (same pattern as AdminMessages)
- Save failure: error text below Save button, form stays editable
- Invalid status transition: API returns 422, shown as form error

---

## Out of Scope

- Automatic status transitions (e.g. PayPal webhook → PAID) — already handled separately
- Bulk status updates
- Order cancellation refund flow
- Resending tracking email
