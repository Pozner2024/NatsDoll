# PayPal Payments (Склад ЮСА) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Принимать оплату заказов через PayPal на аккаунт посредника «Склад ЮСА»; креды настраиваются через админку; модуль адаптивный (server-режим при заданном Secret, client-режим при пустом).

**Architecture:** Новая 3-слойная feature `apps/api/src/features/payments` (infrastructure/application/presentation), собирается в `app.ts`. Сток списывается в момент оплаты (`markOrderPaid`), а не при оформлении. На фронте — компонент PayPal-кнопки + раздел настроек в админке.

**Tech Stack:** Hono, Prisma/PostgreSQL, Zod (v3), Node `crypto` (AES-256-GCM), PayPal Orders v2 REST API + PayPal JS SDK, Nuxt 4/Vue 3/Pinia, Vitest.

**Спек:** `docs/superpowers/specs/2026-06-17-paypal-payments-design.md`

---

## Карта файлов

**Создать (api):**
- `apps/api/src/features/payments/infrastructure/secretCrypto.ts` — шифр/дешифр Secret (AES-256-GCM)
- `apps/api/src/features/payments/infrastructure/secretCrypto.test.ts`
- `apps/api/src/features/payments/infrastructure/paypalClient.ts` — обёртка PayPal Orders v2
- `apps/api/src/features/payments/infrastructure/paypalClient.test.ts`
- `apps/api/src/features/payments/infrastructure/paymentRepository.ts`
- `apps/api/src/features/payments/application/getPaymentSettings.ts`
- `apps/api/src/features/payments/application/updatePaymentSettings.ts`
- `apps/api/src/features/payments/application/getPaymentConfig.ts`
- `apps/api/src/features/payments/application/createPaypalOrder.ts`
- `apps/api/src/features/payments/application/capturePaypalPayment.ts`
- `apps/api/src/features/payments/application/claimPaypalPayment.ts`
- `apps/api/src/features/payments/application/markOrderPaid.ts`
- `apps/api/src/features/payments/application/*.test.ts` (рядом с каждым use-case)
- `apps/api/src/features/payments/presentation/paymentRoutes.ts` (+ `.test.ts`)
- `apps/api/src/features/payments/presentation/adminPaymentRoutes.ts` (+ `.test.ts`)
- `apps/api/src/features/payments/types.ts`
- `apps/api/src/features/payments/index.ts`

**Модифицировать (api):**
- `apps/api/prisma/schema.prisma` — модель `PaymentSettings`, enum `PaymentMode`, поле `Order.paypalCaptureId`
- `apps/api/src/features/orders/infrastructure/orderRepository.ts` — убрать списание стока из `createOrderFromCart`
- `apps/api/src/app.ts` — composition root для payments
- `.env.example` — `PAYMENT_ENCRYPTION_KEY`

**Создать (web):**
- `apps/web/src/features/paypal-payment/PaypalPayment.vue` (+ `index.ts`, `paypalPaymentApi.ts`)
- `apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.vue`
- `apps/web/src/widgets/admin-panel/adminPaymentApi.ts`
- `apps/web/src/widgets/admin-panel/components/icons/IconPayment.vue`

**Модифицировать (web):**
- `apps/web/src/widgets/admin-panel/components/AdminSidebar.vue` — пункт меню
- `apps/web/src/widgets/admin-panel/AdminPanel.vue` — рендер раздела
- `apps/web/src/pages/OrderConfirmationPage.vue` — кнопка оплаты для PENDING

---

## Фаза 0 — Схема БД

### Task 0.1: Модель PaymentSettings + поля Order

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Добавить модель и enum** (после модели `Sale`, рядом с другими настройками)

```prisma
model PaymentSettings {
  id             String      @id @default("default")
  enabled        Boolean     @default(false)
  mode           PaymentMode @default(SANDBOX)
  paypalClientId String?
  paypalSecret   String?     // AES-256-GCM ciphertext; null = client-режим
  updatedAt      DateTime    @updatedAt
}

enum PaymentMode {
  SANDBOX
  LIVE
}
```

- [ ] **Step 2: Добавить поле в модель `Order`** (рядом с существующим `paypalOrderId`)

```prisma
  paypalCaptureId String?
```

- [ ] **Step 3: Создать миграцию**

Run: `npx prisma migrate dev -n payment_settings -w apps/api`
Expected: миграция создана, `prisma generate` отработал без ошибок.

- [ ] **Step 4: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations
git commit -m "feat(api): add PaymentSettings model and Order.paypalCaptureId"
```

---

## Фаза 1 — Шифрование Secret

### Task 1.1: secretCrypto (AES-256-GCM)

**Files:**
- Create: `apps/api/src/features/payments/infrastructure/secretCrypto.ts`
- Test: `apps/api/src/features/payments/infrastructure/secretCrypto.test.ts`

- [ ] **Step 1: Написать падающий тест**

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { encryptSecret, decryptSecret } from './secretCrypto'

describe('secretCrypto', () => {
  beforeEach(() => {
    // 32 байта в hex
    process.env.PAYMENT_ENCRYPTION_KEY = '0'.repeat(64)
  })

  it('round-trips a secret', () => {
    const enc = encryptSecret('my-paypal-secret')
    expect(enc).not.toBe('my-paypal-secret')
    expect(decryptSecret(enc)).toBe('my-paypal-secret')
  })

  it('produces different ciphertext each call (random IV)', () => {
    expect(encryptSecret('x')).not.toBe(encryptSecret('x'))
  })

  it('throws when key is missing', () => {
    delete process.env.PAYMENT_ENCRYPTION_KEY
    expect(() => encryptSecret('x')).toThrow()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api secretCrypto --reporter=basic`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать**

```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const KEY_LENGTH = 32

function getKey(): Buffer {
  const hex = process.env.PAYMENT_ENCRYPTION_KEY
  if (!hex) {
    throw new Error('PAYMENT_ENCRYPTION_KEY is not set')
  }
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error('PAYMENT_ENCRYPTION_KEY must be 32 bytes (64 hex chars)')
  }
  return key
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${tag.toString('base64')}:${ciphertext.toString('base64')}`
}

export function decryptSecret(encoded: string): string {
  const [ivB64, tagB64, dataB64] = encoded.split(':')
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error('Invalid encrypted secret format')
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8')
}
```

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api secretCrypto --reporter=basic`
Expected: PASS (3 теста).

- [ ] **Step 5: Добавить ключ в `.env.example`**

В секцию `# PayPal` файла `.env.example` добавить:
```
# 32 байта в hex (64 символа). Сгенерировать: openssl rand -hex 32
PAYMENT_ENCRYPTION_KEY=
```

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/payments/infrastructure/secretCrypto.ts apps/api/src/features/payments/infrastructure/secretCrypto.test.ts .env.example
git commit -m "feat(api): add AES-256-GCM secretCrypto for PayPal secret"
```

---

## Фаза 2 — PayPal клиент

### Task 2.1: types.ts (общие типы payments)

**Files:**
- Create: `apps/api/src/features/payments/types.ts`

- [ ] **Step 1: Написать типы** (тестов нет — только определения)

```ts
export type PaymentMode = 'SANDBOX' | 'LIVE'

