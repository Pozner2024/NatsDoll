import { describe, it, expect, vi, beforeEach } from 'vitest'
import { makePaypalClient } from './paypalClient'
import type { PaypalCreds } from '../types'

const creds: PaypalCreds = { clientId: 'cid', secret: 'sec', mode: 'SANDBOX' }

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; body: unknown }>) {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.body,
      text: async () => JSON.stringify(r.body),
    })
  }
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => vi.unstubAllGlobals())

describe('paypalClient.createOrder', () => {
  it('gets token then creates order and returns id', async () => {
    const fetchFn = mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { id: 'PAYPAL-1' } },
    ])
    const client = makePaypalClient()
    const res = await client.createOrder({ creds, amountUsd: 42.5, invoiceId: 'natsdoll-7' })
    expect(res.paypalOrderId).toBe('PAYPAL-1')
    expect(String(fetchFn.mock.calls[0][0])).toContain('api-m.sandbox.paypal.com')
    const body = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(body.purchase_units[0].amount.value).toBe('42.50')
    expect(body.purchase_units[0].invoice_id).toBe('natsdoll-7')
  })
})

describe('paypalClient.captureOrder', () => {
  it('returns COMPLETED with captureId', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1' }] } }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
    expect(res.captureId).toBe('CAP-1')
  })

  it('reads invoice_id from the capture, not the purchase unit', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { status: 'COMPLETED', purchase_units: [{ payments: { captures: [{ id: 'CAP-1', amount: { currency_code: 'USD', value: '28.00' }, invoice_id: 'natsdoll-13' } ] } }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.invoiceId).toBe('natsdoll-13')
    expect(res.amount).toBe('28.00')
    expect(res.currencyCode).toBe('USD')
  })

  it('treats ORDER_ALREADY_CAPTURED as success', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: false, status: 422, body: { details: [{ issue: 'ORDER_ALREADY_CAPTURED' }] } },
    ])
    const client = makePaypalClient()
    const res = await client.captureOrder({ creds, paypalOrderId: 'PAYPAL-1' })
    expect(res.status).toBe('COMPLETED')
  })
})

describe('paypalClient.verifyWebhookSignature', () => {
  const headers = {
    transmissionId: 'tid',
    transmissionTime: '2026-06-27T00:00:00Z',
    certUrl: 'https://api.sandbox.paypal.com/cert',
    authAlgo: 'SHA256withRSA',
    transmissionSig: 'sig',
  }

  it('returns true when PayPal verification_status is SUCCESS', async () => {
    const fetchFn = mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { verification_status: 'SUCCESS' } },
    ])
    const client = makePaypalClient()
    const ok = await client.verifyWebhookSignature({ creds, webhookId: 'WH-1', headers, rawBody: '{"event_type":"CHECKOUT.ORDER.APPROVED"}' })
    expect(ok).toBe(true)
    const body = JSON.parse(fetchFn.mock.calls[1][1].body)
    expect(body.webhook_id).toBe('WH-1')
    expect(body.transmission_id).toBe('tid')
    expect(body.webhook_event.event_type).toBe('CHECKOUT.ORDER.APPROVED')
  })

  it('returns false when verification_status is not SUCCESS', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: true, body: { verification_status: 'FAILURE' } },
    ])
    const client = makePaypalClient()
    const ok = await client.verifyWebhookSignature({ creds, webhookId: 'WH-1', headers, rawBody: '{}' })
    expect(ok).toBe(false)
  })

  it('returns false when the verify request itself fails', async () => {
    mockFetchSequence([
      { ok: true, body: { access_token: 'tok' } },
      { ok: false, status: 400, body: { error: 'bad' } },
    ])
    const client = makePaypalClient()
    const ok = await client.verifyWebhookSignature({ creds, webhookId: 'WH-1', headers, rawBody: '{}' })
    expect(ok).toBe(false)
  })
})
