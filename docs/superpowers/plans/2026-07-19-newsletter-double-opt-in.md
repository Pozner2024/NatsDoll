# Newsletter Double-Opt-In Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подписка на рассылку становится двухшаговой: адрес считается подтверждённым только после перехода по ссылке из письма и нажатия кнопки подтверждения.

**Architecture:** Stateless HMAC-токен по образцу действующего unsubscribe (`hashToken('newsletter-confirm:' + email)`), новое nullable-поле `confirmedAt` в `NewsletterSubscriber`, письмо через существующий `emailService` (fire-and-forget), страница `/newsletter/confirm` — клон unsubscribe-страницы. Спек: `docs/superpowers/specs/2026-07-19-newsletter-double-opt-in-design.md`.

**Tech Stack:** Hono + Prisma + Zod (api), Vue 3 + Nuxt 4 (web), Vitest, Playwright.

## Global Constraints

- Комментарии в код не добавлять (правило CLAUDE.md; существующие не трогать).
- Запрет `any`; ошибки — через `AppError` из `shared/errors`.
- Тесты api: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot` (из корня репо).
- Тесты web: `node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=dot` (из корня репо).
- Typecheck api: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api`.
- После `prisma generate` удалять `apps/api/dist` (инкрементальный кэш tsc даёт ложно-зелёный результат).
- Строки писем/UI — копировать дословно из этого плана (en-US, как весь пользовательский текст проекта).
- Ответ `POST /newsletter/subscribe` всегда `201 { message: 'Subscribed' }` независимо от того, был ли адрес в базе (анти-enumeration).
- Стили — BEM в `<style scoped lang="scss">`; без `cursor: pointer`.
- Git-коммит в конце каждой задачи (пользователь одобрил покоммитное выполнение плана — уточнить перед стартом выполнения, если контекст утерян).

---

### Task 1: Поле `confirmedAt` в схеме + миграция с бэкфиллом

**Files:**
- Modify: `apps/api/prisma/schema.prisma:281-285`
- Create: `apps/api/prisma/migrations/<timestamp>_add_newsletter_confirmed_at/migration.sql` (генерируется prisma)

**Interfaces:**
- Consumes: —
- Produces: колонка `NewsletterSubscriber.confirmedAt: DateTime?` в БД и в Prisma Client (тип `Date | null`). Существующие строки получают `confirmedAt = subscribedAt`.

- [ ] **Step 1: Обновить модель в schema.prisma**

Заменить блок:

```prisma
model NewsletterSubscriber {
  id           String   @id @default(cuid())
  email        String   @unique
  subscribedAt DateTime @default(now())
}
```

на:

```prisma
model NewsletterSubscriber {
  id           String    @id @default(cuid())
  email        String    @unique
  subscribedAt DateTime  @default(now())
  confirmedAt  DateTime?
}
```

- [ ] **Step 2: Сгенерировать миграцию без применения**

Из `apps/api` (DATABASE_URL подхватится из `apps/api/.env`; локальная БД `postgresql://user:password@localhost:5432/natsdoll`):

```powershell
npx prisma migrate dev --create-only --name add_newsletter_confirmed_at
```

Expected: создана папка `apps/api/prisma/migrations/<timestamp>_add_newsletter_confirmed_at/` с `migration.sql`, содержащим `ALTER TABLE ... ADD COLUMN "confirmedAt" TIMESTAMP(3);`.

- [ ] **Step 3: Дописать бэкфилл в migration.sql**

В конец сгенерированного `migration.sql` добавить строку (вариант А из спека — существующие подписчики считаются подтверждёнными):

```sql
UPDATE "NewsletterSubscriber" SET "confirmedAt" = "subscribedAt";
```

- [ ] **Step 4: Применить миграцию и перегенерировать клиент**

```powershell
npx prisma migrate dev
npx prisma generate
```

Expected: `migrate dev` применяет миграцию без ошибок; `generate` завершается успешно.

- [ ] **Step 5: Сбросить кэш tsc и прогнать typecheck**

Из корня репо:

```powershell
if (Test-Path apps\api\dist) { Remove-Item -Recurse -Force apps\api\dist }
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
```

