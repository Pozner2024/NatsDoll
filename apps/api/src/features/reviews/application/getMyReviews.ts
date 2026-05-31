import type { ReviewRepository, ReviewView } from '../types'

export function makeGetMyReviews(repo: ReviewRepository) {
  return function getMyReviews(userId: string): Promise<ReviewView[]> {
    return repo.findMyReviews(userId)
  }
}
