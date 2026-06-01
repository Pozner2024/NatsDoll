# Admin Listings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Реализовать вкладку Listings в админ-панели — CRUD товаров и категорий с grid-просмотром, фильтрами, и отдельными страницами формы.

**Architecture:** Backend — новые use-cases и методы репозитория в существующей `features/products` + роуты добавляются в `features/admin`. Frontend — composables + компоненты в `widgets/admin-panel`, две новых страницы (new/edit) добавляются в роутер как дочерние `/admin`.

**Tech Stack:** Hono + Prisma (backend), Vue 3 + Zod + authFetch (frontend), Vitest (тесты).

---

## Карта файлов

### Backend (создать)
- `apps/api/src/features/admin/application/listAdminProducts.ts`
- `apps/api/src/features/admin/application/listAdminProducts.test.ts`
- `apps/api/src/features/admin/application/createProduct.ts`
- `apps/api/src/features/admin/application/createProduct.test.ts`
- `apps/api/src/features/admin/application/updateProduct.ts`
- `apps/api/src/features/admin/application/updateProduct.test.ts`
- `apps/api/src/features/admin/application/deleteProduct.ts`
- `apps/api/src/features/admin/application/deleteProduct.test.ts`
- `apps/api/src/features/admin/application/togglePublish.ts`
- `apps/api/src/features/admin/application/togglePublish.test.ts`
- `apps/api/src/features/admin/application/createCategory.ts`
- `apps/api/src/features/admin/application/createCategory.test.ts`
- `apps/api/src/features/admin/application/updateCategory.ts`
- `apps/api/src/features/admin/application/updateCategory.test.ts`
- `apps/api/src/features/admin/application/deleteCategory.ts`
- `apps/api/src/features/admin/application/deleteCategory.test.ts`

### Backend (изменить)
- `apps/api/src/features/admin/types.ts` — добавить типы для products/categories admin
- `apps/api/src/features/admin/infrastructure/adminRepository.ts` — добавить методы
- `apps/api/src/features/admin/presentation/adminRoutes.ts` — добавить роуты
- `apps/api/src/features/admin/presentation/adminRoutes.test.ts` — добавить тесты роутов
- `apps/api/src/features/admin/index.ts` — экспорт новых use-cases
- `apps/api/src/app.ts` — wire up новых use-cases

### Frontend (создать)
- `apps/web/src/widgets/admin-panel/adminListingsApi.ts` — composable useAdminListings
- `apps/web/src/widgets/admin-panel/adminCategoriesApi.ts` — composable useAdminCategories
- `apps/web/src/widgets/admin-panel/components/AdminProductCard.vue`
- `apps/web/src/widgets/admin-panel/components/AdminCategoriesSection.vue`
- `apps/web/src/pages/AdminProductFormPage.vue`

### Frontend (изменить)
- `apps/web/src/widgets/admin-panel/components/AdminListings.vue` — реализовать полностью
- `apps/web/src/router/index.ts` — добавить маршруты new/edit

---

## Task 1: Типы для admin listings (backend)

**Files:**
- Modify: `apps/api/src/features/admin/types.ts`

- [ ] **Шаг 1: Добавить типы в конец файла**

```typescript
// ── Admin Products ────────────────────────────────────────────

export type AdminProductListItem = {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  isPublished: boolean
  image: string | null
  category: string
  categoryId: string
}

export type AdminProductListParams = {
  search?: string
  categoryId?: string
  status?: 'published' | 'draft'
  page: number
  limit: number
}

export type AdminProductListResponse = {
  items: AdminProductListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminProductInput = {
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: string
  images: string[]
  messageOptions: string[]
  isPublished: boolean
}

export type AdminCategoryItem = {
  id: string
  name: string
  slug: string
  productCount: number
}

export type AdminRepository = {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
  // products
  listProducts(params: AdminProductListParams): Promise<{ items: AdminProductListItem[]; total: number }>
  createProduct(input: AdminProductInput): Promise<{ id: string }>
  updateProduct(id: string, input: AdminProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  togglePublish(id: string): Promise<{ isPublished: boolean }>
  // categories
  listCategoriesWithCount(): Promise<AdminCategoryItem[]>
  createCategory(name: string, slug: string): Promise<{ id: string }>
  updateCategory(id: string, name: string, slug: string): Promise<void>
  deleteCategory(id: string): Promise<void>
}

export type ListAdminProducts = (params: AdminProductListParams) => Promise<AdminProductListResponse>
export type CreateProduct = (input: AdminProductInput) => Promise<{ id: string }>
export type UpdateProduct = (id: string, input: AdminProductInput) => Promise<void>
export type DeleteProduct = (id: string) => Promise<void>
export type TogglePublish = (id: string) => Promise<{ isPublished: boolean }>
export type ListCategoriesWithCount = () => Promise<AdminCategoryItem[]>
export type CreateCategory = (name: string, slug: string) => Promise<{ id: string }>
export type UpdateCategory = (id: string, name: string, slug: string) => Promise<void>
export type DeleteCategory = (id: string) => Promise<void>
```

> **Важно:** тип `AdminRepository` заменяет существующий `AdminRepository` из того же файла. Объедини оба интерфейса в один.

- [ ] **Шаг 2: Убедись что старый `AdminRepository` удалён, новый содержит все методы**

- [ ] **Шаг 3: Commit**

```bash
git add apps/api/src/features/admin/types.ts
git commit -m "feat(admin): add product/category admin types"
```

---

## Task 2: Методы репозитория (backend)

**Files:**
- Modify: `apps/api/src/features/admin/infrastructure/adminRepository.ts`

- [ ] **Шаг 1: Добавить методы в объект репозитория**

В функцию `makeAdminRepository` добавь после `markAllMessagesRead`:

```typescript
    async listProducts(params: AdminProductListParams) {
      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.status === 'published' ? { isPublished: true } : {}),
        ...(params.status === 'draft' ? { isPublished: false } : {}),
      }
      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (params.page - 1) * params.limit,
          take: params.limit,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            isPublished: true,
            images: true,
            category: { select: { name: true, id: true } },
          },
        }),
        prisma.product.count({ where }),
      ])
      return {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          price: r.price.toNumber(),
          stock: r.stock,
          isPublished: r.isPublished,
          image: r.images[0] ?? null,
          category: r.category.name,
          categoryId: r.category.id,
        })),
        total,
      }
    },

    async createProduct(input: AdminProductInput) {
      const product = await prisma.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          stock: input.stock,
          categoryId: input.categoryId,
          images: input.images,
          messageOptions: input.messageOptions,
          isPublished: input.isPublished,
        },
        select: { id: true },
      })
      return { id: product.id }
    },

    async updateProduct(id: string, input: AdminProductInput) {
      await prisma.product.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          stock: input.stock,
          categoryId: input.categoryId,
          images: input.images,
          messageOptions: input.messageOptions,
          isPublished: input.isPublished,
        },
      })
    },

    async deleteProduct(id: string) {
      await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    },

    async togglePublish(id: string) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id }, select: { isPublished: true } })
      await prisma.product.update({ where: { id }, data: { isPublished: !product.isPublished } })
      return { isPublished: !product.isPublished }
    },

    async listCategoriesWithCount() {
      const rows = await prisma.category.findMany({
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: { where: { deletedAt: null } } } },
        },
      })
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        productCount: r._count.products,
      }))
    },

    async createCategory(name: string, slug: string) {
      const last = await prisma.category.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
      const position = (last?.position ?? 0) + 1
      const cat = await prisma.category.create({ data: { name, slug, position }, select: { id: true } })
      return { id: cat.id }
    },

    async updateCategory(id: string, name: string, slug: string) {
      await prisma.category.update({ where: { id }, data: { name, slug } })
    },

    async deleteCategory(id: string) {
      await prisma.category.delete({ where: { id } })
    },
```

