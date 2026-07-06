import type { PrismaClient } from '@prisma/client'
import type { PaymentRepository, PaymentMode, OrderForPayment, OrderForWooPayment } from '../types'
import { AppError } from '../../../shared/errors'
import { isPaidStatus, isTerminalStatus } from '../../../shared/lib'

const SETTINGS_ID = 'default'

export function makePaymentRepository(prisma: PrismaClient): PaymentRepository {
  return {
    async getSettings() {
      const s = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } })
      if (!s) return null
      const isLive = s.mode === 'LIVE'
      return {
        enabled: s.enabled,
        mode: s.mode as PaymentMode,
        clientId: isLive ? s.liveClientId : s.sandboxClientId,
        secret: isLive ? s.liveSecret : s.sandboxSecret,
        webhookId: isLive ? s.liveWebhookId : s.sandboxWebhookId,
        externalPageEnabled: s.externalPageEnabled,
      }
    },

    async getAdminSettings() {
      const s = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } })
      if (!s) return null
      return {
        enabled: s.enabled,
        mode: s.mode as PaymentMode,
        sandboxClientId: s.sandboxClientId,
        sandboxSecret: s.sandboxSecret,
        sandboxWebhookId: s.sandboxWebhookId,
        liveClientId: s.liveClientId,
        liveSecret: s.liveSecret,
        liveWebhookId: s.liveWebhookId,
        externalPageEnabled: s.externalPageEnabled,
      }
    },

    async upsertSettings(data) {
      const { sandbox, live } = data
      const sandboxSecretUpdate = sandbox.secret === undefined ? {} : { sandboxSecret: sandbox.secret }
      const sandboxWebhookUpdate = sandbox.webhookId === undefined ? {} : { sandboxWebhookId: sandbox.webhookId }
      const liveSecretUpdate = live.secret === undefined ? {} : { liveSecret: live.secret }
      const liveWebhookUpdate = live.webhookId === undefined ? {} : { liveWebhookId: live.webhookId }
      await prisma.paymentSettings.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          enabled: data.enabled,
          mode: data.mode,
          sandboxClientId: sandbox.clientId,
          sandboxSecret: sandbox.secret ?? null,
          sandboxWebhookId: sandbox.webhookId ?? null,
          liveClientId: live.clientId,
          liveSecret: live.secret ?? null,
          liveWebhookId: live.webhookId ?? null,
          externalPageEnabled: data.externalPageEnabled,
        },
        update: {
          enabled: data.enabled,
          mode: data.mode,
          sandboxClientId: sandbox.clientId,
          ...sandboxSecretUpdate,
          ...sandboxWebhookUpdate,
          liveClientId: live.clientId,
          ...liveSecretUpdate,
          ...liveWebhookUpdate,
          externalPageEnabled: data.externalPageEnabled,
        },
      })
    },

    async getOrderForPayment(orderId: string): Promise<OrderForPayment | null> {
      const o = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, userId: true, orderNumber: true, status: true, totalAmount: true, paypalOrderId: true },
      })
      if (!o) return null
      return { ...o, totalAmount: o.totalAmount.toNumber() }
    },

    async getOrderForPaymentByNumber(orderNumber: number): Promise<OrderForPayment | null> {
      const o = await prisma.order.findUnique({
        where: { orderNumber },
        select: { id: true, userId: true, orderNumber: true, status: true, totalAmount: true, paypalOrderId: true },
      })
      if (!o) return null
      return { ...o, totalAmount: o.totalAmount.toNumber() }
    },

    async setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
      await prisma.order.update({ where: { id: orderId }, data: { paypalOrderId } })
    },

    async claimPaypalOrder(orderId: string, paypalOrderId: string): Promise<void> {
      await prisma.order.update({ where: { id: orderId }, data: { paypalOrderId, paymentClaimed: true } })
    },

    async getOrderForWooPayment(orderId: string): Promise<OrderForWooPayment | null> {
      const o = await prisma.order.findUnique({
        where: { id: orderId },
        select: {
          id: true, userId: true, orderNumber: true, status: true, totalAmount: true,
          shippingCost: true, wooOrderId: true, wooOrderKey: true, shippingAddress: true,
          user: { select: { email: true } },
          items: { select: { quantity: true, price: true, product: { select: { name: true } } } },
        },
      })
      if (!o) return null
      const address = o.shippingAddress as {
        fullName?: string
        line1?: string
        line2?: string
        city?: string
        country?: string
        postalCode?: string
      }
      return {
        id: o.id,
        userId: o.userId,
        orderNumber: o.orderNumber,
        status: o.status,
        totalAmount: o.totalAmount.toNumber(),
        shippingCost: o.shippingCost.toNumber(),
        wooOrderId: o.wooOrderId,
        wooOrderKey: o.wooOrderKey,
        customerName: address.fullName ?? '',
        customerEmail: o.user.email,
        billingAddress: {
          line1: address.line1 ?? '',
          line2: address.line2,
          city: address.city ?? '',
          country: address.country ?? '',
          postalCode: address.postalCode ?? '',
        },
        items: o.items.map((i) => ({
          name: i.product.name,
          quantity: i.quantity,
          subtotalUsd: i.price.mul(i.quantity).toNumber(),
        })),
      }
    },

    async setWooOrder(orderId: string, wooOrderId: number, wooOrderKey: string): Promise<boolean> {
      const { count } = await prisma.order.updateMany({
        where: { id: orderId, wooOrderId: null },
        data: { wooOrderId, wooOrderKey },
      })
      return count === 1
    },

    async getOrderByWooOrderId(wooOrderId: number): Promise<OrderForPayment | null> {
      const o = await prisma.order.findUnique({
        where: { wooOrderId },
        select: { id: true, userId: true, orderNumber: true, status: true, totalAmount: true, paypalOrderId: true },
      })
      if (!o) return null
      return { ...o, totalAmount: o.totalAmount.toNumber() }
    },

    async markOrderPaid(orderId: string, captureId: string | null): Promise<boolean> {
      return prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, adminNote: true, items: { select: { productId: true, quantity: true, product: { select: { name: true } } } } },
        })
        if (!order) throw new AppError(404, 'Order not found')
        if (isPaidStatus(order.status)) return true // идемпотентность: сток уже списан
        if (isTerminalStatus(order.status)) return false // CANCELLED/REFUNDED не воскрешаем в PAID

        const { count: claimed } = await tx.order.updateMany({
          where: { id: orderId, status: 'PENDING' },
          data: { status: 'PAID', paypalCaptureId: captureId },
        })
        if (claimed === 0) {
          const current = await tx.order.findUnique({ where: { id: orderId }, select: { status: true } })
          return current !== null && isPaidStatus(current.status)
        }

        const stockIssues: string[] = []
        for (const item of order.items) {
          const { count } = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (count === 0) stockIssues.push(item.product.name)
        }

        if (stockIssues.length > 0) {
          const warning = `⚠ Проверить остаток: ${stockIssues.join(', ')}`
          await tx.order.update({
            where: { id: orderId },
            data: { adminNote: order.adminNote ? `${order.adminNote}\n${warning}` : warning },
          })
        }
        return true
      })
    },
  }
}
