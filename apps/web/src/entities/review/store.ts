import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { ReviewView, ReviewableItem, CreateReviewData } from './types'
import { fetchMyReviews, fetchReviewableItems, submitReview } from './reviewApi'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<ReviewView[]>([])
  const reviewableItems = ref<ReviewableItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const [r, items] = await Promise.all([fetchMyReviews(), fetchReviewableItems()])
      reviews.value = r
      reviewableItems.value = items
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load reviews'
    } finally {
      loading.value = false
    }
  }

  async function create(data: CreateReviewData): Promise<void> {
    const created = await submitReview(data)
    reviews.value = [created, ...reviews.value]
    reviewableItems.value = reviewableItems.value.filter(
      item => !(item.productId === data.productId && item.orderId === data.orderId),
    )
  }

  return {
    reviews: readonly(reviews),
    reviewableItems: readonly(reviewableItems),
    loading: readonly(loading),
    error: readonly(error),
    load,
    create,
  }
})