Expected: 0 ошибок.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/prisma
git commit -m "feat(api): add NewsletterSubscriber.confirmedAt with backfill migration"
```

---

### Task 2: Репозиторий — `upsertSubscriber` возвращает строку, новый `confirmByEmail`

**Files:**
- Modify: `apps/api/src/features/newsletter/infrastructure/newsletterRepository.ts`
- Modify: `apps/api/src/features/newsletter/infrastructure/newsletterRepository.test.ts`
- Modify: `apps/api/src/features/newsletter/application/subscribe.test.ts` (мок репо — только чтобы компилировался)
- Modify: `apps/api/src/features/newsletter/application/unsubscribe.test.ts` (мок репо — только чтобы компилировался)

**Interfaces:**
- Consumes: Prisma Client с полем `confirmedAt` (Task 1).
- Produces:
  - `type NewsletterSubscriber = { id: string; email: string; subscribedAt: Date; confirmedAt: Date | null }`
  - `upsertSubscriber(email: string): Promise<NewsletterSubscriber>`
  - `confirmByEmail(email: string): Promise<void>`

- [ ] **Step 1: Дописать падающие тесты в newsletterRepository.test.ts**

В `makePrisma()` добавить `updateMany: vi.fn()` рядом с остальными:

```ts
function makePrisma() {
  return {
    newsletterSubscriber: { upsert: vi.fn(), findMany: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
  } as unknown as Parameters<typeof makeNewsletterRepository>[0]
}
```

Тест `upsertSubscriber` заменить (теперь проверяем и возврат строки):

```ts
  it('upsertSubscriber апсертит по email и возвращает строку', async () => {
    const row = { id: '1', email: 'a@b.co', subscribedAt: new Date(), confirmedAt: null }
    vi.mocked(prisma.newsletterSubscriber.upsert).mockResolvedValue(row as never)
    const repo = makeNewsletterRepository(prisma)
    const result = await repo.upsertSubscriber('a@b.co')
    expect(prisma.newsletterSubscriber.upsert).toHaveBeenCalledWith({
      where: { email: 'a@b.co' },
      update: {},
      create: { email: 'a@b.co' },
    })
    expect(result).toBe(row)
  })
```

Добавить новый тест:

```ts
  it('confirmByEmail проставляет confirmedAt (идемпотентно, updateMany)', async () => {
    vi.mocked(prisma.newsletterSubscriber.updateMany).mockResolvedValue({} as never)
    const repo = makeNewsletterRepository(prisma)
    await repo.confirmByEmail('a@b.co')
    expect(prisma.newsletterSubscriber.updateMany).toHaveBeenCalledWith({
      where: { email: 'a@b.co' },
      data: { confirmedAt: expect.any(Date) },
    })
  })
```

- [ ] **Step 2: Запустить тесты — убедиться, что падают**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
```

Expected: FAIL — `confirmByEmail is not a function`, `result` = undefined.

- [ ] **Step 3: Реализовать в newsletterRepository.ts**

Полное новое содержимое файла:

```ts
import type { PrismaClient } from '@prisma/client'

export type NewsletterSubscriber = {
  id: string
  email: string
  subscribedAt: Date
  confirmedAt: Date | null
}

export type NewsletterRepository = {
  upsertSubscriber(email: string): Promise<NewsletterSubscriber>
  getAll(): Promise<NewsletterSubscriber[]>
  deleteById(id: string): Promise<void>
  deleteByEmail(email: string): Promise<void>
  confirmByEmail(email: string): Promise<void>
}

export function makeNewsletterRepository(prisma: PrismaClient): NewsletterRepository {
  return {
    upsertSubscriber: (email) => prisma.newsletterSubscriber.upsert({
      where: { email },
      update: {},
      create: { email },
    }),

    getAll: () => prisma.newsletterSubscriber.findMany({
      orderBy: { subscribedAt: 'desc' },
    }),

    async deleteById(id) {
      await prisma.newsletterSubscriber.deleteMany({ where: { id } })
    },

    async deleteByEmail(email) {
      await prisma.newsletterSubscriber.deleteMany({ where: { email } })
    },

    async confirmByEmail(email) {
      await prisma.newsletterSubscriber.updateMany({ where: { email }, data: { confirmedAt: new Date() } })
    },
  }
}
```

- [ ] **Step 4: Починить компиляцию соседних моков**

В `subscribe.test.ts` и `unsubscribe.test.ts` мок репозитория дополнить недостающим методом:

```ts
const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}
```

В `subscribe.test.ts` обе строки `vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(undefined)` заменить на:

```ts
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue({ id: 's1', email: 'x@y.co', subscribedAt: new Date(), confirmedAt: null })
```

(Поведенческие тесты subscribe перепишутся в Task 5 — здесь только компиляция.)

- [ ] **Step 5: Прогнать тесты фичи и typecheck**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
```

Expected: тесты PASS, tsc 0 ошибок.

- [ ] **Step 6: Commit**

```powershell
git add apps/api/src/features/newsletter
git commit -m "feat(api): newsletter repository returns subscriber row, add confirmByEmail"
```

---

### Task 3: `emailService.sendNewsletterConfirmation` + обновление моков

**Files:**
- Modify: `apps/api/src/features/auth/infrastructure/emailService.ts`
- Modify: `apps/api/src/features/orders/application/createOrder.test.ts` (мок EmailService)
- Modify: `apps/api/src/features/auth/application/register.test.ts` (мок EmailService)
- Modify: `apps/api/src/features/payments/application/handleWooWebhook.test.ts` (мок EmailService)
- Modify: `apps/api/src/features/payments/application/capturePaypalPayment.test.ts` (мок EmailService)
- Modify: `apps/api/src/features/payments/application/handlePaypalWebhook.test.ts` (мок EmailService)

**Interfaces:**
- Consumes: —
- Produces: `sendNewsletterConfirmation(to: string, confirmUrl: string): Promise<void>` в типе `EmailService` и в реализации `makeEmailService()`.

- [ ] **Step 1: Добавить метод в тип EmailService**

В `emailService.ts` в тип `EmailService` (после `sendNewOrderAlert(...)`) добавить:

```ts
  sendNewsletterConfirmation(to: string, confirmUrl: string): Promise<void>
```

- [ ] **Step 2: Добавить реализацию**

В возвращаемый объект `makeEmailService()` (после `sendNewOrderAlert`) добавить:

```ts
    async sendNewsletterConfirmation(to, confirmUrl) {
      await send({
        from: 'noreply@natsdoll.com',
        to,
        subject: 'Confirm your subscription — NatsDoll',
        html: `
          <p>Thanks for subscribing to the NatsDoll newsletter!</p>
          <p>Please confirm your subscription by clicking the link below:</p>
          <p><a href="${confirmUrl}">Confirm subscription</a></p>
          <p>If you didn't subscribe, just ignore this email.</p>
        `,
      })
    },
```

`confirmUrl` — server-controlled (FRONTEND_URL + HMAC-токен), user-input в html не попадает.

- [ ] **Step 3: Обновить 5 полных моков EmailService**

В каждом из пяти файлов (`createOrder.test.ts`, `register.test.ts`, `handleWooWebhook.test.ts`, `capturePaypalPayment.test.ts`, `handlePaypalWebhook.test.ts`) найти объект-мок, содержащий `sendPaymentCaptureAlert: vi.fn()`, и добавить в него строку:

```ts
    sendNewsletterConfirmation: vi.fn(),
```

- [ ] **Step 4: Прогнать все тесты api и typecheck**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
```

Expected: все тесты PASS, tsc 0 ошибок.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src
git commit -m "feat(api): add newsletter confirmation email to EmailService"
```

---

### Task 4: `normalizeEmail` в отдельный модуль + use-case `confirm`

Вынос `normalizeEmail` нужен, чтобы не создать цикл импортов: в Task 5 `subscribe.ts` начнёт импортировать `confirmToken` из `confirm.ts`, а `confirm.ts` (как и `unsubscribe.ts`) использует `normalizeEmail`, который сейчас живёт в `subscribe.ts`.

**Files:**
- Create: `apps/api/src/features/newsletter/application/normalizeEmail.ts`
- Create: `apps/api/src/features/newsletter/application/confirm.ts`
- Create: `apps/api/src/features/newsletter/application/confirm.test.ts`
- Modify: `apps/api/src/features/newsletter/application/subscribe.ts` (убрать локальный normalizeEmail)
- Modify: `apps/api/src/features/newsletter/application/unsubscribe.ts` (импорт из нового модуля)

**Interfaces:**
- Consumes: `hashToken` из `shared/lib`, `AppError` из `shared/errors`, `NewsletterRepository.confirmByEmail` (Task 2).
- Produces:
  - `normalizeEmail(email: string): string` из `./normalizeEmail`
  - `confirmToken(email: string): string` из `./confirm`
  - `makeConfirm(repo: NewsletterRepository)` → `confirm(email: string, token: string): Promise<void>`

- [ ] **Step 1: Создать normalizeEmail.ts**

```ts
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
```

- [ ] **Step 2: Перевести subscribe.ts и unsubscribe.ts на новый модуль**

`subscribe.ts` — полное новое содержимое (поведение пока прежнее):

```ts
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { normalizeEmail } from './normalizeEmail'

export function makeSubscribe(repo: NewsletterRepository) {
  return async function subscribe(email: string): Promise<void> {
    await repo.upsertSubscriber(normalizeEmail(email))
  }
}
```

В `unsubscribe.ts` заменить строку `import { normalizeEmail } from './subscribe'` на:

```ts
import { normalizeEmail } from './normalizeEmail'
```

- [ ] **Step 3: Написать падающий confirm.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeConfirm, confirmToken } from './confirm'
import { unsubscribeToken } from './unsubscribe'
import { AppError } from '../../../shared/errors'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}

describe('confirm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(mockRepo.confirmByEmail).mockResolvedValue(undefined)
  })

  it('подтверждает подписку при валидном токене', async () => {
    const confirm = makeConfirm(mockRepo)
    await confirm('test@example.com', confirmToken('test@example.com'))
    expect(mockRepo.confirmByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('токен не зависит от регистра и пробелов в email', async () => {
    const confirm = makeConfirm(mockRepo)
    await confirm('  Test@Example.COM ', confirmToken('test@example.com'))
    expect(mockRepo.confirmByEmail).toHaveBeenCalledWith('test@example.com')
  })

  it('отклоняет неверный токен с 400', async () => {
    const confirm = makeConfirm(mockRepo)
    await expect(confirm('test@example.com', 'wrong-token')).rejects.toThrow(AppError)
    expect(mockRepo.confirmByEmail).not.toHaveBeenCalled()
  })

  it('отклоняет токен от другого email', async () => {
    const confirm = makeConfirm(mockRepo)
    await expect(confirm('test@example.com', confirmToken('other@example.com'))).rejects.toThrow(AppError)
    expect(mockRepo.confirmByEmail).not.toHaveBeenCalled()
  })

  it('confirm-токен не совпадает с unsubscribe-токеном того же email', () => {
    expect(confirmToken('test@example.com')).not.toBe(unsubscribeToken('test@example.com'))
  })
})
```

- [ ] **Step 4: Запустить — убедиться, что падает**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
```

Expected: FAIL — `Cannot find module './confirm'`.

- [ ] **Step 5: Создать confirm.ts**

```ts
import { timingSafeEqual } from 'node:crypto'
import { AppError } from '../../../shared/errors'
import { hashToken } from '../../../shared/lib'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { normalizeEmail } from './normalizeEmail'

const TOKEN_PREFIX = 'newsletter-confirm:'

export function confirmToken(email: string): string {
  return hashToken(TOKEN_PREFIX + normalizeEmail(email))
}

export function makeConfirm(repo: NewsletterRepository) {
  return async function confirm(email: string, token: string): Promise<void> {
    const expected = Buffer.from(confirmToken(email))
    const provided = Buffer.from(token)
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new AppError(400, 'Invalid confirmation link')
    }
    await repo.confirmByEmail(normalizeEmail(email))
  }
}
```

- [ ] **Step 6: Запустить тесты фичи и typecheck**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
```

