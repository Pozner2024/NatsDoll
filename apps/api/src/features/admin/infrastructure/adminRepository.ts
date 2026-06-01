import type { PrismaClient, Prisma } from '@prisma/client'
import type { AdminRepository, DashboardResponse, AdminProductListParams, AdminProductInput } from '../types'

const PAID_STATUSES: Array<'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED'> = [
  'PAID',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
]

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
  }
}
