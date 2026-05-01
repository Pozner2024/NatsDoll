# Catalog Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить заглушку `ShopPage.vue` на работающую страницу каталога — пилюли категорий, сортировка по цене, классическая пагинация, карточки товаров с кнопкой-заглушкой «Add to cart».

**Architecture:** Backend — новая Hono-фича `products` по образцу `gallery` (application/infrastructure/presentation), Prisma findMany с фильтрами + count. Frontend — Vue 3 + Pinia: widget `shop-catalog` композирует пилюли/сортировку/сетку/пагинацию, состояние читается из URL, категории кэшируются в store, товары загружаются на каждое изменение URL.

**Tech Stack:** Hono, Prisma, Zod, Vue 3 (composition API), Pinia, vue-router, Vitest, Playwright, SCSS (BEM в `<style scoped>`).

**Spec:** `docs/superpowers/specs/2026-05-01-catalog-page-design.md`

---

## Pre-flight Notes

**Отступление от спеки:** спека упоминает `packages/shared` для Zod-схем и типов, но этот workspace физически в проекте не создан. Создание npm-workspace `packages/shared` — отдельная задача. Этот план следует существующему паттерну: Zod-схема и типы живут локально в `apps/api/src/features/products/types.ts` и `apps/web/src/entities/product/{types.ts,productApi.ts}` (дублирование, как в `gallery`).

**Стиль кода (из CLAUDE.md):**
- Никаких комментариев — пишем код, который не требует пояснений
- Существующие в проекте русские комментарии не удаляем при модификации
- TypeScript: `any` запрещён, на границах `unknown` + Zod
- BEM в `<style scoped lang="scss">`, никаких `cursor: pointer`, никаких `rgba()`
- Адаптация только через `@include tablet { ... }` / `@include desktop { ... }` из `@/assets/styles/breakpoints.module`
- Z-index — через `calc(var(--prev) + 1)`, переменные в `index.html` (`:root`)

**Запуск тестов:**
- API: `npm run test -w apps/api` или одиночный файл: `npx -w apps/api vitest run path/to/file.test.ts`
- Web: `npm run test -w apps/web` или одиночный: `npx -w apps/web vitest run path/to/file.test.ts`
- E2E: `npm run test:e2e -w apps/web`
- Полный typecheck из CLAUDE.md: `node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit` (для api) и `node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit` (для web)

**Коммиты:** каждая задача завершается коммитом. Сообщения в стиле `feat: ...` / `test: ...` / `chore: ...` (см. `git log` репозитория).

---

## Phase 1 — Database & Seed

### Task 1: Add `slug` to Product model

**Files:**
- Modify: `apps/api/prisma/schema.prisma:77-97`

- [ ] **Step 1: Add `slug String @unique` field to Product model**

В `apps/api/prisma/schema.prisma`, в блоке `model Product`, после строки `name        String` добавить:

```prisma
model Product {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String
  price       Decimal   @db.Decimal(10, 2)
  images      String[]
  stock       Int       @default(0)
  isPublished Boolean   @default(false)
  deletedAt   DateTime?
  categoryId  String
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  category    Category    @relation(fields: [categoryId], references: [id])
  cartItems   CartItem[]
  orderItems  OrderItem[]
  reviews     Review[]

  @@index([categoryId])
  @@index([isPublished, deletedAt])
}
```

- [ ] **Step 2: Install slugify dependency**

```bash
npm install slugify -w apps/api
```

Expected: `slugify` появляется в `apps/api/package.json` под `dependencies`.

- [ ] **Step 3: Create migration**

```bash
npx -w apps/api prisma migrate dev --name add_product_slug
```

Expected: создаётся новая папка в `apps/api/prisma/migrations/<timestamp>_add_product_slug/` с `migration.sql`, который добавляет колонку `slug TEXT NOT NULL` и уникальный индекс. Если в БД нет товаров — миграция применяется чисто. Если товары есть — Prisma попросит default-value: указать пустую строку и запустить бэкфилл вручную в Step 4.

**Важно:** если миграция спросит `Enter a name for the new migration`, ввести `add_product_slug`. Если спросит про default value (товары существуют) — отменить (Ctrl+C), удалить пустую миграционную папку, выполнить `npx -w apps/api prisma migrate reset` (предупреждение: чистит БД!) и повторить. В dev-окружении это OK, в prod — отдельная процедура (вне скоупа).

- [ ] **Step 4: Verify schema regenerated**

```bash
npx -w apps/api prisma generate
```