Expected: все PASS, tsc 0 ошибок.

- [ ] **Step 7: Commit**

```powershell
git add apps/api/src/features/newsletter
git commit -m "feat(api): newsletter confirm use-case with HMAC token"
```

---

### Task 5: `subscribe` отправляет письмо-подтверждение неподтверждённым

**Files:**
- Modify: `apps/api/src/features/newsletter/application/subscribe.ts`
- Modify: `apps/api/src/features/newsletter/application/subscribe.test.ts`

**Interfaces:**
- Consumes: `confirmToken` (Task 4), `sendNewsletterConfirmation` (Task 3), `upsertSubscriber → NewsletterSubscriber` (Task 2), `FRONTEND_URL` из `shared/lib`.
- Produces: `makeSubscribe(repo: NewsletterRepository, emailService: Pick<EmailService, 'sendNewsletterConfirmation'>)` → `subscribe(email: string): Promise<void>`. Ссылка в письме: `${FRONTEND_URL}/newsletter/confirm?email=<urlencoded>&token=<confirmToken>`.

- [ ] **Step 1: Переписать subscribe.test.ts (падающие тесты)**

Полное новое содержимое:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makeSubscribe } from './subscribe'
import { confirmToken } from './confirm'
import type { NewsletterRepository, NewsletterSubscriber } from '../infrastructure/newsletterRepository'

