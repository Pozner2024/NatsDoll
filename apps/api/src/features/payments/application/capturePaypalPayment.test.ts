import { describe, it, expect, vi, afterEach } from 'vitest'
import { makeCaptureOrderCore, makeCapturePaypalPayment } from './capturePaypalPayment'

const order = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 42.5, paypalOrderId: 'PP-1' }

function deps(captureResult: unknown) {
  return {
    repo: {
      getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc', webhookId: null }),
      getOrderForPayment: vi.fn().mockResolvedValue(order),
    },
    paypal: { captureOrder: vi.fn().mockResolvedValue(captureResult) },
    markOrderPaid: vi.fn().mockResolvedValue(undefined),
    decrypt: vi.fn().mockReturnValue('plain'),
    emailService: { sendPaymentCaptureAlert: vi.fn().mockResolvedValue(undefined) },
  }
}

function core(d: ReturnType<typeof deps>) {
  return makeCaptureOrderCore(d.repo as never, d.paypal as never, d.markOrderPaid as never, d.decrypt as never, d.emailService as never)
}

describe('captureOrderCore verification', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('marks paid when amount/currency/invoice match', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    await core(d)('o1')
    expect(d.markOrderPaid).toHaveBeenCalledWith('o1', 'CAP-1')
  })

  it('rejects and does not mark paid when amount mismatches', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '1.00', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    await expect(core(d)('o1')).rejects.toThrow()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('rejects when invoice mismatches', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-999' })
    await expect(core(d)('o1')).rejects.toThrow()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('marks paid on idempotent ORDER_ALREADY_CAPTURED (amount null, verify skipped)', async () => {
    const d = deps({ status: 'COMPLETED', captureId: null, amount: null, currencyCode: null, invoiceId: null })
    await core(d)('o1')
    expect(d.markOrderPaid).toHaveBeenCalledWith('o1', null)
  })

  it('returns COMPLETED without re-capturing an already paid order (idempotent)', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    d.repo.getOrderForPayment.mockResolvedValue({ ...order, status: 'PAID' })
    const res = await core(d)('o1')
    expect(res.status).toBe('COMPLETED')
    expect(d.paypal.captureOrder).not.toHaveBeenCalled()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('alerts admin and rethrows when markOrderPaid fails after a successful capture', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@natsdoll.com')
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-9', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    d.markOrderPaid.mockRejectedValue(new Error('db down'))
    await expect(core(d)('o1')).rejects.toThrow('db down')
    expect(d.emailService.sendPaymentCaptureAlert).toHaveBeenCalledWith('admin@natsdoll.com', 7, 'CAP-9', 'db down')
  })

  it('rejects a terminal (cancelled/refunded) order without taking money', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    d.repo.getOrderForPayment.mockResolvedValue({ ...order, status: 'CANCELLED' })
    await expect(core(d)('o1')).rejects.toThrow()
    expect(d.paypal.captureOrder).not.toHaveBeenCalled()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('alerts admin when verification fails after money was already captured', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@natsdoll.com')
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-2', amount: '1.00', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    await expect(core(d)('o1')).rejects.toThrow('Payment verification failed')
    expect(d.markOrderPaid).not.toHaveBeenCalled()
    expect(d.emailService.sendPaymentCaptureAlert).toHaveBeenCalledWith('admin@natsdoll.com', 7, 'CAP-2', 'Payment verification failed')
  })
})

describe('capturePaypalPayment ownership wrapper', () => {
  it('delegates to core when the order belongs to the user', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue(order) }
    const captureCore = vi.fn().mockResolvedValue({ status: 'COMPLETED' })
    const uc = makeCapturePaypalPayment(repo as never, captureCore)
    await uc('u1', 'o1')
    expect(captureCore).toHaveBeenCalledWith('o1')
  })

  it('rejects with 404 and never calls core for a foreign order', async () => {
    const repo = { getOrderForPayment: vi.fn().mockResolvedValue(order) }
    const captureCore = vi.fn().mockResolvedValue({ status: 'COMPLETED' })
    const uc = makeCapturePaypalPayment(repo as never, captureCore)
    await expect(uc('someone-else', 'o1')).rejects.toThrow()
    expect(captureCore).not.toHaveBeenCalled()
  })
})
