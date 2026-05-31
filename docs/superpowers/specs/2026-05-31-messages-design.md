# Messages — Design Spec

**Date:** 2026-05-31
**Scope:** Customer-facing messaging — покупатель может отправить сообщение администратору (привязанное к заказу или нет). Сообщения хранятся в БД. При каждом новом сообщении администратор получает email-уведомление. Admin UI — вне скоупа, будет позже.

---

## Database

New model `Message`:

```prisma
model Message {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  orderId   String?
  order     Order?   @relation(fields: [orderId], references: [id], onDelete: SetNull)
  text      String
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([orderId])
}
```

Add `messages Message[]` to `User` and `Order` models in schema.prisma.

---

## Backend

**Feature:** `apps/api/src/features/messages/`

**Use-cases:**
- `getMyMessages(userId)` — returns all messages for user, ordered by `createdAt DESC`, includes `orderNumber` if linked to order
- `createMessage(userId, { text, orderId? })` — validates text (min 1, max 2000), validates orderId belongs to user if provided, saves to DB, sends email notification to admin

**Email notification:** on `createMessage`, send email via existing `emailService` (Resend) to `process.env.ADMIN_EMAIL`. Subject: `New message from [user name]`. Body: message text + order number if linked.

**Endpoints** (JWT-protected):
- `GET /me/messages` — list user's messages
- `POST /me/messages` — body: `{ text: string, orderId?: string }`

---

## Frontend

**`apps/web/src/entities/message/types.ts`:**
```ts
export type MessageView = {
  id: string
  text: string
  orderId: string | null
  orderNumber: number | null
  createdAt: string
}

export type SendMessageData = {
  text: string
  orderId?: string
}
```

**`apps/web/src/entities/message/messageApi.ts`** — `fetchMyMessages()`, `sendMessage(data)`

**`apps/web/src/entities/message/store.ts`** — Pinia store: `messages`, `loading`, `error`; actions: `load()`, `send(data)`

**`apps/web/src/entities/message/index.ts`** — exports

**`apps/web/src/widgets/account-page/components/AccountMessages.vue`:**

- On mount: load orders (`orderStore.loadMyOrders()`) and messages (`messageStore.load()`)
- **Message list:** если есть сообщения — показывать их в хронологическом порядке (oldest first). Каждое: дата, текст, «Re: Order #N» если привязано
- **Form:**
  - Дропдаун «Order (optional)» — показывается только если у пользователя есть заказы; опции: «Not related to an order» + список заказов (`Order #N — дата`)
  - Textarea (placeholder: «Write your message…»)
  - Кнопка «Send message» — disabled пока textarea пустая или идёт отправка
  - После успешной отправки: показать «Message sent!», очистить форму, добавить сообщение в список
  - Ошибка — показать inline

---

## Out of scope

- Admin UI (reply interface)
- Read/unread status
- Real-time updates (WebSocket)