export interface PaypalCreds {
  clientId: string
  secret: string
  mode: PaymentMode
}

export interface CreatedPaypalOrder {
  paypalOrderId: string
}

export interface CapturedPayment {
  status: string        // 'COMPLETED' при успехе
  captureId: string | null
}

export interface PaypalClient {
  createOrder(input: { creds: PaypalCreds; amountUsd: number; invoiceId: string }): Promise<CreatedPaypalOrder>
  captureOrder(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
  getOrderStatus(input: { creds: PaypalCreds; paypalOrderId: string }): Promise<CapturedPayment>
}

// --- Settings ---
export interface PaymentSettingsView {
  enabled: boolean
  mode: PaymentMode
  clientId: string | null
  hasSecret: boolean
}

export interface UpdatePaymentSettingsInput {
  enabled: boolean
  mode: PaymentMode
  clientId: string | null
  secret?: string | null   // undefined = не трогать; '' или null = очистить; строка = заменить
}

export interface PublicPaymentConfig {
  enabled: boolean
  clientId: string | null
  mode: PaymentMode
  serverFlow: boolean      // true = Secret задан
}

// --- Repository ---
export interface OrderForPayment {
  id: string
  userId: string
  orderNumber: number
  status: string
  totalAmount: number
  paypalOrderId: string | null
}

export interface PaymentRepository {
  getSettings(): Promise<{ enabled: boolean; mode: PaymentMode; clientId: string | null; secret: string | null } | null>
  upsertSettings(data: { enabled: boolean; mode: PaymentMode; clientId: string | null; secret: string | null | undefined }): Promise<void>
  getOrderForPayment(orderId: string): Promise<OrderForPayment | null>
  setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void>
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/features/payments/types.ts
git commit -m "feat(api): add payments feature types"
```

### Task 2.2: paypalClient

**Files:**
- Create: `apps/api/src/features/payments/infrastructure/paypalClient.ts`
- Test: `apps/api/src/features/payments/infrastructure/paypalClient.test.ts`

- [ ] **Step 1: Написать падающий тест** (мок глобального `fetch`)

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makePaypalClient } from './paypalClient'
import type { PaypalCreds } from '../types'

const creds: PaypalCreds = { clientId: 'cid', secret: 'sec', mode: 'SANDBOX' }

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    })
  }
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => vi.unstubAllGlobals())

describe('paypalClient.createOrder', () => {
  it('gets token then creates order and returns id', async () => {
    const fetchFn = mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { id: 'PAYPAL-1' } },
    ])
    const client = makePaypalClient()
    const res = await client.createOrder({ creds, amountUsd: 42.5, invoiceId: 'natsdoll-7' })
    expect(res.paypalOrderId).toBe('PAYPAL-1')
    // sandbox base url
    expect(String(fetchFn.mock.calls[0][0])).toContain('api-m.sandbox.paypal.com')
    // сумма и invoice ушли в теле create-order
    const body = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(body.purchase_units[0].amount.value).toBe('42.50')
    expect(body.purchase_units[0].invoice_id).toBe('natsdoll-7')
  })
})

describe('paypalClient.captureOrder', () => {
  it('returns COMPLETED with captureId', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
    expect(res.captureId).toBe('CAP-1')
  })

  it('treats ORDER_ALREADY_CAPTURED as success', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: false, status: 422, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api paypalClient --reporter=basic`
Expected: FAIL (модуль не найден).

- [ ] **Step 3: Реализовать**

```ts
import { randomUUID } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import type { PaypalClient, PaypalCreds, CreatedPaypalOrder, CapturedPayment } from '../types'

function baseUrl(mode: PaypalCreds['mode']): string {
  return mode === 'LIVE' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

async function getAccessToken(creds: PaypalCreds): Promise<string> {
  const auth = Buffer.from(`${creds.clientId}:${creds.secret}`).toString('base64')
  const res = await fetch(`${baseUrl(creds.mode)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) {
    throw new AppError(502, 'PayPal authentication failed')
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) {
    throw new AppError(502, 'PayPal authentication failed')
  }
  return data.access_token
}

function extractCaptureId(body: unknown): string | null {
  const pu = (body as { purchase_units?: Array<{ payments?: { captures?: Array<{ id?: string }> } }> }).purchase_units
  return pu?.[0]?.payments?.captures?.[0]?.id ?? null
}

export function makePaypalClient(): PaypalClient {
  return {
    async createOrder({ creds, amountUsd, invoiceId }): Promise<CreatedPaypalOrder> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': invoiceId,
        },
        body: JSON.stringify({
          intent: 'CAPTURE',
          purchase_units: [{
            invoice_id: invoiceId,
            custom_id: invoiceId,
            amount: { currency_code: 'USD', value: amountUsd.toFixed(2) },
          }],
        }),
      })
      if (!res.ok) {
        throw new AppError(502, 'Failed to create PayPal order')
      }
      const data = (await res.json()) as { id?: string }
      if (!data.id) {
        throw new AppError(502, 'Failed to create PayPal order')
      }
      return { paypalOrderId: data.id }
    },

    async captureOrder({ creds, paypalOrderId }): Promise<CapturedPayment> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          'PayPal-Request-Id': `cap-${paypalOrderId}`,
        },
      })
      const body = (await res.json().catch(() => ({}))) as { status?: string; details?: Array<{ issue?: string }> }
      if (!res.ok) {
        if (body.details?.some((d) => d.issue === 'ORDER_ALREADY_CAPTURED')) {
          return { status: 'COMPLETED', captureId: null }
        }
        throw new AppError(502, 'Failed to capture PayPal payment')
      }
      return { status: body.status ?? 'UNKNOWN', captureId: extractCaptureId(body) }
    },

    async getOrderStatus({ creds, paypalOrderId }): Promise<CapturedPayment> {
      const token = await getAccessToken(creds)
      const res = await fetch(`${baseUrl(creds.mode)}/v2/checkout/orders/${paypalOrderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        throw new AppError(502, 'Failed to fetch PayPal order')
      }
      const body = (await res.json()) as { status?: string }
      return { status: body.status ?? 'UNKNOWN', captureId: extractCaptureId(body) }
    },
  }
}
```
Примечание: `randomUUID` импортирован для возможной генерации request-id, но мы используем детерминированные id (`invoiceId`, `cap-...`) для идемпотентности — импорт можно убрать, если линтер ругается на unused.

- [ ] **Step 4: Запустить — убедиться, что проходит**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api paypalClient --reporter=basic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments/infrastructure/paypalClient.ts apps/api/src/features/payments/infrastructure/paypalClient.test.ts
git commit -m "feat(api): add PayPal Orders v2 client wrapper"
```

---

## Фаза 3 — Репозиторий и use-cases настроек

### Task 3.1: paymentRepository

**Files:**
- Create: `apps/api/src/features/payments/infrastructure/paymentRepository.ts`

- [ ] **Step 1: Реализовать** (без отдельного unit-теста — покрывается интеграционно через use-cases)

```ts
import type { PrismaClient } from '@prisma/client'
import type { PaymentRepository, PaymentMode, OrderForPayment } from '../types'

const SETTINGS_ID = 'default'

export function makePaymentRepository(prisma: PrismaClient): PaymentRepository {
  return {
    async getSettings() {
      const s = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } })
      if (!s) return null
      return {
        enabled: s.enabled,
        mode: s.mode as PaymentMode,
        clientId: s.paypalClientId,
        secret: s.paypalSecret,
      }
    },

    async upsertSettings(data) {
      // secret === undefined → не трогаем существующее значение
      const secretUpdate = data.secret === undefined ? {} : { paypalSecret: data.secret }
      await prisma.paymentSettings.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          enabled: data.enabled,
          mode: data.mode,
          paypalClientId: data.clientId,
          paypalSecret: data.secret ?? null,
        },
        update: {
          enabled: data.enabled,
          mode: data.mode,
          paypalClientId: data.clientId,
          ...secretUpdate,
        },
      })
    },

    async getOrderForPayment(orderId: string): Promise<OrderForPayment | null> {
      const o = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, userId: true, orderNumber: true, status: true, totalAmount: true, paypalOrderId: true },
      })
      if (!o) return null
      return { ...o, totalAmount: o.totalAmount.toNumber() }
    },

    async setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
      await prisma.order.update({ where: { id: orderId }, data: { paypalOrderId } })
    },
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/features/payments/infrastructure/paymentRepository.ts
git commit -m "feat(api): add payment repository"
```

### Task 3.2: getPaymentSettings + updatePaymentSettings + getPaymentConfig

**Files:**
- Create: `getPaymentSettings.ts`, `updatePaymentSettings.ts`, `getPaymentConfig.ts` (+ тесты) в `application/`

- [ ] **Step 1: Тест для updatePaymentSettings** (шифрование + правило «enabled требует clientId»)

```ts
// updatePaymentSettings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeUpdatePaymentSettings } from './updatePaymentSettings'
import { decryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository } from '../types'