const mockRepo: NewsletterRepository = {
  upsertSubscriber: vi.fn(),
  getAll: vi.fn(),
  deleteById: vi.fn(),
  deleteByEmail: vi.fn(),
  confirmByEmail: vi.fn(),
}

const emailService = { sendNewsletterConfirmation: vi.fn() }

function row(overrides: Partial<NewsletterSubscriber> = {}): NewsletterSubscriber {
  return { id: 's1', email: 'test@example.com', subscribedAt: new Date(), confirmedAt: null, ...overrides }
}

describe('subscribe', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(emailService.sendNewsletterConfirmation).mockResolvedValue(undefined)
  })

  it('сохраняет нормализованный email через репозиторий', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('  Foo@Example.COM ')
    expect(mockRepo.upsertSubscriber).toHaveBeenCalledWith('foo@example.com')
  })

  it('шлёт письмо-подтверждение неподтверждённому адресу со ссылкой на /newsletter/confirm', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('test@example.com')
    expect(emailService.sendNewsletterConfirmation).toHaveBeenCalledWith(
      'test@example.com',
      expect.stringContaining(`/newsletter/confirm?email=test%40example.com&token=${confirmToken('test@example.com')}`),
    )
  })

  it('НЕ шлёт письмо уже подтверждённому адресу', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row({ confirmedAt: new Date() }))
    const subscribe = makeSubscribe(mockRepo, emailService)
    await subscribe('test@example.com')
    expect(emailService.sendNewsletterConfirmation).not.toHaveBeenCalled()
  })

  it('сбой отправки письма не роняет подписку', async () => {
    vi.mocked(mockRepo.upsertSubscriber).mockResolvedValue(row())
    vi.mocked(emailService.sendNewsletterConfirmation).mockRejectedValue(new Error('resend down'))
    const subscribe = makeSubscribe(mockRepo, emailService)
    await expect(subscribe('test@example.com')).resolves.toBeUndefined()
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падают**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
```

Expected: FAIL — makeSubscribe принимает 1 аргумент, письма не шлются.

- [ ] **Step 3: Реализовать subscribe.ts**

Полное новое содержимое:

```ts
import { FRONTEND_URL } from '../../../shared/lib'
import type { EmailService } from '../../auth/infrastructure/emailService'
import type { NewsletterRepository } from '../infrastructure/newsletterRepository'
import { confirmToken } from './confirm'
import { normalizeEmail } from './normalizeEmail'

function confirmUrl(email: string): string {
  return `${FRONTEND_URL}/newsletter/confirm?email=${encodeURIComponent(email)}&token=${confirmToken(email)}`
}

export function makeSubscribe(repo: NewsletterRepository, emailService: Pick<EmailService, 'sendNewsletterConfirmation'>) {
  return async function subscribe(email: string): Promise<void> {
    const normalized = normalizeEmail(email)
    const subscriber = await repo.upsertSubscriber(normalized)
    if (subscriber.confirmedAt) return
    try {
      await emailService.sendNewsletterConfirmation(normalized, confirmUrl(normalized))
    } catch (err) {
      console.error('Failed to send newsletter confirmation:', err)
    }
  }
}
```

- [ ] **Step 4: Запустить тесты фичи**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot apps/api/src/features/newsletter
```

Expected: PASS. (app.ts ещё передаёт 1 аргумент — typecheck упадёт, это чинится в Task 6; поэтому здесь tsc не гоняем.)

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src/features/newsletter
git commit -m "feat(api): subscribe sends confirmation email to unconfirmed addresses"
```

---

### Task 6: Роут `POST /newsletter/confirm` + wiring в app.ts

**Files:**
- Modify: `apps/api/src/features/newsletter/presentation/newsletterRouter.ts`
- Modify: `apps/api/src/features/newsletter/index.ts`
- Modify: `apps/api/src/app.ts:230-234`

**Interfaces:**
- Consumes: `makeConfirm` (Task 4), `makeSubscribe(repo, emailService)` (Task 5), `emailService` из app.ts:220.
- Produces: `POST /newsletter/confirm { email, token }` → `200 { message: 'Confirmed' }`; `makeNewsletterRouter(subscribe, unsubscribe, confirm)`.

- [ ] **Step 1: Обновить newsletterRouter.ts**

Полное новое содержимое (схема unsubscribe переименована в общую `emailTokenBodySchema` — форма тела у confirm и unsubscribe одинаковая):

```ts
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import { createRateLimiter } from '../../../shared/middleware'

const subscribeBodySchema = z.object({
  email: z.string().email().max(254),
})

const emailTokenBodySchema = z.object({
  email: z.string().email().max(254),
  token: z.string().min(1).max(128),
})

const subscribeLimiter = createRateLimiter({ max: 3, windowMs: 60 * 60_000 })
const unsubscribeLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60_000 })
const confirmLimiter = createRateLimiter({ max: 10, windowMs: 60 * 60_000 })

