import type { PrismaClient, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'

export function createCategory(prisma: PrismaClient, overrides: Partial<Prisma.CategoryCreateInput> = {}) {
  return prisma.category.create({
    data: { name: 'Cat', slug: `cat-${randomUUID()}`, ...overrides },
  })
}

export function createProduct(
  prisma: PrismaClient,
  categoryId: string,
  overrides: Partial<Prisma.ProductUncheckedCreateInput> = {},
) {
  return prisma.product.create({
    data: {
      name: 'Doll',
      slug: `doll-${randomUUID()}`,
      description: 'handmade',
      price: 10,
      stock: 1,
      isPublished: true,
      categoryId,
      ...overrides,
    },
  })
}

export function createUser(prisma: PrismaClient, overrides: Partial<Prisma.UserCreateInput> = {}) {
  return prisma.user.create({
    data: {
      email: `u-${randomUUID()}@test.local`,
      name: 'Test User',
      emailVerified: true,
      ...overrides,
    },
  })
}

// Создаёт корзину пользователя с одной позицией. Возвращает id корзины.
export async function createCartWithItem(
  prisma: PrismaClient,
  userId: string,
  productId: string,
  quantity: number,
  message: string | null = null,
): Promise<string> {
  const cart = await prisma.cart.create({ data: { userId } })
  await prisma.cartItem.create({ data: { cartId: cart.id, productId, quantity, message } })
  return cart.id
}