beforeEach(() => { process.env.PAYMENT_ENCRYPTION_KEY = '0'.repeat(64) })

function repoStub(): PaymentRepository & { saved: unknown } {
  const r = {
    saved: null as unknown,
    async getSettings() { return null },
    async upsertSettings(data: unknown) { r.saved = data },
    async getOrderForPayment() { return null },
    async setPaypalOrderId() {},
  }
  return r
}

describe('updatePaymentSettings', () => {
  it('encrypts secret before saving', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({ enabled: false, mode: 'SANDBOX', clientId: 'cid', secret: 'plain-secret' })
    const saved = repo.saved as { paypalSecret?: string; secret?: string }
    const stored = (saved as { secret?: string }).secret as string
    expect(stored).not.toBe('plain-secret')
    expect(decryptSecret(stored)).toBe('plain-secret')
  })

  it('rejects enabling without clientId', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await expect(update({ enabled: true, mode: 'LIVE', clientId: null, secret: undefined })).rejects.toThrow()
  })

  it('passes secret:undefined through (keep existing)', async () => {
    const repo = repoStub()
    const update = makeUpdatePaymentSettings(repo)
    await update({ enabled: false, mode: 'SANDBOX', clientId: 'cid', secret: undefined })
    expect((repo.saved as { secret?: unknown }).secret).toBeUndefined()
  })
})
```

- [ ] **Step 2: Запустить — FAIL**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api updatePaymentSettings --reporter=basic`
Expected: FAIL.

- [ ] **Step 3: Реализовать три use-case'а**

`updatePaymentSettings.ts`:
```ts
import { AppError } from '../../../shared/errors'
import { encryptSecret } from '../infrastructure/secretCrypto'
import type { PaymentRepository, UpdatePaymentSettingsInput } from '../types'

export type UpdatePaymentSettings = (input: UpdatePaymentSettingsInput) => Promise<void>

export function makeUpdatePaymentSettings(repo: PaymentRepository): UpdatePaymentSettings {
  return async (input) => {
    if (input.enabled && !input.clientId) {
      throw new AppError(400, 'Client ID is required to enable payments')
    }
    let secret: string | null | undefined
    if (input.secret === undefined) {
      secret = undefined
    } else if (input.secret === null || input.secret === '') {
      secret = null
    } else {
      secret = encryptSecret(input.secret)
    }
    await repo.upsertSettings({
      enabled: input.enabled,
      mode: input.mode,
      clientId: input.clientId,
      secret,
    })
  }
}
```

`getPaymentSettings.ts`:
```ts
import type { PaymentRepository, PaymentSettingsView } from '../types'

export type GetPaymentSettings = () => Promise<PaymentSettingsView>

export function makeGetPaymentSettings(repo: PaymentRepository): GetPaymentSettings {
  return async () => {
    const s = await repo.getSettings()
    if (!s) {
      return { enabled: false, mode: 'SANDBOX', clientId: null, hasSecret: false }
    }
    return { enabled: s.enabled, mode: s.mode, clientId: s.clientId, hasSecret: s.secret !== null }
  }
}
```

`getPaymentConfig.ts`:
```ts
import type { PaymentRepository, PublicPaymentConfig } from '../types'

export type GetPaymentConfig = () => Promise<PublicPaymentConfig>

export function makeGetPaymentConfig(repo: PaymentRepository): GetPaymentConfig {
  return async () => {
    const s = await repo.getSettings()
    if (!s || !s.enabled) {
      return { enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false }
    }
    return { enabled: true, clientId: s.clientId, mode: s.mode, serverFlow: s.secret !== null }
  }
}
```

- [ ] **Step 4: Запустить — PASS**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api updatePaymentSettings --reporter=basic`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments/application/getPaymentSettings.ts apps/api/src/features/payments/application/updatePaymentSettings.ts apps/api/src/features/payments/application/getPaymentConfig.ts apps/api/src/features/payments/application/updatePaymentSettings.test.ts
git commit -m "feat(api): add payment settings use-cases"
```

---

## Фаза 4 — Оплата: use-cases markOrderPaid / create / capture / claim

### Task 4.1: markOrderPaid (единая операция перевода в PAID + сток)

**Files:**
- Create: `apps/api/src/features/payments/application/markOrderPaid.ts` (+ `.test.ts`)

