import { describe, it, expect, vi } from 'vitest'
import { createHmac } from 'node:crypto'
import { makeHandleWooWebhook } from './handleWooWebhook'

const SECRET = 'whsec'
const order = { id: 'o1', userId: 'u1', orderNumber: 1042, status: 'PENDING', totalAmount: 29, paypalOrderId: null }

function sign(rawBody: string, secret = SECRET): string {
  return createHmac('sha256', secret).update(rawBody, 'utf8').digest('base64')
}

function makeDeps(overrides: Record<string, unknown> = {}) {
  const repo = {
    getOrderByWooOrderId: vi.fn().mockResolvedValue({ ...order }),
    markOrderPaid: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
  const emailService = { sendPaymentCaptureAlert: vi.fn().mockResolvedValue(undefined) }
  return { repo, emailService, uc: makeHandleWooWebhook(repo as never, emailService as never, SECRET) }
}

const paidEvent = JSON.stringify({ id: 7, status: 'processing', total: '29.00', currency: 'USD', transaction_id: 'TX1' })

describe('handleWooWebhook', () => {
  it('валидная подпись + processing + сумма сошлась → PAID', async () => {
    const { repo, uc } = makeDeps()
    const result = await uc(paidEvent, sign(paidEvent))
    expect(repo.getOrderByWooOrderId).toHaveBeenCalledWith(7)
    expect(repo.markOrderPaid).toHaveBeenCalledWith('o1', 'TX1')
    expect(result).toEqual({ handled: true })
  })

  it('статус completed тоже подтверждает оплату', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'completed', total: '29.00', currency: 'USD' })
    const result = await uc(body, sign(body))
    expect(repo.markOrderPaid).toHaveBeenCalledWith('o1', null)
    expect(result).toEqual({ handled: true })
  })

  it('нестандартный формат суммы («29.0») всё равно подтверждает оплату', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'processing', total: '29.0', currency: 'USD', transaction_id: 'TX1' })
    const result = await uc(body, sign(body))
    expect(repo.markOrderPaid).toHaveBeenCalledWith('o1', 'TX1')
    expect(result).toEqual({ handled: true })
  })

  it('невалидная подпись → 401, заказ не тронут', async () => {
    const { repo, uc } = makeDeps()
    await expect(uc(paidEvent, sign(paidEvent, 'wrong'))).rejects.toMatchObject({ statusCode: 401 })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('секрет не настроен → handled false без проверок', async () => {
    const repo = { getOrderByWooOrderId: vi.fn(), markOrderPaid: vi.fn() }
    const emailService = { sendPaymentCaptureAlert: vi.fn() }
    const uc = makeHandleWooWebhook(repo as never, emailService as never, undefined)
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
  })

  it('не-оплатный статус (pending) → handled false', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'pending', total: '29.00', currency: 'USD' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('неизвестный wooOrderId → handled false', async () => {
    const { uc } = makeDeps({ getOrderByWooOrderId: vi.fn().mockResolvedValue(null) })
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
  })

  it('сумма не сошлась → handled false, алерт, PAID не ставится', async () => {
    const { repo, emailService, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'processing', total: '0.01', currency: 'USD' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
    expect(emailService.sendPaymentCaptureAlert).toHaveBeenCalled()
  })

  it('валюта не USD → handled false', async () => {
    const { repo, uc } = makeDeps()
    const body = JSON.stringify({ id: 7, status: 'processing', total: '29.00', currency: 'EUR' })
    expect(await uc(body, sign(body))).toEqual({ handled: false })
    expect(repo.markOrderPaid).not.toHaveBeenCalled()
  })

  it('markOrderPaid=false (терминальный статус) → handled false + алерт', async () => {
    const { emailService, uc } = makeDeps({ markOrderPaid: vi.fn().mockResolvedValue(false) })
    expect(await uc(paidEvent, sign(paidEvent))).toEqual({ handled: false })
    expect(emailService.sendPaymentCaptureAlert).toHaveBeenCalled()
  })

  it('не-JSON body с валидной подписью → handled false', async () => {
    const { uc } = makeDeps()
    const body = 'webhook_id=5'
    expect(await uc(body, sign(body))).toEqual({ handled: false })
  })
})
