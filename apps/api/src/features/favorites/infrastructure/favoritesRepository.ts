import type { PrismaClient } from '@prisma/client'
import type { FavoritesRepository, FavoriteProduct } from '../types'

export function makeFavoritesRepository(prisma: PrismaClient): FavoritesRepository {
  return {
    async isProductAvailable(productId: string): Promise<boolean> {
      const row = await prisma.product.findFirst({
        where: { id: productId, deletedAt: null, isPublished: true },
        select: { id: true },
      })
      return row !== null
    },

    async upsertFavorite(userId: string, productId: string): Promise<void> {
      await prisma.favorite.upsert({
        where: { userId_productId: { userId, productId } },
        create: { userId, productId },
        update: {},
      })
    },

    async deleteFavorite(userId: string, productId: string): Promise<void> {
      await prisma.favorite.deleteMany({
        where: { userId, productId },
      })
    },

    async listFavoriteIds(userId: string): Promise<string[]> {
      const rows = await prisma.favorite.findMany({
        where: { userId },
        select: { productId: true },
      })
      return rows.map((r) => r.productId)
    },

    async listFavoriteProducts(userId: string): Promise<FavoriteProduct[]> {
      const rows = await prisma.favorite.findMany({
        where: {
          userId,
          product: { deletedAt: null, isPublished: true },
        },
        orderBy: { createdAt: 'desc' },
        select: {
          product: {
            select: {
              id: true,
              slug: true,
              name: true,
              price: true,
              images: true,
              stock: true,
            },
          },
        },
      })
      return rows.map((r) => ({
        id: r.product.id,
        slug: r.product.slug,
        name: r.product.name,
        price: r.product.price.toNumber(),
        image: r.product.images[0] ?? null,
        stock: r.product.stock,
      }))
    },
  }
}
