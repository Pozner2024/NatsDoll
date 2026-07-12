import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeAdminShippingRouter } from './adminShippingRoutes'
import { signAccessToken } from '../../../shared/lib'

const settings = { baseCost: 12, perExtraItemCost: 1 }

function makeApp() {
  const getSettings = vi.fn().mockResolvedValue(settings)
  const updateSettings = vi.fn().mockResolvedValue(undefined)
  const app = new Hono()
  app.route('/admin/shipping', makeAdminShippingRouter(getSettings as never, updateSettings as never))
  return { app, getSettings, updateSettings }
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

describe('admin shipping routes — auth/admin гейт и валидация', () => {
  let app: ReturnType<typeof makeApp>
  beforeEach(() => { app = makeApp() })

  it('GET / без auth → 401, getSettings не вызван', async () => {
    const res = await app.app.request('/admin/shipping')
    expect(res.status).toBe(401)
    expect(app.getSettings).not.toHaveBeenCalled()
  })

  it('GET / авторизован, но не админ (role=USER) → 403', async () => {
    const token = await signAccessToken({ sub: 'u1', role: 'USER' })
    const res = await app.app.request('/admin/shipping', { headers: bearer(token) })
    expect(res.status).toBe(403)
    expect(app.getSettings).not.toHaveBeenCalled()
  })

  it('GET / админ → 200, отдаёт настройки', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/shipping', { headers: bearer(token) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(settings)
  })

  it('PUT / админ с валидным телом → 200, updateSettings вызван', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/shipping', {
      method: 'PUT', headers: bearer(token), body: JSON.stringify({ baseCost: 15, perExtraItemCost: 2 }),
    })
    expect(res.status).toBe(200)
    expect(app.updateSettings).toHaveBeenCalledWith({ baseCost: 15, perExtraItemCost: 2 })
  })

  it('PUT / отрицательная ставка → 400, updateSettings не вызван', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/shipping', {
      method: 'PUT', headers: bearer(token), body: JSON.stringify({ baseCost: -1, perExtraItemCost: 2 }),
    })
    expect(res.status).toBe(400)
    expect(app.updateSettings).not.toHaveBeenCalled()
  })

  it('PUT / нулевая ставка (бесплатная доставка) → 200, updateSettings вызван', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/shipping', {
      method: 'PUT', headers: bearer(token), body: JSON.stringify({ baseCost: 12, perExtraItemCost: 0 }),
    })
    expect(res.status).toBe(200)
    expect(app.updateSettings).toHaveBeenCalledWith({ baseCost: 12, perExtraItemCost: 0 })
  })
})
