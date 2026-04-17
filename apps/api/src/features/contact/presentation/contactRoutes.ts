import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'

const contactBodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(254),
  message: z.string().min(1).max(5000),
})

const MAX_REQUESTS = 3
const WINDOW_MS = 60_000
const ipHits = new Map<string, { count: number; resetAt: number }>()

function extractClientIp(header: string | undefined): string {
  if (!header) return 'unknown'
  const parts = header.split(',').map((s) => s.trim()).filter(Boolean)
  return parts.at(-1) ?? 'unknown'
}

function cleanupExpiredEntries() {
  const now = Date.now()
  for (const [key, entry] of ipHits) {
    if (now >= entry.resetAt) ipHits.delete(key)
  }
}

// Очистка устаревших записей каждые 5 минут
setInterval(cleanupExpiredEntries, 5 * 60_000).unref()

type Submit = (data: { name: string; email: string; message: string }) => Promise<void>

export function makeContactRouter(submit: Submit) {
  const router = new Hono()

  router.post('/', zValidator('json', contactBodySchema), async (c) => {
    const ip = extractClientIp(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'))
    const now = Date.now()
    const entry = ipHits.get(ip)

    if (entry && now < entry.resetAt) {
      if (entry.count >= MAX_REQUESTS) {
        return c.json({ error: 'Too many requests' }, 429)
      }
      entry.count++
    } else {
      ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    }

    const data = c.req.valid('json')
    await submit(data)
    return c.json({ message: 'Message sent' }, 201)
  })

  return router
}
