import { AppError } from '../../../shared/errors'
import type { PaymentRepository, WooClient } from '../types'

export type CreateWooPayment = (userId: string, orderId: string) => Promise<{ payUrl: string }>

export function makeCreateWooPayment(
  repo: Pick<PaymentRepository, 'getSettings' | 'getOrderForWooPayment' | 'setWooOrder'>,
  woo: WooClient,
  frontendUrl: string,
): CreateWooPayment {
  return async (userId, orderId) => {
    const settings = await repo.getSettings()
    if (!settings?.enabled || !settings.externalPageEnabled) {
      throw new AppError(409, 'External payment is not available')
    }
    const order = await repo.getOrderForWooPayment(orderId)
    if (!order || order.userId !== userId) {
      throw new AppError(404, 'Order not found')
    }
    if (order.status !== 'PENDING') {
      throw new AppError(409, 'Order is not awaiting payment')
    }
    if (order.wooOrderId !== null && order.wooOrderKey !== null) {
      return { payUrl: woo.payUrl(order.wooOrderId, order.wooOrderKey) }
    }
    const created = await woo.createOrder({
      orderNumber: order.orderNumber,
      lineItems: order.items,
      shippingUsd: order.shippingCost,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      returnUrl: `${frontendUrl}/orders/${order.id}`,
    })
    const bound = await repo.setWooOrder(orderId, created.wooOrderId, created.wooOrderKey)
    if (bound) {
      return { payUrl: woo.payUrl(created.wooOrderId, created.wooOrderKey) }
    }
    const fresh = await repo.getOrderForWooPayment(orderId)
    if (fresh && fresh.wooOrderId !== null && fresh.wooOrderKey !== null) {
      return { payUrl: woo.payUrl(fresh.wooOrderId, fresh.wooOrderKey) }
    }
    throw new AppError(409, 'Order is not awaiting payment')
  }
}
