import type { PrismaClient, Prisma } from '@prisma/client'
import type { ProductListParams, ProductListItem, CategoryListItem, ProductRepository, ProductSortOrder, ProductDetail } from '../types'

const PRODUCT_SELECT = {
  id: true,
  slug: true,
  name: true,
  price: true,
  images: true,
  stock: true,
} as const

function orderByForSort(sort: ProductSortOrder): Prisma.ProductOrderByWithRelationInput {
  if (sort === 'price-asc') return { price: 'asc' }
  if (sort === 'price-desc') return { price: 'desc' }
  return { createdAt: 'desc' }
}

export function makeProductRepository(prisma: PrismaClient): ProductRepository {
  return {
    async findMany(params: ProductListParams) {
      const where: Prisma.ProductWhereInput = {
        isPublished: true,
        deletedAt: null,
        stock: { gt: 0 },
        ...(params.category ? { category: { slug: params.category } } : {}),
      }

      const [rows, total] = await Promise.all([
        prisma.product.findMany({
          where,
          orderBy: orderByForSort(params.sort),
          select: PRODUCT_SELECT,
          skip: (params.page - 1) * params.limit,
          take: params.limit,
        }),
        prisma.product.count({ where }),
      ])

      const items: ProductListItem[] = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        name: r.name,
        price: r.price.toNumber(),
        image: r.images[0] ?? null,
        stock: r.stock,
      }))

      return { items, total }
    },
    async listCategories(): Promise<CategoryListItem[]> {
      return prisma.category.findMany({
        orderBy: { position: 'asc' },
        select: { id: true, slug: true, name: true },
      })
    },
    async findBySlug(slug: string): Promise<ProductDetail | null> {
      const row = await prisma.product.findFirst({
        where: { slug, isPublished: true, deletedAt: null },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          price: true,
          images: true,
          stock: true,
          messageOptions: true,
          category: { select: { name: true, slug: true } },
        },
      })
      if (!row) return null
      if (!row.category) {
        console.warn('Product has no category', { id: row.id, slug: row.slug })
        return null
      }
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        description: row.description,
        price: row.price.toNumber(),
        images: row.images,
        stock: row.stock,
        category: row.category.name,
        categorySlug: row.category.slug,
        messageOptions: row.messageOptions,
      }
    },
  }
}
