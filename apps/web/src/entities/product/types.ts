export type ProductSortOrder = 'newest' | 'price-asc' | 'price-desc'

export type Product = {
  id: string
  slug: string
  name: string
  price: number
  image: string | null
  stock: number
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
  images: string[]
  stock: number
  category: string
}
