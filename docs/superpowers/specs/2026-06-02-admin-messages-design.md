# Admin Messages Tab — Design Spec

**Date:** 2026-06-02
**Feature:** Messages tab in the admin panel with two-way messaging (inbox per user + admin replies)

---

## Overview

Replaces the "Coming soon" placeholder in `AdminMessages.vue` with a full inbox. Admin can read all user messages grouped by user, reply with optional order reference, and mark conversations as read. User's account cabinet (`AccountMessages.vue`) automatically shows admin replies.

---

## Schema Change

Add one field to the `Message` model:

```prisma
model Message {
  // ... existing fields ...
  fromAdmin     Boolean  @default(false)
}
```

New migration: `prisma migrate dev --name add_message_from_admin`.

---

## Backend

### New types (`admin/types.ts`)

```ts
type ConversationPreview = {
  userId: string
  userName: string
  userEmail: string
  lastMessageText: string
  lastMessageAt: string
  unreadCount: number          // messages where fromAdmin=false AND isReadByAdmin=false
}

type ConversationMessage = {
  id: string
  text: string
  fromAdmin: boolean
  orderId: string | null
  orderNumber: number | null
  createdAt: string
}

type ConversationDetail = {
  userId: string
  userName: string
  userEmail: string
  messages: ConversationMessage[]
  userOrders: { id: string; orderNumber: number; createdAt: string }[]
}

type ReplyInput = {
  userId: string
  text: string
  orderId?: string
}
```

### New use-cases (`admin/application/`)

| File | Function | Description |
|---|---|---|
| `listConversations.ts` | `makeListConversations` | Returns list of `ConversationPreview`, ordered by `lastMessageAt` desc |
| `getConversation.ts` | `makeGetConversation` | Returns `ConversationDetail` for a userId |
| `replyToUser.ts` | `makeReplyToUser` | Creates `Message` with `fromAdmin: true` |
| `markConversationRead.ts` | `makeMarkConversationRead` | Sets `isReadByAdmin: true` on all user's incoming messages |

### New repository methods (`admin/infrastructure/adminRepository.ts`)

```ts
listConversations(): Promise<ConversationPreview[]>
getConversation(userId: string): Promise<ConversationDetail | null>
replyToUser(input: ReplyInput): Promise<void>
markConversationRead(userId: string): Promise<void>
```

**`listConversations` query:** group messages by `userId`, take latest per user via `findMany` + in-memory grouping, or a raw subquery. Simplest: fetch all messages ordered by createdAt desc, reduce to one entry per userId keeping first occurrence (= most recent).

**`getConversation` query:** `prisma.message.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, include: { order: { select: { orderNumber: true } } } })` + `prisma.order.findMany({ where: { userId }, select: { id, orderNumber, createdAt } })`.

**`replyToUser` query:** validate `orderId` belongs to `userId` if provided. `prisma.message.create({ data: { userId, text, orderId, fromAdmin: true, isReadByAdmin: true } })`.

**`markConversationRead` query:** `prisma.message.updateMany({ where: { userId, fromAdmin: false, isReadByAdmin: false }, data: { isReadByAdmin: true } })`.

### New routes (`admin/presentation/adminRoutes.ts`)

```
GET  /admin/messages/conversations               → listConversations
GET  /admin/messages/conversations/:userId       → getConversation
POST /admin/messages/reply                       → replyToUser   body: { userId, text, orderId? }
PATCH /admin/messages/conversations/:userId/mark-read → markConversationRead
```

All under existing `requireAdmin` middleware. Existing `PATCH /admin/messages/mark-all-read` remains.

### Updated `messages/types.ts`

Add `fromAdmin: boolean` to `MessageView`.

### Updated `messages/infrastructure/messageRepository.ts`

`findByUser`: add `fromAdmin: r.fromAdmin` to the mapped object.

---

## Frontend

### New file: `adminMessagesApi.ts`

Composable following `adminDashboardApi.ts` pattern. Exports:
- `useConversations()` — loads conversation list, exposes `conversations`, `isLoading`, `error`, `refresh()`
- `useConversationThread(userId: Ref<string | null>)` — loads thread when userId changes, exposes `thread`, `isLoading`, `error`
- `replyToUser(payload: { userId, text, orderId? })` — POST, returns void
- `markConversationRead(userId: string)` — PATCH, returns void

All use `authFetch` + Zod validation at the boundary.

### Updated `AdminMessages.vue`

Two-column layout:

```
┌─────────────────┬──────────────────────────────────┐
│  ConversationList│  ConversationThread               │
│                 │                                   │
│  [User A]  (2) ●│  User A — a@example.com           │
│  [User B]       │  ─────────────────────────────    │
│  [User C]       │  [user msg]              Jun 1    │
│                 │              [admin reply] Jun 1  │
│                 │  ─────────────────────────────    │
│                 │  [textarea] [select order] [Send] │
└─────────────────┴──────────────────────────────────┘
```

- Left column: `240px` fixed, scrollable
- Right column: `flex: 1`, scrollable thread + sticky reply form at bottom
- On mobile (`< tablet`): one column — list view, click → thread view, back button in thread header

### `ConversationList.vue`

Props: `conversations: ConversationPreview[]`, `selectedUserId: string | null`
Emits: `select(userId: string)`

Each row:
- Name (bold) + email (muted, small)
- Preview of `lastMessageText` (truncated to 1 line)
- Date (right-aligned, small)
- Unread badge (circle with count) if `unreadCount > 0`
- Active row: accent left border

### `ConversationThread.vue`

Props: `thread: ConversationDetail | null`, `sending: boolean`
Emits: `reply({ text, orderId? })`, `back()`

Message bubbles:
- `fromAdmin: false` (user) — left-aligned, white background, border
- `fromAdmin: true` (admin) — right-aligned, `rgb(var(--btn-gradient-light) / 0.15)` background, label "NatsDoll"
- Each bubble: order tag `Re: Order #N` if applicable, text, timestamp

Reply form:
- `<select>` with user's orders (optional, default "Not related to order")
- `<textarea>` min 2 rows
- Submit button disabled while `sending` or text is empty

### Updated `AccountMessages.vue`

Extend existing message items to differentiate direction:
- `fromAdmin: false` — existing style (right side)
- `fromAdmin: true` — left side, muted background, sender label "NatsDoll"

No form changes needed.

---

## Data Flow

```
Admin opens Messages tab
  → AdminMessages mounted
  → useConversations() fetches GET /admin/messages/conversations
  → ConversationList renders

Admin clicks a user
  → selectedUserId set
  → useConversationThread watches userId, fetches GET /admin/messages/conversations/:userId
  → PATCH /admin/messages/conversations/:userId/mark-read fires automatically
  → ConversationThread renders with messages + reply form

Admin submits reply
  → POST /admin/messages/reply { userId, text, orderId? }
  → thread refetched
  → conversations refetched to update lastMessage / unreadCount
```

---

## Error Handling

- Load failures: show inline error with retry button (same pattern as `AdminDashboard`)
- Reply failure: show error text below form, keep textarea contents
- `orderId` validation: if provided order doesn't belong to the user → API returns 403 → show error

---

## Out of Scope

- Real-time updates (WebSocket / polling) — manual refresh only
- Message deletion
- File/image attachments
- Email notifications on admin reply
