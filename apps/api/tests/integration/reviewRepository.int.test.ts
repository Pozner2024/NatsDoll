import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser } from './factories'
import { makeReviewRepository } from '../../src/features/reviews/infrastructure/reviewRepository'

const prisma = makeTestPrisma()
const repo = makeReviewRepository(prisma)

beforeAll(async () => { await prisma.$connect() })
afterAll(async () => { await prisma.$disconnect() })
beforeEach(async () => { await truncateAll(prisma) })

async function orderWith(userId: string, productId: string, status: string) {
  return prisma.order.create({
    data: {
      userId,
      status: status as never,
      totalAmount: 10,
      shippingCost: 0,
      shippingAddress: {},
      items: { create: [{ productId, quantity: 1, price: 10 }] },
    },
  })
}

describe('reviewRepository.findReviewableItems (integration)', () => {
  it('returns items only from DELIVERED orders', async () => {
    const category = await createCategory(prisma)
    const delivered = await createProduct(prisma, category.id)
    const paidOnly = await createProduct(prisma, category.id)
    const user = await createUser(prisma)
    await orderWith(user.id, delivered.id, 'DELIVERED')
    await orderWith(user.id, paidOnly.id, 'PAID')

    const items = await repo.findReviewableItems(user.id)

    const ids = items.map(i => i.productId)
    expect(ids).toContain(delivered.id)
    expect(ids).not.toContain(paidOnly.id)
  })

  it('excludes products the user has already reviewed', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id)
    const user = await createUser(prisma)
    const order = await orderWith(user.id, product.id, 'DELIVERED')

    expect((await repo.findReviewableItems(user.id)).map(i => i.productId)).toContain(product.id)

    await repo.create(user.id, { productId: product.id, orderId: order.id, rating: 5, comment: null })

    expect((await repo.findReviewableItems(user.id)).map(i => i.productId)).not.toContain(product.id)
  })

  it('does not expose another user\'s delivered items', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id)
    const owner = await createUser(prisma)
    const stranger = await createUser(prisma)
    await orderWith(owner.id, product.id, 'DELIVERED')

    expect(await repo.findReviewableItems(stranger.id)).toHaveLength(0)
  })
})
