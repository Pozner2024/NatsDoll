export type ProductSortOrder = 'newest' | 'price-asc' | 'price-desc'

export type Product = {
  id: string
  slug: string
  name: string
  price: number
  salePrice?: number
  salePercent?: number
  image: string | null
  stock: number
  hasMessage?: boolean
}

export type ProductListResponse = {
  items: Product[]
  total: number
  page: number
  totalPages: number
}

export type ProductListParams = {
  category?: string
  sort: ProductSortOrder
  page: number
  limit: number
}

export type ProductDetail = {
  id: string
  slug: string
  name: string
  description: string
  price: number
  salePrice?: number
  salePercent?: number
  images: string[]
  stock: number
  category: string
  categorySlug: string
  messageOptions: string[]
}
