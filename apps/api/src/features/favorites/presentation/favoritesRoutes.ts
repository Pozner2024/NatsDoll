import { Hono } from 'hono'
import type { AddFavorite, RemoveFavorite, ListFavorites } from '../types'

export function makeFavoritesRouter(
  addFavorite: AddFavorite,
  removeFavorite: RemoveFavorite,
  listFavorites: ListFavorites,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const items = await listFavorites(userId)
    return c.json(items)
  })

  router.post('/:productId', async (c) => {
    const { userId } = c.get('auth')
    const productId = c.req.param('productId')
    const result = await addFavorite({ userId, productId })
    return c.json(result)
  })

  router.delete('/:productId', async (c) => {
    const { userId } = c.get('auth')
    const productId = c.req.param('productId')
    const result = await removeFavorite({ userId, productId })
    return c.json(result)
  })

  return router
}
