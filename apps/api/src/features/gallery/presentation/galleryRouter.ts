import { Hono } from 'hono'
import type { HomeGallery, Collection } from '../types'

type GetHomeGallery = () => Promise<HomeGallery>
type GetCollections = () => Promise<Collection[]>

export function makeGalleryRouter(
  getHomeGallery: GetHomeGallery,
  getCollections: GetCollections,
) {
  const router = new Hono()

  router.get('/home', async (c) => {
    const data = await getHomeGallery()
    return c.json(data)
  })

  router.get('/collections', async (c) => {
    const data = await getCollections()
    return c.json(data)
  })

  return router
}
