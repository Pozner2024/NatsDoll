import type { PrismaClient, Prisma } from '@prisma/client'
import type { AdminRepository, AdminOrderListParams, AdminOrderSummary, AdminOrderDetail, UpdateOrderInput } from '../types'
import type { ShippingAddress } from '../../orders/types'
import { AppError } from '../../../shared/errors'
import { PAID_STATUSES, isTerminalStatus } from '../../../shared/lib'

export function makeAdminOrdersRepository(prisma: PrismaClient): Pick<
  AdminRepository,
  'listAdminOrders' | 'getAdminOrder' | 'updateAdminOrder'
> {
  return {
    async listAdminOrders(params: AdminOrderListParams) {
      const { page, limit, status, search } = params
      const where: Prisma.OrderWhereInput = {
        ...(status ? { status: status as Prisma.EnumOrderStatusFilter } : {}),
        ...(search
          ? {
              OR: [
                ...(isNaN(Number(search)) ? [] : [{ orderNumber: { equals: Number(search) } }]),
                { user: { name: { contains: search, mode: 'insensitive' as const } } },
              ],
            }
          : {}),
      }
      const [rows, total] = await Promise.all([
        prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            _count: { select: { items: true } },
          },
        }),
        prisma.order.count({ where }),
      ])
      const items: AdminOrderSummary[] = rows.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: Number(o.totalAmount),
        userName: o.user.name,
        userEmail: o.user.email,
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
      }))
      return { items, total }
    },

    async getAdminOrder(orderId: string): Promise<AdminOrderDetail | null> {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          shippingCost: true,
          shippingAddress: true,
          trackingNumber: true,
          adminNote: true,
          paypalOrderId: true,
          createdAt: true,
          user: { select: { id: true, name: true, email: true } },
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              originalPrice: true,
              message: true,
              product: { select: { id: true, slug: true, name: true, images: true } },
            },
          },
        },
      })
      if (!order) return null
      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        totalAmount: Number(order.totalAmount),
        shippingCost: Number(order.shippingCost),
        shippingAddress: order.shippingAddress as ShippingAddress,
        trackingNumber: order.trackingNumber,
        adminNote: order.adminNote,
        paypalOrderId: order.paypalOrderId,
        createdAt: order.createdAt.toISOString(),
        userId: order.user.id,
        userName: order.user.name,
        userEmail: order.user.email,
        items: order.items.map((item) => ({
          id: item.id,
          productId: item.product.id,
          productSlug: item.product.slug,
          productName: item.product.name,
          productImage: item.product.images[0] ?? null,
          quantity: item.quantity,
          price: Number(item.price),
          originalPrice: item.originalPrice !== null ? Number(item.originalPrice) : null,
          subtotal: Number(item.price) * item.quantity,
          message: item.message,
        })),
      }
    },

    async updateAdminOrder(orderId: string, input: UpdateOrderInput) {
      const current = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          status: true,
          trackingNumber: true,
          orderNumber: true,
          user: { select: { name: true, email: true } },
          items: { select: { productId: true, quantity: true } },
        },
      })
      if (!current) throw new AppError(404, 'Order not found')

      const newStatus = input.status as 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED'

      await prisma.$transaction(async (tx) => {
        // Статус читаем ПОД row-lock внутри транзакции: конкурентный переход (ручной
        // PAID админом одновременно с markOrderPaid-capture) сериализуется, а решение о
        // движении стока принимается по актуальному статусу — без двойного списания.
        const locked = await tx.$queryRaw<{ status: string }[]>`SELECT status FROM "Order" WHERE id = ${orderId} FOR UPDATE`
        const currentStatus = locked[0]?.status ?? current.status

        // CANCELLED/REFUNDED — финал: вернуть заказ в рабочий статус нельзя (защита от
        // денежного рассинхрона, напр. REFUNDED→PAID). Переход между терминальными разрешён.
        if (isTerminalStatus(currentStatus) && newStatus !== currentStatus && !isTerminalStatus(newStatus)) {
          throw new AppError(409, 'Order is in a final state and cannot be reactivated')
        }

        // Инвариант: сток списан ⟺ заказ в «оплаченном» статусе (PAID_STATUSES).
        // Списание — при переходе в оплаченный статус (в т.ч. ручное PENDING→PAID),
        // возврат — при уходе из оплаченного. PENDING→CANCELLED склад не держал.
        const wasCharged = PAID_STATUSES.includes(currentStatus as typeof PAID_STATUSES[number])
        const willCharge = PAID_STATUSES.includes(newStatus as typeof PAID_STATUSES[number])
        const shouldRestoreStock = wasCharged && !willCharge
        const shouldReclaimStock = !wasCharged && willCharge

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: newStatus,
            ...(input.trackingNumber !== undefined ? { trackingNumber: input.trackingNumber } : {}),
            ...(input.adminNote !== undefined ? { adminNote: input.adminNote } : {}),
          },
        })

        if (shouldRestoreStock) {
          for (const item of current.items) {
            await tx.product.updateMany({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            })
          }
        }

        if (shouldReclaimStock) {
          for (const item of current.items) {
            const { count } = await tx.product.updateMany({
              where: { id: item.productId, stock: { gte: item.quantity } },
              data: { stock: { decrement: item.quantity } },
            })
            if (count === 0) {
              throw new AppError(409, 'Not enough stock for this order')
            }
          }
        }
      })

      const wasNull = current.trackingNumber === null
      const isNowSet = input.trackingNumber !== null && input.trackingNumber !== undefined && input.trackingNumber !== ''
      if (wasNull && isNowSet) {
        return {
          userEmail: current.user.email,
          userName: current.user.name,
          orderNumber: current.orderNumber,
          trackingNumber: input.trackingNumber as string,
        }
      }
      return null
    },
  }
}
