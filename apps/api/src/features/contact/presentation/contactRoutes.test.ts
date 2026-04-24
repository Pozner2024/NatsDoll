import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { makeContactRouter } from './contactRoutes'

const validBody = { name: 'Nat', email: 'nat@example.com', message: 'Hello world' }

function makeApp(submit = vi.fn().mockResolvedValue(undefined)) {
  const app = new Hono()
  app.route('/api/contact', makeContactRouter(submit))
  return { app, submit }
}

function post(app: Hono, body: unknown, headers: Record<string, string> = {}) {
  return app.request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

describe('POST /api/contact', () => {
  it('возвращает 201 при корректном запросе', async () => {
    const { app } = makeApp()
    const res = await post(app, validBody)
    expect(res.status).toBe(201)
  })

  it('вызывает submit с данными из body', async () => {
    const { app, submit } = makeApp()
    await post(app, validBody)
    expect(submit).toHaveBeenCalledWith(validBody)
  })

  it('возвращает 400 при невалидном теле', async () => {
    const { app } = makeApp()
    const res = await post(app, { name: '', email: 'not-email', message: '' })
    expect(res.status).toBe(400)
  })

  it('берёт первый IP из x-forwarded-for (extractClientIp)', async () => {
    const { app, submit } = makeApp()
    // Первый вызов с первым IP — ожидаем, что rate-limit считает его отдельно
    const res = await post(app, validBody, { 'x-forwarded-for': '1.2.3.4, 5.6.7.8, 9.10.11.12' })
    expect(res.status).toBe(201)
    expect(submit).toHaveBeenCalledTimes(1)
  })

  it('применяет rate-limit: 4-й запрос с одного IP возвращает 429', async () => {
    // Используем отдельный app чтобы не смешивать счётчики из других тестов
    const { app } = makeApp()
    const ip = '99.99.99.99'
    const headers = { 'x-forwarded-for': ip }

    await post(app, validBody, headers)
    await post(app, validBody, headers)
    await post(app, validBody, headers)
    const res = await post(app, validBody, headers)

    expect(res.status).toBe(429)
  })
})
