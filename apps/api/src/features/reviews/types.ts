export type ReviewView = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  orderId: string | null
  rating: number
  comment: string | null
  createdAt: string
}

export type ReviewableItem = {
  productId: string
  productName: string
  productImage: string | null
  orderId: string
}

export type CreateReviewData = {
  productId: string
  orderId: string
  rating: number
  comment?: string
}

export interface ReviewRepository {
  findMyReviews(userId: string): Promise<ReviewView[]>
  findReviewableItems(userId: string): Promise<ReviewableItem[]>
  create(userId: string, data: CreateReviewData): Promise<ReviewView>
}

export type GetMyReviews = (userId: string) => Promise<ReviewView[]>
export type GetReviewableItems = (userId: string) => Promise<ReviewableItem[]>
export type CreateReview = (userId: string, data: CreateReviewData) => Promise<ReviewView>
