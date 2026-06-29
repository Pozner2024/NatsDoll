import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeAdminPaymentRouter } from './adminPaymentRoutes'
import { signAccessToken } from '../../../shared/lib'

const settings = {
  enabled: false, mode: 'SANDBOX' as const,
  sandbox: { clientId: null, hasSecret: false, webhookId: null },
  live: { clientId: null, hasSecret: false, webhookId: null },
}

function makeApp() {
  const getSettings = vi.fn().mockResolvedValue(settings)
  const updateSettings = vi.fn().mockResolvedValue(undefined)
  const app = new Hono()
  app.route('/admin/payments', makeAdminPaymentRouter(getSettings as never, updateSettings as never))
  return { app, getSettings, updateSettings }
}

const validBody = {
  enabled: true,
  mode: 'SANDBOX',
  sandbox: { clientId: 'cid', secret: 'sec', webhookId: null },
  live: { clientId: null },
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
}

describe('admin payment routes — auth/admin гейт', () => {
  let app: ReturnType<typeof makeApp>
  beforeEach(() => { app = makeApp() })

  it('GET / без auth → 401, getSettings не вызван', async () => {
    const res = await app.app.request('/admin/payments')
    expect(res.status).toBe(401)
    expect(app.getSettings).not.toHaveBeenCalled()
  })

  it('PUT / без auth → 401, updateSettings не вызван', async () => {
    const res = await app.app.request('/admin/payments', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(401)
    expect(app.updateSettings).not.toHaveBeenCalled()
  })

  it('GET / авторизован, но не админ (role=USER) → 403', async () => {
    const token = await signAccessToken({ sub: 'u1', role: 'USER' })
    const res = await app.app.request('/admin/payments', { headers: bearer(token) })
    expect(res.status).toBe(403)
    expect(app.getSettings).not.toHaveBeenCalled()
  })

  it('GET / админ → 200, отдаёт настройки', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/payments', { headers: bearer(token) })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(settings)
  })

  it('PUT / админ с валидным телом → 200, updateSettings вызван', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/payments', {
      method: 'PUT', headers: bearer(token), body: JSON.stringify(validBody),
    })
    expect(res.status).toBe(200)
    expect(app.updateSettings).toHaveBeenCalledWith(expect.objectContaining({ enabled: true, mode: 'SANDBOX' }))
  })

  it('PUT / админ с невалидным телом → 400, updateSettings не вызван', async () => {
    const token = await signAccessToken({ sub: 'admin', role: 'ADMIN' })
    const res = await app.app.request('/admin/payments', {
      method: 'PUT', headers: bearer(token), body: JSON.stringify({ enabled: 'yes' }),
    })
    expect(res.status).toBe(400)
    expect(app.updateSettings).not.toHaveBeenCalled()
  })
})
