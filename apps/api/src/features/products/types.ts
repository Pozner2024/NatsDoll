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

export interface ProductRepository {
  findMany(params: ProductListParams): Promise<{ items: ProductListItem[]; total: number }>
  listCategories(): Promise<CategoryListItem[]>
}
