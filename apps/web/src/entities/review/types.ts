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
