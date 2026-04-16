import type { MiddlewareHandler } from 'hono'
import { verifyAccessToken } from '../lib/tokens'

declare module 'hono' {
  interface ContextVariableMap {
    auth: { userId: string; role: string }
  }
}

export const requireAuth: MiddlewareHandler = async (c, next) => {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  const token = authorization.slice(7)
  const payload = await verifyAccessToken(token)
  c.set('auth', { userId: payload.sub, role: payload.role })
  await next()
}
