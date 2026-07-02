import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct } from './factories'
import { makeProductRepository } from '../../src/features/products/infrastructure/productRepository'

const prisma = makeTestPrisma()
const repo = makeProductRepository(prisma)

const listParams = { page: 1, limit: 20, sort: 'newest' as const, category: undefined }

beforeAll(async () => { await prisma.$connect() })
afterAll(async () => { await prisma.$disconnect() })
beforeEach(async () => { await truncateAll(prisma) })

describe('productRepository public listing (integration)', () => {
  it('findMany returns only published, non-deleted, in-stock products', async () => {
    const category = await createCategory(prisma)
    const visible = await createProduct(prisma, category.id, { stock: 3, isPublished: true })
    await createProduct(prisma, category.id, { isPublished: false })
    await createProduct(prisma, category.id, { deletedAt: new Date() })
    await createProduct(prisma, category.id, { stock: 0 })

    const { items, total } = await repo.findMany(listParams)

    expect(total).toBe(1)
    expect(items.map(i => i.id)).toEqual([visible.id])
  })

  it('findBySlug returns a published product even when sold out, but null for draft/deleted', async () => {
    const category = await createCategory(prisma)
    const soldOut = await createProduct(prisma, category.id, { stock: 0, isPublished: true })
    const draft = await createProduct(prisma, category.id, { isPublished: false })
    const deleted = await createProduct(prisma, category.id, { deletedAt: new Date() })

    expect(await repo.findBySlug(soldOut.slug)).not.toBeNull()
    expect(await repo.findBySlug(draft.slug)).toBeNull()
    expect(await repo.findBySlug(deleted.slug)).toBeNull()
  })
})