Контракт репозитория расширяем: `markOrderPaid` работает через метод репозитория, который выполняет транзакцию. Добавить в `PaymentRepository` (types.ts) метод:

```ts
  // добавить в PaymentRepository:
  markOrderPaid(orderId: string, captureId: string | null): Promise<void>
```

И реализовать в `paymentRepository.ts` (транзакция с CAS-списанием стока, как в orderRepository.createOrderFromCart):

```ts
    async markOrderPaid(orderId: string, captureId: string | null): Promise<void> {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, items: { select: { productId: true, quantity: true, product: { select: { name: true } } } } },
        })
        if (!order) throw new AppError(404, 'Order not found')
        if (order.status === 'PAID') return // идемпотентность

        const stockIssues: string[] = []
        for (const item of order.items) {
          const { count } = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (count === 0) stockIssues.push(item.product.name)
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paypalCaptureId: captureId,
            ...(stockIssues.length > 0
              ? { adminNote: `⚠ Проверить остаток: ${stockIssues.join(', ')}` }
              : {}),
          },
        })
      })
    },
```
(добавить `import { AppError } from '../../../shared/errors'` в paymentRepository.ts)

- [ ] **Step 1: Тест use-case markOrderPaid** (мок репозитория — проверяем делегирование)

```ts
import { describe, it, expect, vi } from 'vitest'
import { makeMarkOrderPaid } from './markOrderPaid'

describe('markOrderPaid', () => {
  it('delegates to repository with orderId and captureId', async () => {
    const repo = { markOrderPaid: vi.fn().mockResolvedValue(undefined) }
    const markPaid = makeMarkOrderPaid(repo as never)
    await markPaid('order-1', 'CAP-1')
    expect(repo.markOrderPaid).toHaveBeenCalledWith('order-1', 'CAP-1')
  })
})
```

- [ ] **Step 2: FAIL**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api markOrderPaid --reporter=basic`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

```ts
import type { PaymentRepository } from '../types'

export type MarkOrderPaid = (orderId: string, captureId: string | null) => Promise<void>

export function makeMarkOrderPaid(repo: Pick<PaymentRepository, 'markOrderPaid'>): MarkOrderPaid {
  return (orderId, captureId) => repo.markOrderPaid(orderId, captureId)
}
```

- [ ] **Step 4: PASS** (тот же запуск).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments/application/markOrderPaid.ts apps/api/src/features/payments/application/markOrderPaid.test.ts apps/api/src/features/payments/infrastructure/paymentRepository.ts apps/api/src/features/payments/types.ts
git commit -m "feat(api): add markOrderPaid with CAS stock decrement"
```

### Task 4.2: createPaypalOrder + capturePaypalPayment + claimPaypalPayment

**Files:**
- Create: `createPaypalOrder.ts`, `capturePaypalPayment.ts`, `claimPaypalPayment.ts` (+ тесты)

Общие правила: проверять владельца (`order.userId === userId`), `status === 'PENDING'`, что оплата включена. Метка `natsdoll-${order.orderNumber}`.

- [ ] **Step 1: Тесты** (`createPaypalOrder.test.ts`)

```ts
import { describe, it, expect, vi } from 'vitest'
import { makeCreatePaypalOrder } from './createPaypalOrder'

const order = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 42.5, paypalOrderId: null }

function deps(over: Partial<Record<string, unknown>> = {}) {
  return {
    repo: {
      getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc' }),
      getOrderForPayment: vi.fn().mockResolvedValue(order),
      setPaypalOrderId: vi.fn().mockResolvedValue(undefined),
      ...((over.repo as object) ?? {}),
    },
    paypal: { createOrder: vi.fn().mockResolvedValue({ paypalOrderId: 'PP-1' }) },
    decrypt: vi.fn().mockReturnValue('plain-secret'),
  }
}

describe('createPaypalOrder', () => {
  it('creates paypal order with natsdoll- invoice and persists id', async () => {
    const d = deps()
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    const res = await uc('u1', 'o1')
    expect(d.paypal.createOrder).toHaveBeenCalledWith({
      creds: { clientId: 'cid', secret: 'plain-secret', mode: 'SANDBOX' },
      amountUsd: 42.5,
      invoiceId: 'natsdoll-7',
    })
    expect(d.repo.setPaypalOrderId).toHaveBeenCalledWith('o1', 'PP-1')
    expect(res.paypalOrderId).toBe('PP-1')
  })

  it('rejects when order belongs to another user', async () => {
    const d = deps()
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    await expect(uc('other', 'o1')).rejects.toThrow()
  })

  it('rejects when secret is missing (client-режим)', async () => {
    const d = deps({ repo: { getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: null }) } })
    const uc = makeCreatePaypalOrder(d.repo as never, d.paypal as never, d.decrypt as never)
    await expect(uc('u1', 'o1')).rejects.toThrow()
  })
})
```

- [ ] **Step 2: FAIL**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api createPaypalOrder --reporter=basic`
Expected: FAIL.

- [ ] **Step 3: Реализовать**

`createPaypalOrder.ts`:
```ts
import { AppError } from '../../../shared/errors'
import type { PaymentRepository, PaypalClient } from '../types'

export type CreatePaypalOrder = (userId: string, orderId: string) => Promise<{ paypalOrderId: string }>

export function makeCreatePaypalOrder(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment' | 'setPaypalOrderId'>,
  paypal: Pick<PaypalClient, 'createOrder'>,
  decrypt: (s: string) => string,
): CreatePaypalOrder {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings || !settings.enabled || !settings.clientId) {
      throw new AppError(409, 'Payments are not configured')
    }
    if (!settings.secret) {
      throw new AppError(409, 'Server-side payment is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      throw new AppError(409, 'Order is not awaiting payment')
    }
    const { paypalOrderId } = await paypal.createOrder({
      creds: { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode },
      amountUsd: order.totalAmount,
      invoiceId: `natsdoll-${order.orderNumber}`,
    })
    await repo.setPaypalOrderId(orderId, paypalOrderId)
    return { paypalOrderId }
  }
}
```

`capturePaypalPayment.ts`:
```ts
import { AppError } from '../../../shared/errors'
import type { PaymentRepository, PaypalClient } from '../types'
import type { MarkOrderPaid } from './markOrderPaid'

export type CapturePaypalPayment = (userId: string, orderId: string) => Promise<{ status: string }>

