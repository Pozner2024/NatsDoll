import type { PrismaClient } from '@prisma/client'
import type { ProductListParams, ProductListItem, CategoryListItem, ProductRepository } from '../types'

export function makeProductRepository(prisma: PrismaClient): ProductRepository {
  return {
    async findMany(_params: ProductListParams) {
      return { items: [] as ProductListItem[], total: 0 }
    },
    async listCategories(): Promise<CategoryListItem[]> {
      return prisma.category.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, slug: true, name: true },
      })
    },
  }
}
