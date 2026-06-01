import type { MiddlewareHandler } from 'hono'

export const requireAdmin: MiddlewareHandler = async (c, next) => {
  const auth = c.get('auth')
  if (!auth || auth.role !== 'ADMIN') {
    return c.json({ error: 'Forbidden' }, 403)
  }
  await next()
}