export function makeCapturePaypalPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForPayment'>,
  paypal: Pick<PaypalClient, 'captureOrder'>,
  markOrderPaid: MarkOrderPaid,
  decrypt: (s: string) => string,
): CapturePaypalPayment {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings || !settings.clientId || !settings.secret) {
      throw new AppError(409, 'Server-side payment is not available')
    }
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status === 'PAID') {
      return { status: 'COMPLETED' }
    }
    if (!order.paypalOrderId) {
      throw new AppError(409, 'No PayPal order to capture')
    }
    const result = await paypal.captureOrder({
      creds: { clientId: settings.clientId, secret: decrypt(settings.secret), mode: settings.mode },
      paypalOrderId: order.paypalOrderId,
    })
    if (result.status !== 'COMPLETED') {
      throw new AppError(402, 'Payment was not completed')
    }
    await markOrderPaid(orderId, result.captureId)
    return { status: 'COMPLETED' }
  }
}
```

`claimPaypalPayment.ts` (client-режим — фиксируем paypalOrderId, статус НЕ меняем):
```ts
import { AppError } from '../../../shared/errors'
import type { PaymentRepository } from '../types'

export type ClaimPaypalPayment = (userId: string, orderId: string, paypalOrderId: string) => Promise<void>

export function makeClaimPaypalPayment(
  repo: Pick<PaymentRepository, 'getOrderForPayment' | 'setPaypalOrderId'>,
): ClaimPaypalPayment {
  return async (userId, orderId, paypalOrderId) => {
    const order = await repo.getOrderForPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      return
    }
    await repo.setPaypalOrderId(orderId, paypalOrderId)
  }
}
```

- [ ] **Step 4: PASS**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api createPaypalOrder --reporter=basic`
Expected: PASS (3 теста).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/payments/application/createPaypalOrder.ts apps/api/src/features/payments/application/capturePaypalPayment.ts apps/api/src/features/payments/application/claimPaypalPayment.ts apps/api/src/features/payments/application/createPaypalOrder.test.ts
git commit -m "feat(api): add create/capture/claim PayPal payment use-cases"
```

---

## Фаза 5 — Маршруты и composition root

### Task 5.1: paymentRoutes (public + checkout)

**Files:**
- Create: `apps/api/src/features/payments/presentation/paymentRoutes.ts`

- [ ] **Step 1: Реализовать**

```ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import { requireAuth } from '../../../shared/middleware'
import type { GetPaymentConfig } from '../application/getPaymentConfig'
import type { CreatePaypalOrder } from '../application/createPaypalOrder'
import type { CapturePaypalPayment } from '../application/capturePaypalPayment'
import type { ClaimPaypalPayment } from '../application/claimPaypalPayment'

const orderIdSchema = z.object({ orderId: z.string().min(1) })
const claimSchema = z.object({ orderId: z.string().min(1), paypalOrderId: z.string().min(1) })

export function makePaymentRouter(
  getPaymentConfig: GetPaymentConfig,
  createPaypalOrder: CreatePaypalOrder,
  capturePaypalPayment: CapturePaypalPayment,
  claimPaypalPayment: ClaimPaypalPayment,
) {
  const router = new Hono()

  router.get('/config', async (c) => c.json(await getPaymentConfig()))

  router.post('/paypal/create-order', requireAuth, zValidator('json', orderIdSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId } = c.req.valid('json')
    return c.json(await createPaypalOrder(userId, orderId))
  })

  router.post('/paypal/capture', requireAuth, zValidator('json', orderIdSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId } = c.req.valid('json')
    return c.json(await capturePaypalPayment(userId, orderId))
  })

  router.post('/paypal/claim', requireAuth, zValidator('json', claimSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId, paypalOrderId } = c.req.valid('json')
    await claimPaypalPayment(userId, orderId, paypalOrderId)
    return c.json({ ok: true })
  })

  return router
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/features/payments/presentation/paymentRoutes.ts
git commit -m "feat(api): add payment routes (config/create/capture/claim)"
```

### Task 5.2: adminPaymentRoutes

**Files:**
- Create: `apps/api/src/features/payments/presentation/adminPaymentRoutes.ts`

- [ ] **Step 1: Реализовать** (защита `requireAuth` + `requireAdmin`)

```ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import { requireAuth, requireAdmin } from '../../../shared/middleware'
import type { GetPaymentSettings } from '../application/getPaymentSettings'
import type { UpdatePaymentSettings } from '../application/updatePaymentSettings'

const updateSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  clientId: z.string().max(200).nullable(),
  secret: z.string().max(200).nullable().optional(),
})

