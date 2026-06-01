// apps/api/src/features/admin/infrastructure/adminRepository.ts
import type { PrismaClient } from '@prisma/client'
import type { AdminRepository, DashboardResponse } from '../types'

const PAID_STATUSES = ['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'] as const

export function makeAdminRepository(prisma: PrismaClient): AdminRepository {
  return {
    async getDashboardData(): Promise<DashboardResponse> {
      const now = new Date()

      const startOfToday = new Date(now)
      startOfToday.setUTCHours(0, 0, 0, 0)

      const startOfMonth = new Date(now)
      startOfMonth.setUTCDate(1)
      startOfMonth.setUTCHours(0, 0, 0, 0)

      const [
        ordersToday,
        revenueTodayResult,
        revenueMonthResult,
        newMessages,
        activeListings,
        recentOrdersRaw,
        recentMessagesRaw,
      ] = await prisma.$transaction([
        prisma.order.count({
          where: { createdAt: { gte: startOfToday } },
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            status: { in: PAID_STATUSES },
            createdAt: { gte: startOfToday },
          },
        }),
        prisma.order.aggregate({
          _sum: { totalAmount: true },
          where: {
            status: { in: PAID_STATUSES },
            createdAt: { gte: startOfMonth },
          },
        }),
        prisma.message.count({ where: { isReadByAdmin: false } }),
        prisma.product.count({ where: { isPublished: true, deletedAt: null } }),
        prisma.order.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            orderNumber: true,
            status: true,
            totalAmount: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        }),
        prisma.message.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            text: true,
            createdAt: true,
            isReadByAdmin: true,
            user: { select: { name: true } },
            order: { select: { orderNumber: true } },
          },
        }),
      ])

      return {
        stats: {
          ordersToday,
          revenueToday: Number(revenueTodayResult._sum.totalAmount ?? 0),
          revenueMonth: Number(revenueMonthResult._sum.totalAmount ?? 0),
          newMessages,
          activeListings,
        },
        recentOrders: recentOrdersRaw.map((o) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          totalAmount: Number(o.totalAmount),
          createdAt: o.createdAt.toISOString(),
          userName: o.user.name,
        })),
        recentMessages: recentMessagesRaw.map((m) => ({
          id: m.id,
          text: m.text,
          createdAt: m.createdAt.toISOString(),
          userName: m.user.name,
          orderNumber: m.order?.orderNumber ?? null,
          isReadByAdmin: m.isReadByAdmin,
        })),
      }
    },

    async markAllMessagesRead(): Promise<void> {
      await prisma.message.updateMany({
        where: { isReadByAdmin: false },
        data: { isReadByAdmin: true },
      })
    },
  }
}
