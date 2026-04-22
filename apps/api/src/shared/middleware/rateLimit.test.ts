import { describe, it, expect } from 'vitest'
import { Hono } from 'hono'
import { createRateLimiter } from './rateLimit'

function buildApp(max: number, windowMs: number) {
  const limiter = createRateLimiter({ max, windowMs })
  const app = new Hono()
  app.get('/', limiter.middleware, (c) => c.json({ ok: true }))
  return { app, limiter }
}

function request(app: Hono, ip = '1.1.1.1') {
  return app.request('/', { headers: { 'x-forwarded-for': ip } })
}

describe('createRateLimiter', () => {
  it('пропускает первый запрос', async () => {
    const { app } = buildApp(2, 60_000)
    const res = await request(app)
    expect(res.status).toBe(200)
  })

  it('пропускает запросы до лимита', async () => {
    const { app } = buildApp(3, 60_000)
    expect((await request(app)).status).toBe(200)
    expect((await request(app)).status).toBe(200)
    expect((await request(app)).status).toBe(200)
  })

  it('возвращает 429 при превышении лимита', async () => {
    const { app } = buildApp(2, 60_000)
    await request(app)
    await request(app)
    const res = await request(app)
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({ error: 'Too many requests' })
  })

  it('считает лимиты независимо для разных IP', async () => {
    const { app } = buildApp(1, 60_000)
    expect((await request(app, '1.1.1.1')).status).toBe(200)
    expect((await request(app, '1.1.1.1')).status).toBe(429)
    expect((await request(app, '2.2.2.2')).status).toBe(200)
  })

  it('берёт первый IP из x-forwarded-for со списком', async () => {
    const { app } = buildApp(1, 60_000)
    expect((await app.request('/', { headers: { 'x-forwarded-for': '5.5.5.5, 10.0.0.1' } })).status).toBe(200)
    expect((await app.request('/', { headers: { 'x-forwarded-for': '5.5.5.5, 99.99.99.99' } })).status).toBe(429)
  })

  it('сбрасывается через reset()', async () => {
    const { app, limiter } = buildApp(1, 60_000)
    await request(app)
    expect((await request(app)).status).toBe(429)
    limiter.reset()
    expect((await request(app)).status).toBe(200)
  })

  it('падает на unknown IP когда заголовков нет', async () => {
    const { app } = buildApp(1, 60_000)
    expect((await app.request('/')).status).toBe(200)
    expect((await app.request('/')).status).toBe(429)
  })

  it('использует x-real-ip как fallback', async () => {
    const limiter = createRateLimiter({ max: 1, windowMs: 60_000 })
    const app = new Hono()
    app.get('/', limiter.middleware, (c) => c.json({ ok: true }))
    expect((await app.request('/', { headers: { 'x-real-ip': '7.7.7.7' } })).status).toBe(200)
    expect((await app.request('/', { headers: { 'x-real-ip': '7.7.7.7' } })).status).toBe(429)
    expect((await app.request('/', { headers: { 'x-real-ip': '8.8.8.8' } })).status).toBe(200)
  })
})
