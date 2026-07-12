import type { PrismaClient } from '@prisma/client'
import type { AdminRepository, SaleInput, SaleRecord, ActiveSale, SaleScope } from '../types'

export function makeAdminSalesRepository(prisma: PrismaClient): Pick<
  AdminRepository,
  'createSale' | 'updateSale' | 'deleteSale' | 'listSales' | 'getActiveSale' | 'countProductsInSale'
> {
  return {
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