type Subscribe = (email: string) => Promise<void>
type Unsubscribe = (email: string, token: string) => Promise<void>
type Confirm = (email: string, token: string) => Promise<void>

export function makeNewsletterRouter(subscribe: Subscribe, unsubscribe: Unsubscribe, confirm: Confirm) {
  const router = new Hono()

  router.post('/subscribe', subscribeLimiter.middleware, zValidator('json', subscribeBodySchema), async (c) => {
    const { email } = c.req.valid('json')
    await subscribe(email)
    return c.json({ message: 'Subscribed' }, 201)
  })

  router.post('/unsubscribe', unsubscribeLimiter.middleware, zValidator('json', emailTokenBodySchema), async (c) => {
    const { email, token } = c.req.valid('json')
    await unsubscribe(email, token)
    return c.json({ message: 'Unsubscribed' })
  })

  router.post('/confirm', confirmLimiter.middleware, zValidator('json', emailTokenBodySchema), async (c) => {
    const { email, token } = c.req.valid('json')
    await confirm(email, token)
    return c.json({ message: 'Confirmed' })
  })

  return router
}
```

- [ ] **Step 2: Экспортировать из index.ts**

Добавить строку после экспорта unsubscribe:

```ts
export { makeConfirm, confirmToken } from './application/confirm'
```

- [ ] **Step 3: Обновить app.ts**

В блоке `// Newsletter` (строки 229–235) заменить:

