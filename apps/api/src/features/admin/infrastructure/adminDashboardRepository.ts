import type { PrismaClient } from '@prisma/client'
import type { AdminRepository, DashboardResponse, AnalyticsPeriod, AnalyticsResponse } from '../types'
import { PAID_STATUSES } from '../../../shared/lib'

function bucketKey(period: AnalyticsPeriod, date: Date): string {
  if (period === 'today' || period === 'yesterday') {
    // YYYY-MM-DD HH:00
    return `${date.toISOString().slice(0, 10)} ${String(date.getUTCHours()).padStart(2, '0')}:00`
  }
  if (period === '365d') {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-01`
  }
  if (period === '90d') {
    const d = new Date(date)
    const day = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() - day + 1)
    return d.toISOString().slice(0, 10)
  }
  return date.toISOString().slice(0, 10)
}

function buildBuckets(
  period: AnalyticsPeriod,
  start: Date,
  end: Date,
): Record<string, { revenue: number; count: number }> {
  const buckets: Record<string, { revenue: number; count: number }> = {}
  const cur = new Date(start)

  if (period === 'today' || period === 'yesterday') {
    // 24 hourly buckets
    while (cur <= end) {
      buckets[bucketKey(period, cur)] = { revenue: 0, count: 0 }
      cur.setUTCHours(cur.getUTCHours() + 1)
    }
  } else if (period === '365d') {
    cur.setUTCDate(1)
    while (cur <= end) {
      buckets[bucketKey(period, cur)] = { revenue: 0, count: 0 }
      cur.setUTCMonth(cur.getUTCMonth() + 1)
    }
  } else if (period === '90d') {
    const day = cur.getUTCDay() || 7
    cur.setUTCDate(cur.getUTCDate() - day + 1)
    while (cur <= end) {
      buckets[bucketKey(period, cur)] = { revenue: 0, count: 0 }
      cur.setUTCDate(cur.getUTCDate() + 7)
    }
  } else {
    while (cur <= end) {
      buckets[bucketKey(period, cur)] = { revenue: 0, count: 0 }
      cur.setUTCDate(cur.getUTCDate() + 1)
    }
  }

  return buckets
}

export function makeAdminDashboardRepository(prisma: PrismaClient): Pick<AdminRepository, 'getDashboardData' | 'getAnalyticsData'> {
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
          revenueToday: Number(revenueTodayResult._sum?.totalAmount ?? 0),
          revenueMonth: Number(revenueMonthResult._sum?.totalAmount ?? 0),
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

    async getAnalyticsData(period: AnalyticsPeriod): Promise<AnalyticsResponse> {
      const now = new Date()

      let currentStart: Date
      let endOfPeriod: Date
      let endBucket: Date
      let prevStart: Date | null = null

      if (period === 'today') {
        currentStart = new Date(now)
        currentStart.setUTCHours(0, 0, 0, 0)
        endOfPeriod = now
        endBucket = new Date(now)
        endBucket.setUTCMinutes(0, 0, 0)  // current hour bucket (inclusive)
        prevStart = null
      } else if (period === 'yesterday') {
        const yesterday = new Date(now)
        yesterday.setUTCDate(yesterday.getUTCDate() - 1)
        currentStart = new Date(yesterday)
        currentStart.setUTCHours(0, 0, 0, 0)
        endBucket = new Date(yesterday)
        endBucket.setUTCHours(23, 0, 0, 0)
        endOfPeriod = new Date(now)
        endOfPeriod.setUTCHours(0, 0, 0, 0)  // start of today = end of yesterday
        prevStart = null
      } else {
        const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365
        endOfPeriod = new Date(now)
        endOfPeriod.setUTCHours(0, 0, 0, 0)
        endBucket = new Date(endOfPeriod)
        endBucket.setUTCDate(endBucket.getUTCDate() - 1)
        currentStart = new Date(endOfPeriod)
        currentStart.setUTCDate(currentStart.getUTCDate() - days)
        currentStart.setUTCHours(0, 0, 0, 0)
        prevStart = new Date(currentStart)
        prevStart.setUTCDate(prevStart.getUTCDate() - days)
      }

      const [currentOrders, prevOrders] = await Promise.all([
        prisma.order.findMany({
          where: { createdAt: { gte: currentStart, lt: endOfPeriod } },
          select: { createdAt: true, totalAmount: true, status: true },
          orderBy: { createdAt: 'asc' },
        }),
        prevStart
          ? prisma.order.findMany({
              where: { createdAt: { gte: prevStart, lt: currentStart } },
              select: { totalAmount: true, status: true },
            })
          : Promise.resolve([]),
      ])

      // Build zero-filled date buckets
      const buckets = buildBuckets(period, currentStart, endBucket)

      for (const order of currentOrders) {
        const key = bucketKey(period, order.createdAt)
        if (buckets[key]) {
          buckets[key].count += 1
          if (PAID_STATUSES.includes(order.status as typeof PAID_STATUSES[number])) {
            buckets[key].revenue += Number(order.totalAmount)
          }
        }
      }

      const revenue = Object.entries(buckets).map(([date, b]) => ({ date, amount: b.revenue }))
      const orders  = Object.entries(buckets).map(([date, b]) => ({ date, count: b.count }))

      const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0)
      const totalOrders  = orders.reduce((s, o) => s + o.count, 0)

      const prevRevenue = prevOrders
        .filter(o => PAID_STATUSES.includes(o.status as typeof PAID_STATUSES[number]))
        .reduce((s, o) => s + Number(o.totalAmount), 0)
      const prevOrderCount = prevOrders.length

      const revenueChange = prevStart === null || prevRevenue === 0 ? null : Number(((totalRevenue - prevRevenue) / prevRevenue * 100).toFixed(1))
      const ordersChange  = prevStart === null || prevOrderCount === 0 ? null : Number(((totalOrders - prevOrderCount) / prevOrderCount * 100).toFixed(1))

      return { revenue, orders, summary: { totalRevenue, totalOrders, revenueChange, ordersChange } }
    },
  }
}
