import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib'
import type { GetMyReviews, GetReviewableItems, CreateReview } from '../types'

const createReviewSchema = z.object({
  productId: z.string().min(1),
  orderId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
})

export function makeReviewRouter(
  getMyReviews: GetMyReviews,
  getReviewableItems: GetReviewableItems,
  createReview: CreateReview,
) {
  const router = new Hono()

  router.get('/', async (c) => {
    const { userId } = c.get('auth')
    const reviews = await getMyReviews(userId)
    return c.json(reviews)
  })

  router.get('/reviewable', async (c) => {
    const { userId } = c.get('auth')
    const items = await getReviewableItems(userId)
    return c.json(items)
  })

  router.post('/', zValidator('json', createReviewSchema), async (c) => {
    const { userId } = c.get('auth')
    const data = c.req.valid('json')
    const review = await createReview(userId, data)
    return c.json(review, 201)
  })

  return router
}
