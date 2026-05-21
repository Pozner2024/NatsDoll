export type ProductSortOrder = 'newest' | 'price-asc' | 'price-desc'

export type ProductListItem = {
  id: string
  slug: string
  name: string
  price: number
  image: string | null
  stock: number
}

export type ProductListResponse = {
  items: ProductListItem[]
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

export type CategoryListItem = {
  id: string
  slug: string
  name: string
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
  categorySlug: string
  hasMessage: boolean
  messageOptions: string[]
}

export type GetProduct = (slug: string) => Promise<ProductDetail | null>

export interface ProductRepository {
  findMany(params: ProductListParams): Promise<{ items: ProductListItem[]; total: number }>
  listCategories(): Promise<CategoryListItem[]>
  findBySlug(slug: string): Promise<ProductDetail | null>
}
