import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeHandlePaypalWebhook } from './handlePaypalWebhook'

const headers = {
  transmissionId: 'tid',
  transmissionTime: '2026-06-27T00:00:00Z',
  certUrl: 'https://api.sandbox.paypal.com/cert',
  authAlgo: 'SHA256withRSA',
  transmissionSig: 'sig',
}

function deps() {
  return {
    repo: {
      getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc', webhookId: 'WH-1' }),
      getOrderForPaymentByNumber: vi.fn().mockResolvedValue({ id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 42.5, paypalOrderId: 'PP-1' }),
      markOrderPaid: vi.fn().mockResolvedValue(true),
    },
    paypal: { verifyWebhookSignature: vi.fn().mockResolvedValue(true) },
    captureOrderCore: vi.fn().mockResolvedValue({ status: 'COMPLETED' }),
    decrypt: vi.fn().mockReturnValue('plain'),
    emailService: { sendPaymentCaptureAlert: vi.fn().mockResolvedValue(undefined) },
  }
}

function make(d: ReturnType<typeof deps>) {
  return makeHandlePaypalWebhook(d.repo as never, d.paypal as never, d.captureOrderCore, d.decrypt as never, d.emailService as never)
}

describe('handlePaypalWebhook', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })
  it('captures the order on CHECKOUT.ORDER.APPROVED', async () => {
    const d = deps()
    const body = JSON.stringify({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'PP-1', purchase_units: [{ invoice_id: 'natsdoll-7' }] } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(true)
    expect(d.captureOrderCore).toHaveBeenCalledWith('o1')
  })

  it('marks paid on PAYMENT.CAPTURE.COMPLETED when amount/currency/invoice match', async () => {
    const d = deps()
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7', amount: { value: '42.50', currency_code: 'USD' } } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(true)
    expect(d.repo.markOrderPaid).toHaveBeenCalledWith('o1', 'CAP-1')
  })

  it('does NOT mark paid on PAYMENT.CAPTURE.COMPLETED when the captured amount mismatches', async () => {
    const d = deps()
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7', amount: { value: '1.00', currency_code: 'USD' } } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(false)
    expect(d.repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('alerts admin by email when the captured amount mismatches (money taken, order left unpaid)', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@natsdoll.com')
    const d = deps()
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7', amount: { value: '1.00', currency_code: 'USD' } } })
    await make(d)(body, headers)
    expect(d.emailService.sendPaymentCaptureAlert).toHaveBeenCalledWith('admin@natsdoll.com', 7, 'CAP-1', expect.any(String))
  })

  it('alerts admin when the captured order went terminal and cannot be marked paid', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@natsdoll.com')
    const d = deps()
    d.repo.markOrderPaid.mockResolvedValue(false)
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7', amount: { value: '42.50', currency_code: 'USD' } } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(false)
    expect(d.emailService.sendPaymentCaptureAlert).toHaveBeenCalledWith('admin@natsdoll.com', 7, 'CAP-1', expect.any(String))
  })

  it('returns handled:false on a malformed JSON body without calling PayPal', async () => {
    const d = deps()
    const res = await make(d)('{not-json', headers)
    expect(res.handled).toBe(false)
    expect(d.paypal.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it('bails without calling PayPal when required signature headers are empty', async () => {
    const d = deps()
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7', amount: { value: '42.50', currency_code: 'USD' } } })
    const res = await make(d)(body, { ...headers, transmissionSig: '' })
    expect(res.handled).toBe(false)
    expect(d.paypal.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it('rejects and touches nothing when the signature is invalid', async () => {
    const d = deps()
    d.paypal.verifyWebhookSignature.mockResolvedValue(false)
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7' } })
    await expect(make(d)(body, headers)).rejects.toThrow()
    expect(d.captureOrderCore).not.toHaveBeenCalled()
    expect(d.repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('no-ops without verifying when webhook is not configured', async () => {
    const d = deps()
    d.repo.getSettings.mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc', webhookId: null })
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-7' } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(false)
    expect(d.paypal.verifyWebhookSignature).not.toHaveBeenCalled()
  })

  it('ignores an event for an unknown order', async () => {
    const d = deps()
    d.repo.getOrderForPaymentByNumber.mockResolvedValue(null)
    const body = JSON.stringify({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAP-1', invoice_id: 'natsdoll-999' } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(false)
    expect(d.repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('ignores unrelated event types', async () => {
    const d = deps()
    const body = JSON.stringify({ event_type: 'BILLING.SUBSCRIPTION.CREATED', resource: { id: 'x', invoice_id: 'natsdoll-7' } })
    const res = await make(d)(body, headers)
    expect(res.handled).toBe(false)
    expect(d.captureOrderCore).not.toHaveBeenCalled()
    expect(d.repo.markOrderPaid).not.toHaveBeenCalled()
  })
})
