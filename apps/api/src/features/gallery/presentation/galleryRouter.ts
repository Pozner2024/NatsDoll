import { Hono } from 'hono'
import type { makeGetHomeGallery } from '../application/getHomeGallery'

type GetHomeGallery = ReturnType<typeof makeGetHomeGallery>

export function makeGalleryRouter(getHomeGallery: GetHomeGallery) {
  const router = new Hono()

  router.get('/home', async (c) => {
    try {
      const data = await getHomeGallery()
      return c.json(data)
    } catch (err) {
      console.error('getHomeGallery failed', err)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })

  return router
}
