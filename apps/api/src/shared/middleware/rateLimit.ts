// Мидлвар ограничивает количество запросов с одного IP.
// Хранит счётчики в памяти (Map). При превышении лимита возвращает 429.
import type { MiddlewareHandler } from 'hono'


type RateLimitOptions = {
  max: number
  windowMs: number
}

type Entry = { count: number; resetAt: number }

function extractClientIp(header: string | undefined): string {
  if (!header) return 'unknown'
  const first = header.split(',')[0]?.trim()
  return first || 'unknown'
}

export function createRateLimiter({ max, windowMs }: RateLimitOptions) {
  const hits = new Map<string, Entry>()

  // Чистим устаревшие записи, чтобы Map не рос бесконечно.
  // unref() — таймер не мешает Node.js завершиться при остановке сервера
  const cleanupTimer = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (now >= entry.resetAt) hits.delete(key)
    }
  }, Math.max(windowMs, 60_000))
  cleanupTimer.unref()

  const middleware: MiddlewareHandler = async (c, next) => {
    const ip = extractClientIp(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'))
    const now = Date.now()
    const entry = hits.get(ip)

    if (entry && now < entry.resetAt) {
            if (entry.count >= max) {
        return c.json({ error: 'Too many requests' }, 429)
      }
      entry.count++
    } else {
      
      hits.set(ip, { count: 1, resetAt: now + windowMs })
    }
    return next()
  }

  return { middleware, reset: () => hits.clear() }
}
