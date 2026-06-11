import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser } from './factories'
import { makeCartRepository } from '../../src/features/cart/infrastructure/cartRepository'

const prisma = makeTestPrisma()
const repo = makeCartRepository(prisma)

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await truncateAll(prisma)
})

describe('cartRepository.addCartItemRespectingStock (integration)', () => {
  it('rejects an add that would exceed the stock limit and leaves quantity capped', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 1 })
    const user = await createUser(prisma)
    const cartId = await repo.getOrCreateCartId(user.id)

    const first = await repo.addCartItemRespectingStock({
      cartId,
      productId: product.id,
      message: null,
      addQuantity: 1,
      stockLimit: 1,
    })
    expect(first.added).toBe(true)

    const second = await repo.addCartItemRespectingStock({
      cartId,
      productId: product.id,
      message: null,
      addQuantity: 1,
      stockLimit: 1,
    })
    expect(second.added).toBe(false)

    // Количество в корзине не превысило сток.
    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId, productId: product.id } })
    expect(item.quantity).toBe(1)
  })

  it('accumulates quantity for the same product+message up to the limit', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    const cartId = await repo.getOrCreateCartId(user.id)

    await repo.addCartItemRespectingStock({ cartId, productId: product.id, message: null, addQuantity: 2, stockLimit: 5 })
    const r = await repo.addCartItemRespectingStock({ cartId, productId: product.id, message: null, addQuantity: 3, stockLimit: 5 })
    expect(r.added).toBe(true)

    const item = await prisma.cartItem.findFirstOrThrow({ where: { cartId, productId: product.id } })
    expect(item.quantity).toBe(5)
  })
})
