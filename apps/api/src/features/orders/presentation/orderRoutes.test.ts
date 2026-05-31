import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeOrderRouter } from './orderRoutes'
import type { CreateOrder, GetMyOrders, GetOrder } from '../types'

const mockAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

const mockOrderDetail = {
  id: 'order-1', userId: 'u1', status: 'PENDING', totalAmount: 10,
  shippingAddress: mockAddress, createdAt: '2026-05-21T00:00:00.000Z', items: [],
}

function makeApp(
  createOrder: CreateOrder,
  getMyOrders: GetMyOrders,
  getOrder: GetOrder,
) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', { userId: 'u1', role: 'CUSTOMER' })
    await next()
  })
  app.route('/', makeOrderRouter(createOrder, getMyOrders, getOrder))
  return app
}

describe('POST /orders', () => {
  it('returns 200 with order detail on valid input', async () => {
    const createOrder = vi.fn().mockResolvedValue(mockOrderDetail)
    const app = makeApp(createOrder, vi.fn(), vi.fn())
    const res = await app.request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: mockAddress }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as typeof mockOrderDetail
    expect(body.id).toBe('order-1')
    expect(createOrder).toHaveBeenCalledWith('u1', mockAddress)
  })

  it('returns 400 when shippingAddress is missing fullName', async () => {
    const app = makeApp(vi.fn(), vi.fn(), vi.fn())
    const res = await app.request('/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shippingAddress: { line1: '123', city: 'NY', country: 'US', postalCode: '10001' } }),
    })
    expect(res.status).toBe(400)
  })
})

describe('GET /orders', () => {
  it('returns list of order summaries', async () => {
    const summary = [{ id: 'o1', status: 'PENDING', totalAmount: 10, itemCount: 1,
      createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null }]
    const getMyOrders = vi.fn().mockResolvedValue(summary)
    const app = makeApp(vi.fn(), getMyOrders, vi.fn())
    const res = await app.request('/orders')
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(summary)
    expect(getMyOrders).toHaveBeenCalledWith('u1')
  })
})

describe('GET /orders/:id', () => {
  it('returns order detail', async () => {
    const getOrder = vi.fn().mockResolvedValue(mockOrderDetail)
    const app = makeApp(vi.fn(), vi.fn(), getOrder)
    const res = await app.request('/orders/order-1')
    expect(res.status).toBe(200)
    const body = await res.json() as typeof mockOrderDetail
    expect(body.id).toBe('order-1')
    expect(getOrder).toHaveBeenCalledWith('u1', 'order-1')
  })
})
