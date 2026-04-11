import { Hono } from 'hono'
import type { HomeGallery } from '../types'

type GetHomeGallery = () => Promise<HomeGallery>

export function makeGalleryRouter(getHomeGallery: GetHomeGallery) {
  const router = new Hono()

  router.get('/home', async (c) => {
    const data = await getHomeGallery()
    return c.json(data)
  })

  return router
}
