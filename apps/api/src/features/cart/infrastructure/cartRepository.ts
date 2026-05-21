import type { PrismaClient } from '@prisma/client'
import type { CartRepository, CartItemView, CartView, ProductSnapshot } from '../types'

export function makeCartRepository(prisma: PrismaClient): CartRepository {
  return {
    async getOrCreateCartId(userId: string): Promise<string> {
      const existing = await prisma.cart.findUnique({
        where: { userId },
        select: { id: true },
      })
      if (existing) return existing.id
      const created = await prisma.cart.create({
        data: { userId },
        select: { id: true },
      })
      return created.id
    },

    async findProductForCart(productId: string): Promise<ProductSnapshot | null> {
      const row = await prisma.product.findUnique({
        where: { id: productId },
        select: {
          id: true,
          price: true,
          stock: true,
          isPublished: true,
          deletedAt: true,
          messageOptions: true,
          category: { select: { hasMessage: true } },
        },
      })
      if (!row || !row.category) return null
      return {
        id: row.id,
        price: row.price.toNumber(),
        stock: row.stock,
        hasMessage: row.category.hasMessage,
        messageOptions: row.messageOptions,
        isAvailable: row.isPublished && row.deletedAt === null,
      }
    },

    async findCartItem(cartId, productId, message) {
      return prisma.cartItem.findFirst({
        where: { cartId, productId, message },
        select: { id: true, quantity: true },
      })
    },

    async findCartItemById(itemId) {
      return prisma.cartItem.findUnique({
        where: { id: itemId },
        select: { id: true, cartId: true, productId: true },
      })
    },

    async createCartItem(cartId, productId, quantity, message) {
      await prisma.cartItem.create({
        data: { cartId, productId, quantity, message },
      })
    },

    async updateCartItemQuantity(itemId, quantity) {
      await prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      })
    },

    async deleteCartItem(itemId) {
      await prisma.cartItem.delete({ where: { id: itemId } })
    },

    async getCartView(userId: string): Promise<CartView> {
      const cart = await prisma.cart.findUnique({
        where: { userId },
        select: {
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              quantity: true,
              message: true,
              product: {
                select: {
                  id: true,
                  slug: true,
                  name: true,
                  images: true,
                  price: true,
                },
              },
            },
          },
        },
      })
      if (!cart) return { items: [], totalAmount: 0, itemCount: 0 }

      const items: CartItemView[] = cart.items.map((row) => {
        const unitPrice = row.product.price.toNumber()
        return {
          id: row.id,
          productId: row.product.id,
          productSlug: row.product.slug,
          productName: row.product.name,
          productImage: row.product.images[0] ?? null,
          unitPrice,
          quantity: row.quantity,
          subtotal: unitPrice * row.quantity,
          message: row.message,
        }
      })

      const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0)
      const itemCount = items.reduce((sum, it) => sum + it.quantity, 0)

      return { items, totalAmount, itemCount }
    },
  }
}