Добавь импорт типа в начало файла (если его нет):
```typescript
import type { PrismaClient, Prisma } from '@prisma/client'
import type { AdminRepository, DashboardResponse, AdminProductListParams, AdminProductInput } from '../types'
```

- [ ] **Шаг 2: Commit**

```bash
git add apps/api/src/features/admin/infrastructure/adminRepository.ts
git commit -m "feat(admin): implement product/category repository methods"
```

---

## Task 3: Use-cases для продуктов (backend)

**Files:**
- Create: `apps/api/src/features/admin/application/listAdminProducts.ts`
- Create: `apps/api/src/features/admin/application/listAdminProducts.test.ts`
- Create: `apps/api/src/features/admin/application/createProduct.ts`
- Create: `apps/api/src/features/admin/application/createProduct.test.ts`
- Create: `apps/api/src/features/admin/application/updateProduct.ts`
- Create: `apps/api/src/features/admin/application/updateProduct.test.ts`
- Create: `apps/api/src/features/admin/application/deleteProduct.ts`
- Create: `apps/api/src/features/admin/application/deleteProduct.test.ts`
- Create: `apps/api/src/features/admin/application/togglePublish.ts`
- Create: `apps/api/src/features/admin/application/togglePublish.test.ts`

- [ ] **Шаг 1: Создать use-case файлы**

`apps/api/src/features/admin/application/listAdminProducts.ts`:
```typescript
import type { AdminRepository, ListAdminProducts, AdminProductListParams, AdminProductListResponse } from '../types'

export function makeListAdminProducts(repo: AdminRepository): ListAdminProducts {
  return async function listAdminProducts(params: AdminProductListParams): Promise<AdminProductListResponse> {
    const { items, total } = await repo.listProducts(params)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    return { items, total, page: params.page, totalPages }
  }
}
```

`apps/api/src/features/admin/application/createProduct.ts`:
```typescript
import type { AdminRepository, CreateProduct, AdminProductInput } from '../types'

export function makeCreateProduct(repo: AdminRepository): CreateProduct {
  return (input: AdminProductInput) => repo.createProduct(input)
}
```

`apps/api/src/features/admin/application/updateProduct.ts`:
```typescript
import type { AdminRepository, UpdateProduct, AdminProductInput } from '../types'

export function makeUpdateProduct(repo: AdminRepository): UpdateProduct {
  return (id: string, input: AdminProductInput) => repo.updateProduct(id, input)
}
```

`apps/api/src/features/admin/application/deleteProduct.ts`:
```typescript
import type { AdminRepository, DeleteProduct } from '../types'

export function makeDeleteProduct(repo: AdminRepository): DeleteProduct {
  return (id: string) => repo.deleteProduct(id)
}
```

`apps/api/src/features/admin/application/togglePublish.ts`:
```typescript
import type { AdminRepository, TogglePublish } from '../types'

export function makeTogglePublish(repo: AdminRepository): TogglePublish {
  return (id: string) => repo.togglePublish(id)
}
```

- [ ] **Шаг 2: Написать тесты для listAdminProducts**

`apps/api/src/features/admin/application/listAdminProducts.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeListAdminProducts } from './listAdminProducts'
import type { AdminRepository, AdminProductListItem } from '../types'

const mockItem: AdminProductListItem = {
  id: 'p1', name: 'Bunny', slug: 'bunny', price: 24, stock: 5,
  isPublished: true, image: null, category: 'Dolls', categoryId: 'c1',
}

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
    listProducts: vi.fn().mockResolvedValue({ items: [mockItem], total: 1 }),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    ...overrides,
  } as unknown as AdminRepository
}

describe('listAdminProducts', () => {
  it('returns items with pagination', async () => {
    const repo = makeRepo()
    const listAdminProducts = makeListAdminProducts(repo)
    const result = await listAdminProducts({ page: 1, limit: 12 })
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.page).toBe(1)
  })

  it('calculates totalPages correctly', async () => {
    const repo = makeRepo({ listProducts: vi.fn().mockResolvedValue({ items: [], total: 25 }) })
    const result = await makeListAdminProducts(repo)({ page: 1, limit: 12 })
    expect(result.totalPages).toBe(3)
  })

  it('returns totalPages 0 when total is 0', async () => {
    const repo = makeRepo({ listProducts: vi.fn().mockResolvedValue({ items: [], total: 0 }) })
    const result = await makeListAdminProducts(repo)({ page: 1, limit: 12 })
    expect(result.totalPages).toBe(0)
  })
})
```

- [ ] **Шаг 3: Написать тесты для togglePublish**

`apps/api/src/features/admin/application/togglePublish.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeTogglePublish } from './togglePublish'
import type { AdminRepository } from '../types'

function makeRepo(overrides: Partial<AdminRepository> = {}): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    togglePublish: vi.fn().mockResolvedValue({ isPublished: false }),
    listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    ...overrides,
  } as unknown as AdminRepository
}

describe('togglePublish', () => {
  it('delegates to repo and returns result', async () => {
    const repo = makeRepo()
    const toggle = makeTogglePublish(repo)
    const result = await toggle('p1')
    expect(repo.togglePublish).toHaveBeenCalledWith('p1')
    expect(result).toEqual({ isPublished: false })
  })
})
```

Аналогичные минимальные тесты (делегирование к repo) написать для `createProduct.test.ts`, `updateProduct.test.ts`, `deleteProduct.test.ts`:

`apps/api/src/features/admin/application/createProduct.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeCreateProduct } from './createProduct'
import type { AdminRepository, AdminProductInput } from '../types'

const input: AdminProductInput = {
  name: 'Bunny', slug: 'bunny', description: 'desc', price: 24,
  stock: 5, categoryId: 'c1', images: [], messageOptions: [], isPublished: false,
}

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn().mockResolvedValue({ id: 'p1' }),
    updateProduct: vi.fn(), deleteProduct: vi.fn(), togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn(), createCategory: vi.fn(),
    updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('createProduct', () => {
  it('delegates to repo and returns id', async () => {
    const repo = makeRepo()
    const result = await makeCreateProduct(repo)(input)
    expect(repo.createProduct).toHaveBeenCalledWith(input)
    expect(result).toEqual({ id: 'p1' })
  })
})
```

`apps/api/src/features/admin/application/updateProduct.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeUpdateProduct } from './updateProduct'
import type { AdminRepository, AdminProductInput } from '../types'

const input: AdminProductInput = {
  name: 'Bunny', slug: 'bunny', description: 'desc', price: 24,
  stock: 5, categoryId: 'c1', images: [], messageOptions: [], isPublished: true,
}

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(),
    updateProduct: vi.fn().mockResolvedValue(undefined), deleteProduct: vi.fn(),
    togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('updateProduct', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeUpdateProduct(repo)('p1', input)
    expect(repo.updateProduct).toHaveBeenCalledWith('p1', input)
  })
})
```

`apps/api/src/features/admin/application/deleteProduct.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeDeleteProduct } from './deleteProduct'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(),
    updateProduct: vi.fn(), deleteProduct: vi.fn().mockResolvedValue(undefined),
    togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('deleteProduct', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeDeleteProduct(repo)('p1')
    expect(repo.deleteProduct).toHaveBeenCalledWith('p1')
  })
})
```

- [ ] **Шаг 4: Запустить тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application --reporter=basic
```

Ожидаем: все тесты PASS.

- [ ] **Шаг 5: Commit**

```bash
git add apps/api/src/features/admin/application/
git commit -m "feat(admin): add product use-cases with tests"
```

---

## Task 4: Use-cases для категорий (backend)

**Files:**
- Create: `apps/api/src/features/admin/application/listCategoriesWithCount.ts`
- Create: `apps/api/src/features/admin/application/listCategoriesWithCount.test.ts`
- Create: `apps/api/src/features/admin/application/createCategory.ts`
- Create: `apps/api/src/features/admin/application/createCategory.test.ts`
- Create: `apps/api/src/features/admin/application/updateCategory.ts`
- Create: `apps/api/src/features/admin/application/updateCategory.test.ts`
- Create: `apps/api/src/features/admin/application/deleteCategory.ts`
- Create: `apps/api/src/features/admin/application/deleteCategory.test.ts`

- [ ] **Шаг 1: Создать use-case файлы**

`apps/api/src/features/admin/application/listCategoriesWithCount.ts`:
```typescript
import type { AdminRepository, ListCategoriesWithCount } from '../types'

