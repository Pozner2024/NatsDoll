import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { makeTestPrisma, truncateAll } from './dbHelpers'
import { createCategory, createProduct, createUser } from './factories'
import { makeAdminRepository } from '../../src/features/admin/infrastructure/adminRepository'

const prisma = makeTestPrisma()
const repo = makeAdminRepository(prisma)

beforeAll(async () => {
  await prisma.$connect()
})

afterAll(async () => {
  await prisma.$disconnect()
})

beforeEach(async () => {
  await truncateAll(prisma)
})

async function seedPaidOrder(stock: number, quantity: number) {
  const category = await createCategory(prisma)
  const product = await createProduct(prisma, category.id, { stock })
  const user = await createUser(prisma)
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: 'PAID',
      totalAmount: 10 * quantity,
      shippingCost: 0,
      shippingAddress: {},
      items: { create: [{ productId: product.id, quantity, price: 10 }] },
    },
  })
  return { productId: product.id, orderId: order.id }
}

async function seedPendingOrder(stock: number, quantity: number) {
  const category = await createCategory(prisma)
  const product = await createProduct(prisma, category.id, { stock })
  const user = await createUser(prisma)
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      status: 'PENDING',
      totalAmount: 10 * quantity,
      shippingCost: 0,
      shippingAddress: {},
      items: { create: [{ productId: product.id, quantity, price: 10 }] },
    },
  })
  return { productId: product.id, orderId: order.id }
}

describe('adminRepository.updateAdminOrder — stock restore (integration)', () => {
  it('does not restore stock when an unpaid (PENDING) order is cancelled', async () => {
    const { productId, orderId } = await seedPendingOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'CANCELLED' })

    // Неоплаченный заказ склад не держал — возвращать нечего.
    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(0)
  })

  it('reclaims stock when a pending order is marked paid', async () => {
    const { productId, orderId } = await seedPendingOrder(5, 2)

    await repo.updateAdminOrder(orderId, { status: 'PAID' })

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(3)
  })

  it('restores stock when a paid order is cancelled', async () => {
    const { productId, orderId } = await seedPaidOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'CANCELLED' })

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(2)
  })

  it('does not restore stock twice on repeated terminal transitions', async () => {
    const { productId, orderId } = await seedPaidOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'CANCELLED' })
    // Повторная отмена и переход CANCELLED → REFUNDED не должны восстановить сток ещё раз.
    await repo.updateAdminOrder(orderId, { status: 'CANCELLED' })
    await repo.updateAdminOrder(orderId, { status: 'REFUNDED' })

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(2)
  })

  it('rejects reactivating a terminal order into a working status (no money desync)', async () => {
    const { productId, orderId } = await seedPaidOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'REFUNDED' })
    await expect(repo.updateAdminOrder(orderId, { status: 'PAID' })).rejects.toThrow()

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    expect(order.status).toBe('REFUNDED') // статус не изменился
    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(2) // сток не списан повторно
  })

  it('allows transitions between terminal statuses (CANCELLED ↔ REFUNDED)', async () => {
    const { orderId } = await seedPaidOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'CANCELLED' })
    await repo.updateAdminOrder(orderId, { status: 'REFUNDED' })

    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } })
    expect(order.status).toBe('REFUNDED')
  })

  it('does not restore stock for non-terminal status changes', async () => {
    const { productId, orderId } = await seedPaidOrder(0, 2)

    await repo.updateAdminOrder(orderId, { status: 'PROCESSING' })
    await repo.updateAdminOrder(orderId, { status: 'SHIPPED' })

    const after = await prisma.product.findUniqueOrThrow({ where: { id: productId } })
    expect(after.stock).toBe(0)
  })
})