export function makeAdminPaymentRouter(
  getPaymentSettings: GetPaymentSettings,
  updatePaymentSettings: UpdatePaymentSettings,
) {
  const router = new Hono()
  router.use('*', requireAuth, requireAdmin)

  router.get('/', async (c) => c.json(await getPaymentSettings()))

  router.put('/', zValidator('json', updateSchema), async (c) => {
    await updatePaymentSettings(c.req.valid('json'))
    return c.json(await getPaymentSettings())
  })

  return router
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/features/payments/presentation/adminPaymentRoutes.ts
git commit -m "feat(api): add admin payment-settings routes"
```

### Task 5.3: index.ts + composition в app.ts

**Files:**
- Create: `apps/api/src/features/payments/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: index.ts** (публичный API feature)

```ts
export { makePaymentRepository } from './infrastructure/paymentRepository'
export { makePaypalClient } from './infrastructure/paypalClient'
export { encryptSecret, decryptSecret } from './infrastructure/secretCrypto'
export { makeGetPaymentSettings } from './application/getPaymentSettings'
export { makeUpdatePaymentSettings } from './application/updatePaymentSettings'
export { makeGetPaymentConfig } from './application/getPaymentConfig'
export { makeCreatePaypalOrder } from './application/createPaypalOrder'
export { makeCapturePaypalPayment } from './application/capturePaypalPayment'
export { makeClaimPaypalPayment } from './application/claimPaypalPayment'
export { makeMarkOrderPaid } from './application/markOrderPaid'
export { makePaymentRouter } from './presentation/paymentRoutes'
export { makeAdminPaymentRouter } from './presentation/adminPaymentRoutes'
```

- [ ] **Step 2: В `app.ts` добавить импорт и wiring** (после блока Orders, до Favorites)

Импорт (рядом с другими feature-импортами):
```ts
import {
  makePaymentRepository,
  makePaypalClient,
  decryptSecret,
  makeGetPaymentSettings,
  makeUpdatePaymentSettings,
  makeGetPaymentConfig,
  makeCreatePaypalOrder,
  makeCapturePaypalPayment,
  makeClaimPaypalPayment,
  makeMarkOrderPaid,
  makePaymentRouter,
  makeAdminPaymentRouter,
} from './features/payments'
```

Wiring (после `app.route('/', makeOrderRouter(...))`):
```ts
  // Payments
  const paymentRepo = makePaymentRepository(prisma)
  const paypalClient = makePaypalClient()
  const markOrderPaid = makeMarkOrderPaid(paymentRepo)
  const getPaymentSettings = makeGetPaymentSettings(paymentRepo)
  const updatePaymentSettings = makeUpdatePaymentSettings(paymentRepo)
  const getPaymentConfig = makeGetPaymentConfig(paymentRepo)
  const createPaypalOrder = makeCreatePaypalOrder(paymentRepo, paypalClient, decryptSecret)
  const capturePaypalPayment = makeCapturePaypalPayment(paymentRepo, paypalClient, markOrderPaid, decryptSecret)
  const claimPaypalPayment = makeClaimPaypalPayment(paymentRepo)
  app.route('/payments', makePaymentRouter(getPaymentConfig, createPaypalOrder, capturePaypalPayment, claimPaypalPayment))
  app.route('/admin/payment-settings', makeAdminPaymentRouter(getPaymentSettings, updatePaymentSettings))
```

- [ ] **Step 3: Typecheck**

Run: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: без ошибок. (Если ложно-зелёный/устаревший — `npx prisma generate -w apps/api` и удалить `apps/api/dist`.)

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/features/payments/index.ts apps/api/src/app.ts
git commit -m "feat(api): wire payments feature into composition root"
```

---

## Фаза 6 — Заказы: сток списывается при оплате

### Task 6.1: Убрать списание стока из createOrderFromCart

**Files:**
- Modify: `apps/api/src/features/orders/infrastructure/orderRepository.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.test.ts` (и `orderRoutes.test.ts` при необходимости)

- [ ] **Step 1: Обновить тест createOrder** — заказ создаётся БЕЗ изменения стока

Найти в `createOrder.test.ts` / `orderRepository`-связанных тестах ассерты, проверяющие `stock decrement` при оформлении, и заменить на проверку, что `product.updateMany`/decrement НЕ вызывается на этапе создания заказа. (Точные строки — по факту; цель: оформление не трогает сток.)

- [ ] **Step 2: Запустить — FAIL** (старый код ещё списывает сток)

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api orders --reporter=basic`
Expected: FAIL на обновлённом тесте.

- [ ] **Step 3: Удалить CAS-блок списания стока** из `createOrderFromCart`

В `orderRepository.ts` удалить цикл `for (const item of items) { const { count } = await tx.product.updateMany({... stock decrement ...}) ... }` (строки списания стока внутри транзакции). Оставить: перечитывание цен, формирование `orderItems`, `tx.order.create`, `tx.cartItem.deleteMany`. Заказ остаётся `PENDING` (default), сток не трогаем.

Примечание: проверка доступности/наличия товара уже делается раньше в `createOrder.ts` (application). Финальное CAS-списание происходит позже, в `markOrderPaid`.

- [ ] **Step 4: Запустить — PASS**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api orders --reporter=basic`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/orders/infrastructure/orderRepository.ts apps/api/src/features/orders/application/createOrder.test.ts
git commit -m "refactor(api): defer stock decrement from order creation to payment"
```

### Task 6.2: updateAdminOrder → markOrderPaid при ручном переводе в PAID

**Files:**
- Modify: `apps/api/src/features/admin/application/updateAdminOrder.ts`
- Modify: `apps/api/src/app.ts` (передать `markOrderPaid` в `makeUpdateAdminOrder`)

- [ ] **Step 1: Тест** — при `status: 'PAID'` вызывается `markOrderPaid(orderId, null)`

```ts
// в updateAdminOrder.test.ts (создать, если нет)
import { describe, it, expect, vi } from 'vitest'
import { makeUpdateAdminOrder } from './updateAdminOrder'

describe('updateAdminOrder', () => {
  it('calls markOrderPaid when status set to PAID', async () => {
    const repo = { updateAdminOrder: vi.fn().mockResolvedValue(null) }
    const email = { sendTrackingNotification: vi.fn() }
    const markOrderPaid = vi.fn().mockResolvedValue(undefined)
    const uc = makeUpdateAdminOrder(repo as never, email as never, markOrderPaid)
    await uc('o1', { status: 'PAID' } as never)
    expect(markOrderPaid).toHaveBeenCalledWith('o1', null)
  })
})
```

- [ ] **Step 2: FAIL** (сигнатура ещё без markOrderPaid)

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api updateAdminOrder --reporter=basic`
Expected: FAIL.

- [ ] **Step 3: Реализовать** — добавить третий параметр и вызов до/вместо обычного апдейта статуса

```ts
import type { AdminRepository, UpdateAdminOrder, UpdateOrderInput } from '../types'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { MarkOrderPaid } from '../../payments/application/markOrderPaid'

export function makeUpdateAdminOrder(
  repo: AdminRepository,
  emailService: EmailService,
  markOrderPaid: MarkOrderPaid,
): UpdateAdminOrder {
  return async (orderId: string, input: UpdateOrderInput): Promise<void> => {
    if (input.status === 'PAID') {
      await markOrderPaid(orderId, null)
    }
    const result = await repo.updateAdminOrder(orderId, input)
    if (result) {
      try {
        await emailService.sendTrackingNotification(
          result.userEmail, result.userName, result.orderNumber, result.trackingNumber,
        )
      } catch (err) {
        console.error('Failed to send tracking notification:', err)
      }
    }
  }
}
```

Примечание: `markOrderPaid` идемпотентен (ранний выход при `status === 'PAID'`), повторный перевод безопасен. Если `updateAdminOrder` репозиторий тоже пишет `status`, поведение не конфликтует: `markOrderPaid` уже выставил `PAID`.

- [ ] **Step 4: Обновить wiring в `app.ts`**

```ts
const updateAdminOrder = makeUpdateAdminOrder(adminRepo, emailService, markOrderPaid)
```
(`markOrderPaid` определён в блоке Payments — убедиться, что блок Payments идёт ВЫШЕ блока Admin в `app.ts`; при необходимости переставить определение `markOrderPaid`/`paymentRepo` до блока Admin.)

- [ ] **Step 5: PASS + typecheck**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api updateAdminOrder --reporter=basic`
Then: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: PASS, без ошибок типов.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/admin/application/updateAdminOrder.ts apps/api/src/features/admin/application/updateAdminOrder.test.ts apps/api/src/app.ts
git commit -m "feat(api): decrement stock and mark paid on manual order PAID transition"
```

---

## Фаза 7 — Веб: настройки оплаты в админке

### Task 7.1: adminPaymentApi + AdminPaymentSettings.vue

**Files:**
- Create: `apps/web/src/widgets/admin-panel/adminPaymentApi.ts`
- Create: `apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.vue`
- Create: `apps/web/src/widgets/admin-panel/components/icons/IconPayment.vue`
- Modify: `apps/web/src/widgets/admin-panel/components/AdminSidebar.vue`
- Modify: `apps/web/src/widgets/admin-panel/AdminPanel.vue`

- [ ] **Step 1: adminPaymentApi.ts** (следует паттерну `adminSalesApi.ts` — `authFetch`, zod-валидация ответа)

```ts
import { z } from 'zod'
import { authFetch } from '@/shared'

const settingsSchema = z.object({
  enabled: z.boolean(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  clientId: z.string().nullable(),
  hasSecret: z.boolean(),
})
export type PaymentSettings = z.infer<typeof settingsSchema>

export interface UpdatePaymentSettingsBody {
  enabled: boolean
  mode: 'SANDBOX' | 'LIVE'
  clientId: string | null
  secret?: string | null
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  const res = await authFetch('/admin/payment-settings')
  if (!res.ok) throw new Error('Failed to load payment settings')
  return settingsSchema.parse(await res.json())
}

export async function savePaymentSettings(body: UpdatePaymentSettingsBody): Promise<PaymentSettings> {
  const res = await authFetch('/admin/payment-settings', { method: 'PUT', json: body })
  if (!res.ok) {
    const b = await res.json().catch(() => ({}))
    throw new Error((b as { error?: string }).error ?? 'Failed to save payment settings')
  }
  return settingsSchema.parse(await res.json())
}
```

- [ ] **Step 2: AdminPaymentSettings.vue** (форма; Secret пустой → плейсхолдер «оставьте пустым…», текущее значение не показываем)

```vue
<template>
  <section class="payment-settings">
    <h2 class="payment-settings__title">Оплата (PayPal)</h2>

    <label class="payment-settings__row">
      <input type="checkbox" v-model="form.enabled" />
      <span>Включить приём оплаты</span>
    </label>

    <label class="payment-settings__row">
      <span>Режим</span>
      <select v-model="form.mode">
        <option value="SANDBOX">Sandbox (тест)</option>
        <option value="LIVE">Live (боевой)</option>
      </select>
    </label>

    <label class="payment-settings__field">
      <span>PayPal Client ID</span>
      <input type="text" v-model="form.clientId" autocomplete="off" />
    </label>

    <label class="payment-settings__field">
      <span>PayPal Secret</span>
      <input
        type="password"
        v-model="secretInput"
        autocomplete="off"
        :placeholder="hasSecret ? 'Secret задан — оставьте пустым, чтобы не менять' : 'Оставьте пустым, если не используете'"
      />
      <small v-if="hasSecret">Secret задан. Чтобы удалить — введите пробел и сохраните.</small>
    </label>

    <button class="payment-settings__save" :disabled="saving" @click="onSave">
      {{ saving ? 'Сохранение…' : 'Сохранить' }}
    </button>
    <p v-if="error" class="payment-settings__error">{{ error }}</p>
    <p v-if="saved" class="payment-settings__ok">Сохранено</p>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import { fetchPaymentSettings, savePaymentSettings } from '../adminPaymentApi'

const form = reactive({ enabled: false, mode: 'SANDBOX' as 'SANDBOX' | 'LIVE', clientId: '' })
const secretInput = ref('')
const hasSecret = ref(false)
const saving = ref(false)
const error = ref('')
const saved = ref(false)

onMounted(async () => {
  const s = await fetchPaymentSettings()
  form.enabled = s.enabled
  form.mode = s.mode
  form.clientId = s.clientId ?? ''
  hasSecret.value = s.hasSecret
})

async function onSave() {
  saving.value = true
  error.value = ''
  saved.value = false
  try {
    // secret: пусто → не трогаем (undefined); явный ввод → меняем
    const secret = secretInput.value === '' ? undefined : secretInput.value
    const s = await savePaymentSettings({
      enabled: form.enabled,
      mode: form.mode,
      clientId: form.clientId.trim() === '' ? null : form.clientId.trim(),
      secret,
    })
    hasSecret.value = s.hasSecret
    secretInput.value = ''
    saved.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.payment-settings {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 480px;

  &__title { font-size: 20px; }
  &__row { display: flex; align-items: center; gap: 8px; }
  &__field { display: flex; flex-direction: column; gap: 4px; }
  &__field input,
  &__row select { padding: 8px; }
  &__save { align-self: flex-start; padding: 10px 20px; }
  &__error { color: #c0392b; }
  &__ok { color: #2e7d32; }
}
</style>
```

- [ ] **Step 3: IconPayment.vue** (по образцу `IconSales.vue` — простой SVG-компонент)

```vue
<template>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M2 10h20" />
  </svg>
</template>
```

- [ ] **Step 4: Подключить в AdminSidebar.vue и AdminPanel.vue**

В `AdminSidebar.vue` — добавить пункт навигации «Оплата» рядом с существующими (по образцу пункта Sales: тот же массив/разметка, ключ напр. `'payments'`, иконка `IconPayment`). В `AdminPanel.vue` — добавить ветку рендера `AdminPaymentSettings` при активном разделе `'payments'` (по образцу `AdminSales`).

Точные правки повторяют паттерн соседних разделов (Sales): найти, где регистрируется `AdminSales`/пункт `sales`, и добавить аналогичный `payments`.

- [ ] **Step 5: Typecheck + lint web**

Run: `cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck`
Then: `cd apps/web && npx eslint app src --max-warnings=0`
Expected: без ошибок.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/admin-panel/adminPaymentApi.ts apps/web/src/widgets/admin-panel/components/AdminPaymentSettings.vue apps/web/src/widgets/admin-panel/components/icons/IconPayment.vue apps/web/src/widgets/admin-panel/components/AdminSidebar.vue apps/web/src/widgets/admin-panel/AdminPanel.vue
git commit -m "feat(web): add admin payment settings section"
```

---

## Фаза 8 — Веб: PayPal-кнопка и оплата заказа

### Task 8.1: paypalPaymentApi + PaypalPayment.vue

**Files:**
- Create: `apps/web/src/features/paypal-payment/paypalPaymentApi.ts`
- Create: `apps/web/src/features/paypal-payment/PaypalPayment.vue`
- Create: `apps/web/src/features/paypal-payment/index.ts`

- [ ] **Step 1: paypalPaymentApi.ts**

```ts
import { z } from 'zod'
import { apiFetch, authFetch } from '@/shared'

const configSchema = z.object({
  enabled: z.boolean(),
  clientId: z.string().nullable(),
  mode: z.enum(['SANDBOX', 'LIVE']),
  serverFlow: z.boolean(),
})
export type PaymentConfig = z.infer<typeof configSchema>

export async function fetchPaymentConfig(): Promise<PaymentConfig> {
  const res = await apiFetch('/payments/config')
  if (!res.ok) throw new Error('Failed to load payment config')
  return configSchema.parse(await res.json())
}

export async function createServerPaypalOrder(orderId: string): Promise<string> {
  const res = await authFetch('/payments/paypal/create-order', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error('Failed to create PayPal order')
  return z.object({ paypalOrderId: z.string() }).parse(await res.json()).paypalOrderId
}

export async function captureServerPayment(orderId: string): Promise<void> {
  const res = await authFetch('/payments/paypal/capture', { method: 'POST', json: { orderId } })
  if (!res.ok) throw new Error('Payment capture failed')
}

export async function claimClientPayment(orderId: string, paypalOrderId: string): Promise<void> {
  const res = await authFetch('/payments/paypal/claim', { method: 'POST', json: { orderId, paypalOrderId } })
  if (!res.ok) throw new Error('Failed to record payment')
}
```
(Если в проекте `apiFetch` называется иначе — взять фактический публичный fetch-хелпер из `@/shared`, как в `productApi.ts`.)

- [ ] **Step 2: PaypalPayment.vue** (грузит SDK, разводит server/client flow)

```vue
<template>
  <div class="paypal-payment">
    <p v-if="!ready && !error" class="paypal-payment__status">Загрузка оплаты…</p>
    <p v-if="error" class="paypal-payment__error">{{ error }}</p>
    <div ref="buttonsEl" class="paypal-payment__buttons"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  fetchPaymentConfig, createServerPaypalOrder, captureServerPayment, claimClientPayment,
  type PaymentConfig,
} from './paypalPaymentApi'

const props = defineProps<{ orderId: string; orderNumber: number; amountUsd: number }>()
const emit = defineEmits<{ paid: []; claimed: [] }>()

const buttonsEl = ref<HTMLElement | null>(null)
const ready = ref(false)
const error = ref('')

function loadSdk(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as { paypal?: unknown }
    if (w.paypal) return resolve()
    const s = document.createElement('script')
    s.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture`
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Не удалось загрузить PayPal SDK'))
    document.head.appendChild(s)
  })
}

onMounted(async () => {
  try {
    const cfg: PaymentConfig = await fetchPaymentConfig()
    if (!cfg.enabled || !cfg.clientId) {
      error.value = 'Оплата временно недоступна'
      return
    }
    await loadSdk(cfg.clientId)
    const paypal = (window as unknown as { paypal: { Buttons: (o: unknown) => { render: (el: HTMLElement) => void } } }).paypal

    const invoiceId = `natsdoll-${props.orderNumber}`
    const buttons = paypal.Buttons(
      cfg.serverFlow
        ? {
            createOrder: () => createServerPaypalOrder(props.orderId),
            onApprove: async () => { await captureServerPayment(props.orderId); emit('paid') },
            onError: () => { error.value = 'Ошибка оплаты' },
          }
        : {
            createOrder: (_d: unknown, actions: { order: { create: (o: unknown) => Promise<string> } }) =>
              actions.order.create({
                purchase_units: [{ invoice_id: invoiceId, custom_id: invoiceId, amount: { currency_code: 'USD', value: props.amountUsd.toFixed(2) } }],
              }),
            onApprove: async (_d: unknown, actions: { order: { capture: () => Promise<{ id: string }> } }) => {
              const res = await actions.order.capture()
              await claimClientPayment(props.orderId, res.id)
              emit('claimed')
            },
            onError: () => { error.value = 'Ошибка оплаты' },
          },
    )
    if (buttonsEl.value) buttons.render(buttonsEl.value)
    ready.value = true
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Ошибка'
  }
})
</script>

<style scoped lang="scss">
.paypal-payment {
  &__status { color: #666; }
  &__error { color: #c0392b; }
  &__buttons { min-height: 48px; }
}
</style>
```

- [ ] **Step 3: index.ts**

```ts
export { default as PaypalPayment } from './PaypalPayment.vue'
```

- [ ] **Step 4: Typecheck + lint**

Run: `cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck`
Then: `cd apps/web && npx eslint app src --max-warnings=0`
Expected: без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/features/paypal-payment
git commit -m "feat(web): add PaypalPayment button component (server/client flow)"
```

### Task 8.2: Интеграция кнопки на странице заказа

**Files:**
- Modify: `apps/web/src/pages/OrderConfirmationPage.vue`

- [ ] **Step 1: Показать кнопку для PENDING-заказа**

В `OrderConfirmationPage.vue`: если `order.status === 'PENDING'` и нет признака «заявлено», рендерить `<PaypalPayment :order-id order-number :amount-usd @paid="..." @claimed="..." />`. По `paid` — перезагрузить заказ (станет `PAID`). По `claimed` — показать «оплата проверяется». `PAID` — текущее подтверждение.

```vue
<!-- в шаблоне, в блоке заказа -->
<PaypalPayment
  v-if="order.status === 'PENDING'"
  :order-id="order.id"
  :order-number="order.orderNumber"
  :amount-usd="order.totalAmount"
  @paid="onPaid"
  @claimed="onClaimed"
/>
<p v-else-if="claimed">Оплата получена и проверяется. Мы подтвердим её в ближайшее время.</p>
```

```ts
// в script setup
import { PaypalPayment } from '@/features/paypal-payment'
const claimed = ref(false)
async function onPaid() { await reloadOrder() /* существующая загрузка заказа */ }
function onClaimed() { claimed.value = true }
```
(`reloadOrder` — использовать существующий механизм загрузки заказа на странице; если его нет — повторно вызвать `fetchOrder(order.id)` из `@/entities/order`.)

- [ ] **Step 2: Typecheck + lint + web-тесты**

Run: `cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck`
Then: `cd apps/web && npx eslint app src --max-warnings=0`
Then: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic`
Expected: без ошибок, тесты зелёные.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/pages/OrderConfirmationPage.vue
git commit -m "feat(web): show PayPal payment button for pending orders"
```

---

## Фаза 9 — Финальная проверка

### Task 9.1: Полный прогон проверок

- [ ] **Step 1: API тесты**

Run: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=basic`
Expected: всё зелёное.

- [ ] **Step 2: API typecheck**

Run: `npx prisma generate -w apps/api` затем `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`
Expected: без ошибок.

- [ ] **Step 3: Web тесты + typecheck + lint**

Run:
```
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=basic
cd apps/web && NODE_OPTIONS=--max-old-space-size=4096 npx nuxt typecheck
cd apps/web && npx eslint app src --max-warnings=0
```
Expected: всё зелёное.

- [ ] **Step 4: Ручная проверка sandbox** (по готовности кредов)

Включить оплату в админке (Sandbox, тестовые Client ID/Secret), оформить заказ, оплатить тестовым PayPal-аккаунтом, убедиться: server-режим → заказ `PAID`, сток уменьшился; client-режим (Secret пуст) → заказ остаётся `PENDING` с `paypalOrderId`, «оплата проверяется».

---

## Замечания по безопасности (при ревью)

- `Secret` нигде не логировать; в ответах API не возвращать (только `hasSecret`).
- `PAYMENT_ENCRYPTION_KEY` — в проде отдельный от `JWT_SECRET`/`HMAC_SECRET`, не в git.
- Сумма берётся из `Order.totalAmount` на сервере; тело client-flow `actions.order.create` использует ту же сумму, но источник истины — серверный заказ (capture в server-режиме её и подтверждает).
- API-токен «Склад ЮСА» к этой фиче не относится (их API — фулфилмент); не хранить в коде.
