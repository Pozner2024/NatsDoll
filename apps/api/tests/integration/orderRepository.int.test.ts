import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser, createCartWithItem } from './factories'
import { makeOrderRepository } from '../../src/features/orders/infrastructure/orderRepository'
import { makePaymentRepository } from '../../src/features/payments/infrastructure/paymentRepository'
import type { ShippingAddress } from '../../src/features/orders/types'

const prisma = makeTestPrisma()
const repo = makeOrderRepository(prisma)
const paymentRepo = makePaymentRepository(prisma)

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
  it('does not decrement stock on order creation (deferred to payment) and clears the cart', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    await createCartWithItem(prisma, user.id, product.id, 3)

    const items = await repo.getCartItemsForCheckout(user.id)
    const order = await repo.createOrderFromCart(user.id, items, 12, address, null)

    expect(order.status).toBe('PENDING')

    // Сток НЕ тронут при оформлении — списание перенесено на момент оплаты.
    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(5)

    // Корзина очищена после оформления.
    const remaining = await prisma.cartItem.count({ where: { cart: { userId: user.id } } })
    expect(remaining).toBe(0)
  })

  it('allows two concurrent checkouts for the last unit without touching stock', async () => {
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

    // Оба заказа создаются: защита от oversell теперь на этапе оплаты (markOrderPaid),
    // а не оформления. Сток при оформлении не меняется.
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(2)

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(1)
  })
})

describe('orderRepository paymentClaimed (integration)', () => {
  async function pendingOrder() {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    await createCartWithItem(prisma, user.id, product.id, 1)
    const items = await repo.getCartItemsForCheckout(user.id)
    return repo.createOrderFromCart(user.id, items, 0, address, null)
  }

  it('is false for a server-flow order that only has paypalOrderId bound (abandoned popup can still pay)', async () => {
    const order = await pendingOrder()

    await paymentRepo.setPaypalOrderId(order.id, 'PP-SERVER')

    const detail = await repo.getOrderById(order.id)
    expect(detail?.paymentClaimed).toBe(false)
  })

  it('is true after a client-mode claim', async () => {
    const order = await pendingOrder()

    await paymentRepo.claimPaypalOrder(order.id, 'PP-CLIENT')

    const detail = await repo.getOrderById(order.id)
    expect(detail?.paymentClaimed).toBe(true)
  })
})
