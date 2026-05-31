import type { PrismaClient } from '@prisma/client'
import type { ReviewRepository, ReviewView, ReviewableItem } from '../types'

export function makeReviewRepository(prisma: PrismaClient): ReviewRepository {
  return {
    async findMyReviews(userId) {
      const rows = await prisma.review.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          product: { select: { name: true, images: true } },
        },
      })
      return rows.map((r): ReviewView => ({
        id: r.id,
        productId: r.productId,
        productName: r.product.name,
        productImage: r.product.images[0] ?? null,
        orderId: r.orderId,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      }))
    },

    async findReviewableItems(userId) {
      const orders = await prisma.order.findMany({
        where: { userId, status: 'DELIVERED' },
        include: {
          items: {
            include: {
              product: { select: { id: true, name: true, images: true } },
            },
          },
        },
      })

      const reviewed = await prisma.review.findMany({
        where: { userId },
        select: { productId: true },
      })
      const reviewedIds = new Set(reviewed.map(r => r.productId))

      const items: ReviewableItem[] = []
      for (const order of orders) {
        for (const item of order.items) {
          if (!reviewedIds.has(item.productId)) {
            items.push({
              productId: item.productId,
              productName: item.product.name,
              productImage: item.product.images[0] ?? null,
              orderId: order.id,
            })
          }
        }
      }
      return items
    },

    async create(userId, data) {
      const row = await prisma.review.create({
        data: {
          userId,
          productId: data.productId,
          orderId: data.orderId,
          rating: data.rating,
          comment: data.comment ?? null,
        },
        include: {
          product: { select: { name: true, images: true } },
        },
      })
      return {
        id: row.id,
        productId: row.productId,
        productName: row.product.name,
        productImage: row.product.images[0] ?? null,
        orderId: row.orderId,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.createdAt.toISOString(),
      }
    },
  }
}
