// apps/api/src/shared/middleware/requireAdmin.ts
import type { MiddlewareHandler } from 'hono'

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const { role } = c.get('auth')
  if (role !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
