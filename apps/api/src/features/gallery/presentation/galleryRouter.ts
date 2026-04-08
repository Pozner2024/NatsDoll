import { Hono } from 'hono'
import { AppError } from '../../../shared/errors'

type GetHomeGallery = () => Promise<unknown>

export function makeGalleryRouter(getHomeGallery: GetHomeGallery) {
  const router = new Hono()

  router.get('/home', async (c) => {
    try {
      const data = await getHomeGallery()
      return c.json(data)
    } catch (err) {
      if (err instanceof AppError) {
        return c.json({ error: err.message }, err.statusCode as 400 | 401 | 404 | 500)
      }
      console.error('getHomeGallery failed', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  return router
}