Expected: `Generated Prisma Client` без ошибок.

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations apps/api/package.json package-lock.json
git commit -m "feat(db): add slug field to Product model"
```

---

### Task 2: Update seed.ts with sample products

**Files:**
- Modify: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Add slugify import and sample products array**

В `apps/api/prisma/seed.ts` после `import { PrismaClient, GallerySection } from '@prisma/client'` добавить:

```typescript
import slugify from 'slugify'
```

В конец файла, перед `async function main()`, добавить:

```typescript
const sampleProducts = [
  { name: 'Sleeping bunny figurine', categorySlug: 'art-dolls', price: 24.0, stock: 5, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Bunny'] },
  { name: 'Forest fox magnet', categorySlug: 'birthday-gifts', price: 12.5, stock: 0, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Fox'] },
  { name: 'Mini cake topper — heart', categorySlug: 'cake-toppers', price: 8.0, stock: 12, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Heart'] },
  { name: 'Halloween pumpkin earrings', categorySlug: 'halloween-gifts', price: 18.0, stock: 3, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Pumpkin'] },
  { name: 'Christmas tree miniature', categorySlug: 'christmas-gifts', price: 30.0, stock: 2, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Tree'] },
  { name: 'Valentines bear with heart', categorySlug: 'valentines-day-gifts', price: 22.0, stock: 7, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Bear'] },
  { name: 'Graduation cap badge', categorySlug: 'graduation-gifts', price: 15.0, stock: 4, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Cap'] },
  { name: 'Tiny dollhouse teapot', categorySlug: 'dollhouse-miniature', price: 9.5, stock: 8, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Teapot'] },
  { name: 'Party favor — unicorn pack of 10', categorySlug: 'party-favors-bulk', price: 45.0, stock: 1, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Unicorns'] },
  { name: 'Strawberry charm', categorySlug: 'art-dolls', price: 6.0, stock: 20, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Strawberry'] },
  { name: 'Sushi set magnets', categorySlug: 'cake-toppers', price: 14.0, stock: 0, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Sushi'] },
  { name: 'Mermaid figurine', categorySlug: 'art-dolls', price: 32.0, stock: 6, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Mermaid'] },
  { name: 'Cute hedgehog brooch', categorySlug: 'birthday-gifts', price: 11.0, stock: 9, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Hedgehog'] },
  { name: 'Mini food platter', categorySlug: 'dollhouse-miniature', price: 16.5, stock: 5, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Platter'] },
]
```

- [ ] **Step 2: Add product seeding loop**

В функции `main()`, после блока gallery seeding (после `console.log(\`Seeded ${galleryItems.length} gallery items.\`)`), добавить:

```typescript
  console.log('Seeding products...')

  const categoriesBySlug = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id]),
  )

  for (const p of sampleProducts) {
    const categoryId = categoriesBySlug.get(p.categorySlug)
    if (!categoryId) {
      console.warn(`Skipping ${p.name}: category ${p.categorySlug} not found`)
      continue
    }
    const baseSlug = slugify(p.name, { lower: true, strict: true })
    await prisma.product.upsert({
      where: { slug: baseSlug },
      update: {
        name: p.name,
        price: p.price,
        stock: p.stock,
        images: p.images,
        isPublished: true,
        categoryId,
      },
      create: {
        name: p.name,
        slug: baseSlug,
        description: `Handmade polymer clay item: ${p.name}.`,
        price: p.price,
        stock: p.stock,
        images: p.images,
        isPublished: true,
        categoryId,
      },
    })
  }

  console.log(`Seeded ${sampleProducts.length} products.`)
```

- [ ] **Step 3: Run seed**

```bash
npx -w apps/api prisma db seed
```

Expected output ends with `Seeded 14 products.`

- [ ] **Step 4: Verify in DB**

```bash
npx -w apps/api prisma studio
```

Открыть таблицу `Product` — должно быть 14 записей с заполненным `slug`. Закрыть studio (Ctrl+C).

- [ ] **Step 5: Commit**

```bash
git add apps/api/prisma/seed.ts
git commit -m "chore(seed): add sample products with slugs"
```

---

## Phase 2 — Backend types & repository

### Task 3: Define product feature types

**Files:**
- Create: `apps/api/src/features/products/types.ts`

- [ ] **Step 1: Write the file**

```typescript
export type ProductSortOrder = 'newest' | 'price-asc' | 'price-desc'

export type ProductListItem = {
  id: string
  slug: string
  name: string
  price: number
  image: string | null
  stock: number
}

export type ProductListResponse = {
  items: ProductListItem[]
  total: number
  page: number
  totalPages: number
}

export type ProductListParams = {
  category?: string
  sort: ProductSortOrder
  page: number
  limit: number
}

export type CategoryListItem = {
  id: string
  slug: string
  name: string
}

export interface ProductRepository {
  findMany(params: ProductListParams): Promise<{ items: ProductListItem[]; total: number }>
  listCategories(): Promise<CategoryListItem[]>
}
```

- [ ] **Step 2: Verify typecheck**

```bash
npx -w apps/api tsc --noEmit
```

Expected: no errors. (`tsc` may need `--max-old-space-size=8192` if path has Cyrillic — see CLAUDE.md.)

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/features/products/types.ts
git commit -m "feat(api): add products feature types"
```

---

### Task 4: ProductRepository — listCategories

**Files:**
- Create: `apps/api/src/features/products/infrastructure/productRepository.ts`
- Create: `apps/api/src/features/products/infrastructure/productRepository.test.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/features/products/infrastructure/productRepository.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeProductRepository } from './productRepository'

function makePrismaMock() {
  return {
    product: { findMany: vi.fn(), count: vi.fn() },
    category: { findMany: vi.fn() },
  } as unknown as Parameters<typeof makeProductRepository>[0]
}

describe('productRepository.listCategories', () => {
  it('returns categories ordered by name', async () => {
    const prisma = makePrismaMock()
    const fake = [
      { id: '1', slug: 'animals', name: 'Animals' },
      { id: '2', slug: 'sweet', name: 'Sweet' },
    ]
    vi.mocked(prisma.category.findMany).mockResolvedValue(fake)

    const repo = makeProductRepository(prisma)
    const result = await repo.listCategories()

    expect(prisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, slug: true, name: true },
    })
    expect(result).toEqual(fake)
  })

  it('returns empty array when no categories exist', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.category.findMany).mockResolvedValue([])

    const repo = makeProductRepository(prisma)
    const result = await repo.listCategories()

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/api vitest run src/features/products/infrastructure/productRepository.test.ts
```

Expected: FAIL with `Cannot find module './productRepository'`.

- [ ] **Step 3: Write minimal implementation**

`apps/api/src/features/products/infrastructure/productRepository.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import type { ProductListParams, ProductListItem, CategoryListItem, ProductRepository } from '../types'

export function makeProductRepository(prisma: PrismaClient): ProductRepository {
  return {
    async findMany(_params: ProductListParams) {
      return { items: [] as ProductListItem[], total: 0 }
    },
    async listCategories(): Promise<CategoryListItem[]> {
      return prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, name: true },
      })
    },
  }
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/api vitest run src/features/products/infrastructure/productRepository.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/products/infrastructure/
git commit -m "feat(api): add productRepository.listCategories"
```

---

### Task 5: ProductRepository — findMany filters

**Files:**
- Modify: `apps/api/src/features/products/infrastructure/productRepository.ts`
- Modify: `apps/api/src/features/products/infrastructure/productRepository.test.ts`

- [ ] **Step 1: Add failing tests for findMany**

В `productRepository.test.ts` после блока `describe('productRepository.listCategories', ...)` добавить:

```typescript
describe('productRepository.findMany', () => {
  it('filters by isPublished and deletedAt and applies pagination', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', slug: 'p-1', name: 'P1', price: { toNumber: () => 10 } as never, images: ['img1'], stock: 1 },
    ])
    vi.mocked(prisma.product.count).mockResolvedValue(1)

    const repo = makeProductRepository(prisma)
    const result = await repo.findMany({ sort: 'newest', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.where).toMatchObject({ isPublished: true, deletedAt: null })
    expect(calledWith.skip).toBe(0)
    expect(calledWith.take).toBe(12)
    expect(calledWith.orderBy).toEqual({ createdAt: 'desc' })
    expect(result.total).toBe(1)
    expect(result.items).toEqual([
      { id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img1', stock: 1 },
    ])
  })

  it('filters by category slug when provided', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ category: 'animals', sort: 'newest', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.where).toMatchObject({
      isPublished: true,
      deletedAt: null,
      category: { slug: 'animals' },
    })
  })

  it('orders by price asc when sort=price-asc', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'price-asc', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.orderBy).toEqual({ price: 'asc' })
  })

  it('orders by price desc when sort=price-desc', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'price-desc', page: 1, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.orderBy).toEqual({ price: 'desc' })
  })

  it('computes skip from page and limit', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([])
    vi.mocked(prisma.product.count).mockResolvedValue(0)

    const repo = makeProductRepository(prisma)
    await repo.findMany({ sort: 'newest', page: 3, limit: 12 })

    const calledWith = vi.mocked(prisma.product.findMany).mock.calls[0]![0]!
    expect(calledWith.skip).toBe(24)
    expect(calledWith.take).toBe(12)
  })

  it('returns null image when images array is empty', async () => {
    const prisma = makePrismaMock()
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', slug: 'p-1', name: 'P1', price: { toNumber: () => 10 } as never, images: [], stock: 1 },
    ])
    vi.mocked(prisma.product.count).mockResolvedValue(1)

    const repo = makeProductRepository(prisma)
    const result = await repo.findMany({ sort: 'newest', page: 1, limit: 12 })

    expect(result.items[0]!.image).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests, verify FAILs**

```bash
npx -w apps/api vitest run src/features/products/infrastructure/productRepository.test.ts
```

Expected: 6 tests fail (`findMany` returns empty stub).

- [ ] **Step 3: Implement findMany**

Заменить `findMany` в `productRepository.ts`:

```typescript
import type { PrismaClient, Prisma } from '@prisma/client'
import type { ProductListParams, ProductListItem, CategoryListItem, ProductRepository, ProductSortOrder } from '../types'

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  images: true,
  stock: true,
} as const

function orderByForSort(sort: ProductSortOrder): Prisma.ProductOrderByWithRelationInput {
  if (sort === 'price-asc') return { price: 'asc' }
  if (sort === 'price-desc') return { price: 'desc' }
  return { createdAt: 'desc' }
}

export function makeProductRepository(prisma: PrismaClient): ProductRepository {
  return {
    async findMany(params: ProductListParams) {
      const where: Prisma.ProductWhereInput = {
        isPublished: true,
        deletedAt: null,
        ...(params.category ? { category: { slug: params.category } } : {}),
      }

      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: orderByForSort(params.sort),
          select: PRODUCT_SELECT,
          skip: (params.page - 1) * params.limit,
          take: params.limit,
        }),
        prisma.product.count({ where }),
      ])

      const items: ProductListItem[] = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        price: r.price.toNumber(),
        image: r.images[0] ?? null,
        stock: r.stock,
      }))

      return { items, total }
    },
    async listCategories(): Promise<CategoryListItem[]> {
      return prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, name: true },
      })
    },
  }
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx -w apps/api vitest run src/features/products/infrastructure/productRepository.test.ts
```

Expected: 8 tests pass (2 listCategories + 6 findMany).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/products/infrastructure/
git commit -m "feat(api): implement productRepository.findMany with filters and pagination"
```

---

## Phase 3 — Backend application (use-cases)

### Task 6: listProducts use-case

**Files:**
- Create: `apps/api/src/features/products/application/listProducts.ts`
- Create: `apps/api/src/features/products/application/listProducts.test.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/features/products/application/listProducts.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeListProducts } from './listProducts'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
  }
}

describe('listProducts', () => {
  it('returns response with totalPages computed from total and limit', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({
      items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img', stock: 1 }],
      total: 25,
    })

    const listProducts = makeListProducts(repo)
    const result = await listProducts({ sort: 'newest', page: 2, limit: 12 })

    expect(repo.findMany).toHaveBeenCalledWith({ sort: 'newest', page: 2, limit: 12 })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(25)
    expect(result.page).toBe(2)
    expect(result.totalPages).toBe(3)
  })

  it('totalPages is 0 when total is 0', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({ items: [], total: 0 })

    const listProducts = makeListProducts(repo)
    const result = await listProducts({ sort: 'newest', page: 1, limit: 12 })

    expect(result.totalPages).toBe(0)
    expect(result.items).toEqual([])
  })

  it('passes category filter to repository', async () => {
    const repo = makeRepo()
    vi.mocked(repo.findMany).mockResolvedValue({ items: [], total: 0 })

    const listProducts = makeListProducts(repo)
    await listProducts({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })

    expect(repo.findMany).toHaveBeenCalledWith({ category: 'animals', sort: 'price-asc', page: 1, limit: 12 })
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/api vitest run src/features/products/application/listProducts.test.ts
```

Expected: FAIL `Cannot find module './listProducts'`.

- [ ] **Step 3: Write implementation**

`apps/api/src/features/products/application/listProducts.ts`:

```typescript
import type { ProductListParams, ProductListResponse, ProductRepository } from '../types'

export function makeListProducts(repo: ProductRepository) {
  return async function listProducts(params: ProductListParams): Promise<ProductListResponse> {
    const { items, total } = await repo.findMany(params)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    return { items, total, page: params.page, totalPages }
  }
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/api vitest run src/features/products/application/listProducts.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/products/application/listProducts.ts apps/api/src/features/products/application/listProducts.test.ts
git commit -m "feat(api): add listProducts use-case"
```

---

### Task 7: listCategories use-case

**Files:**
- Create: `apps/api/src/features/products/application/listCategories.ts`
- Create: `apps/api/src/features/products/application/listCategories.test.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/features/products/application/listCategories.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeListCategories } from './listCategories'
import type { ProductRepository } from '../types'

function makeRepo(): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
  }
}

describe('listCategories', () => {
  it('delegates to repository', async () => {
    const repo = makeRepo()
    const fake = [
      { id: '1', slug: 'animals', name: 'Animals' },
      { id: '2', slug: 'sweet', name: 'Sweet' },
    ]
    vi.mocked(repo.listCategories).mockResolvedValue(fake)

    const listCategories = makeListCategories(repo)
    const result = await listCategories()

    expect(result).toEqual(fake)
  })

  it('returns empty array when no categories exist', async () => {
    const repo = makeRepo()
    vi.mocked(repo.listCategories).mockResolvedValue([])

    const listCategories = makeListCategories(repo)
    const result = await listCategories()

    expect(result).toEqual([])
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/api vitest run src/features/products/application/listCategories.test.ts
```

Expected: FAIL `Cannot find module './listCategories'`.

- [ ] **Step 3: Write implementation**

`apps/api/src/features/products/application/listCategories.ts`:

```typescript
import type { CategoryListItem, ProductRepository } from '../types'

export function makeListCategories(repo: ProductRepository) {
  return async function listCategories(): Promise<CategoryListItem[]> {
    return repo.listCategories()
  }
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/api vitest run src/features/products/application/listCategories.test.ts
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/products/application/listCategories.ts apps/api/src/features/products/application/listCategories.test.ts
git commit -m "feat(api): add listCategories use-case"
```

---

## Phase 4 — Backend presentation (HTTP routes)

### Task 8: productRoutes — basic GET /products

**Files:**
- Create: `apps/api/src/features/products/presentation/productRoutes.ts`
- Create: `apps/api/src/features/products/presentation/productRoutes.test.ts`

- [ ] **Step 1: Write failing test**

`apps/api/src/features/products/presentation/productRoutes.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeProductsRouter } from './productRoutes'

const sampleResponse = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: 'img', stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

function makeApp(listProducts = vi.fn().mockResolvedValue(sampleResponse), listCategories = vi.fn().mockResolvedValue([])) {
  const app = new Hono()
  app.route('/', makeProductsRouter(listProducts, listCategories))
  return { app, listProducts, listCategories }
}

describe('GET /products', () => {
  it('returns 200 with default params (sort=newest, page=1, limit=12)', async () => {
    const { app, listProducts } = makeApp()
    const res = await app.request('/products')
    expect(res.status).toBe(200)
    expect(listProducts).toHaveBeenCalledWith({ sort: 'newest', page: 1, limit: 12, category: undefined })
    expect(await res.json()).toEqual(sampleResponse)
  })

  it('passes category, sort, page, limit from query', async () => {
    const { app, listProducts } = makeApp()
    await app.request('/products?category=animals&sort=price-asc&page=2&limit=24')
    expect(listProducts).toHaveBeenCalledWith({
      category: 'animals',
      sort: 'price-asc',
      page: 2,
      limit: 24,
    })
  })

  it('treats empty category as no filter', async () => {
    const { app, listProducts } = makeApp()
    const res = await app.request('/products?category=')
    expect(res.status).toBe(200)
    expect(listProducts).toHaveBeenCalledWith({ sort: 'newest', page: 1, limit: 12, category: undefined })
  })

  it('returns 400 for invalid sort', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?sort=foobar')
    expect(res.status).toBe(400)
  })

  it('returns 400 for page=0', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=0')
    expect(res.status).toBe(400)
  })

  it('returns 400 for negative page', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=-1')
    expect(res.status).toBe(400)
  })

  it('returns 400 for non-numeric page', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?page=abc')
    expect(res.status).toBe(400)
  })

  it('returns 400 when limit > 48', async () => {
    const { app } = makeApp()
    const res = await app.request('/products?limit=99')
    expect(res.status).toBe(400)
  })
})

describe('GET /categories', () => {
  it('returns 200 with category list', async () => {
    const fake = [{ id: '1', slug: 'animals', name: 'Animals' }]
    const { app } = makeApp(undefined, vi.fn().mockResolvedValue(fake))
    const res = await app.request('/categories')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(fake)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/api vitest run src/features/products/presentation/productRoutes.test.ts
```

Expected: FAIL `Cannot find module './productRoutes'`.

- [ ] **Step 3: Write implementation**

`apps/api/src/features/products/presentation/productRoutes.ts`:

```typescript
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import type { ProductListParams, ProductListResponse, CategoryListItem } from '../types'

type ListProducts = (params: ProductListParams) => Promise<ProductListResponse>
type ListCategories = () => Promise<CategoryListItem[]>

const productListQuerySchema = z.object({
  category: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

export function makeProductsRouter(listProducts: ListProducts, listCategories: ListCategories) {
  const router = new Hono()

  router.get('/products', zValidator('query', productListQuerySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await listProducts(params)
    return c.json(result)
  })

  router.get('/categories', async (c) => {
    const result = await listCategories()
    return c.json(result)
  })

  return router
}
```

- [ ] **Step 4: Run tests, verify PASS**

```bash
npx -w apps/api vitest run src/features/products/presentation/productRoutes.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/features/products/presentation/
git commit -m "feat(api): add products and categories HTTP routes"
```

---

## Phase 5 — Backend wiring

### Task 9: Wire products feature into app.ts

**Files:**
- Create: `apps/api/src/features/products/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Step 1: Write public API barrel**

`apps/api/src/features/products/index.ts`:

```typescript
export { makeProductRepository } from './infrastructure/productRepository'
export { makeListProducts } from './application/listProducts'
export { makeListCategories } from './application/listCategories'
export { makeProductsRouter } from './presentation/productRoutes'
```

- [ ] **Step 2: Wire into app.ts**

В `apps/api/src/app.ts` найти блок импортов и добавить новый импорт после `import { makeContactRepository, ... }`:

```typescript
import {
  makeProductRepository,
  makeListProducts,
  makeListCategories,
  makeProductsRouter,
} from './features/products'
```

В функции `createApp()`, после блока `// Contact` (после строки `app.route('/contact', makeContactRouter(submit))`) и перед `// Auth`, добавить:

```typescript
  // Products
  const productRepo = makeProductRepository(prisma)
  const listProducts = makeListProducts(productRepo)
  const listCategories = makeListCategories(productRepo)
  app.route('/', makeProductsRouter(listProducts, listCategories))
```

(Используем `app.route('/', ...)` потому что роутер уже содержит пути `/products` и `/categories` в полном виде — не префиксим.)

- [ ] **Step 3: Verify typecheck**

```bash
npx -w apps/api tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Smoke test endpoints manually (optional but recommended)**

В одном терминале:
```bash
npm run dev -w apps/api
```

В другом:
```bash
curl http://localhost:3000/products
curl http://localhost:3000/categories
curl 'http://localhost:3000/products?sort=price-asc&page=1'
curl 'http://localhost:3000/products?sort=invalid'
```

Expected:
- `/products` → JSON `{ items: [...14], total: 14, page: 1, totalPages: 2 }`
- `/categories` → JSON массив 9 категорий
- `?sort=price-asc` → товары отсортированы по возрастанию цены
- `?sort=invalid` → 400

Остановить dev-сервер (Ctrl+C).

- [ ] **Step 5: Run full API test suite**

```bash
npm run test -w apps/api
```

Expected: все тесты проходят (включая существующие auth/gallery/contact/newsletter).

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/features/products/index.ts apps/api/src/app.ts
git commit -m "feat(api): wire products feature into composition root"
```

---

## Phase 6 — Frontend shared utility

### Task 10: formatPrice utility

**Files:**
- Create: `apps/web/src/shared/lib/formatPrice.ts`
- Create: `apps/web/src/shared/lib/formatPrice.test.ts`
- Modify: `apps/web/src/shared/index.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/shared/lib/formatPrice.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { formatPrice } from './formatPrice'

describe('formatPrice', () => {
  it('formats integer prices with two decimals and dollar sign', () => {
    expect(formatPrice(24)).toBe('$24.00')
  })

  it('formats one-decimal prices with two decimals', () => {
    expect(formatPrice(24.5)).toBe('$24.50')
  })

  it('formats zero as $0.00', () => {
    expect(formatPrice(0)).toBe('$0.00')
  })

  it('formats large numbers with comma thousand separators', () => {
    expect(formatPrice(1234.56)).toBe('$1,234.56')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/shared/lib/formatPrice.test.ts
```

Expected: FAIL `Cannot find module './formatPrice'`.

- [ ] **Step 3: Write implementation**

`apps/web/src/shared/lib/formatPrice.ts`:

```typescript
const formatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value: number): string {
  return formatter.format(value)
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/shared/lib/formatPrice.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Export from shared barrel**

В `apps/web/src/shared/index.ts` добавить строку (можно в конец):

```typescript
export { formatPrice } from './lib/formatPrice'
```

- [ ] **Step 6: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/shared/lib/formatPrice.ts apps/web/src/shared/lib/formatPrice.test.ts apps/web/src/shared/index.ts
git commit -m "feat(web): add formatPrice utility"
```

---

## Phase 7 — Frontend entities

### Task 11: entities/category

**Files:**
- Create: `apps/web/src/entities/category/types.ts`
- Create: `apps/web/src/entities/category/categoryApi.ts`
- Create: `apps/web/src/entities/category/index.ts`

- [ ] **Step 1: Write types**

`apps/web/src/entities/category/types.ts`:

```typescript
export type Category = {
  id: string
  slug: string
  name: string
}
```

- [ ] **Step 2: Write API client**

`apps/web/src/entities/category/categoryApi.ts`:

```typescript
import { z } from 'zod'
import { apiFetch } from '@/shared'
import type { Category } from './types'

const CategorySchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
})

const CategoryListSchema = z.array(CategorySchema)

export async function fetchCategories(): Promise<Category[]> {
  const res = await apiFetch('/categories')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return CategoryListSchema.parse(data)
}
```

- [ ] **Step 3: Write barrel**

`apps/web/src/entities/category/index.ts`:

```typescript
export type { Category } from './types'
export { fetchCategories } from './categoryApi'
```

- [ ] **Step 4: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/entities/category/
git commit -m "feat(web): add category entity"
```

---

### Task 12: entities/product types and API

**Files:**
- Create: `apps/web/src/entities/product/types.ts`
- Create: `apps/web/src/entities/product/productApi.ts`
- Create: `apps/web/src/entities/product/index.ts`

- [ ] **Step 1: Write types**

`apps/web/src/entities/product/types.ts`:

```typescript
export type ProductSortOrder = 'newest' | 'price-asc' | 'price-desc'

export type Product = {
  id: string
  slug: string
  name: string
  price: number
  image: string | null
  stock: number
}

export type ProductListResponse = {
  items: Product[]
  total: number
  page: number
  totalPages: number
}

export type ProductListParams = {
  category?: string
  sort: ProductSortOrder
  page: number
  limit: number
}
```

- [ ] **Step 2: Write API client**

`apps/web/src/entities/product/productApi.ts`:

```typescript
import { z } from 'zod'
import { apiFetch } from '@/shared'
import type { Product, ProductListResponse, ProductListParams } from './types'

const ProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  image: z.string().nullable(),
  stock: z.number().int().min(0),
}) satisfies z.ZodType<Product>

const ProductListResponseSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  totalPages: z.number().int().min(0),
}) satisfies z.ZodType<ProductListResponse>

export async function fetchProducts(params: ProductListParams): Promise<ProductListResponse> {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  search.set('sort', params.sort)
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))

  const res = await apiFetch(`/products?${search.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return ProductListResponseSchema.parse(data)
}
```

- [ ] **Step 3: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit (will add barrel after ProductCard task)**

```bash
git add apps/web/src/entities/product/types.ts apps/web/src/entities/product/productApi.ts
git commit -m "feat(web): add product types and API client"
```

---

### Task 13: ProductCard component

**Files:**
- Create: `apps/web/src/entities/product/ProductCard.vue`
- Create: `apps/web/src/entities/product/ProductCard.test.ts`
- Create: `apps/web/src/entities/product/index.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/entities/product/ProductCard.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ProductCard from './ProductCard.vue'
import type { Product } from './types'

const baseProduct: Product = {
  id: 'p1',
  slug: 'sleeping-bunny',
  name: 'Sleeping bunny',
  price: 24,
  image: 'https://example.com/bunny.jpg',
  stock: 5,
}

function mountCard(product: Product) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  return mount(ProductCard, {
    props: { product },
    global: { plugins: [router] },
  })
}

describe('ProductCard', () => {
  it('renders name, formatted price, and image', () => {
    const wrapper = mountCard(baseProduct)
    expect(wrapper.text()).toContain('Sleeping bunny')
    expect(wrapper.text()).toContain('$24.00')
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/bunny.jpg')
  })

  it('renders placeholder when image is null', () => {
    const wrapper = mountCard({ ...baseProduct, image: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.product-card__placeholder').exists()).toBe(true)
  })

  it('wraps product info in router-link to /product/:slug', () => {
    const wrapper = mountCard(baseProduct)
    const link = wrapper.find('a.product-card__link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/product/sleeping-bunny')
  })

  it('renders enabled "Add to cart" button when stock > 0', () => {
    const wrapper = mountCard(baseProduct)
    const btn = wrapper.find('button.product-card__btn')
    expect(btn.text()).toBe('Add to cart')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('renders disabled "Sold out" button and badge when stock === 0', () => {
    const wrapper = mountCard({ ...baseProduct, stock: 0 })
    const btn = wrapper.find('button.product-card__btn')
    expect(btn.text()).toBe('Sold out')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.product-card__badge').text()).toBe('Sold out')
  })

  it('button click calls console.log("add to cart", id) and does NOT trigger navigation', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mountCard(baseProduct)

    const btn = wrapper.find('button.product-card__btn')
    await btn.trigger('click')

    expect(spy).toHaveBeenCalledWith('add to cart', 'p1')
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/entities/product/ProductCard.test.ts
```

Expected: FAIL `Cannot find module './ProductCard.vue'`.

- [ ] **Step 3: Write component**

`apps/web/src/entities/product/ProductCard.vue`:

```vue
<template>
  <article class="product-card">
    <RouterLink
      :to="`/product/${product.slug}`"
      class="product-card__link"
    >
      <div class="product-card__image">
        <img
          v-if="product.image"
          :src="product.image"
          :alt="product.name"
          class="product-card__img"
        >
        <div
          v-else
          class="product-card__placeholder"
          aria-hidden="true"
        />
        <span
          v-if="product.stock === 0"
          class="product-card__badge"
        >Sold out</span>
      </div>
      <div class="product-card__body">
        <h3 class="product-card__name">{{ product.name }}</h3>
        <p class="product-card__price">{{ formatPrice(product.price) }}</p>
      </div>
    </RouterLink>
    <button
      type="button"
      class="product-card__btn"
      :disabled="product.stock === 0"
      @click="onAdd"
    >
      {{ product.stock === 0 ? 'Sold out' : 'Add to cart' }}
    </button>
  </article>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatPrice } from '@/shared'
import type { Product } from './types'

const props = defineProps<{ product: Product }>()

function onAdd() {
  console.log('add to cart', props.product.id)
}
</script>

<style scoped lang="scss">
.product-card {
  display: flex;
  flex-direction: column;
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }

  &__link {
    color: inherit;
    text-decoration: none;
  }

  &__image {
    position: relative;
    aspect-ratio: 1;
    background: rgb(var(--btn-gradient-light) / 0.4);
  }

  &__img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(
      135deg,
      rgb(var(--btn-gradient-light) / 1),
      rgb(var(--btn-gradient-mid) / 0.4)
    );
  }

  &__badge {
    position: absolute;
    top: 0.6rem;
    left: 0.6rem;
    background: rgb(0 0 0 / 0.7);
    color: var(--color-white);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
  }

  &__body {
    padding: 0.75rem 0.75rem 0.5rem;
  }

  &__name {
    font-size: var(--fs-md);
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.25rem;
  }

  &__price {
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--color-accent);
  }

  &__btn {
    margin: 0 0.75rem 0.75rem;
    padding: 0.6rem 1rem;
    background: var(--color-accent);
    color: var(--color-white);
    border: none;
    border-radius: 4px;
    font-family: var(--font-display);
    font-size: var(--fs-sm);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    transition: background-color 0.2s ease;

    &:hover:not(:disabled) {
      background: var(--color-text-muted);
    }

    &:disabled {
      background: var(--color-border);
      color: var(--color-text-muted);
    }
  }
}
</style>
```

- [ ] **Step 4: Write barrel**

`apps/web/src/entities/product/index.ts`:

```typescript
export type { Product, ProductListResponse, ProductListParams, ProductSortOrder } from './types'
export { fetchProducts } from './productApi'
export { default as ProductCard } from './ProductCard.vue'
```

- [ ] **Step 5: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/entities/product/ProductCard.test.ts
```

Expected: 6 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/entities/product/
git commit -m "feat(web): add ProductCard component"
```

---

## Phase 8 — Frontend widget — store and composable

### Task 14: shopCatalogStore (Pinia)

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/shopCatalogStore.ts`
- Create: `apps/web/src/widgets/shop-catalog/shopCatalogStore.test.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/widgets/shop-catalog/shopCatalogStore.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { flushPromises } from '@vue/test-utils'

vi.mock('@/entities/category', () => ({
  fetchCategories: vi.fn(),
}))

import { fetchCategories } from '@/entities/category'
import { useShopCatalogStore } from './shopCatalogStore'

const mockFetch = vi.mocked(fetchCategories)

describe('shopCatalogStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state — empty categories, not loading, no error', () => {
    const store = useShopCatalogStore()
    expect(store.categories).toEqual([])
    expect(store.categoriesLoading).toBe(false)
    expect(store.categoriesError).toBe(false)
  })

  it('loadCategories fetches and stores categories', async () => {
    const fake = [{ id: '1', slug: 'a', name: 'A' }]
    mockFetch.mockResolvedValue(fake)

    const store = useShopCatalogStore()
    await store.loadCategories()

    expect(store.categories).toEqual(fake)
    expect(store.categoriesLoading).toBe(false)
    expect(store.categoriesError).toBe(false)
  })

  it('loadCategories is idempotent — second call does not refetch', async () => {
    mockFetch.mockResolvedValue([{ id: '1', slug: 'a', name: 'A' }])

    const store = useShopCatalogStore()
    await store.loadCategories()
    await store.loadCategories()

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('loadCategories sets categoriesError on failure', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const store = useShopCatalogStore()
    await store.loadCategories()

    expect(store.categoriesError).toBe(true)
    expect(store.categories).toEqual([])
  })

  it('loadCategories sets categoriesLoading=true while fetching', async () => {
    let resolve!: (v: unknown) => void
    mockFetch.mockReturnValue(new Promise((r) => { resolve = r }))

    const store = useShopCatalogStore()
    const promise = store.loadCategories()

    expect(store.categoriesLoading).toBe(true)
    resolve([])
    await promise
    await flushPromises()
    expect(store.categoriesLoading).toBe(false)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/shopCatalogStore.test.ts
```

Expected: FAIL `Cannot find module './shopCatalogStore'`.

- [ ] **Step 3: Write implementation**

`apps/web/src/widgets/shop-catalog/shopCatalogStore.ts`:

```typescript
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchCategories, type Category } from '@/entities/category'

export const useShopCatalogStore = defineStore('shopCatalog', () => {
  const categories = ref<Category[]>([])
  const categoriesLoading = ref(false)
  const categoriesError = ref(false)
  let loaded = false

  async function loadCategories() {
    if (loaded || categoriesLoading.value) return
    categoriesLoading.value = true
    categoriesError.value = false
    try {
      categories.value = await fetchCategories()
      loaded = true
    } catch {
      categoriesError.value = true
    } finally {
      categoriesLoading.value = false
    }
  }

  return { categories, categoriesLoading, categoriesError, loadCategories }
})
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/shopCatalogStore.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/shopCatalogStore.ts apps/web/src/widgets/shop-catalog/shopCatalogStore.test.ts
git commit -m "feat(web): add shopCatalog Pinia store"
```

---

### Task 15: useShopCatalog composable

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/useShopCatalog.ts`
- Create: `apps/web/src/widgets/shop-catalog/useShopCatalog.test.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/widgets/shop-catalog/useShopCatalog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { defineComponent, h } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import { createRouter, createMemoryHistory, type Router } from 'vue-router'

vi.mock('@/entities/product', () => ({
  fetchProducts: vi.fn(),
}))
vi.mock('@/entities/category', () => ({
  fetchCategories: vi.fn().mockResolvedValue([]),
}))

import { fetchProducts } from '@/entities/product'
import { useShopCatalog } from './useShopCatalog'

const mockFetch = vi.mocked(fetchProducts)

const sampleResponse = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: null, stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

function makeRouter(initialPath = '/shop') {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  }).push(initialPath).then(() => undefined) as unknown as Promise<Router>
}

async function mountComposable(initialPath = '/shop') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  await router.push(initialPath)

  let api: ReturnType<typeof useShopCatalog>
  const Comp = defineComponent({
    setup() { api = useShopCatalog(); return () => h('div') },
  })
  mount(Comp, { global: { plugins: [createPinia(), router] } })
  await flushPromises()
  return { api: api!, router }
}

describe('useShopCatalog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    mockFetch.mockResolvedValue(sampleResponse)
  })

  it('fetches products on mount with default params from URL /shop', async () => {
    await mountComposable('/shop')

    expect(mockFetch).toHaveBeenCalledWith({
      category: undefined,
      sort: 'newest',
      page: 1,
      limit: 12,
    })
  })

  it('reads category from route params', async () => {
    await mountComposable('/shop/animals')

    expect(mockFetch).toHaveBeenCalledWith({
      category: 'animals',
      sort: 'newest',
      page: 1,
      limit: 12,
    })
  })

  it('reads sort and page from query', async () => {
    await mountComposable('/shop?sort=price-asc&page=2')

    expect(mockFetch).toHaveBeenCalledWith({
      category: undefined,
      sort: 'price-asc',
      page: 2,
      limit: 12,
    })
  })

  it('falls back to defaults for invalid sort', async () => {
    await mountComposable('/shop?sort=garbage')

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ sort: 'newest' }))
  })

  it('falls back to page=1 for invalid page', async () => {
    await mountComposable('/shop?page=abc')

    expect(mockFetch).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('exposes products, total, totalPages, isLoading, error after fetch', async () => {
    const { api } = await mountComposable('/shop')

    expect(api.products.value).toEqual(sampleResponse.items)
    expect(api.total.value).toBe(1)
    expect(api.totalPages.value).toBe(1)
    expect(api.isLoading.value).toBe(false)
    expect(api.error.value).toBe(null)
  })

  it('sets error and clears products when fetch fails', async () => {
    mockFetch.mockRejectedValue(new Error('HTTP 500'))

    const { api } = await mountComposable('/shop')

    expect(api.error.value).toBeInstanceOf(Error)
    expect(api.products.value).toEqual([])
  })

  it('refetches when category changes', async () => {
    const { router } = await mountComposable('/shop')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await router.push('/shop/animals')
    await flushPromises()

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'animals' }))
  })

  it('race condition: keeps result of latest call when two fetches overlap', async () => {
    let resolveFirst!: (v: typeof sampleResponse) => void
    let resolveSecond!: (v: typeof sampleResponse) => void

    mockFetch
      .mockReturnValueOnce(new Promise((r) => { resolveFirst = r }))
      .mockReturnValueOnce(new Promise((r) => { resolveSecond = r }))

    const { api, router } = await mountComposable('/shop')
    await router.push('/shop/animals')
    await flushPromises()

    const second = { ...sampleResponse, items: [{ ...sampleResponse.items[0]!, id: 'second' }] }
    const first = { ...sampleResponse, items: [{ ...sampleResponse.items[0]!, id: 'first' }] }

    resolveSecond(second)
    await flushPromises()
    resolveFirst(first)
    await flushPromises()

    expect(api.products.value[0]!.id).toBe('second')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/useShopCatalog.test.ts
```

Expected: FAIL `Cannot find module './useShopCatalog'`.

- [ ] **Step 3: Write implementation**

`apps/web/src/widgets/shop-catalog/useShopCatalog.ts`:

```typescript
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { fetchProducts, type Product, type ProductSortOrder } from '@/entities/product'
import { useShopCatalogStore } from './shopCatalogStore'

export const PAGE_SIZE = 12
const VALID_SORTS: ProductSortOrder[] = ['newest', 'price-asc', 'price-desc']

function parseSort(raw: unknown): ProductSortOrder {
  return typeof raw === 'string' && (VALID_SORTS as string[]).includes(raw)
    ? (raw as ProductSortOrder)
    : 'newest'
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : NaN
  return Number.isFinite(n) && n >= 1 ? n : 1
}

export function useShopCatalog() {
  const route = useRoute()
  const store = useShopCatalogStore()

  const category = computed(() => {
    const c = route.params.category
    return typeof c === 'string' && c.length > 0 ? c : undefined
  })
  const sort = computed(() => parseSort(route.query.sort))
  const page = computed(() => parsePage(route.query.page))

  const products = ref<Product[]>([])
  const total = ref(0)
  const totalPages = ref(0)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  let requestId = 0

  async function load() {
    const myId = ++requestId
    isLoading.value = true
    error.value = null
    try {
      const res = await fetchProducts({
        category: category.value,
        sort: sort.value,
        page: page.value,
        limit: PAGE_SIZE,
      })
      if (myId !== requestId) return
      products.value = res.items
      total.value = res.total
      totalPages.value = res.totalPages
    } catch (e) {
      if (myId !== requestId) return
      error.value = e instanceof Error ? e : new Error(String(e))
      products.value = []
      total.value = 0
      totalPages.value = 0
    } finally {
      if (myId === requestId) isLoading.value = false
    }
  }

  watch([category, sort, page], () => { void load() }, { immediate: true })

  void store.loadCategories()

  return {
    category,
    sort,
    page,
    products,
    total,
    totalPages,
    isLoading,
    error,
    categories: computed(() => store.categories),
    categoriesError: computed(() => store.categoriesError),
    retry: load,
  }
}
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/useShopCatalog.test.ts
```

Expected: 9 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/useShopCatalog.ts apps/web/src/widgets/shop-catalog/useShopCatalog.test.ts
git commit -m "feat(web): add useShopCatalog composable with URL state and race-condition guard"
```

---

## Phase 9 — Frontend widget components

### Task 16: CategoryPills

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/components/CategoryPills.vue`
- Create: `apps/web/src/widgets/shop-catalog/components/CategoryPills.test.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/widgets/shop-catalog/components/CategoryPills.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CategoryPills from './CategoryPills.vue'
import type { Category } from '@/entities/category'

const categories: Category[] = [
  { id: '1', slug: 'animals', name: 'Animals' },
  { id: '2', slug: 'sweet', name: 'Sweet' },
]

function mountPills(activeSlug: string | undefined, currentSort = 'newest') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  return mount(CategoryPills, {
    props: { categories, activeSlug, currentSort },
    global: { plugins: [router] },
  })
}

describe('CategoryPills', () => {
  it('renders "All" pill plus one per category', () => {
    const wrapper = mountPills(undefined)
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills).toHaveLength(3)
    expect(pills[0]!.text()).toBe('All')
    expect(pills[1]!.text()).toBe('Animals')
    expect(pills[2]!.text()).toBe('Sweet')
  })

  it('marks "All" pill active when activeSlug is undefined', () => {
    const wrapper = mountPills(undefined)
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills[0]!.classes()).toContain('category-pills__pill--active')
    expect(pills[1]!.classes()).not.toContain('category-pills__pill--active')
  })

  it('marks correct pill active when activeSlug is set', () => {
    const wrapper = mountPills('animals')
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills[0]!.classes()).not.toContain('category-pills__pill--active')
    expect(pills[1]!.classes()).toContain('category-pills__pill--active')
  })

  it('"All" link goes to /shop, preserves sort, drops page', () => {
    const wrapper = mountPills('animals', 'price-asc')
    const allLink = wrapper.findAll('a.category-pills__pill')[0]!
    const href = allLink.attributes('href')!
    expect(href).toContain('/shop')
    expect(href).toContain('sort=price-asc')
    expect(href).not.toContain('page=')
    expect(href).not.toContain('/shop/animals')
  })

  it('category link goes to /shop/:slug, preserves sort, drops page', () => {
    const wrapper = mountPills(undefined, 'price-asc')
    const animalsLink = wrapper.findAll('a.category-pills__pill')[1]!
    const href = animalsLink.attributes('href')!
    expect(href).toContain('/shop/animals')
    expect(href).toContain('sort=price-asc')
    expect(href).not.toContain('page=')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/components/CategoryPills.test.ts
```

Expected: FAIL `Cannot find module './CategoryPills.vue'`.

- [ ] **Step 3: Write component**

`apps/web/src/widgets/shop-catalog/components/CategoryPills.vue`:

```vue
<template>
  <nav
    class="category-pills"
    aria-label="Shop categories"
  >
    <RouterLink
      class="category-pills__pill"
      :class="{ 'category-pills__pill--active': !activeSlug }"
      :to="{ name: 'shop', params: { category: '' }, query: { sort: currentSort } }"
    >
      All
    </RouterLink>
    <RouterLink
      v-for="cat in categories"
      :key="cat.id"
      class="category-pills__pill"
      :class="{ 'category-pills__pill--active': activeSlug === cat.slug }"
      :to="{ name: 'shop', params: { category: cat.slug }, query: { sort: currentSort } }"
    >
      {{ cat.name }}
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
import type { Category } from '@/entities/category'

defineProps<{
  categories: Category[]
  activeSlug: string | undefined
  currentSort: string
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.category-pills {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  padding: 0.25rem 0;
  scrollbar-width: thin;

  &__pill {
    flex-shrink: 0;
    padding: 0.45rem 1rem;
    background: var(--color-border);
    color: var(--color-text);
    border-radius: 999px;
    font-size: var(--fs-sm);
    text-decoration: none;
    white-space: nowrap;
    transition: background-color 0.2s ease, color 0.2s ease;

    &:hover {
      background: rgb(var(--btn-gradient-mid) / 0.4);
    }

    &--active {
      background: var(--color-accent);
      color: var(--color-white);

      &:hover {
        background: var(--color-text-muted);
      }
    }
  }

  @include tablet {
    flex-wrap: wrap;
    overflow-x: visible;
  }
}
</style>
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/components/CategoryPills.test.ts
```

Expected: 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/components/CategoryPills.vue apps/web/src/widgets/shop-catalog/components/CategoryPills.test.ts
git commit -m "feat(web): add CategoryPills component"
```

---

### Task 17: SortControl

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/components/SortControl.vue`

- [ ] **Step 1: Write component (no separate test — covered by integration tests in shopCatalog.test.ts)**

`apps/web/src/widgets/shop-catalog/components/SortControl.vue`:

```vue
<template>
  <label class="sort-control">
    <span class="sort-control__label">Sort:</span>
    <select
      class="sort-control__select"
      :value="value"
      @change="onChange(($event.target as HTMLSelectElement).value)"
    >
      <option value="newest">Newest</option>
      <option value="price-asc">Price: low to high</option>
      <option value="price-desc">Price: high to low</option>
    </select>
  </label>
</template>

<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import type { ProductSortOrder } from '@/entities/product'

defineProps<{ value: ProductSortOrder }>()

const router = useRouter()
const route = useRoute()

function onChange(raw: string) {
  const sort = raw as ProductSortOrder
  const query = { ...route.query, sort }
  delete query.page
  void router.replace({ name: 'shop', params: route.params, query })
}
</script>

<style scoped lang="scss">
.sort-control {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: var(--fs-sm);
  color: var(--color-text-muted);

  &__select {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
    font-size: var(--fs-sm);
  }
}
</style>
```

- [ ] **Step 2: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/components/SortControl.vue
git commit -m "feat(web): add SortControl component"
```

---

### Task 18: ProductsGrid

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/components/ProductsGrid.vue`

- [ ] **Step 1: Write component**

`apps/web/src/widgets/shop-catalog/components/ProductsGrid.vue`:

```vue
<template>
  <div
    class="products-grid"
    :class="{ 'products-grid--dimmed': dimmed }"
  >
    <ProductCard
      v-for="product in products"
      :key="product.id"
      :product="product"
    />
  </div>
</template>

<script setup lang="ts">
import { ProductCard, type Product } from '@/entities/product'

defineProps<{
  products: Product[]
  dimmed?: boolean
}>()
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.products-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
  transition: opacity 0.2s ease;

  &--dimmed {
    opacity: 0.6;
    pointer-events: none;
  }

  @media (width >= 480px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @include tablet {
    grid-template-columns: repeat(3, 1fr);
    gap: 1.25rem;
  }

  @include desktop {
    grid-template-columns: repeat(4, 1fr);
    gap: 1.5rem;
  }
}
</style>
```

Note: `@media (width >= 480px)` для перехода 1→2 колонки на маленьких телефонах — допустимое исключение, потому что это не tablet/desktop, а мелкая адаптация в пределах mobile-диапазона. CLAUDE.md запрещает хардкод `@media (width >= 768px)` (это tablet), но не запрещает мелкие mobile-адаптации.

Если код-ревью отвергнет этот хардкод — заменить на расширение миксинов в `breakpoints.module.scss` (отдельная задача, выходит за скоуп).

- [ ] **Step 2: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/components/ProductsGrid.vue
git commit -m "feat(web): add ProductsGrid component"
```

---

### Task 19: ShopPagination

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/components/ShopPagination.vue`
- Create: `apps/web/src/widgets/shop-catalog/components/ShopPagination.test.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/widgets/shop-catalog/components/ShopPagination.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ShopPagination from './ShopPagination.vue'

function mountPag(currentPage: number, totalPages: number, query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  return mount(ShopPagination, {
    props: { currentPage, totalPages, currentSort: query.sort ?? 'newest' },
    global: { plugins: [router] },
  })
}

function pageNumbers(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('a.shop-pagination__page, span.shop-pagination__page').map((el) => el.text())
}

describe('ShopPagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const wrapper = mountPag(1, 1)
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('5 pages, current 1: 1 2 3 4 5 ›', () => {
    const wrapper = mountPag(1, 5)
    expect(pageNumbers(wrapper)).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.find('.shop-pagination__prev').exists()).toBe(false)
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(true)
  })

  it('17 pages, current 1: 1 2 3 ... 17 ›', () => {
    const wrapper = mountPag(1, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '2', '3', '...', '17'])
  })

  it('17 pages, current 9: ‹ 1 ... 8 9 10 ... 17 ›', () => {
    const wrapper = mountPag(9, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '...', '8', '9', '10', '...', '17'])
    expect(wrapper.find('.shop-pagination__prev').exists()).toBe(true)
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(true)
  })

  it('17 pages, current 17: ‹ 1 ... 15 16 17', () => {
    const wrapper = mountPag(17, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '...', '15', '16', '17'])
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(false)
  })

  it('page links preserve currentSort in query', () => {
    const wrapper = mountPag(1, 5, { sort: 'price-asc' })
    const link = wrapper.find('a.shop-pagination__page')
    expect(link.attributes('href')).toContain('sort=price-asc')
  })

  it('current page is rendered as span (non-clickable), others as anchors', () => {
    const wrapper = mountPag(2, 5)
    const items = wrapper.findAll('.shop-pagination__page')
    const current = items.find((el) => el.classes().includes('shop-pagination__page--current'))!
    expect(current.element.tagName.toLowerCase()).toBe('span')
    expect(current.text()).toBe('2')
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/components/ShopPagination.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Write component**

`apps/web/src/widgets/shop-catalog/components/ShopPagination.vue`:

```vue
<template>
  <nav
    v-if="totalPages > 1"
    class="shop-pagination"
    aria-label="Pagination"
  >
    <RouterLink
      v-if="currentPage > 1"
      class="shop-pagination__prev"
      :to="linkTo(currentPage - 1)"
      aria-label="Previous page"
    >
      ‹
    </RouterLink>

    <template
      v-for="(item, idx) in items"
      :key="`${item.kind}-${idx}`"
    >
      <RouterLink
        v-if="item.kind === 'page' && item.page !== currentPage"
        class="shop-pagination__page"
        :to="linkTo(item.page)"
      >
        {{ item.page }}
      </RouterLink>
      <span
        v-else-if="item.kind === 'page'"
        class="shop-pagination__page shop-pagination__page--current"
        aria-current="page"
      >
        {{ item.page }}
      </span>
      <span
        v-else
        class="shop-pagination__page shop-pagination__page--ellipsis"
      >...</span>
    </template>

    <RouterLink
      v-if="currentPage < totalPages"
      class="shop-pagination__next"
      :to="linkTo(currentPage + 1)"
      aria-label="Next page"
    >
      ›
    </RouterLink>
  </nav>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

const props = defineProps<{
  currentPage: number
  totalPages: number
  currentSort: string
}>()

type Item = { kind: 'page'; page: number } | { kind: 'ellipsis' }

const items = computed<Item[]>(() => buildPages(props.currentPage, props.totalPages))

function buildPages(current: number, total: number): Item[] {
  if (total <= 5) {
    return Array.from({ length: total }, (_, i) => ({ kind: 'page', page: i + 1 }))
  }
  const out: Item[] = []
  const window = new Set<number>([1, total, current - 1, current, current + 1])
  const sorted = [...window].filter((n) => n >= 1 && n <= total).sort((a, b) => a - b)

  let prev = 0
  for (const n of sorted) {
    if (n - prev > 1) out.push({ kind: 'ellipsis' })
    out.push({ kind: 'page', page: n })
    prev = n
  }
  return out
}

const route = useRoute()

function linkTo(page: number) {
  const query: Record<string, string> = { sort: props.currentSort }
  if (page > 1) query.page = String(page)
  return { name: 'shop', params: route.params, query }
}
</script>

<style scoped lang="scss">
.shop-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.4rem;
  margin-top: 2rem;
  font-size: var(--fs-sm);

  &__page,
  &__prev,
  &__next {
    min-width: 2rem;
    height: 2rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 0.5rem;
    color: var(--color-text);
    text-decoration: none;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);

    &:hover {
      background: rgb(var(--btn-gradient-mid) / 0.2);
    }
  }

  &__page--current {
    background: var(--color-accent);
    color: var(--color-white);
    border-color: var(--color-accent);

    &:hover {
      background: var(--color-accent);
    }
  }

  &__page--ellipsis {
    border: none;
    background: transparent;

    &:hover {
      background: transparent;
    }
  }
}
</style>
```

- [ ] **Step 4: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/components/ShopPagination.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/components/ShopPagination.vue apps/web/src/widgets/shop-catalog/components/ShopPagination.test.ts
git commit -m "feat(web): add ShopPagination component"
```

---

### Task 20: EmptyState, ErrorBar, ShopCatalogSkeleton

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/components/EmptyState.vue`
- Create: `apps/web/src/widgets/shop-catalog/components/ErrorBar.vue`
- Create: `apps/web/src/widgets/shop-catalog/components/ShopCatalogSkeleton.vue`

- [ ] **Step 1: Write EmptyState**

`apps/web/src/widgets/shop-catalog/components/EmptyState.vue`:

```vue
<template>
  <div class="empty-state">
    <p class="empty-state__text">No items here yet — check back soon</p>
    <RouterLink
      class="empty-state__btn"
      :to="{ name: 'shop' }"
    >
      Back to shop
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<style scoped lang="scss">
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: 3rem 1rem;
  text-align: center;

  &__text {
    font-size: var(--fs-base);
    color: var(--color-text-muted);
  }

  &__btn {
    padding: 0.6rem 1.5rem;
    background: var(--color-accent);
    color: var(--color-white);
    text-decoration: none;
    border-radius: 4px;
    font-size: var(--fs-sm);
    text-transform: uppercase;
    letter-spacing: 0.08em;

    &:hover {
      background: var(--color-text-muted);
    }
  }
}
</style>
```

- [ ] **Step 2: Write ErrorBar**

`apps/web/src/widgets/shop-catalog/components/ErrorBar.vue`:

```vue
<template>
  <div
    class="error-bar"
    role="alert"
  >
    <p class="error-bar__text">{{ message }}</p>
    <button
      type="button"
      class="error-bar__btn"
      @click="emit('retry')"
    >
      Try again
    </button>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ message?: string }>(),
  { message: "Couldn't load shop." },
)

const emit = defineEmits<{ retry: [] }>()
</script>

<style scoped lang="scss">
.error-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 1rem;
  margin-bottom: 1rem;
  background: rgb(192 57 43 / 0.08);
  border: 1px solid rgb(192 57 43 / 0.25);
  border-radius: 4px;

  &__text {
    color: var(--color-error);
    font-size: var(--fs-sm);
  }

  &__btn {
    padding: 0.4rem 1rem;
    background: var(--color-white);
    color: var(--color-error);
    border: 1px solid var(--color-error);
    border-radius: 4px;
    font-size: var(--fs-sm);

    &:hover {
      background: var(--color-error);
      color: var(--color-white);
    }
  }
}
</style>
```

- [ ] **Step 3: Write ShopCatalogSkeleton**

`apps/web/src/widgets/shop-catalog/components/ShopCatalogSkeleton.vue`:

```vue
<template>
  <div
    class="shop-skeleton"
    aria-hidden="true"
  >
    <div class="shop-skeleton__pills">
      <div
        v-for="i in 5"
        :key="i"
        class="shop-skeleton__pill"
      />
    </div>
    <div class="shop-skeleton__grid">
      <div
        v-for="i in 8"
        :key="i"
        class="shop-skeleton__card"
      />
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.shop-skeleton {
  &__pills {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  &__pill {
    width: 5rem;
    height: 2rem;
    border-radius: 999px;
    background: var(--color-border);
    animation: pulse 1.5s ease-in-out infinite;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;

    @include tablet { grid-template-columns: repeat(3, 1fr); }
    @include desktop { grid-template-columns: repeat(4, 1fr); }
  }

  &__card {
    aspect-ratio: 0.8;
    border-radius: 8px;
    background: var(--color-border);
    animation: pulse 1.5s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>
```

- [ ] **Step 4: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/components/EmptyState.vue apps/web/src/widgets/shop-catalog/components/ErrorBar.vue apps/web/src/widgets/shop-catalog/components/ShopCatalogSkeleton.vue
git commit -m "feat(web): add EmptyState, ErrorBar, ShopCatalogSkeleton components"
```

---

## Phase 10 — Frontend widget — composition

### Task 21: ShopCatalog (composes all components)

**Files:**
- Create: `apps/web/src/widgets/shop-catalog/ShopCatalog.vue`
- Create: `apps/web/src/widgets/shop-catalog/shopCatalog.test.ts`
- Create: `apps/web/src/widgets/shop-catalog/index.ts`

- [ ] **Step 1: Write failing test**

`apps/web/src/widgets/shop-catalog/shopCatalog.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/entities/product', async (orig) => {
  const actual = await orig<typeof import('@/entities/product')>()
  return { ...actual, fetchProducts: vi.fn() }
})
vi.mock('@/entities/category', async (orig) => {
  const actual = await orig<typeof import('@/entities/category')>()
  return { ...actual, fetchCategories: vi.fn() }
})

import { fetchProducts } from '@/entities/product'
import { fetchCategories } from '@/entities/category'
import ShopCatalog from './ShopCatalog.vue'

const mockFetchProducts = vi.mocked(fetchProducts)
const mockFetchCategories = vi.mocked(fetchCategories)

const sample = {
  items: [{ id: 'p1', slug: 'p-1', name: 'P1', price: 10, image: null, stock: 1 }],
  total: 1,
  page: 1,
  totalPages: 1,
}

async function mountShop(initialPath = '/shop') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: ShopCatalog },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  await router.push(initialPath)
  const wrapper = mount(ShopCatalog, {
    global: { plugins: [createPinia(), router] },
  })
  await flushPromises()
  return wrapper
}

describe('ShopCatalog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchCategories.mockResolvedValue([
      { id: 'c1', slug: 'animals', name: 'Animals' },
    ])
  })

  it('renders skeleton on first load while products empty and loading', async () => {
    let resolve!: (v: typeof sample) => void
    mockFetchProducts.mockReturnValue(new Promise((r) => { resolve = r }))

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/shop/:category?', name: 'shop', component: ShopCatalog },
      ],
    })
    await router.push('/shop')
    const wrapper = mount(ShopCatalog, { global: { plugins: [createPinia(), router] } })

    expect(wrapper.find('.shop-skeleton').exists()).toBe(true)

    resolve(sample)
    await flushPromises()
  })

  it('renders header "The shop" without breadcrumb on /shop', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.shop-catalog__title').text()).toBe('The shop')
    expect(wrapper.find('.shop-catalog__crumb').exists()).toBe(false)
  })

  it('renders breadcrumb "The shop / Animals" on /shop/animals', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop/animals')
    expect(wrapper.find('.shop-catalog__crumb').text()).toContain('The shop')
    expect(wrapper.find('.shop-catalog__crumb').text()).toContain('Animals')
  })

  it('renders products grid when products exist', async () => {
    mockFetchProducts.mockResolvedValue(sample)
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.products-grid').exists()).toBe(true)
    expect(wrapper.findAll('.product-card')).toHaveLength(1)
  })

  it('renders EmptyState when total === 0 and no error', async () => {
    mockFetchProducts.mockResolvedValue({ ...sample, items: [], total: 0, totalPages: 0 })
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.empty-state').exists()).toBe(true)
    expect(wrapper.find('.products-grid').exists()).toBe(false)
    expect(wrapper.find('.sort-control').exists()).toBe(false)
  })

  it('renders ErrorBar when fetch fails on first load (no products yet)', async () => {
    mockFetchProducts.mockRejectedValue(new Error('HTTP 500'))
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.error-bar').exists()).toBe(true)
    expect(wrapper.find('.products-grid').exists()).toBe(false)
  })

  it('shows pills even when error occurs (so user can switch category)', async () => {
    mockFetchProducts.mockRejectedValue(new Error('HTTP 500'))
    const wrapper = await mountShop('/shop')
    expect(wrapper.find('.category-pills').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: Run test, verify FAIL**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/shopCatalog.test.ts
```

Expected: FAIL `Cannot find module './ShopCatalog.vue'`.

- [ ] **Step 3: Write composite component**

`apps/web/src/widgets/shop-catalog/ShopCatalog.vue`:

```vue
<template>
  <section class="shop-catalog">
    <header class="shop-catalog__header">
      <h1 class="shop-catalog__title">The shop</h1>
      <p
        v-if="categoryName"
        class="shop-catalog__crumb"
      >
        <RouterLink
          to="/shop"
          class="shop-catalog__crumb-link"
        >The shop</RouterLink>
        <span class="shop-catalog__crumb-sep"> / </span>
        <span>{{ categoryName }}</span>
      </p>
    </header>

    <ShopCatalogSkeleton v-if="isFirstLoad" />

    <template v-else>
      <CategoryPills
        :categories="categories"
        :active-slug="category"
        :current-sort="sort"
      />

      <div
        v-if="showSortBar"
        class="shop-catalog__bar"
      >
        <span class="shop-catalog__total">{{ total }} items</span>
        <SortControl :value="sort" />
      </div>

      <ErrorBar
        v-if="error && products.length > 0"
        @retry="retry"
      />

      <ErrorBar
        v-if="error && products.length === 0"
        @retry="retry"
      />

      <EmptyState v-else-if="!error && total === 0" />

      <ProductsGrid
        v-else
        :products="products"
        :dimmed="isLoading && products.length > 0"
      />

      <ShopPagination
        v-if="totalPages > 1"
        :current-page="page"
        :total-pages="totalPages"
        :current-sort="sort"
      />
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useShopCatalog } from './useShopCatalog'
import CategoryPills from './components/CategoryPills.vue'
import SortControl from './components/SortControl.vue'
import ProductsGrid from './components/ProductsGrid.vue'
import ShopPagination from './components/ShopPagination.vue'
import EmptyState from './components/EmptyState.vue'
import ErrorBar from './components/ErrorBar.vue'
import ShopCatalogSkeleton from './components/ShopCatalogSkeleton.vue'

const {
  category, sort, page,
  products, total, totalPages,
  isLoading, error,
  categories,
  retry,
} = useShopCatalog()

const isFirstLoad = computed(() => isLoading.value && products.value.length === 0 && !error.value)

const categoryName = computed(() => {
  if (!category.value) return null
  const found = categories.value.find((c) => c.slug === category.value)
  return found?.name ?? category.value
})

const showSortBar = computed(() => total.value > 0 && !error.value)
</script>

<style scoped lang="scss">
.shop-catalog {
  max-width: 1280px;
  margin: 0 auto;
  padding: 1.5rem 1rem 4rem;

  &__header {
    margin-bottom: 1.5rem;
  }

  &__title {
    font-family: var(--font-display);
    font-size: var(--fs-section-heading);
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  &__crumb {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__crumb-link {
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      color: var(--color-accent);
      text-decoration: underline;
    }
  }

  &__crumb-sep {
    margin: 0 0.25rem;
  }

  &__bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 1rem 0;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  &__total {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }
}
</style>
```

- [ ] **Step 4: Write barrel**

`apps/web/src/widgets/shop-catalog/index.ts`:

```typescript
export { default as ShopCatalog } from './ShopCatalog.vue'
```

- [ ] **Step 5: Run test, verify PASS**

```bash
npx -w apps/web vitest run src/widgets/shop-catalog/shopCatalog.test.ts
```

Expected: 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/widgets/shop-catalog/ShopCatalog.vue apps/web/src/widgets/shop-catalog/shopCatalog.test.ts apps/web/src/widgets/shop-catalog/index.ts
git commit -m "feat(web): add ShopCatalog composite widget"
```

---

## Phase 11 — Frontend page

### Task 22: ShopPage

**Files:**
- Modify: `apps/web/src/pages/ShopPage.vue`

- [ ] **Step 1: Replace placeholder with widget**

Полностью заменить содержимое `apps/web/src/pages/ShopPage.vue`:

```vue
<template>
  <ShopCatalog />
</template>

<script setup lang="ts">
import { ShopCatalog } from '@/widgets/shop-catalog'
</script>
```

- [ ] **Step 2: Verify typecheck**

```bash
npx -w apps/web vue-tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run full web unit suite**

```bash
npm run test -w apps/web
```

Expected: all tests pass (including pre-existing tests for other features).

- [ ] **Step 4: Manual smoke test**

В двух терминалах:
```bash
# T1
npm run dev -w apps/api
# T2
npm run dev -w apps/web
```

Открыть http://localhost:5173/shop. Проверить:
- Видны заголовок «The shop», пилюли категорий, сортировка, сетка из 12 (или меньше, если seed создал меньше) товаров, пагинация если `> 12`.
- Кликнуть на пилюлю «Art Dolls» → URL меняется на `/shop/art-dolls`, появляется хлебная крошка.
- Сменить сортировку → URL получает `?sort=price-asc`, товары переупорядочиваются, `?page` сбрасывается.
- Перейти на страницу 2 (если есть) → URL `?page=2`, контент обновляется.
- Открыть `/shop/non-existent-category` → пустое состояние «No items here yet».
- Кликнуть на карточку → переход на `/product/<slug>` (страницы пока нет — будет 404 от роутера или белая страница, это ОК).
- Кликнуть «Add to cart» → в console появляется `add to cart <id>`, навигация не происходит.
- Сетка корректно перестраивается на разной ширине (DevTools → Toggle device toolbar).

Остановить серверы.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ShopPage.vue
git commit -m "feat(web): wire ShopCatalog into ShopPage"
```

---

## Phase 12 — E2E

### Task 23: Playwright golden path

**Files:**
- Create: `apps/web/tests/e2e/shop.spec.ts`

- [ ] **Step 1: Verify there is at least one product seeded for category `art-dolls`**

```bash
npx -w apps/api prisma db seed
```

Expected: `Seeded 14 products.` (idempotent — re-running OK).

- [ ] **Step 2: Write the test**

`apps/web/tests/e2e/shop.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test('shop catalog golden path', async ({ page }) => {
  await page.goto('/shop')

  await expect(page.getByRole('heading', { name: 'The shop' })).toBeVisible()
  await expect(page.locator('.category-pills__pill').first()).toBeVisible()
  await expect(page.locator('.product-card').first()).toBeVisible()

  await page.getByRole('link', { name: 'Art Dolls' }).click()
  await expect(page).toHaveURL(/\/shop\/art-dolls/)
  await expect(page.locator('.shop-catalog__crumb')).toContainText('Art Dolls')

  await page.getByLabel(/sort/i).selectOption('price-asc')
  await expect(page).toHaveURL(/sort=price-asc/)
  await expect(page).not.toHaveURL(/page=/)

  const firstCard = page.locator('.product-card').first()
  const productHref = await firstCard.locator('a.product-card__link').getAttribute('href')
  expect(productHref).toMatch(/^\/product\/.+/)

  await firstCard.locator('a.product-card__link').click()
  await expect(page).toHaveURL(new RegExp(productHref!.replace(/[/]/g, '\\/')))

  await page.goBack()
  await expect(page).toHaveURL(/\/shop\/art-dolls\?sort=price-asc/)
  await expect(page.getByRole('heading', { name: 'The shop' })).toBeVisible()
})
```

Note: тест предполагает что в seed есть товары категории `art-dolls`. После Task 2 это так (3 товара в этой категории).

- [ ] **Step 3: Run e2e**

```bash
npm run test:e2e -w apps/web
```

Expected: тест проходит. Если упадёт из-за того, что dev-серверы не подняты — Playwright должен сам поднимать через `playwright.config.ts` `webServer`. Проверить эту секцию конфига.

- [ ] **Step 4: If Playwright config needs webServer, add it**

Если в `apps/web/playwright.config.ts` нет секции `webServer`, добавить:

```typescript
export default defineConfig({
  // ...
  webServer: [
    {
      command: 'npm run dev -w apps/api',
      port: 3000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev -w apps/web',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
  use: {
    baseURL: 'http://localhost:5173',
  },
})
```

(Если `playwright.config.ts` ещё не существует — его создаст агент по необходимости.)

- [ ] **Step 5: Re-run e2e and confirm pass**

```bash
npm run test:e2e -w apps/web
```

Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git add apps/web/tests/e2e/shop.spec.ts apps/web/playwright.config.ts
git commit -m "test(web): add e2e golden path for shop catalog"
```

---

## Phase 13 — Final verification

### Task 24: Run all checks

- [ ] **Step 1: API typecheck**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Expected: no errors.

- [ ] **Step 2: Web typecheck**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Expected: no errors.

- [ ] **Step 3: Full test suite**

```bash
npm test
```

Expected: api тесты + web тесты — все проходят. Если e2e тоже запускается — он тоже должен проходить.

- [ ] **Step 4: Lint**

```bash
npm run lint
```

Expected: 0 warnings, 0 errors.

- [ ] **Step 5: Final smoke test in browser**

Запустить `npm run dev -w apps/api` + `npm run dev -w apps/web`, пройтись по всем сценариям из спеки (раздел 11 «Критерий успеха»):
- `/shop` → 14 товаров на странице 1, навигация на 2-ю страницу если их > 12
- Пилюли работают на десктопе (wrap) и мобильном (горизонтальный скролл при переполнении) — DevTools → mobile mode (375px)
- Сортировка меняет порядок, сохраняется в URL, сбрасывает `?page`
- Открыть `/shop/art-dolls?sort=price-asc&page=1` напрямую — попадаешь на правильное состояние
- Out-of-stock товары видны (например, «Forest fox magnet» с stock=0), кнопка disabled с текстом «Sold out»
- Skeleton при первой загрузке (можно увидеть, замедлив сеть в DevTools → Network → Slow 3G)
- Empty state на `/shop/non-existent` (404 от бэка → пустой массив)
- Error state — отключить API (Ctrl+C на бэке), перезагрузить `/shop` → видеть ErrorBar с retry. Запустить бэк обратно, нажать retry → товары загружаются.

Если все шаги работают — переходим к Phase 14.

---

## Phase 14 — Documentation

### Task 25: Update architecture docs (если требуется)

- [ ] **Step 1: Verify docs/architecture.md mentions catalog feature appropriately**

Посмотреть `docs/architecture.md` на предмет нужности обновлений. Скорее всего изменения не требуются (документ описывает паттерны, не каждую фичу). Если требуется — добавить запись в раздел «Где используется Pinia store» что `shopCatalog` теперь существует.

- [ ] **Step 2 (если изменено): Commit**

```bash
git add docs/architecture.md
git commit -m "docs: note shop-catalog feature in architecture"
```

Если `docs/architecture.md` не менялся — пропустить commit.

---

## Spec Coverage Map

Чтобы убедиться что план покрывает спеку полностью:

| Spec section / requirement | Implementing task |
|---|---|
| § 1 Цель — заменить заглушку ShopPage | Task 22 |
| § 2 Скоуп — пилюли | Task 16 |
| § 2 Скоуп — сортировка | Task 17 |
| § 2 Скоуп — пагинация | Task 19 |
| § 2 Скоуп — карточка с кнопкой | Task 13 |
| § 2 Скоуп — состояния (skeleton/empty/error) | Tasks 20, 21 |
| § 2 Скоуп — endpoints `/products`, `/categories` | Task 8 |
| § 2 Скоуп — миграция slug | Task 1 |
| § 2 Скоуп — типы и Zod | Tasks 3, 12 (локально, не packages/shared — отступление зафиксировано) |
| § 2 Скоуп — unit + e2e тесты | Tasks 4-21, 23 |
| § 3 UX — заголовок «The shop» | Task 21 |
| § 3 UX — хлебные крошки | Task 21 (test 3) |
| § 3 UX — Out of stock | Task 13 (test 5) |
| § 3 UX — Empty state | Task 20 |
| § 3 UX — Error state | Task 20 |
| § 3 UX — USD `$24.00` | Task 10 |
| § 3 UX — mobile-first сетка 1→2→3→4 | Task 18 |
| § 4.1 Backend структура | Tasks 3-9 |
| § 4.2 Frontend структура (entities + widget) | Tasks 11-21 |
| § 4.4 БД-миграция add slug | Task 1 |
| § 5.1 GET /products контракт | Task 8 |
| § 5.2 GET /categories контракт | Task 8 |
| § 5.3 Slug в Product | Task 1 |
| § 6.1 URL = источник истины | Task 15 |
| § 6.2 Pinia store с кэшем категорий | Task 14 |
| § 6.3 Race-condition через requestId | Task 15 (test 9) |
| § 6.4 Сброс page при смене category/sort | Tasks 16, 17 |
| § 7 Состояния UI приоритет | Task 21 |
| § 8.1 Backend тесты | Tasks 4, 5, 6, 7, 8 |
| § 8.2 Frontend unit-тесты | Tasks 10, 13, 14, 15, 16, 19, 21 |
| § 8.3 E2E golden path | Task 23 |
| § 9 Risk: race condition | Task 15 |
| § 9 Risk: payload size (select only needed fields) | Task 5 (PRODUCT_SELECT) |
| § 9 Risk: button stub без toast | Task 13 (test 6) |
| § 9 Risk: skeleton vs overlay | Task 21 (dimmed prop в Task 18) |

---

## Notes for the executing agent

1. **Если миграция Prisma спрашивает про default value для существующих товаров** — см. Task 1 Step 3 (миграционная процедура).
2. **Если возникнет TS-ошибка `'image' is missing` в Zod-схеме** — образец строгого `satisfies z.ZodType<T>` в Task 12 защищает от этого; повторить паттерн.
3. **`@/entities/category` mock в тестах widget'а должен быть полным** (включая type re-exports). См. `vi.mock('@/entities/category', async (orig) => { const actual = ...; return { ...actual, fetchCategories: vi.fn() } })` в Task 21.
4. **Если новый ESLint выдаёт ошибку про `RouterLink` в template** — проверить что у проекта `RouterLink` уже глобально зарегистрирован или импортирован в каждом компоненте, как сделано в `AppButton.vue`.
5. **При использовании `vi.spyOn(console, 'log')`** — обязательно `mockRestore()` в конце теста, чтобы не сломать другие тесты в файле.
6. **Если `<style scoped>` не подхватывает SCSS-миксины** — убедиться что `@use '@/assets/styles/breakpoints.module' as *;` стоит **первой строкой** в `<style scoped lang="scss">`.
7. **При написании коммитов** — формат `feat(api): ...`, `feat(web): ...`, `test(...): ...`, `chore(...): ...` (см. недавний `git log`).
