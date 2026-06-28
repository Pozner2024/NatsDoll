import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import { requireAuth, createRateLimiter } from '../../../shared/middleware'
import type { GetPaymentConfig } from '../application/getPaymentConfig'
import type { CreatePaypalOrder } from '../application/createPaypalOrder'
import type { CapturePaypalPayment } from '../application/capturePaypalPayment'
import type { ClaimPaypalPayment } from '../application/claimPaypalPayment'
import type { HandlePaypalWebhook } from '../application/handlePaypalWebhook'

const orderIdSchema = z.object({ orderId: z.string().min(1) })
const claimSchema = z.object({ orderId: z.string().min(1), paypalOrderId: z.string().min(1) })

const paymentLimiter = createRateLimiter({ max: 20, windowMs: 60_000 })
// Публичный эндпоинт зовёт PayPal: лимит щедрый (под легитимную частоту доставок),
// но не бесконечный — чтобы спам с мусорными заголовками не жёг наши OAuth/verify-запросы.
const webhookLimiter = createRateLimiter({ max: 60, windowMs: 60_000 })

export function makePaymentRouter(
  getPaymentConfig: GetPaymentConfig,
  createPaypalOrder: CreatePaypalOrder,
  capturePaypalPayment: CapturePaypalPayment,
  claimPaypalPayment: ClaimPaypalPayment,
  handlePaypalWebhook: HandlePaypalWebhook,
) {
  const router = new Hono()

  router.get('/config', async (c) => c.json(await getPaymentConfig()))

  // PayPal зовёт этот эндпоинт сам: без requireAuth, защита — проверка подписи внутри
  // handlePaypalWebhook. Rate-limit ограничивает усиление через мусорные вызовы. Нужен сырой body.
  router.post('/paypal/webhook', webhookLimiter.middleware, async (c) => {
    const rawBody = await c.req.text()
    const result = await handlePaypalWebhook(rawBody, {
      transmissionId: c.req.header('paypal-transmission-id') ?? '',
      transmissionTime: c.req.header('paypal-transmission-time') ?? '',
      certUrl: c.req.header('paypal-cert-url') ?? '',
      authAlgo: c.req.header('paypal-auth-algo') ?? '',
      transmissionSig: c.req.header('paypal-transmission-sig') ?? '',
    })
    return c.json(result)
  })

  router.post('/paypal/create-order', paymentLimiter.middleware, requireAuth, zValidator('json', orderIdSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId } = c.req.valid('json')
    return c.json(await createPaypalOrder(userId, orderId))
  })

  router.post('/paypal/capture', paymentLimiter.middleware, requireAuth, zValidator('json', orderIdSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId } = c.req.valid('json')
    return c.json(await capturePaypalPayment(userId, orderId))
  })

  router.post('/paypal/claim', paymentLimiter.middleware, requireAuth, zValidator('json', claimSchema), async (c) => {
    const { userId } = c.get('auth')
    const { orderId, paypalOrderId } = c.req.valid('json')
    await claimPaypalPayment(userId, orderId, paypalOrderId)
    return c.json({ ok: true })
  })

  return router
}