export function makeListCategoriesWithCount(repo: AdminRepository): ListCategoriesWithCount {
  return () => repo.listCategoriesWithCount()
}
```

`apps/api/src/features/admin/application/createCategory.ts`:
```typescript
import type { AdminRepository, CreateCategory } from '../types'

export function makeCreateCategory(repo: AdminRepository): CreateCategory {
  return (name: string, slug: string) => repo.createCategory(name, slug)
}
```

`apps/api/src/features/admin/application/updateCategory.ts`:
```typescript
import type { AdminRepository, UpdateCategory } from '../types'

export function makeUpdateCategory(repo: AdminRepository): UpdateCategory {
  return (id: string, name: string, slug: string) => repo.updateCategory(id, name, slug)
}
```

`apps/api/src/features/admin/application/deleteCategory.ts`:
```typescript
import type { AdminRepository, DeleteCategory } from '../types'

export function makeDeleteCategory(repo: AdminRepository): DeleteCategory {
  return (id: string) => repo.deleteCategory(id)
}
```

- [ ] **Шаг 2: Написать тесты**

`apps/api/src/features/admin/application/listCategoriesWithCount.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeListCategoriesWithCount } from './listCategoriesWithCount'
import type { AdminRepository, AdminCategoryItem } from '../types'

const mockCat: AdminCategoryItem = { id: 'c1', name: 'Dolls', slug: 'dolls', productCount: 5 }

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(),
    listCategoriesWithCount: vi.fn().mockResolvedValue([mockCat]),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('listCategoriesWithCount', () => {
  it('returns category list from repo', async () => {
    const repo = makeRepo()
    const result = await makeListCategoriesWithCount(repo)()
    expect(result).toEqual([mockCat])
    expect(repo.listCategoriesWithCount).toHaveBeenCalledOnce()
  })
})
```

`apps/api/src/features/admin/application/createCategory.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeCreateCategory } from './createCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn().mockResolvedValue({ id: 'c1' }),
    updateCategory: vi.fn(), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('createCategory', () => {
  it('delegates and returns id', async () => {
    const repo = makeRepo()
    const result = await makeCreateCategory(repo)('Dolls', 'dolls')
    expect(repo.createCategory).toHaveBeenCalledWith('Dolls', 'dolls')
    expect(result).toEqual({ id: 'c1' })
  })
})
```

`apps/api/src/features/admin/application/updateCategory.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeUpdateCategory } from './updateCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn().mockResolvedValue(undefined), deleteCategory: vi.fn(),
  } as unknown as AdminRepository
}

describe('updateCategory', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeUpdateCategory(repo)('c1', 'Dolls New', 'dolls-new')
    expect(repo.updateCategory).toHaveBeenCalledWith('c1', 'Dolls New', 'dolls-new')
  })
})
```

`apps/api/src/features/admin/application/deleteCategory.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest'
import { makeDeleteCategory } from './deleteCategory'
import type { AdminRepository } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(), markAllMessagesRead: vi.fn(),
    listProducts: vi.fn(), createProduct: vi.fn(), updateProduct: vi.fn(),
    deleteProduct: vi.fn(), togglePublish: vi.fn(), listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(), updateCategory: vi.fn(), deleteCategory: vi.fn().mockResolvedValue(undefined),
  } as unknown as AdminRepository
}

