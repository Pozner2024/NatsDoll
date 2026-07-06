import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeWooClient } from './wooClient'

const ENV_KEYS = ['WOO_BASE_URL', 'WOO_CONSUMER_KEY', 'WOO_CONSUMER_SECRET', 'WOO_PLACEHOLDER_PRODUCT_ID'] as const
const input = {
  orderNumber: 1042,
  lineItems: [{ name: 'Polymer clay fox', quantity: 2, subtotalUsd: 24 }],
  shippingUsd: 5,
  customerName: 'Jane Ann Doe',
  customerEmail: 'jane@example.com',
  billingAddress: { line1: '123 Main St', city: 'New York', country: 'US', postalCode: '10001' },
  returnUrl: 'https://natsdoll.com/orders/o1',
}

describe('wooClient', () => {
  beforeEach(() => {
    process.env.WOO_BASE_URL = 'https://pay.example.com/'
    process.env.WOO_CONSUMER_KEY = 'ck'
    process.env.WOO_CONSUMER_SECRET = 'cs'
    process.env.WOO_PLACEHOLDER_PRODUCT_ID = '17'
  })
  afterEach(() => {
    for (const k of ENV_KEYS) delete process.env[k]
    vi.unstubAllGlobals()
  })

  it('создаёт заказ: плейсхолдер-товар, суммы с двумя знаками, метка и return url в meta', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ id: 7, order_key: 'wc_key' }), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    const created = await makeWooClient().createOrder(input)
    expect(created).toEqual({ wooOrderId: 7, wooOrderKey: 'wc_key' })
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://pay.example.com/wp-json/wc/v3/orders')
    const body = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(body.line_items).toEqual([{ product_id: 17, name: 'Polymer clay fox', quantity: 2, subtotal: '24.00', total: '24.00' }])
    expect(body.shipping_lines).toEqual([{ method_id: 'flat_rate', method_title: 'Shipping', total: '5.00' }])
    expect(body.billing).toEqual({
      first_name: 'Jane',
      last_name: 'Ann Doe',
      email: 'jane@example.com',
      address_1: '123 Main St',
      address_2: '',
      city: 'New York',
      postcode: '10001',
      country: 'US',
    })
    expect(body.meta_data).toEqual([
      { key: 'natsdoll_order_number', value: 'natsdoll-1042' },
      { key: 'natsdoll_return_url', value: 'https://natsdoll.com/orders/o1' },
    ])
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${Buffer.from('ck:cs').toString('base64')}`)
  })

  it('строит pay-ссылку из id и ключа', () => {
    expect(makeWooClient().payUrl(7, 'wc_key')).toBe('https://pay.example.com/checkout/order-pay/7/?pay_for_order=true&key=wc_key')
  })

  it('503 когда env не настроен', async () => {
    delete process.env.WOO_CONSUMER_SECRET
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ statusCode: 503 })
  })

  it('502 когда Woo ответил ошибкой', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('boom', { status: 500 })))
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ statusCode: 502 })
  })

  it('502 когда в ответе нет id/order_key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 201 })))
    await expect(makeWooClient().createOrder(input)).rejects.toMatchObject({ statusCode: 502 })
  })
})