```ts
  const subscribe = makeSubscribe(newsletterRepo)
```

на:

```ts
  const subscribe = makeSubscribe(newsletterRepo, emailService)
  const confirmSubscription = makeConfirm(newsletterRepo)
```

и строку роутера на:

```ts
  app.route('/newsletter', makeNewsletterRouter(subscribe, unsubscribe, confirmSubscription))
```

В импортах app.ts из `'./features/newsletter'` добавить `makeConfirm`.

- [ ] **Step 4: Полный прогон api-тестов и typecheck**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
```

Expected: все тесты PASS, tsc 0 ошибок.

- [ ] **Step 5: Commit**

```powershell
git add apps/api/src
git commit -m "feat(api): POST /newsletter/confirm route and composition wiring"
```

---

### Task 7: Страница подтверждения на web

**Files:**
- Create: `apps/web/src/pages/NewsletterConfirmPage.vue`
- Create: `apps/web/src/pages/NewsletterConfirmPage.test.ts`
- Create: `apps/web/app/pages/newsletter/confirm.vue`

**Interfaces:**
- Consumes: `POST /newsletter/confirm { email, token }` (Task 6), `AppButton`/`apiFetch` из `@/shared`.
- Produces: маршрут `/newsletter/confirm?email=…&token=…` (route name `newsletter-confirm`, noindex).

- [ ] **Step 1: Написать падающий тест NewsletterConfirmPage.test.ts**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>()
  return { ...actual, apiFetch: vi.fn() }
})

vi.mock('vue-router', () => ({
  RouterLink: { name: 'RouterLink', template: '<a><slot /></a>' },
}))

import { apiFetch } from '@/shared'
import NewsletterConfirmPage from './NewsletterConfirmPage.vue'

const mockApiFetch = vi.mocked(apiFetch)

describe('NewsletterConfirmPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('показывает invalid без query-параметров', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm')
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    expect(wrapper.text()).toContain('The link is invalid')
  })

  it('подтверждает подписку по кнопке', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm?email=a%40b.co&token=t1')
    mockApiFetch.mockResolvedValue({ ok: true } as Response)
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mockApiFetch).toHaveBeenCalledWith('/newsletter/confirm', {
      method: 'POST',
      json: { email: 'a@b.co', token: 't1' },
    })
    expect(wrapper.text()).toContain('Your subscription is confirmed')
  })

  it('показывает invalid при 400 от API', async () => {
    window.history.replaceState({}, '', '/newsletter/confirm?email=a%40b.co&token=bad')
    mockApiFetch.mockResolvedValue({ ok: false, status: 400 } as Response)
    const wrapper = mount(NewsletterConfirmPage)
    await flushPromises()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('The link is invalid')
  })
})
```