describe('deleteCategory', () => {
  it('delegates to repo', async () => {
    const repo = makeRepo()
    await makeDeleteCategory(repo)('c1')
    expect(repo.deleteCategory).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Шаг 3: Запустить тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/application --reporter=basic
```

Ожидаем: все тесты PASS.

- [ ] **Шаг 4: Commit**

```bash
git add apps/api/src/features/admin/application/
git commit -m "feat(admin): add category use-cases with tests"
```

---

## Task 5: Admin роуты (backend)

**Files:**
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.test.ts`

- [ ] **Шаг 1: Переписать adminRoutes.ts**

```typescript
import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import { requireAdmin } from '../../../shared/middleware'
import type {
  GetDashboard, MarkAllMessagesRead,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
} from '../types'

const productListQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['published', 'draft']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

const productBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1),
  images: z.array(z.string()),
  messageOptions: z.array(z.string()),
  isPublished: z.boolean(),
})

const categoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
})

export function makeAdminRouter(
  getDashboard: GetDashboard,
  markAllMessagesRead: MarkAllMessagesRead,
  listAdminProducts: ListAdminProducts,
  createProduct: CreateProduct,
  updateProduct: UpdateProduct,
  deleteProduct: DeleteProduct,
  togglePublish: TogglePublish,
  listCategoriesWithCount: ListCategoriesWithCount,
  createCategory: CreateCategory,
  updateCategory: UpdateCategory,
  deleteCategory: DeleteCategory,
) {
  const router = new Hono()

  router.use('*', requireAdmin)

  router.get('/dashboard', async (c) => {
    const data = await getDashboard()
    return c.json(data)
  })

  router.patch('/messages/mark-all-read', async (c) => {
    await markAllMessagesRead()
    return c.json({ ok: true })
  })

  router.get('/products', zValidator('query', productListQuerySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await listAdminProducts(params)
    return c.json(result)
  })

  router.post('/products', zValidator('json', productBodySchema), async (c) => {
    const input = c.req.valid('json')
    const result = await createProduct(input)
    return c.json(result, 201)
  })

  router.put('/products/:id', zValidator('json', productBodySchema), async (c) => {
    const id = c.req.param('id')
    const input = c.req.valid('json')
    await updateProduct(id, input)
    return c.json({ ok: true })
  })

  router.delete('/products/:id', async (c) => {
    const id = c.req.param('id')
    await deleteProduct(id)
    return c.json({ ok: true })
  })

  router.patch('/products/:id/toggle-publish', async (c) => {
    const id = c.req.param('id')
    const result = await togglePublish(id)
    return c.json(result)
  })

  router.get('/categories', async (c) => {
    const result = await listCategoriesWithCount()
    return c.json(result)
  })

  router.post('/categories', zValidator('json', categoryBodySchema), async (c) => {
    const { name, slug } = c.req.valid('json')
    const result = await createCategory(name, slug)
    return c.json(result, 201)
  })

  router.put('/categories/:id', zValidator('json', categoryBodySchema), async (c) => {
    const id = c.req.param('id')
    const { name, slug } = c.req.valid('json')
    await updateCategory(id, name, slug)
    return c.json({ ok: true })
  })

  router.delete('/categories/:id', async (c) => {
    const id = c.req.param('id')
    await deleteCategory(id)
    return c.json({ ok: true })
  })

  return router
}
```

- [ ] **Шаг 2: Обновить тесты роутов**

Добавить в `adminRoutes.test.ts` вспомогательную функцию `makeApp` принимающую все use-cases, и тесты для новых эндпоинтов. Существующие тесты dashboard/messages сохранить.

```typescript
import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeAdminRouter } from './adminRoutes'
import type {
  GetDashboard, MarkAllMessagesRead, DashboardResponse,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  AdminProductListResponse, AdminCategoryItem,
} from '../types'

const mockDashboard: DashboardResponse = {
  stats: { ordersToday: 1, revenueToday: 50, revenueMonth: 200, newMessages: 3, activeListings: 8 },
  recentOrders: [{ id: 'o1', orderNumber: 42, status: 'PAID', totalAmount: 50, createdAt: '2026-06-01T10:00:00.000Z', userName: 'Anna' }],
  recentMessages: [],
}

const mockProductList: AdminProductListResponse = {
  items: [{ id: 'p1', name: 'Bunny', slug: 'bunny', price: 24, stock: 5, isPublished: true, image: null, category: 'Dolls', categoryId: 'c1' }],
  total: 1, page: 1, totalPages: 1,
}

const mockCategories: AdminCategoryItem[] = [{ id: 'c1', name: 'Dolls', slug: 'dolls', productCount: 5 }]

function makeApp(overrides: {
  getDashboard?: GetDashboard
  markAllMessagesRead?: MarkAllMessagesRead
  listAdminProducts?: ListAdminProducts
  createProduct?: CreateProduct
  updateProduct?: UpdateProduct
  deleteProduct?: DeleteProduct
  togglePublish?: TogglePublish
  listCategoriesWithCount?: ListCategoriesWithCount
  createCategory?: CreateCategory
  updateCategory?: UpdateCategory
  deleteCategory?: DeleteCategory
} = {}) {
  const app = new Hono()
  app.use('*', async (c, next) => { c.set('auth', { userId: 'u1', role: 'ADMIN' }); await next() })
  app.route('/admin', makeAdminRouter(
    overrides.getDashboard ?? vi.fn().mockResolvedValue(mockDashboard),
    overrides.markAllMessagesRead ?? vi.fn().mockResolvedValue(undefined),
    overrides.listAdminProducts ?? vi.fn().mockResolvedValue(mockProductList),
    overrides.createProduct ?? vi.fn().mockResolvedValue({ id: 'p1' }),
    overrides.updateProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteProduct ?? vi.fn().mockResolvedValue(undefined),
    overrides.togglePublish ?? vi.fn().mockResolvedValue({ isPublished: false }),
    overrides.listCategoriesWithCount ?? vi.fn().mockResolvedValue(mockCategories),
    overrides.createCategory ?? vi.fn().mockResolvedValue({ id: 'c1' }),
    overrides.updateCategory ?? vi.fn().mockResolvedValue(undefined),
    overrides.deleteCategory ?? vi.fn().mockResolvedValue(undefined),
  ))
  return app
}

describe('GET /admin/dashboard', () => {
  it('returns dashboard data', async () => {
    const app = makeApp()
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(200)
    const body = await res.json() as DashboardResponse
    expect(body.stats.ordersToday).toBe(1)
  })

  it('returns 403 when not ADMIN', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => { c.set('auth', { userId: 'u1', role: 'CUSTOMER' }); await next() })
    app.route('/admin', makeAdminRouter(
      vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(), vi.fn(),
    ))
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(403)
  })
})

describe('PATCH /admin/messages/mark-all-read', () => {
  it('returns 200', async () => {
    const markAll = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ markAllMessagesRead: markAll })
    const res = await app.request('/admin/messages/mark-all-read', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(markAll).toHaveBeenCalledOnce()
  })
})

describe('GET /admin/products', () => {
  it('returns product list', async () => {
    const app = makeApp()
    const res = await app.request('/admin/products')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminProductListResponse
    expect(body.items).toHaveLength(1)
    expect(body.items[0].name).toBe('Bunny')
  })
})

describe('POST /admin/products', () => {
  it('creates product and returns 201', async () => {
    const createProduct = vi.fn().mockResolvedValue({ id: 'p2' })
    const app = makeApp({ createProduct })
    const res = await app.request('/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bear', slug: 'bear', description: 'desc', price: 18.5, stock: 3, categoryId: 'c1', images: [], messageOptions: [], isPublished: false }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { id: string }
    expect(body.id).toBe('p2')
  })

  it('returns 422 when name is missing', async () => {
    const app = makeApp()
    const res = await app.request('/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: 'bear' }),
    })
    expect(res.status).toBe(422)
  })
})

describe('PATCH /admin/products/:id/toggle-publish', () => {
  it('returns toggled state', async () => {
    const toggle = vi.fn().mockResolvedValue({ isPublished: true })
    const app = makeApp({ togglePublish: toggle })
    const res = await app.request('/admin/products/p1/toggle-publish', { method: 'PATCH' })
    expect(res.status).toBe(200)
    const body = await res.json() as { isPublished: boolean }
    expect(body.isPublished).toBe(true)
  })
})

describe('GET /admin/categories', () => {
  it('returns category list', async () => {
    const app = makeApp()
    const res = await app.request('/admin/categories')
    expect(res.status).toBe(200)
    const body = await res.json() as AdminCategoryItem[]
    expect(body[0].name).toBe('Dolls')
    expect(body[0].productCount).toBe(5)
  })
})

describe('DELETE /admin/categories/:id', () => {
  it('calls deleteCategory and returns ok', async () => {
    const del = vi.fn().mockResolvedValue(undefined)
    const app = makeApp({ deleteCategory: del })
    const res = await app.request('/admin/categories/c1', { method: 'DELETE' })
    expect(res.status).toBe(200)
    expect(del).toHaveBeenCalledWith('c1')
  })
})
```

- [ ] **Шаг 3: Запустить тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run apps/api/src/features/admin/presentation --reporter=basic
```

Ожидаем: все тесты PASS.

- [ ] **Шаг 4: Commit**

```bash
git add apps/api/src/features/admin/presentation/
git commit -m "feat(admin): add product/category routes with tests"
```

---

## Task 6: Обновить index.ts и app.ts (backend)

**Files:**
- Modify: `apps/api/src/features/admin/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1: Обновить index.ts**

```typescript
export { makeAdminRepository } from './infrastructure/adminRepository'
export { makeGetDashboard } from './application/getDashboard'
export { makeMarkAllMessagesRead } from './application/markAllMessagesRead'
export { makeListAdminProducts } from './application/listAdminProducts'
export { makeCreateProduct } from './application/createProduct'
export { makeUpdateProduct } from './application/updateProduct'
export { makeDeleteProduct } from './application/deleteProduct'
export { makeTogglePublish } from './application/togglePublish'
export { makeListCategoriesWithCount } from './application/listCategoriesWithCount'
export { makeCreateCategory } from './application/createCategory'
export { makeUpdateCategory } from './application/updateCategory'
export { makeDeleteCategory } from './application/deleteCategory'
export { makeAdminRouter } from './presentation/adminRoutes'
```

- [ ] **Шаг 2: Обновить app.ts — добавить wire-up новых use-cases**

Найди блок с `makeAdminRepository` и замени на:

```typescript
  const adminRepo = makeAdminRepository(prisma)
  const getDashboard = makeGetDashboard(adminRepo)
  const markAllMessagesRead = makeMarkAllMessagesRead(adminRepo)
  const listAdminProducts = makeListAdminProducts(adminRepo)
  const createProduct = makeCreateProduct(adminRepo)
  const updateProduct = makeUpdateProduct(adminRepo)
  const deleteProduct = makeDeleteProduct(adminRepo)
  const togglePublish = makeTogglePublish(adminRepo)
  const listCategoriesWithCount = makeListCategoriesWithCount(adminRepo)
  const createCategory = makeCreateCategory(adminRepo)
  const updateCategory = makeUpdateCategory(adminRepo)
  const deleteCategory = makeDeleteCategory(adminRepo)
  app.use('/admin/*', requireAuth)
  app.route('/admin', makeAdminRouter(
    getDashboard, markAllMessagesRead,
    listAdminProducts, createProduct, updateProduct, deleteProduct, togglePublish,
    listCategoriesWithCount, createCategory, updateCategory, deleteCategory,
  ))
```

Обнови импорт из `./features/admin` — добавь все новые фабрики.

- [ ] **Шаг 3: Проверить типы**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 4: Commit**

```bash
git add apps/api/src/features/admin/index.ts apps/api/src/app.ts
git commit -m "feat(admin): wire up product/category use-cases in app"
```

---

## Task 7: Frontend — composables (adminListingsApi, adminCategoriesApi)

**Files:**
- Create: `apps/web/src/widgets/admin-panel/adminListingsApi.ts`
- Create: `apps/web/src/widgets/admin-panel/adminCategoriesApi.ts`

- [ ] **Шаг 1: Создать adminListingsApi.ts**

```typescript
import { ref, onMounted, watch } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const AdminProductItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  price: z.number(),
  stock: z.number(),
  isPublished: z.boolean(),
  image: z.string().nullable(),
  category: z.string(),
  categoryId: z.string(),
})

const AdminProductListResponseSchema = z.object({
  items: z.array(AdminProductItemSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

const AdminProductInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1),
  images: z.array(z.string()),
  messageOptions: z.array(z.string()),
  isPublished: z.boolean(),
})

export type AdminProductItem = z.infer<typeof AdminProductItemSchema>
export type AdminProductInput = z.infer<typeof AdminProductInputSchema>
export type AdminProductListResponse = z.infer<typeof AdminProductListResponseSchema>

export type AdminListingsFilters = {
  search: string
  categoryId: string
  status: 'all' | 'published' | 'draft'
  page: number
}

export function useAdminListings() {
  const data = ref<AdminProductListResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<AdminListingsFilters>({
    search: '',
    categoryId: '',
    status: 'all',
    page: 1,
  })

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(filters.value.page))
      params.set('limit', '12')
      if (filters.value.search) params.set('search', filters.value.search)
      if (filters.value.categoryId) params.set('categoryId', filters.value.categoryId)
      if (filters.value.status !== 'all') params.set('status', filters.value.status)

      const res = await authFetch(`/admin/products?${params}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load products')
        return
      }
      data.value = AdminProductListResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load products'
    } finally {
      isLoading.value = false
    }
  }

  async function togglePublish(id: string) {
    const res = await authFetch(`/admin/products/${id}/toggle-publish`, { method: 'PATCH' })
    if (!res.ok) return
    const { isPublished } = await res.json() as { isPublished: boolean }
    if (data.value) {
      const item = data.value.items.find((p) => p.id === id)
      if (item) item.isPublished = isPublished
    }
  }

  async function deleteProduct(id: string) {
    const res = await authFetch(`/admin/products/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    await load()
  }

  function setFilter(patch: Partial<AdminListingsFilters>) {
    if (patch.search !== undefined || patch.categoryId !== undefined || patch.status !== undefined) {
      filters.value = { ...filters.value, ...patch, page: 1 }
    } else {
      filters.value = { ...filters.value, ...patch }
    }
  }

  watch(filters, load, { deep: true })
  onMounted(load)

  return { data, isLoading, error, filters, setFilter, togglePublish, deleteProduct, load }
}
```

- [ ] **Шаг 2: Создать adminCategoriesApi.ts**

```typescript
import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const AdminCategoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  productCount: z.number(),
})

export type AdminCategoryItem = z.infer<typeof AdminCategoryItemSchema>

export function useAdminCategories() {
  const categories = ref<AdminCategoryItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/categories')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load categories')
        return
      }
      categories.value = z.array(AdminCategoryItemSchema).parse(await res.json())
    } catch {
      error.value = 'Failed to load categories'
    } finally {
      isLoading.value = false
    }
  }

  async function createCategory(name: string): Promise<boolean> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const res = await authFetch('/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    if (!res.ok) return false
    await load()
    return true
  }

  async function updateCategory(id: string, name: string): Promise<boolean> {
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    const res = await authFetch(`/admin/categories/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, slug }),
    })
    if (!res.ok) return false
    await load()
    return true
  }

  async function deleteCategory(id: string): Promise<boolean> {
    const res = await authFetch(`/admin/categories/${id}`, { method: 'DELETE' })
    if (!res.ok) return false
    await load()
    return true
  }

  onMounted(load)

  return { categories, isLoading, error, load, createCategory, updateCategory, deleteCategory }
}
```

- [ ] **Шаг 3: Commit**

```bash
git add apps/web/src/widgets/admin-panel/adminListingsApi.ts apps/web/src/widgets/admin-panel/adminCategoriesApi.ts
git commit -m "feat(admin): add listings and categories composables"
```

---

## Task 8: Компонент AdminProductCard

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/AdminProductCard.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<template>
  <div class="product-card">
    <div class="product-card__image-wrap">
      <img
        v-if="product.image"
        :src="product.image"
        :alt="product.name"
        class="product-card__image"
      />
      <div
        v-else
        class="product-card__image product-card__image--placeholder"
      />
      <span
        class="product-card__badge product-card__badge--status"
        :class="product.isPublished ? 'product-card__badge--published' : 'product-card__badge--draft'"
      >
        {{ product.isPublished ? 'Published' : 'Draft' }}
      </span>
      <span
        v-if="product.stock === 0"
        class="product-card__badge product-card__badge--stock"
      >
        0 in stock
      </span>
    </div>
    <div class="product-card__body">
      <div class="product-card__name">{{ product.name }}</div>
      <div class="product-card__meta">{{ product.category }} · ${{ product.price.toFixed(2) }}</div>
      <div
        class="product-card__stock"
        :class="{ 'product-card__stock--empty': product.stock === 0 }"
      >
        {{ product.stock === 0 ? 'Out of stock' : `${product.stock} in stock` }}
      </div>
      <div class="product-card__actions">
        <RouterLink
          :to="`/admin/listings/${product.id}/edit`"
          class="product-card__edit"
        >
          Edit
        </RouterLink>
        <div
          class="product-card__menu-btn"
          @click.stop="menuOpen = !menuOpen"
        >
          ⋯
          <div
            v-if="menuOpen"
            class="product-card__menu"
          >
            <button
              class="product-card__menu-item"
              @click="emit('toggle-publish', product.id)"
            >
              {{ product.isPublished ? 'Hide' : 'Publish' }}
            </button>
            <button
              class="product-card__menu-item product-card__menu-item--danger"
              @click="emit('delete', product.id)"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { AdminProductItem } from '../adminListingsApi'

defineProps<{ product: AdminProductItem }>()
const emit = defineEmits<{
  (e: 'toggle-publish', id: string): void
  (e: 'delete', id: string): void
}>()

const menuOpen = ref(false)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-card {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__image-wrap {
    position: relative;
  }

  &__image {
    display: block;
    width: 100%;
    aspect-ratio: 4 / 3;
    object-fit: cover;

    &--placeholder {
      background: linear-gradient(135deg, #fdf0e8, #f5ddd0);
    }
  }

  &__badge {
    position: absolute;
    top: 7px;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    padding: 2px 7px;
    border-radius: 10px;

    &--status { left: 7px; }
    &--stock   { right: 7px; background: rgb(239 68 68 / 0.15); color: #c62828; }

    &--published { background: rgb(34 197 94 / 0.15); color: #2e7d32; }
    &--draft     { background: rgb(234 179 8 / 0.15); color: #92400e; }
  }

  &__body {
    padding: 10px;
  }

  &__name {
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--color-text);
    margin-bottom: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__meta {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-bottom: 2px;
  }

  &__stock {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    margin-bottom: 10px;

    &--empty {
      color: var(--color-border);
    }
  }

  &__actions {
    display: flex;
    gap: 6px;
  }

  &__edit {
    flex: 1;
    text-align: center;
    font-size: 0.72rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 5px;
    padding: 4px;
    font-weight: 600;
    text-decoration: none;
  }

  &__menu-btn {
    position: relative;
    width: 30px;
    text-align: center;
    font-size: 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: 5px;
    padding: 4px;
    color: var(--color-text-muted);
  }

  &__menu {
    position: absolute;
    bottom: calc(100% + 4px);
    right: 0;
    background: var(--color-white);
    border: 1px solid var(--color-border);
    border-radius: 6px;
    min-width: 110px;
    box-shadow: 0 4px 12px rgb(44 24 16 / 0.1);
    z-index: 10;
    overflow: hidden;
  }

  &__menu-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 8px 12px;
    font-size: 0.78rem;
    background: none;
    border: none;
    color: var(--color-text);

    &:hover {
      background: var(--color-bg);
    }

    &--danger {
      color: var(--color-error);
    }
  }
}
</style>
```

