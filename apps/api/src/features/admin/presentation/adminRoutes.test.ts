import { describe, it, expect, vi } from 'vitest'
import { Hono } from 'hono'
import { makeAdminRouter } from './adminRoutes'
import type { GetDashboard, MarkAllMessagesRead, DashboardResponse } from '../types'

const mockDashboard: DashboardResponse = {
  stats: {
    ordersToday: 1,
    revenueToday: 50,
    revenueMonth: 200,
    newMessages: 3,
    activeListings: 8,
  },
  recentOrders: [
    {
      id: 'o1',
      orderNumber: 42,
      status: 'PAID',
      totalAmount: 50,
      createdAt: '2026-06-01T10:00:00.000Z',
      userName: 'Anna',
    },
  ],
  recentMessages: [],
}

function makeApp(getDashboard: GetDashboard, markAllMessagesRead: MarkAllMessagesRead) {
  const app = new Hono()
  app.use('*', async (c, next) => {
    c.set('auth', { userId: 'u1', role: 'ADMIN' })
    await next()
  })
  app.route('/admin', makeAdminRouter(getDashboard, markAllMessagesRead))
  return app
}

describe('GET /admin/dashboard', () => {
  it('returns dashboard data', async () => {
    const getDashboard = vi.fn().mockResolvedValue(mockDashboard)
    const app = makeApp(getDashboard, vi.fn())
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(200)
    const body = await res.json() as DashboardResponse
    expect(body.stats.ordersToday).toBe(1)
    expect(body.recentOrders[0].userName).toBe('Anna')
    expect(getDashboard).toHaveBeenCalledOnce()
  })

  it('returns 403 when role is not ADMIN', async () => {
    const app = new Hono()
    app.use('*', async (c, next) => {
      c.set('auth', { userId: 'u1', role: 'CUSTOMER' })
      await next()
    })
    app.route('/admin', makeAdminRouter(vi.fn(), vi.fn()))
    const res = await app.request('/admin/dashboard')
    expect(res.status).toBe(403)
  })
})

describe('PATCH /admin/messages/mark-all-read', () => {
  it('returns 200 and calls markAllMessagesRead', async () => {
    const markAll = vi.fn().mockResolvedValue(undefined)
    const app = makeApp(vi.fn(), markAll)
    const res = await app.request('/admin/messages/mark-all-read', { method: 'PATCH' })
    expect(res.status).toBe(200)
    expect(markAll).toHaveBeenCalledOnce()
  })
})
