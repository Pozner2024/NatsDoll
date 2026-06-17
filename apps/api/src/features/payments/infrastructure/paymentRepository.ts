import type { PrismaClient } from '@prisma/client'
import type { PaymentRepository, PaymentMode, OrderForPayment } from '../types'

const SETTINGS_ID = 'default'

export function makePaymentRepository(prisma: PrismaClient): PaymentRepository {
  return {
    async getSettings() {
      const s = await prisma.paymentSettings.findUnique({ where: { id: SETTINGS_ID } })
      if (!s) return null
      return {
        enabled: s.enabled,
        mode: s.mode as PaymentMode,
        clientId: s.paypalClientId,
        secret: s.paypalSecret,
      }
    },

    async upsertSettings(data) {
      const secretUpdate = data.secret === undefined ? {} : { paypalSecret: data.secret }
      await prisma.paymentSettings.upsert({
        where: { id: SETTINGS_ID },
        create: {
          id: SETTINGS_ID,
          enabled: data.enabled,
          mode: data.mode,
          paypalClientId: data.clientId,
          paypalSecret: data.secret ?? null,
        },
        update: {
          enabled: data.enabled,
          mode: data.mode,
          paypalClientId: data.clientId,
          ...secretUpdate,
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

    async setPaypalOrderId(orderId: string, paypalOrderId: string): Promise<void> {
      await prisma.order.update({ where: { id: orderId }, data: { paypalOrderId } })
    },
  }
}
