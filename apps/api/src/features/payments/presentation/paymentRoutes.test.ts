import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makePaymentRouter } from './paymentRoutes'

function makeApp(
  config = vi.fn().mockResolvedValue({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false }),
  create = vi.fn(),
  capture = vi.fn(),
  claim = vi.fn(),
) {
  const app = new Hono()
  app.route('/payments', makePaymentRouter(config as never, create as never, capture as never, claim as never))
  return { app, config, create, capture, claim }
}

describe('payment routes — публичность и auth-гейт', () => {
  it('GET /payments/config — публичный (без auth), отдаёт конфиг', async () => {
    const config = vi.fn().mockResolvedValue({ enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: true })
    const { app } = makeApp(config)
    const res = await app.request('/payments/config')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: true })
  })

  it('POST /paypal/create-order без auth → 401, use-case не вызван', async () => {
    const { app, create } = makeApp()
    const res = await app.request('/payments/paypal/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1' }),
    })
    expect(res.status).toBe(401)
    expect(create).not.toHaveBeenCalled()
  })

  it('POST /paypal/capture без auth → 401', async () => {
    const { app, capture } = makeApp()
    const res = await app.request('/payments/paypal/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1' }),
    })
    expect(res.status).toBe(401)
    expect(capture).not.toHaveBeenCalled()
  })

  it('POST /paypal/claim без auth → 401', async () => {
    const { app, claim } = makeApp()
    const res = await app.request('/payments/paypal/claim', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: 'o1', paypalOrderId: 'pp1' }),
    })
    expect(res.status).toBe(401)
    expect(claim).not.toHaveBeenCalled()
  })
})
