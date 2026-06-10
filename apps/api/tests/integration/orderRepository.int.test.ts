import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser, createCartWithItem } from './factories'
import { makeOrderRepository } from '../../src/features/orders/infrastructure/orderRepository'
import type { ShippingAddress } from '../../src/features/orders/types'

const prisma = makeTestPrisma()
const repo = makeOrderRepository(prisma)

const address: ShippingAddress = {
  fullName: 'Test User',
  line1: '1 Main St',
  city: 'City',
  country: 'US',
  postalCode: '00001',
}

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await truncateAll(prisma)
})

describe('orderRepository.createOrderFromCart (integration)', () => {
  it('does not oversell when two checkouts race for the last unit', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 1 })
    const u1 = await createUser(prisma)
    const u2 = await createUser(prisma)
    await createCartWithItem(prisma, u1.id, product.id, 1)
    await createCartWithItem(prisma, u2.id, product.id, 1)

    const [items1, items2] = await Promise.all([
      repo.getCartItemsForCheckout(u1.id),
      repo.getCartItemsForCheckout(u2.id),
    ])

    const results = await Promise.allSettled([
      repo.createOrderFromCart(u1.id, items1, 12, address, null),
      repo.createOrderFromCart(u2.id, items2, 12, address, null),
    ])

    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')

    // Ровно один заказ проходит, второй отклоняется CAS-проверкой — сток не уходит в минус.
    expect(fulfilled).toHaveLength(1)
    expect(rejected).toHaveLength(1)

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(0)
  })

  it('decrements stock by ordered quantity on a successful checkout', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    await createCartWithItem(prisma, user.id, product.id, 3)

    const items = await repo.getCartItemsForCheckout(user.id)
    await repo.createOrderFromCart(user.id, items, 12, address, null)

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(2)

    // Корзина очищена после оформления.
    const remaining = await prisma.cartItem.count({ where: { cart: { userId: user.id } } })
    expect(remaining).toBe(0)
  })
})
