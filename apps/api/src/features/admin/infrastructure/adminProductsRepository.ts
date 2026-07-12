import type { PrismaClient, Prisma } from '@prisma/client'
import type { AdminRepository, AdminProductListParams, AdminProductInput } from '../types'

export function makeAdminProductsRepository(prisma: PrismaClient): Pick<
  AdminRepository,
  | 'listProducts' | 'createProduct' | 'updateProduct' | 'deleteProduct' | 'getAllProductImageUrls'
  | 'togglePublish' | 'moveProductCategory' | 'getProduct'
  | 'listCategoriesWithCount' | 'createCategory' | 'updateCategory' | 'deleteCategory'
> {
  return {
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

    async getAllProductImageUrls() {
      const products = await prisma.product.findMany({ select: { images: true } })
      return products.flatMap((p) => p.images)
    },

    async togglePublish(id: string) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id }, select: { isPublished: true } })
      await prisma.product.update({ where: { id }, data: { isPublished: !product.isPublished } })
      return { isPublished: !product.isPublished }
    },

    async moveProductCategory(id: string, categoryId: string) {
      await prisma.product.update({ where: { id }, data: { categoryId } })
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
  }
}
