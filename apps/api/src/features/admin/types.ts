export type DashboardStats = {
  ordersToday: number
  revenueToday: number
  revenueMonth: number
  newMessages: number
  activeListings: number
}

export type RecentOrder = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  createdAt: string
  userName: string
}

export type RecentMessage = {
  id: string
  text: string
  createdAt: string
  userName: string
  orderNumber: number | null
  isReadByAdmin: boolean
}

export type DashboardResponse = {
  stats: DashboardStats
  recentOrders: RecentOrder[]
  recentMessages: RecentMessage[]
}

export type GetDashboard = () => Promise<DashboardResponse>
export type MarkAllMessagesRead = () => Promise<void>

// ── Admin Products ────────────────────────────────────────────

export type AdminProductListItem = {
  id: string
  name: string
  slug: string
  price: number
  stock: number
  isPublished: boolean
  image: string | null
  category: string
  categoryId: string
}

export type AdminProductListParams = {
  search?: string
  categoryId?: string
  status?: 'published' | 'draft'
  page: number
  limit: number
}

export type AdminProductListResponse = {
  items: AdminProductListItem[]
  total: number
  page: number
  totalPages: number
}

export type AdminProductInput = {
  name: string
  slug: string
  description: string
  price: number
  stock: number
  categoryId: string
  images: string[]
  messageOptions: string[]
  isPublished: boolean
}

export type AdminCategoryItem = {
  id: string
  name: string
  slug: string
  productCount: number
}

export type AdminRepository = {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
  // products
  listProducts(params: AdminProductListParams): Promise<{ items: AdminProductListItem[]; total: number }>
  createProduct(input: AdminProductInput): Promise<{ id: string }>
  updateProduct(id: string, input: AdminProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  togglePublish(id: string): Promise<{ isPublished: boolean }>
  // categories
  listCategoriesWithCount(): Promise<AdminCategoryItem[]>
  createCategory(name: string, slug: string): Promise<{ id: string }>
  updateCategory(id: string, name: string, slug: string): Promise<void>
  deleteCategory(id: string): Promise<void>
}

export type ListAdminProducts = (params: AdminProductListParams) => Promise<AdminProductListResponse>
export type CreateProduct = (input: AdminProductInput) => Promise<{ id: string }>
export type UpdateProduct = (id: string, input: AdminProductInput) => Promise<void>
export type DeleteProduct = (id: string) => Promise<void>
export type TogglePublish = (id: string) => Promise<{ isPublished: boolean }>
export type ListCategoriesWithCount = () => Promise<AdminCategoryItem[]>
export type CreateCategory = (name: string, slug: string) => Promise<{ id: string }>
export type UpdateCategory = (id: string, name: string, slug: string) => Promise<void>
export type DeleteCategory = (id: string) => Promise<void>