- [ ] **Шаг 2: Commit**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminProductCard.vue
git commit -m "feat(admin): add AdminProductCard component"
```

---

## Task 9: Компонент AdminCategoriesSection

**Files:**
- Create: `apps/web/src/widgets/admin-panel/components/AdminCategoriesSection.vue`

- [ ] **Шаг 1: Создать компонент**

```vue
<template>
  <div class="categories-section">
    <div class="categories-section__head">
      <span class="categories-section__title">Categories</span>
      <button
        class="categories-section__add"
        @click="startAdd"
      >
        + Add category
      </button>
    </div>

    <div
      v-if="error"
      class="categories-section__error"
    >
      {{ error }}
    </div>

    <div
      v-else-if="isLoading && !categories.length"
      class="categories-section__empty"
    >
      Loading…
    </div>

    <ul
      v-else
      class="categories-section__list"
    >
      <li
        v-for="cat in categories"
        :key="cat.id"
        class="categories-section__item"
      >
        <template v-if="editingId === cat.id">
          <input
            v-model="editName"
            class="categories-section__input"
            @keydown.enter="saveEdit(cat.id)"
            @keydown.escape="cancelEdit"
          />
          <span class="categories-section__count">{{ cat.productCount }} products</span>
          <button
            class="categories-section__action categories-section__action--save"
            @click="saveEdit(cat.id)"
          >
            Save
          </button>
          <button
            class="categories-section__action"
            @click="cancelEdit"
          >
            Cancel
          </button>
        </template>
        <template v-else>
          <span class="categories-section__name">{{ cat.name }}</span>
          <span class="categories-section__count">{{ cat.productCount }} products</span>
          <button
            class="categories-section__action categories-section__action--icon"
            @click="startEdit(cat)"
          >
            ✎
          </button>
          <button
            class="categories-section__action categories-section__action--icon categories-section__action--delete"
            @click="handleDelete(cat)"
          >
            ✕
          </button>
        </template>
      </li>

      <li
        v-if="addingNew"
        class="categories-section__item"
      >
        <input
          v-model="newName"
          class="categories-section__input"
          placeholder="Category name"
          @keydown.enter="saveNew"
          @keydown.escape="cancelAdd"
        />
        <button
          class="categories-section__action categories-section__action--save"
          @click="saveNew"
        >
          Save
        </button>
        <button
          class="categories-section__action"
          @click="cancelAdd"
        >
          Cancel
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAdminCategories } from '../adminCategoriesApi'
import type { AdminCategoryItem } from '../adminCategoriesApi'

