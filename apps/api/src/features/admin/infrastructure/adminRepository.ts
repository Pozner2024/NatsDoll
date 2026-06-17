import type { PrismaClient, Prisma } from '@prisma/client'
import type { AdminRepository, DashboardResponse, AdminProductListParams, AdminProductInput, ReplyInput, AdminOrderListParams, AdminOrderSummary, AdminOrderDetail, UpdateOrderInput, AnalyticsPeriod, AnalyticsResponse, SaleInput, SaleRecord, ActiveSale, SaleScope } from '../types'
import type { ShippingAddress } from '../../orders/types'
import { AppError } from '../../../shared/errors'

const PAID_STATUSES: Array<'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'> = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]

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
      await prisma.message.create({
        data: {
          userId: input.userId,
          text: input.text,
          orderId: input.orderId ?? null,
          fromAdmin: true,
          isReadByAdmin: true,
        },
      })
    },

    async markConversationRead(userId: string) {
      await prisma.message.updateMany({
        where: { userId, fromAdmin: false, isReadByAdmin: false },
        data: { isReadByAdmin: true },
      })
    },

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

      // Инвариант: сток списан ⟺ заказ в «оплаченном» статусе (PAID_STATUSES).
      // Списание происходит при переходе в оплаченный статус (в т.ч. ручное PENDING→PAID,
      // и реактивация из CANCELLED/REFUNDED), возврат — при уходе из оплаченного.
      // PENDING→CANCELLED ничего не меняет: неоплаченный заказ склад не держал.
      const wasCharged = PAID_STATUSES.includes(current.status as typeof PAID_STATUSES[number])
      const willCharge = PAID_STATUSES.includes(newStatus as typeof PAID_STATUSES[number])
      const shouldRestoreStock = wasCharged && !willCharge
      const shouldReclaimStock = !wasCharged && willCharge

      await prisma.$transaction(async (tx) => {
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

    async listProducts(params: AdminProductListParams) {
      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(params.search ? { name: { contains: params.search, mode: 'insensitive' } } : {}),
        ...(params.categoryId ? { categoryId: params.categoryId } : {}),
        ...(params.status === 'published' ? { isPublished: true } : {}),
        ...(params.status === 'draft' ? { isPublished: false } : {}),
      }
      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (params.page - 1) * params.limit,
          take: params.limit,
          select: {
            id: true,
            name: true,
            slug: true,
            price: true,
            stock: true,
            isPublished: true,
            images: true,
            category: { select: { name: true, id: true } },
          },
        }),
        prisma.product.count({ where }),
      ])
      return {
        items: rows.map((r) => ({
          id: r.id,
          name: r.name,
          slug: r.slug,
          price: r.price.toNumber(),
          stock: r.stock,
          isPublished: r.isPublished,
          image: r.images[0] ?? null,
          category: r.category.name,
          categoryId: r.category.id,
        })),
        total,
      }
    },

    async createProduct(input: AdminProductInput) {
      const product = await prisma.product.create({
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          stock: input.stock,
          categoryId: input.categoryId,
          images: input.images,
          messageOptions: input.messageOptions,
          isPublished: input.isPublished,
        },
        select: { id: true },
      })
      return { id: product.id }
    },

    async updateProduct(id: string, input: AdminProductInput) {
      await prisma.product.update({
        where: { id },
        data: {
          name: input.name,
          slug: input.slug,
          description: input.description,
          price: input.price,
          stock: input.stock,
          categoryId: input.categoryId,
          images: input.images,
          messageOptions: input.messageOptions,
          isPublished: input.isPublished,
        },
      })
    },

    async deleteProduct(id: string) {
      await prisma.product.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
    },

    async togglePublish(id: string) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id }, select: { isPublished: true } })
      await prisma.product.update({ where: { id }, data: { isPublished: !product.isPublished } })
      return { isPublished: !product.isPublished }
    },

    async listCategoriesWithCount() {
      const rows = await prisma.category.findMany({
        orderBy: { position: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          _count: { select: { products: { where: { deletedAt: null } } } },
        },
      })
      return rows.map((r) => ({
        id: r.id,
        name: r.name,
        slug: r.slug,
        productCount: r._count.products,
      }))
    },

    async createCategory(name: string, slug: string) {
      const last = await prisma.category.findFirst({ orderBy: { position: 'desc' }, select: { position: true } })
      const position = (last?.position ?? 0) + 1
      const cat = await prisma.category.create({ data: { name, slug, position }, select: { id: true } })
      return { id: cat.id }
    },

    async updateCategory(id: string, name: string, slug: string) {
      await prisma.category.update({ where: { id }, data: { name, slug } })
    },

    async deleteCategory(id: string) {
      await prisma.category.delete({ where: { id } })
    },

    async getProduct(id: string) {
      const row = await prisma.product.findFirst({
        where: { id, deletedAt: null },
        select: {
          id: true, name: true, slug: true, description: true,
          price: true, stock: true, categoryId: true,
          images: true, messageOptions: true, isPublished: true,
        },
      })
      if (!row) return null
      return { ...row, price: row.price.toNumber() }
    },

    async createSale(input: SaleInput): Promise<{ id: string }> {
      const sale = await prisma.sale.create({
        data: {
          name: input.name,
          discount: input.discount,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          scope: input.scope,
          categoryIds: input.categoryIds,
          productIds: input.productIds,
        },
        select: { id: true },
      })
      return { id: sale.id }
    },

    async updateSale(id: string, input: SaleInput): Promise<void> {
      await prisma.sale.update({
        where: { id },
        data: {
          name: input.name,
          discount: input.discount,
          startsAt: new Date(input.startsAt),
          endsAt: new Date(input.endsAt),
          scope: input.scope,
          categoryIds: input.categoryIds,
          productIds: input.productIds,
        },
      })
    },

    async deleteSale(id: string): Promise<void> {
      await prisma.sale.delete({ where: { id } })
    },

    async listSales(): Promise<SaleRecord[]> {
      const rows = await prisma.sale.findMany({ orderBy: { startsAt: 'desc' } })
      return rows.map((s: { id: string; name: string; discount: number; startsAt: Date; endsAt: Date; scope: string; categoryIds: string[]; productIds: string[]; createdAt: Date }) => ({
        id: s.id,
        name: s.name,
        discount: s.discount,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        scope: s.scope as SaleScope,
        categoryIds: s.categoryIds,
        productIds: s.productIds,
        createdAt: s.createdAt.toISOString(),
      }))
    },

    async getActiveSale(): Promise<ActiveSale | null> {
      const now = new Date()
      const sale = await prisma.sale.findFirst({
        where: { startsAt: { lte: now }, endsAt: { gte: now } },
        orderBy: [{ discount: 'desc' }, { createdAt: 'desc' }],
      })
      if (!sale) return null
      return {
        discount: sale.discount,
        scope: sale.scope as SaleScope,
        categoryIds: sale.categoryIds,
        productIds: sale.productIds,
      }
    },

    async countProductsInSale(input: Pick<SaleInput, 'scope' | 'categoryIds' | 'productIds'>): Promise<number> {
      if (input.scope === 'ALL') {
        return prisma.product.count({ where: { isPublished: true, deletedAt: null } })
      }
      if (input.scope === 'CATEGORIES') {
        return prisma.product.count({ where: { isPublished: true, deletedAt: null, categoryId: { in: input.categoryIds } } })
      }
      return prisma.product.count({ where: { isPublished: true, deletedAt: null, id: { in: input.productIds } } })
    },
  }
}
