import type { PrismaClient } from '@prisma/client'
import type { AdminRepository, ReplyInput, AdminContactMessageListParams, AdminContactMessageSummary } from '../types'
import { AppError } from '../../../shared/errors'

export function makeAdminMessagesRepository(prisma: PrismaClient): Pick<
  AdminRepository,
  'markAllMessagesRead' | 'listConversations' | 'getConversation' | 'replyToUser' | 'markConversationRead' | 'listAdminContactMessages'
> {
  return {
    async markAllMessagesRead(): Promise<void> {
      await prisma.message.updateMany({
        where: { isReadByAdmin: false },
        data: { isReadByAdmin: true },
      })
    },

    async listConversations() {
      const messages = await prisma.message.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          userId: true,
          text: true,
          createdAt: true,
          fromAdmin: true,
          isReadByAdmin: true,
          user: { select: { name: true, email: true } },
        },
      })

      const seen = new Map<string, typeof messages[0]>()
      const unreadCount = new Map<string, number>()

      for (const msg of messages) {
        if (!seen.has(msg.userId)) {
          seen.set(msg.userId, msg)
        }
        if (!msg.fromAdmin && !msg.isReadByAdmin) {
          unreadCount.set(msg.userId, (unreadCount.get(msg.userId) ?? 0) + 1)
        }
      }

      return Array.from(seen.values()).map((msg) => ({
        userId: msg.userId,
        userName: msg.user.name,
        userEmail: msg.user.email,
        lastMessageText: msg.text,
        lastMessageAt: msg.createdAt.toISOString(),
        unreadCount: unreadCount.get(msg.userId) ?? 0,
      }))
    },

    async getConversation(userId: string) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true },
      })
      if (!user) return null

      const [messages, orders] = await Promise.all([
        prisma.message.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            text: true,
            fromAdmin: true,
            orderId: true,
            createdAt: true,
            order: { select: { orderNumber: true } },
          },
        }),
        prisma.order.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, createdAt: true },
        }),
      ])

      return {
        userId,
        userName: user.name,
        userEmail: user.email,
        messages: messages.map((m) => ({
          id: m.id,
          text: m.text,
          fromAdmin: m.fromAdmin,
          orderId: m.orderId,
          orderNumber: m.order?.orderNumber ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
        userOrders: orders.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          createdAt: o.createdAt.toISOString(),
        })),
      }
    },

    async replyToUser(input: ReplyInput) {
      if (input.orderId) {
        const order = await prisma.order.findUnique({ where: { id: input.orderId } })
        if (!order || order.userId !== input.userId) {
          throw new AppError(404, 'Order not found')
        }
      }
      const user = await prisma.user.findUnique({
        where: { id: input.userId },
        select: { email: true, name: true },
      })
      if (!user) throw new AppError(404, 'User not found')
      await prisma.message.create({
        data: {
          userId: input.userId,
          text: input.text,
          orderId: input.orderId ?? null,
          fromAdmin: true,
          isReadByAdmin: true,
        },
      })
      return { userEmail: user.email, userName: user.name }
    },

    async markConversationRead(userId: string) {
      await prisma.message.updateMany({
        where: { userId, fromAdmin: false, isReadByAdmin: false },
        data: { isReadByAdmin: true },
      })
    },

    async listAdminContactMessages(params: AdminContactMessageListParams) {
      const { page, limit } = params
      const [rows, total] = await Promise.all([
        prisma.contactMessage.findMany({
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.contactMessage.count(),
      ])
      const items: AdminContactMessageSummary[] = rows.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
      }))
      return { items, total }
    },
  }
}