const { categories, isLoading, error, createCategory, updateCategory, deleteCategory } = useAdminCategories()

const editingId = ref<string | null>(null)
const editName = ref('')
const addingNew = ref(false)
const newName = ref('')

function startEdit(cat: AdminCategoryItem) {
  editingId.value = cat.id
  editName.value = cat.name
  addingNew.value = false
}

function cancelEdit() {
  editingId.value = null
  editName.value = ''
}

async function saveEdit(id: string) {
  if (!editName.value.trim()) return
  await updateCategory(id, editName.value.trim())
  cancelEdit()
}

function startAdd() {
  addingNew.value = true
  newName.value = ''
  editingId.value = null
}

function cancelAdd() {
  addingNew.value = false
  newName.value = ''
}

async function saveNew() {
  if (!newName.value.trim()) return
  await createCategory(newName.value.trim())
  cancelAdd()
}

async function handleDelete(cat: AdminCategoryItem) {
  if (cat.productCount > 0) {
    if (!confirm(`"${cat.name}" has ${cat.productCount} products. Are you sure?`)) return
  }
  await deleteCategory(cat.id)
}
</script>

<style scoped lang="scss">
.categories-section {
  background: var(--color-white);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  overflow: hidden;

  &__head {
    padding: 12px 16px;
    border-bottom: 1px solid var(--color-border);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__title {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__add {
    font-size: 0.72rem;
    color: var(--color-accent);
    font-style: italic;
    font-weight: 500;
    background: none;
    border: none;
  }

  &__error,
  &__empty {
    padding: 16px;
    font-size: 0.8rem;
    color: var(--color-text-muted);
    font-style: italic;
    text-align: center;
  }

  &__list {
    list-style: none;
  }

  &__item {
    display: flex;
    align-items: center;
    padding: 8px 16px;
    gap: 10px;
    border-bottom: 1px solid var(--color-bg);

    &:last-child {
      border-bottom: none;
    }

    &:nth-child(even) {
      background: var(--color-bg);
    }
  }

  &__name {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__count {
    font-size: 0.7rem;
    color: var(--color-border);
    white-space: nowrap;
  }

  &__input {
    flex: 1;
    font-size: 0.8rem;
    border: 1px solid var(--color-accent);
    border-radius: 4px;
    padding: 2px 8px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
  }

  &__action {
    font-size: 0.72rem;
    background: none;
    border: none;
    color: var(--color-text-muted);
    white-space: nowrap;

    &--save {
      color: var(--color-accent);
      font-weight: 600;
    }

    &--icon {
      font-size: 0.85rem;
      opacity: 0.6;

      &:hover {
        opacity: 1;
      }
    }

    &--delete {
      color: var(--color-error);
    }
  }
}
</style>
```

- [ ] **Шаг 2: Commit**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminCategoriesSection.vue
git commit -m "feat(admin): add AdminCategoriesSection component"
```

---

## Task 10: Реализовать AdminListings.vue

**Files:**
- Modify: `apps/web/src/widgets/admin-panel/components/AdminListings.vue`

- [ ] **Шаг 1: Переписать компонент**

```vue
<template>
  <div class="admin-listings">
    <AdminTopbar
      title="Listings"
      subtitle="Products & categories"
    >
      <template #action>
        <RouterLink
          to="/admin/listings/new"
          class="admin-listings__new-btn"
        >
          + New product
        </RouterLink>
      </template>
    </AdminTopbar>

    <div class="admin-listings__filters">
      <input
        :value="filters.search"
        class="admin-listings__search"
        placeholder="Search by name…"
        @input="setFilter({ search: ($event.target as HTMLInputElement).value })"
      />
      <select
        :value="filters.categoryId"
        class="admin-listings__select"
        @change="setFilter({ categoryId: ($event.target as HTMLSelectElement).value })"
      >
        <option value="">All categories</option>
        <option
          v-for="cat in categoryOptions"
          :key="cat.id"
          :value="cat.id"
        >
          {{ cat.name }}
        </option>
      </select>
      <select
        :value="filters.status"
        class="admin-listings__select"
        @change="setFilter({ status: ($event.target as HTMLSelectElement).value as 'all' | 'published' | 'draft' })"
      >
        <option value="all">All statuses</option>
        <option value="published">Published</option>
        <option value="draft">Draft</option>
      </select>
      <span
        v-if="data"
        class="admin-listings__count"
      >
        {{ data.total }} products
      </span>
    </div>

    <div
      v-if="error"
      class="admin-listings__error"
    >
      <span>{{ error }}</span>
      <button
        class="admin-listings__retry"
        @click="load"
      >
        Retry
      </button>
    </div>

    <div
      v-else-if="isLoading && !data"
      class="admin-listings__loading"
    >
      Loading…
    </div>

    <div
      v-else-if="data && data.items.length === 0"
      class="admin-listings__empty"
    >
      No products found
    </div>

    <div
      v-else-if="data"
      class="admin-listings__grid"
    >
      <AdminProductCard
        v-for="product in data.items"
        :key="product.id"
        :product="product"
        @toggle-publish="togglePublish"
        @delete="deleteProduct"
      />
    </div>

    <div
      v-if="data && data.totalPages > 1"
      class="admin-listings__pagination"
    >
      <button
        v-for="p in data.totalPages"
        :key="p"
        class="admin-listings__page"
        :class="{ 'admin-listings__page--active': p === data.page }"
        @click="setFilter({ page: p })"
      >
        {{ p }}
      </button>
    </div>

    <div class="admin-listings__categories">
      <AdminCategoriesSection />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AdminTopbar from './AdminTopbar.vue'
import AdminProductCard from './AdminProductCard.vue'
import AdminCategoriesSection from './AdminCategoriesSection.vue'
import { useAdminListings } from '../adminListingsApi'
import { useAdminCategories } from '../adminCategoriesApi'

const { data, isLoading, error, filters, setFilter, togglePublish, deleteProduct, load } = useAdminListings()
const { categories } = useAdminCategories()

const categoryOptions = computed(() => categories.value)
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.admin-listings {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__new-btn {
    font-size: 0.75rem;
    background: var(--color-accent);
    color: var(--color-white);
    border-radius: 6px;
    padding: 7px 14px;
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }

  &__filters {
    padding: 10px 16px;
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    align-items: center;

    @include tablet {
      padding: 10px 32px;
    }
  }

  &__search,
  &__select {
    font-size: 0.78rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 5px 10px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);
  }

  &__search {
    width: 160px;
  }

  &__count {
    margin-left: auto;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__error {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    padding: 40px;
  }

  &__retry {
    font-size: 0.8rem;
    padding: 6px 16px;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    background: var(--color-white);
    color: var(--color-text);
  }

  &__loading,
  &__empty {
    padding: 40px;
    text-align: center;
    font-size: 0.85rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  &__grid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;

    @include tablet {
      padding: 20px 32px;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
    }
  }

  &__pagination {
    display: flex;
    justify-content: center;
    gap: 6px;
    padding: 4px 16px 16px;
  }

  &__page {
    font-size: 0.72rem;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 3px 8px;
    background: var(--color-white);
    color: var(--color-text-muted);

    &--active {
      background: var(--color-accent);
      color: var(--color-white);
      border-color: var(--color-accent);
    }
  }

  &__categories {
    padding: 0 16px 20px;

    @include tablet {
      padding: 0 32px 24px;
    }
  }
}
</style>
```

> **Важно:** `AdminTopbar` принимает slot `#action` — проверь существующий компонент. Если slot не поддерживается, добавь его в `AdminTopbar.vue`:
> В `<template>` добавь `<slot name="action" />` рядом с заголовком.

- [ ] **Шаг 2: Commit**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminListings.vue
git commit -m "feat(admin): implement AdminListings with grid, filters, pagination"
```

---

## Task 11: Страница формы товара

**Files:**
- Create: `apps/web/src/pages/AdminProductFormPage.vue`
- Modify: `apps/web/src/router/index.ts`

- [ ] **Шаг 1: Создать страницу AdminProductFormPage.vue**

```vue
<template>
  <div class="product-form-page">
    <div class="product-form-page__topbar">
      <RouterLink
        to="/admin/listings"
        class="product-form-page__back"
      >
        ← Listings
      </RouterLink>
      <h1 class="product-form-page__title">
        {{ isEdit ? 'Edit product' : 'New product' }}
      </h1>
    </div>

    <div
      v-if="loadError"
      class="product-form-page__error"
    >
      {{ loadError }}
    </div>

    <form
      v-else
      class="product-form-page__form"
      @submit.prevent="handleSubmit"
    >
      <div class="product-form-page__row">
        <label class="product-form-page__label">
          Name
          <input
            v-model="form.name"
            class="product-form-page__input"
            required
            @input="autoSlug"
          />
        </label>
        <label class="product-form-page__label">
          Slug
          <input
            v-model="form.slug"
            class="product-form-page__input"
            required
          />
        </label>
      </div>

      <div class="product-form-page__row">
        <label class="product-form-page__label">
          Category
          <select
            v-model="form.categoryId"
            class="product-form-page__input"
            required
          >
            <option
              v-for="cat in categories"
              :key="cat.id"
              :value="cat.id"
            >
              {{ cat.name }}
            </option>
          </select>
        </label>
        <label class="product-form-page__label">
          Price ($)
          <input
            v-model.number="form.price"
            type="number"
            step="0.01"
            min="0"
            class="product-form-page__input"
            required
          />
        </label>
        <label class="product-form-page__label">
          Stock
          <input
            v-model.number="form.stock"
            type="number"
            min="0"
            class="product-form-page__input"
            required
          />
        </label>
      </div>

      <label class="product-form-page__label">
        Description
        <textarea
          v-model="form.description"
          class="product-form-page__textarea"
          rows="4"
        />
      </label>

      <div class="product-form-page__section-title">
        Message options
      </div>
      <div class="product-form-page__tags">
        <span
          v-for="(opt, i) in form.messageOptions"
          :key="i"
          class="product-form-page__tag"
        >
          {{ opt }}
          <button
            type="button"
            @click="removeMessageOption(i)"
          >
            ✕
          </button>
        </span>
        <input
          v-model="newMessageOption"
          class="product-form-page__tag-input"
          placeholder="Add option…"
          @keydown.enter.prevent="addMessageOption"
        />
      </div>

      <label class="product-form-page__label">
        Images (URLs, one per line)
        <textarea
          :value="form.images.join('\n')"
          class="product-form-page__textarea"
          rows="3"
          placeholder="https://..."
          @input="form.images = ($event.target as HTMLTextAreaElement).value.split('\n').map(s => s.trim()).filter(Boolean)"
        />
      </label>

      <label class="product-form-page__checkbox-label">
        <input
          v-model="form.isPublished"
          type="checkbox"
        />
        Published
      </label>

      <div
        v-if="submitError"
        class="product-form-page__submit-error"
      >
        {{ submitError }}
      </div>

      <div class="product-form-page__footer">
        <RouterLink
          to="/admin/listings"
          class="product-form-page__cancel"
        >
          Cancel
        </RouterLink>
        <button
          type="submit"
          class="product-form-page__save"
          :disabled="isSaving"
        >
          {{ isSaving ? 'Saving…' : 'Save' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute, RouterLink } from 'vue-router'
import { authFetch, apiErrorMessage } from '@/shared'
import { useAdminCategories } from '@/widgets/admin-panel/adminCategoriesApi'
import type { AdminProductInput } from '@/widgets/admin-panel/adminListingsApi'

const router = useRouter()
const route = useRoute()
const { categories, load: loadCategories } = useAdminCategories()

const isEdit = computed(() => !!route.params.id)
const loadError = ref<string | null>(null)
const submitError = ref<string | null>(null)
const isSaving = ref(false)
const newMessageOption = ref('')

const form = ref<AdminProductInput>({
  name: '',
  slug: '',
  description: '',
  price: 0,
  stock: 0,
  categoryId: '',
  images: [],
  messageOptions: [],
  isPublished: false,
})

function autoSlug() {
  if (isEdit.value) return
  form.value.slug = form.value.name
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
}

function addMessageOption() {
  const val = newMessageOption.value.trim()
  if (val) {
    form.value.messageOptions.push(val)
    newMessageOption.value = ''
  }
}

function removeMessageOption(index: number) {
  form.value.messageOptions.splice(index, 1)
}

async function loadProduct() {
  const id = route.params.id as string
  const res = await authFetch(`/admin/products/${id}`)
  if (!res.ok) {
    loadError.value = await apiErrorMessage(res, 'Failed to load product')
    return
  }
  const data = await res.json() as AdminProductInput & { id: string }
  form.value = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    price: data.price,
    stock: data.stock,
    categoryId: data.categoryId,
    images: data.images,
    messageOptions: data.messageOptions,
    isPublished: data.isPublished,
  }
}

async function handleSubmit() {
  isSaving.value = true
  submitError.value = null
  try {
    const url = isEdit.value ? `/admin/products/${route.params.id}` : '/admin/products'
    const method = isEdit.value ? 'PUT' : 'POST'
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    if (!res.ok) {
      submitError.value = await apiErrorMessage(res, 'Failed to save product')
      return
    }
    router.push('/admin/listings')
  } catch {
    submitError.value = 'Failed to save product'
  } finally {
    isSaving.value = false
  }
}

onMounted(async () => {
  await loadCategories()
  if (isEdit.value) await loadProduct()
})
</script>

<style scoped lang="scss">
@use '@/assets/styles/breakpoints.module' as *;

.product-form-page {
  display: flex;
  flex-direction: column;
  flex: 1;

  &__topbar {
    padding: 14px 16px;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-white);
    display: flex;
    align-items: center;
    gap: 16px;

    @include tablet {
      padding: 14px 32px;
    }
  }

  &__back {
    font-size: 0.75rem;
    color: var(--color-accent);
    text-decoration: none;
    white-space: nowrap;

    &:hover {
      text-decoration: underline;
    }
  }

  &__title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__error {
    padding: 40px;
    text-align: center;
    color: var(--color-error);
    font-size: 0.85rem;
  }

  &__form {
    padding: 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    max-width: 700px;

    @include tablet {
      padding: 28px 32px;
    }
  }

  &__row {
    display: flex;
    flex-direction: column;
    gap: 12px;

    @include tablet {
      flex-direction: row;
      gap: 16px;
    }
  }

  &__label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__input,
  &__textarea {
    font-size: 0.85rem;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    padding: 7px 10px;
    background: var(--color-white);
    color: var(--color-text);
    font-family: var(--font-display);

    &:focus {
      outline: 2px solid var(--color-accent);
      outline-offset: -1px;
    }
  }

  &__textarea {
    resize: vertical;
  }

  &__section-title {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  &__tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
  }

  &__tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: 12px;
    padding: 2px 10px;
    color: var(--color-text);

    button {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      background: none;
      border: none;
    }
  }

  &__tag-input {
    font-size: 0.8rem;
    border: 1px dashed var(--color-border);
    border-radius: 12px;
    padding: 2px 10px;
    background: none;
    color: var(--color-text);
    font-family: var(--font-display);
    width: 120px;
  }

  &__checkbox-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--color-text);
  }

  &__submit-error {
    font-size: 0.8rem;
    color: var(--color-error);
  }

  &__footer {
    display: flex;
    gap: 12px;
    align-items: center;
    padding-top: 8px;
  }

  &__cancel {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  &__save {
    font-size: 0.85rem;
    background: var(--color-accent);
    color: var(--color-white);
    border: none;
    border-radius: 6px;
    padding: 8px 24px;
    font-weight: 600;
    font-family: var(--font-display);

    &:disabled {
      opacity: 0.6;
    }
  }
}
</style>
```

> **Важно:** Для страницы edit нужен эндпоинт `GET /admin/products/:id`. Добавь его в `adminRoutes.ts` и соответствующий метод в репозиторий (Task 12).

- [ ] **Шаг 2: Добавить роуты в router/index.ts**

В блок children роута `/admin` добавить перед `analytics`:

```typescript
{
  path: 'listings/new',
  name: 'admin-listing-new',
  component: () => import('@/pages/AdminProductFormPage.vue'),
},
{
  path: 'listings/:id/edit',
  name: 'admin-listing-edit',
  component: () => import('@/pages/AdminProductFormPage.vue'),
},
```

> Маршрут `listings/new` должен быть **до** `listings/:id/edit` (Vue Router матчит по порядку).

- [ ] **Шаг 3: Commit**

```bash
git add apps/web/src/pages/AdminProductFormPage.vue apps/web/src/router/index.ts
git commit -m "feat(admin): add product form page with routes"
```

---

## Task 12: GET /admin/products/:id (backend)

**Files:**
- Modify: `apps/api/src/features/admin/infrastructure/adminRepository.ts`
- Modify: `apps/api/src/features/admin/types.ts`
- Modify: `apps/api/src/features/admin/presentation/adminRoutes.ts`
- Modify: `apps/api/src/features/admin/application/` (новый use-case)
- Modify: `apps/api/src/features/admin/index.ts`
- Modify: `apps/api/src/app.ts`

- [ ] **Шаг 1: Добавить тип AdminProductDetail в types.ts**

```typescript
export type AdminProductDetail = {
  id: string
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: string
  images: string[]
  messageOptions: string[]
  isPublished: boolean
}

