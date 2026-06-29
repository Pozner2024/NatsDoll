import type { PrismaClient } from '@prisma/client'
import type { PaymentRepository, PaymentMode, OrderForPayment } from '../types'
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

    async markOrderPaid(orderId: string, captureId: string | null): Promise<void> {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { status: true, items: { select: { productId: true, quantity: true, product: { select: { name: true } } } } },
        })
        if (!order) throw new AppError(404, 'Order not found')
        if (isPaidStatus(order.status)) return // идемпотентность: сток уже списан
        if (isTerminalStatus(order.status)) return // CANCELLED/REFUNDED не воскрешаем в PAID

        const stockIssues: string[] = []
        for (const item of order.items) {
          const { count } = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          })
          if (count === 0) stockIssues.push(item.product.name)
        }

        await tx.order.update({
          where: { id: orderId },
          data: {
            status: 'PAID',
            paypalCaptureId: captureId,
            ...(stockIssues.length > 0
              ? { adminNote: `⚠ Проверить остаток: ${stockIssues.join(', ')}` }
              : {}),
          },
        })
      })
    },
  }
}
