import type { ReviewRepository, ReviewableItem } from '../types'

export function makeGetReviewableItems(repo: ReviewRepository) {
  return function getReviewableItems(userId: string): Promise<ReviewableItem[]> {
    return repo.findReviewableItems(userId)
  }
}
