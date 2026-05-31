import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { ReviewView, ReviewableItem, CreateReviewData } from './types'

const reviewSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  orderId: z.string().nullable(),
  rating: z.number(),
  comment: z.string().nullable(),
  createdAt: z.string(),
})

const reviewableItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  orderId: z.string(),
})

export async function fetchMyReviews(): Promise<ReviewView[]> {
  const res = await authFetch('/me/reviews')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load reviews'))
  return z.array(reviewSchema).parse(await res.json())
}

export async function fetchReviewableItems(): Promise<ReviewableItem[]> {
  const res = await authFetch('/me/reviews/reviewable')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load reviewable items'))
  return z.array(reviewableItemSchema).parse(await res.json())
}

export async function submitReview(data: CreateReviewData): Promise<ReviewView> {
  const res = await authFetch('/me/reviews', { method: 'POST', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to submit review'))
  return reviewSchema.parse(await res.json())
}
