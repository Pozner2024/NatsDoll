import type { ReviewRepository, CreateReviewData, ReviewView } from '../types'
import { AppError } from '../../../shared/errors'

export function makeCreateReview(repo: ReviewRepository) {
  return async function createReview(userId: string, data: CreateReviewData): Promise<ReviewView> {
    if (data.rating < 1 || data.rating > 5) {
      throw new AppError(400, 'Rating must be between 1 and 5')
    }

    const reviewable = await repo.findReviewableItems(userId)
    const isAllowed = reviewable.some(
      item => item.productId === data.productId && item.orderId === data.orderId,
    )
    if (!isAllowed) {
      throw new AppError(400, 'You can only review items from your delivered orders, and cannot review the same product twice')
    }

    return repo.create(userId, data)
  }
}