export type GetAdminProduct = (id: string) => Promise<AdminProductDetail | null>
```

Добавить в `AdminRepository`:
```typescript
getProduct(id: string): Promise<AdminProductDetail | null>
```

- [ ] **Шаг 2: Добавить метод в репозиторий**

```typescript
    async getProduct(id: string) {
      const row = await prisma.product.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true, name: true, slug: true, description: true,
          price: true, stock: true, categoryId: true,
          images: true, messageOptions: true, isPublished: true,
        },
      })
      if (!row) return null
      return { ...row, price: row.price.toNumber() }
    },
```

- [ ] **Шаг 3: Создать use-case**

`apps/api/src/features/admin/application/getAdminProduct.ts`:
```typescript
import type { AdminRepository, GetAdminProduct } from '../types'

export function makeGetAdminProduct(repo: AdminRepository): GetAdminProduct {
  return (id: string) => repo.getProduct(id)
}
```

- [ ] **Шаг 4: Добавить роут в adminRoutes.ts**

В сигнатуру `makeAdminRouter` добавить `getAdminProduct: GetAdminProduct`.
В тело роутера добавить:

```typescript
  router.get('/products/:id', async (c) => {
    const id = c.req.param('id')
    const product = await getAdminProduct(id)
    if (!product) return c.json({ error: 'Not found' }, 404)
    return c.json(product)
  })
