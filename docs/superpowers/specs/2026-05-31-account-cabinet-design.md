# Account Cabinet — Design Spec

**Date:** 2026-05-31
**Scope:** Profile update, Purchases list + detail, Addresses CRUD, Reviews (create + list)
**Out of scope:** Messages (stub), Reviews on product page

---

## 1. Profile (`PATCH /me`)

### Backend

- New use-case: `apps/api/src/features/auth/application/updateProfile.ts`
  - Input: `{ name?: string, password?: string, currentPassword?: string }`
  - If `password` provided → require `currentPassword`, verify against stored hash
  - At least one of `name` or `password` must be present
  - Returns updated user `{ id, name, email }`
- Repository: add `updateUser(id, { name?, passwordHash? })` to `userRepository`
- Endpoint: `PATCH /me` (JWT-protected), mounted in `authRoutes`

### Frontend

- `apps/web/src/entities/user/userApi.ts` — add `patchMe({ name?, password?, currentPassword? })`
- `apps/web/src/entities/user/store.ts` — add `updateProfile(data)` action, update `user.name` on success
- `AccountProfile.vue` — call `authStore.updateProfile(...)` in `save()`, show success/error message inline

---

## 2. Purchases (list + detail)

### Backend

Already implemented: `GET /orders/my` → `OrderSummary[]`, `GET /orders/:id` → `OrderDetail`. No changes needed.

### Frontend

- `AccountPurchases.vue` — connect to `orderStore.loadMyOrders()` on mount, render list of order cards (same card style as Dashboard but all orders)
- New component: `widgets/account-page/components/AccountPurchaseDetail.vue`
  - Loads via `orderStore.loadOrder(id)` on mount
  - Shows: status badge, date, shipping address, list of items (image, name, qty, price), total
- New route: `/account/purchases/:id` → `AccountPurchaseDetail`
- Order cards in list are clickable links to `/account/purchases/:id`

---

## 3. Addresses (full CRUD)

### Backend

**Prisma schema** — new model `Address`:
```prisma
model Address {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  fullName   String
  line1      String
  line2      String?
  city       String
  country    String
  postalCode String
  isDefault  Boolean  @default(false)
  createdAt  DateTime @default(now())
}
```

**Use-cases** (all in `apps/api/src/features/addresses/application/`):
- `getAddresses.ts` — returns user's addresses sorted by `isDefault DESC, createdAt ASC`
- `createAddress.ts` — creates address; if first address → set `isDefault = true`
- `updateAddress.ts` — updates fields, validates ownership
- `deleteAddress.ts` — deletes; if was default → set next address as default
- `setDefaultAddress.ts` — sets `isDefault = true` for target, `false` for rest

**Repository:** `apps/api/src/features/addresses/infrastructure/addressRepository.ts`

**Routes** (`GET/POST/PATCH/DELETE`, JWT-protected):
- `GET /me/addresses`
- `POST /me/addresses`
- `PATCH /me/addresses/:id`
- `DELETE /me/addresses/:id`
- `POST /me/addresses/:id/default`

**Zod schemas** in shared package for request validation.

### Frontend

- New entity: `apps/web/src/entities/address/` — `types.ts`, `addressApi.ts`, `store.ts`, `index.ts`
- `AccountAddresses.vue` — list of address cards with «Edit» / «Delete» / «Set as default» buttons; «Add address» button opens inline form
- Inline form (toggle in same component, not a separate page): fields fullName, line1, line2, city, country, postalCode
- Form used for both create and edit (pre-filled on edit)
- **Checkout integration:** on mount of checkout shipping form, read `addressStore.defaultAddress` and pre-fill if present

---

## 4. Reviews (create + list)

### Backend

**Prisma schema** — new model `Review`:
```prisma
model Review {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id])
  rating    Int
  text      String?
  createdAt DateTime @default(now())

  @@unique([userId, productId])
}
```

**Use-cases** (`apps/api/src/features/reviews/application/`):
- `getMyReviews.ts` — returns user's reviews with product name + image
- `createReview.ts` — validates:
  1. Order belongs to user and has status `COMPLETED`
  2. Product is in that order
  3. No existing review for this product by this user
  - Input: `{ productId, orderId, rating (1–5), text? }`

**Routes** (JWT-protected):
- `GET /me/reviews`
- `POST /me/reviews`

### Frontend

- New entity: `apps/web/src/entities/review/` — `types.ts`, `reviewApi.ts`, `store.ts`, `index.ts`
- `AccountReviews.vue`:
  - List of submitted reviews (product image, name, star rating, text, date)
  - «Leave a review» button → inline form:
    - Dropdown: completed order items not yet reviewed (grouped by order)
    - Star rating selector (1–5)
    - Text area (optional)
  - After submit → form closes, list refreshes
- Already-reviewed products excluded from dropdown

---

## Implementation order

1. Profile (smallest, no DB change)
2. Purchases (no backend work)
3. Addresses (new DB model + full CRUD)
4. Reviews (new DB model + validation logic)