- [ ] **Step 2: Запустить — убедиться, что падает**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=dot apps/web/src/pages/NewsletterConfirmPage.test.ts
```

Expected: FAIL — `Cannot find module './NewsletterConfirmPage.vue'`.

- [ ] **Step 3: Создать NewsletterConfirmPage.vue**

Клон `NewsletterUnsubscribePage.vue` (тот же паттерн: разбор query в onMounted — страница client-only, кнопка вместо авто-подтверждения — защита от почтовых сканеров, ходящих по ссылкам):

```vue
<template>
  <div class="newsletter-confirm">
    <template v-if="state === 'ready' || state === 'loading'">
      <p class="newsletter-confirm__text">
        Confirm your subscription to the NatsDoll newsletter?
      </p>
      <AppButton
        type="button"
        :disabled="state === 'loading'"
        @click="confirm"
      >
        {{ state === 'loading' ? 'Confirming…' : 'Confirm subscription' }}
      </AppButton>
    </template>
    <p
      v-if="state === 'done'"
      class="newsletter-confirm__text"
      role="status"
    >
      Your subscription is confirmed. Welcome!
    </p>
    <p
      v-if="state === 'invalid'"
      class="newsletter-confirm__text"
    >
      The link is invalid.
      <RouterLink to="/">
        Go home
      </RouterLink>
    </p>
    <p
      v-if="state === 'error'"
      class="newsletter-confirm__text"
      role="alert"
    >
      Something went wrong. Please try again.
    </p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import { AppButton, apiFetch } from '@/shared'

type State = 'init' | 'ready' | 'loading' | 'done' | 'invalid' | 'error'

const state = ref<State>('init')
const email = ref('')
const token = ref('')

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  email.value = params.get('email') ?? ''
  token.value = params.get('token') ?? ''
  state.value = email.value && token.value ? 'ready' : 'invalid'
})

async function confirm() {
  state.value = 'loading'
  try {
    const res = await apiFetch('/newsletter/confirm', {
      method: 'POST',
      json: { email: email.value, token: token.value },
    })
    if (res.ok) state.value = 'done'
    else state.value = res.status === 400 ? 'invalid' : 'error'
  } catch {
    state.value = 'error'
  }
}
</script>

