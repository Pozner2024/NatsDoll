import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser, createCartWithItem } from './factories'
import { makeOrderRepository } from '../../src/features/orders/infrastructure/orderRepository'
import { makePaymentRepository } from '../../src/features/payments/infrastructure/paymentRepository'
import type { ShippingAddress } from '../../src/features/orders/types'

const prisma = makeTestPrisma()
const orderRepo = makeOrderRepository(prisma)
const paymentRepo = makePaymentRepository(prisma)

const address: ShippingAddress = { fullName: 'T', line1: '1', city: 'C', country: 'US', postalCode: '00001' }

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await truncateAll(prisma)
})

async function pendingOrder(userId: string, productId: string, qty: number) {
  await createCartWithItem(prisma, userId, productId, qty)
  const items = await orderRepo.getCartItemsForCheckout(userId)
  return orderRepo.createOrderFromCart(userId, items, 0, address, null)
}

describe('paymentRepository.markOrderPaid (integration)', () => {
  it('decrements stock and sets the order PAID with capture id', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    const order = await pendingOrder(user.id, product.id, 3)

    await paymentRepo.markOrderPaid(order.id, 'CAP-1')

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(2)
    const updated = await prisma.order.findUniqueOrThrow({ where: { id: order.id } })
    expect(updated.status).toBe('PAID')
    expect(updated.paypalCaptureId).toBe('CAP-1')
  })

  it('is idempotent — a second call does not decrement again', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 5 })
    const user = await createUser(prisma)
    const order = await pendingOrder(user.id, product.id, 2)

    await paymentRepo.markOrderPaid(order.id, 'CAP-1')
    await paymentRepo.markOrderPaid(order.id, 'CAP-2')

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(3)
  })

  it('does not oversell the last unit — still marks PAID but flags adminNote when stock is short', async () => {
    const category = await createCategory(prisma)
    const product = await createProduct(prisma, category.id, { stock: 1 })
    const u1 = await createUser(prisma)
    const u2 = await createUser(prisma)
    const o1 = await pendingOrder(u1.id, product.id, 1)
    const o2 = await pendingOrder(u2.id, product.id, 1)

    await paymentRepo.markOrderPaid(o1.id, 'CAP-1')
    await paymentRepo.markOrderPaid(o2.id, 'CAP-2')

    const after = await prisma.product.findUniqueOrThrow({ where: { id: product.id } })
    expect(after.stock).toBe(0) // не ушёл в минус

    const order1 = await prisma.order.findUniqueOrThrow({ where: { id: o1.id } })
    const order2 = await prisma.order.findUniqueOrThrow({ where: { id: o2.id } })
    // оба PAID (деньги уже взяты), но ровно один помечен проблемой остатка для ручного разбора
    expect(order1.status).toBe('PAID')
    expect(order2.status).toBe('PAID')
    const flagged = [order1.adminNote, order2.adminNote].filter((n) => n?.includes('Проверить остаток'))
    expect(flagged).toHaveLength(1)
  })
})
