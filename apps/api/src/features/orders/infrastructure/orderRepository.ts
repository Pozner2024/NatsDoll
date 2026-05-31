import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../../shared/errors'
import type { OrderRepository, CartItemForCheckout, OrderDetail, OrderSummary, ShippingAddress, OrderItemView } from '../types'

export function makeOrderRepository(prisma: PrismaClient): OrderRepository {
  return {
    async getCartItemsForCheckout(userId: string): Promise<CartItemForCheckout[]> {
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
                  name: true,
                  images: true,
                  price: true,
                  stock: true,
                  isPublished: true,
                  deletedAt: true,
                },
              },
            },
          },
        },
      })
      if (!cart) return []
      return cart.items.map((item) => ({
        id: item.id,
        productId: item.product.id,
        productName: item.product.name,
        productImage: item.product.images[0] ?? null,
        productPrice: item.product.price.toNumber(),
        productStock: item.product.stock,
        productIsAvailable: item.product.isPublished && item.product.deletedAt === null,
        quantity: item.quantity,
        message: item.message,
      }))
    },

    async createOrderFromCart(
      userId: string,
      items: CartItemForCheckout[],
      totalAmount: number,
      shippingCost: number,
      shippingAddress: ShippingAddress,
    ): Promise<OrderDetail> {
      const cartItemIds = items.map((i) => i.id)

      const order = await prisma.$transaction(async (tx) => {
        // Атомарный CAS-decrement: WHERE stock>=quantity AND product доступен.
        // Условие в WHERE гарантирует, что параллельный checkout не уведёт stock в минус
        // и не пропустит уже снятый с публикации товар.
        for (const item of items) {
          const { count } = await tx.product.updateMany({
            where: {
              id: item.productId,
              isPublished: true,
              deletedAt: null,
              stock: { gte: item.quantity },
            },
            data: { stock: { decrement: item.quantity } },
          })
          if (count === 0) {
            throw new AppError(409, `"${item.productName}" is no longer available or out of stock`)
          }
        }

        const created = await tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingCost,
            shippingAddress: shippingAddress as object,
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.productPrice,
                message: item.message,
              })),
            },
          },
          select: {
            id: true,
            orderNumber: true,
            shippingCost: true,
            userId: true,
            status: true,
            totalAmount: true,
            shippingAddress: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                message: true,
                product: { select: { id: true, slug: true, name: true, images: true } },
              },
            },
          },
        })

        await tx.cartItem.deleteMany({ where: { id: { in: cartItemIds } } })

        return created
      })

      return toOrderDetail(order)
    },

    async getMyOrders(userId: string): Promise<OrderSummary[]> {
      const orders = await prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmount: true,
          createdAt: true,
          items: {
            take: 1,
            orderBy: { id: 'asc' },
            select: {
              product: { select: { images: true } },
            },
          },
          _count: { select: { items: true } },
        },
      })

      return orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount.toNumber(),
        itemCount: o._count.items,
        createdAt: o.createdAt.toISOString(),
        firstItemImage: o.items[0]?.product.images[0] ?? null,
      }))
    },

    async getOrderById(orderId: string): Promise<OrderDetail | null> {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          shippingCost: true,
          userId: true,
          status: true,
          totalAmount: true,
          shippingAddress: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              message: true,
              product: { select: { id: true, slug: true, name: true, images: true } },
            },
          },
        },
      })
      if (!order) return null
      return toOrderDetail(order)
    },
  }
}

type OrderRow = {
  id: string
  orderNumber: number
  shippingCost: { toNumber(): number }
  userId: string
  status: string
  totalAmount: { toNumber(): number }
  shippingAddress: unknown
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: { toNumber(): number }
    message: string | null
    product: { id: string; slug: string; name: string; images: string[] }
  }>
}

function toOrderDetail(order: OrderRow): OrderDetail {
  const items: OrderItemView[] = order.items.map((item) => {
    const price = item.price.toNumber()
    return {
      id: item.id,
      productId: item.product.id,
      productSlug: item.product.slug,
      productName: item.product.name,
      productImage: item.product.images[0] ?? null,
      quantity: item.quantity,
      price,
      subtotal: price * item.quantity,
      message: item.message,
    }
  })

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    status: order.status,
    totalAmount: order.totalAmount.toNumber(),
    shippingCost: order.shippingCost.toNumber(),
    shippingAddress: order.shippingAddress as ShippingAddress,
    createdAt: order.createdAt.toISOString(),
    items,
  }
}
