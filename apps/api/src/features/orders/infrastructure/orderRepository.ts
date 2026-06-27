import type { PrismaClient } from '@prisma/client'
import { AppError } from '../../../shared/errors'
import { saleApplies, applyDiscount } from '../../../shared/lib'
import type { OrderRepository, CartItemForCheckout, GuestOrderItem, OrderDetail, OrderSummary, ShippingAddress, OrderItemView } from '../types'
import type { ActiveSale } from '../../admin/types'

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
                  categoryId: true,
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
        categoryId: item.product.categoryId,
      }))
    },

    async createOrderFromCart(
      userId: string,
      items: CartItemForCheckout[],
      shippingCost: number,
      shippingAddress: ShippingAddress,
      sale: ActiveSale | null,
    ): Promise<OrderDetail> {
      const cartItemIds = items.map((i) => i.id)

      const order = await prisma.$transaction(async (tx) => {
        // Сток НЕ списывается при оформлении — заказ создаётся в статусе PENDING.
        // Реальное списание (CAS) происходит при оплате (markOrderPaid), когда заказ
        // переходит в PAID. Доступность/наличие на момент оформления проверяет createOrder
        // (application). См. инвариант «сток списан ⟺ заказ оплачен».

        // Цены перечитываются внутри транзакции (источник истины на момент оформления),
        // а активная распродажа приходит параметром из application-слоя (getActiveSale) —
        // тем же путём, что и для корзины, без дублирования запроса Sale здесь.
        const products = await tx.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: { id: true, price: true },
        })
        const priceById = new Map(products.map((p) => [p.id, p.price.toNumber()]))

        const orderItems = items.map((item) => {
          const originalPrice = priceById.get(item.productId)
          if (originalPrice === undefined) {
            throw new AppError(409, `"${item.productName}" is no longer available`)
          }
          let salePrice: number | undefined
          if (sale && saleApplies(sale, item.productId, item.categoryId)) {
            salePrice = applyDiscount(originalPrice, sale.discount)
          }
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: salePrice ?? originalPrice,
            originalPrice: salePrice !== undefined ? originalPrice : null,
            message: item.message,
          }
        })

        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const totalAmount = subtotal + shippingCost

        const created = await tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingCost,
            shippingAddress: shippingAddress as object,
            items: {
              create: orderItems,
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
            trackingNumber: true,
            createdAt: true,
            items: {
              select: {
                id: true,
                quantity: true,
                price: true,
                originalPrice: true,
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

    async createOrderFromItems(userId: string, items: GuestOrderItem[], shippingCost: number, shippingAddress: ShippingAddress, sale: ActiveSale | null): Promise<OrderDetail> {
      const order = await prisma.$transaction(async (tx) => {
        const products = await tx.product.findMany({
          where: { id: { in: items.map((i) => i.productId) } },
          select: { id: true, price: true },
        })
        const priceById = new Map(products.map((p) => [p.id, p.price.toNumber()]))

        const orderItems = items.map((item) => {
          const originalPrice = priceById.get(item.productId)
          if (originalPrice === undefined) {
            throw new AppError(409, `"${item.productName}" is no longer available`)
          }
          let salePrice: number | undefined
          if (sale && saleApplies(sale, item.productId, item.categoryId)) {
            salePrice = applyDiscount(originalPrice, sale.discount)
          }
          return {
            productId: item.productId,
            quantity: item.quantity,
            price: salePrice ?? originalPrice,
            originalPrice: salePrice !== undefined ? originalPrice : null,
            message: item.message,
          }
        })

        const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const totalAmount = subtotal + shippingCost

        return tx.order.create({
          data: {
            userId,
            totalAmount,
            shippingCost,
            shippingAddress: shippingAddress as object,
            items: { create: orderItems },
          },
          select: {
            id: true, orderNumber: true, shippingCost: true, userId: true, status: true,
            totalAmount: true, shippingAddress: true, trackingNumber: true, createdAt: true,
            items: {
              select: {
                id: true, quantity: true, price: true, originalPrice: true, message: true,
                product: { select: { id: true, slug: true, name: true, images: true } },
              },
            },
          },
        })
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
          trackingNumber: true,
          createdAt: true,
          items: {
            select: {
              id: true,
              quantity: true,
              price: true,
              originalPrice: true,
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
  trackingNumber: string | null
  createdAt: Date
  items: Array<{
    id: string
    quantity: number
    price: { toNumber(): number }
    originalPrice: { toNumber(): number } | null
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
      originalPrice: item.originalPrice?.toNumber() ?? null,
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
    trackingNumber: order.trackingNumber,
    createdAt: order.createdAt.toISOString(),
    items,
  }
}
