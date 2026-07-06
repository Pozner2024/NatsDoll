import { describe, it, expect, vi } from 'vitest'
import { makeCreateWooPayment } from './createWooPayment'

const settings = { enabled: true, mode: 'SANDBOX', clientId: null, secret: null, webhookId: null, externalPageEnabled: true }
const order = {
  id: 'o1', userId: 'u1', orderNumber: 1042, status: 'PENDING', totalAmount: 29, shippingCost: 5,
  wooOrderId: null, wooOrderKey: null, customerName: 'Jane Doe', customerEmail: 'jane@example.com',
  billingAddress: { line1: '123 Main St', city: 'New York', country: 'US', postalCode: '10001' },
  items: [{ name: 'Fox', quantity: 2, subtotalUsd: 24 }],
}

function makeDeps(repoOverrides: Record<string, unknown> = {}, wooOverrides: Record<string, unknown> = {}) {
  const repo = {
    getSettings: vi.fn().mockResolvedValue({ ...settings }),
    getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order }),
    setWooOrder: vi.fn().mockResolvedValue(true),
    ...repoOverrides,
  }
  const woo = {
    createOrder: vi.fn().mockResolvedValue({ wooOrderId: 7, wooOrderKey: 'wc_key' }),
    payUrl: vi.fn((id: number, key: string) => `https://pay.example.com/checkout/order-pay/${id}/?pay_for_order=true&key=${key}`),
    ...wooOverrides,
  }
  return { repo, woo, uc: makeCreateWooPayment(repo as never, woo as never, 'https://natsdoll.com') }
}

describe('createWooPayment', () => {
  it('создаёт Woo-заказ, привязывает его и возвращает pay-ссылку', async () => {
    const { repo, woo, uc } = makeDeps()
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).toHaveBeenCalledWith({
      orderNumber: 1042,
      lineItems: order.items,
      shippingUsd: 5,
      customerName: 'Jane Doe',
      customerEmail: 'jane@example.com',
      billingAddress: { line1: '123 Main St', city: 'New York', country: 'US', postalCode: '10001' },
      returnUrl: 'https://natsdoll.com/orders/o1',
    })
    expect(repo.setWooOrder).toHaveBeenCalledWith('o1', 7, 'wc_key')
    expect(result.payUrl).toContain('/checkout/order-pay/7/')
  })

  it('повторный вызов возвращает существующую ссылку без создания дубликата', async () => {
    const { woo, uc } = makeDeps({ getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order, wooOrderId: 7, wooOrderKey: 'wc_key' }) })
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).not.toHaveBeenCalled()
    expect(result.payUrl).toContain('/checkout/order-pay/7/')
  })

  it('409 когда внешний режим выключен', async () => {
    const { uc } = makeDeps({ getSettings: vi.fn().mockResolvedValue({ ...settings, externalPageEnabled: false }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('409 когда оплата выключена целиком', async () => {
    const { uc } = makeDeps({ getSettings: vi.fn().mockResolvedValue({ ...settings, enabled: false }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('404 когда заказ чужой', async () => {
    const { uc } = makeDeps()
    await expect(uc('intruder', 'o1')).rejects.toMatchObject({ statusCode: 404 })
  })

  it('409 когда заказ не PENDING', async () => {
    const { uc } = makeDeps({ getOrderForWooPayment: vi.fn().mockResolvedValue({ ...order, status: 'PAID' }) })
    await expect(uc('u1', 'o1')).rejects.toMatchObject({ statusCode: 409 })
  })

  it('гонка привязки: setWooOrder=false → перечитывает и отдаёт уже привязанную ссылку', async () => {
    const { woo, uc } = makeDeps({
      setWooOrder: vi.fn().mockResolvedValue(false),
      getOrderForWooPayment: vi.fn()
        .mockResolvedValueOnce({ ...order })
        .mockResolvedValueOnce({ ...order, wooOrderId: 8, wooOrderKey: 'other' }),
    })
    const result = await uc('u1', 'o1')
    expect(woo.createOrder).toHaveBeenCalledTimes(1)
    expect(result.payUrl).toContain('/checkout/order-pay/8/')
  })
})