<style scoped lang="scss">
.newsletter-confirm {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 4rem 1.5rem;
  text-align: center;

  &__text {
    font-size: var(--fs-base);
    color: var(--color-text);
    margin: 0;
  }
}
</style>
```

- [ ] **Step 4: Создать Nuxt-страницу confirm.vue**

`apps/web/app/pages/newsletter/confirm.vue`:

```vue
<template>
  <NewsletterConfirmPage />
</template>

<script setup lang="ts">
import NewsletterConfirmPage from '@/pages/NewsletterConfirmPage.vue'

definePageMeta({ name: 'newsletter-confirm' })
useHead({ meta: [{ name: 'robots', content: 'noindex' }] })
</script>
```

- [ ] **Step 5: Запустить тест страницы**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=dot apps/web/src/pages/NewsletterConfirmPage.test.ts
```

Expected: PASS (3 теста).

- [ ] **Step 6: Commit**

```powershell
git add apps/web/src/pages/NewsletterConfirmPage.vue apps/web/src/pages/NewsletterConfirmPage.test.ts apps/web/app/pages/newsletter/confirm.vue
git commit -m "feat(web): newsletter confirmation page"
```

---

### Task 8: Текст успеха формы подписки + правка e2e

**Files:**
- Modify: `apps/web/src/features/newsletter-subscribe/NewsletterSubscribe.vue:42`
- Modify: `apps/web/e2e/newsletter.spec.ts:18`

**Interfaces:**
- Consumes: —
- Produces: новый текст успеха формы. Единственные два вхождения строки `You're in!` в apps/web — именно эти (проверено grep'ом).

- [ ] **Step 1: Обновить ассерт e2e (падающим он станет вместе с шагом 2 — правки атомарные, порядок не важен)**

В `apps/web/e2e/newsletter.spec.ts:18` заменить:

```ts
    await expect(page.locator('[data-testid="newsletter-success"]')).toHaveText("You're in!")
```

на:

```ts
    await expect(page.locator('[data-testid="newsletter-success"]')).toHaveText('Almost there — check your inbox to confirm your subscription.')
```

- [ ] **Step 2: Обновить текст в NewsletterSubscribe.vue**

Строку 42 (`You're in!`) заменить на:

```
      Almost there — check your inbox to confirm your subscription.
```

- [ ] **Step 3: Прогнать web-юниты (текст нигде больше не заассерчен, но проверяем)**

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=dot
```

Expected: все PASS.

- [ ] **Step 4: Commit**

```powershell
git add apps/web/src/features/newsletter-subscribe/NewsletterSubscribe.vue apps/web/e2e/newsletter.spec.ts
git commit -m "feat(web): subscribe form asks to confirm via inbox"
```

---

### Task 9: Финальная верификация

**Files:** — (только проверки)

**Interfaces:**
- Consumes: всё выше.
- Produces: зелёный полный прогон перед пушем/деплоем.

- [ ] **Step 1: Полные тесты api + web**

Из корня репо:

```powershell
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/api --reporter=dot
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --root apps/web --reporter=dot
```

Expected: 0 упавших.

- [ ] **Step 2: Оба typecheck**

```powershell
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit -p apps/api
cd apps/web; $env:NODE_OPTIONS = '--max-old-space-size=4096'; npx nuxt typecheck; cd ..\..
```

Expected: 0 ошибок. ВНИМАНИЕ: не маскировать exit code трубой (`| tail`); смотреть на сам вывод `error TS`.

- [ ] **Step 3: Lint**

```powershell
npx eslint apps/api/src apps/web/app apps/web/src --max-warnings=0
```

Expected: 0 ошибок и предупреждений.

- [ ] **Step 4: Интеграционные тесты api (локальная БД natsdoll_test должна быть доступна)**

```powershell
npm run test:int -w apps/api
```

Expected: PASS. Если БД `natsdoll_test` недоступна локально — зафиксировать это в отчёте: int-тесты прогонит CI (job гейтит деплой).

- [ ] **Step 5: Сообщить пользователю статус**

Пуш в main = авто-деплой прода (deploy.yml) — НЕ пушить без явной команды пользователя. Миграция применится на проде пайплайном при деплое.
