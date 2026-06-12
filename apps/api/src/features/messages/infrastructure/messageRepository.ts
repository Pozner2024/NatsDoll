import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../../shared/errors'
import type { MessageRepository, MessageView } from '../types'

export function makeMessageRepository(prisma: PrismaClient): MessageRepository {
  return {
    async findByUser(userId) {
      const rows = await prisma.message.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        include: {
          order: { select: { orderNumber: true } },
        },
      })
      return rows.map((r): MessageView => ({
        id: r.id,
        text: r.text,
        orderId: r.orderId,
        orderNumber: r.order?.orderNumber ?? null,
        fromAdmin: r.fromAdmin,
        createdAt: r.createdAt.toISOString(),
      }))
    },

    async create(userId, data) {
      if (data.orderId) {
        const order = await prisma.order.findUnique({ where: { id: data.orderId } })
        if (!order || order.userId !== userId) throw new AppError(404, 'Order not found')
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
      if (!user) throw new AppError(404, 'User not found')

      const row = await prisma.message.create({
        data: { userId, orderId: data.orderId ?? null, text: data.text },
        include: { order: { select: { orderNumber: true } } },
      })

      const message: MessageView = {
        id: row.id,
        text: row.text,
        orderId: row.orderId,
        orderNumber: row.order?.orderNumber ?? null,
        fromAdmin: row.fromAdmin,
        createdAt: row.createdAt.toISOString(),
      }

      return { message, userName: user.name, userEmail: user.email }
    },
  }
}