```

- [ ] **Шаг 5: Обновить index.ts и app.ts** — экспортировать `makeGetAdminProduct`, добавить в wire-up.

- [ ] **Шаг 6: Проверить типы**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

- [ ] **Шаг 7: Commit**

```bash
git add apps/api/src/features/admin/
git commit -m "feat(admin): add GET /admin/products/:id endpoint"
```

---

## Task 13: Проверить AdminTopbar slot

**Files:**
- Modify (если нужно): `apps/web/src/widgets/admin-panel/components/AdminTopbar.vue`

- [ ] **Шаг 1: Прочитать AdminTopbar.vue**

Открой файл и проверь — есть ли `<slot name="action">` или похожий механизм.

- [ ] **Шаг 2: Если slot отсутствует — добавить**

В `<template>` найди заголовочный блок и добавь:
```html
<div class="admin-topbar__action">
  <slot name="action" />
</div>
```

Добавь стиль:
```scss
&__action {
  margin-left: auto;
}
```

- [ ] **Шаг 3: Commit (только если были изменения)**

```bash
git add apps/web/src/widgets/admin-panel/components/AdminTopbar.vue
git commit -m "feat(admin): add action slot to AdminTopbar"
```

---

## Task 14: Финальная проверка типов и тестов

- [ ] **Шаг 1: Проверить типы фронтенда**

```bash
node --max-old-space-size=4096 ./node_modules/vue-tsc/bin/vue-tsc.js --noEmit
```

Ожидаем: 0 ошибок.

- [ ] **Шаг 2: Запустить все тесты**

```bash
node --max-old-space-size=4096 ./node_modules/vitest/vitest.mjs run --reporter=basic
```

Ожидаем: все тесты PASS.

- [ ] **Шаг 3: Проверить типы бэкенда**

```bash
node --max-old-space-size=8192 ./node_modules/typescript/bin/tsc --noEmit
```

Ожидаем: 0 ошибок.
