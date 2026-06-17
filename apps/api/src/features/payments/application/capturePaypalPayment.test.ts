import { describe, it, expect, vi } from 'vitest'
import { makeCapturePaypalPayment } from './capturePaypalPayment'

const order = { id: 'o1', userId: 'u1', orderNumber: 7, status: 'PENDING', totalAmount: 42.5, paypalOrderId: 'PP-1' }

function deps(captureResult: unknown) {
  return {
    repo: {
      getSettings: vi.fn().mockResolvedValue({ enabled: true, mode: 'SANDBOX', clientId: 'cid', secret: 'enc' }),
      getOrderForPayment: vi.fn().mockResolvedValue(order),
    },
    paypal: { captureOrder: vi.fn().mockResolvedValue(captureResult) },
    markOrderPaid: vi.fn().mockResolvedValue(undefined),
    decrypt: vi.fn().mockReturnValue('plain'),
  }
}

describe('capturePaypalPayment verification', () => {
  it('marks paid when amount/currency/invoice match', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    const uc = makeCapturePaypalPayment(d.repo as never, d.paypal as never, d.markOrderPaid as never, d.decrypt as never)
    await uc('u1', 'o1')
    expect(d.markOrderPaid).toHaveBeenCalledWith('o1', 'CAP-1')
  })

  it('rejects and does not mark paid when amount mismatches', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '1.00', currencyCode: 'USD', invoiceId: 'natsdoll-7' })
    const uc = makeCapturePaypalPayment(d.repo as never, d.paypal as never, d.markOrderPaid as never, d.decrypt as never)
    await expect(uc('u1', 'o1')).rejects.toThrow()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('rejects when invoice mismatches', async () => {
    const d = deps({ status: 'COMPLETED', captureId: 'CAP-1', amount: '42.50', currencyCode: 'USD', invoiceId: 'natsdoll-999' })
    const uc = makeCapturePaypalPayment(d.repo as never, d.paypal as never, d.markOrderPaid as never, d.decrypt as never)
    await expect(uc('u1', 'o1')).rejects.toThrow()
    expect(d.markOrderPaid).not.toHaveBeenCalled()
  })

  it('marks paid on idempotent ORDER_ALREADY_CAPTURED (amount null, verify skipped)', async () => {
    const d = deps({ status: 'COMPLETED', captureId: null, amount: null, currencyCode: null, invoiceId: null })
    const uc = makeCapturePaypalPayment(d.repo as never, d.paypal as never, d.markOrderPaid as never, d.decrypt as never)
    await uc('u1', 'o1')
    expect(d.markOrderPaid).toHaveBeenCalledWith('o1', null)
  })
})
