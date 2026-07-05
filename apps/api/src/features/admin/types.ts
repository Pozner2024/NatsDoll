import type { OrderItemView, ShippingAddress } from '../orders/types'

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
  listConversations(): Promise<ConversationPreview[]>
  getConversation(userId: string): Promise<ConversationDetail | null>
  replyToUser(input: ReplyInput): Promise<void>
  markConversationRead(userId: string): Promise<void>
  listAdminOrders(params: AdminOrderListParams): Promise<{ items: AdminOrderSummary[]; total: number }>
  getAdminOrder(orderId: string): Promise<AdminOrderDetail | null>
  updateAdminOrder(orderId: string, input: UpdateOrderInput): Promise<{ userEmail: string; userName: string; orderNumber: number; trackingNumber: string } | null>
  getAnalyticsData(period: AnalyticsPeriod): Promise<AnalyticsResponse>
  // products
  listProducts(params: AdminProductListParams): Promise<{ items: AdminProductListItem[]; total: number }>
  createProduct(input: AdminProductInput): Promise<{ id: string }>
  updateProduct(id: string, input: AdminProductInput): Promise<void>
  deleteProduct(id: string): Promise<void>
  togglePublish(id: string): Promise<{ isPublished: boolean }>
  moveProductCategory(id: string, categoryId: string): Promise<void>
  // categories
  listCategoriesWithCount(): Promise<AdminCategoryItem[]>
  createCategory(name: string, slug: string): Promise<{ id: string }>
  updateCategory(id: string, name: string, slug: string): Promise<void>
  deleteCategory(id: string): Promise<void>
  getProduct(id: string): Promise<AdminProductDetail | null>
  // sales
  createSale(input: SaleInput): Promise<{ id: string }>
  updateSale(id: string, input: SaleInput): Promise<void>
  deleteSale(id: string): Promise<void>
  listSales(): Promise<SaleRecord[]>
  getActiveSale(): Promise<ActiveSale | null>
  countProductsInSale(input: Pick<SaleInput, 'scope' | 'categoryIds' | 'productIds'>): Promise<number>
}

export type ListAdminProducts = (params: AdminProductListParams) => Promise<AdminProductListResponse>
export type CreateProduct = (input: AdminProductInput) => Promise<{ id: string }>
export type UpdateProduct = (id: string, input: AdminProductInput) => Promise<void>
export type DeleteProduct = (id: string) => Promise<void>
export type TogglePublish = (id: string) => Promise<{ isPublished: boolean }>
export type MoveProductCategory = (id: string, categoryId: string) => Promise<void>
export type ListCategoriesWithCount = () => Promise<AdminCategoryItem[]>
export type CreateCategory = (name: string, slug: string) => Promise<{ id: string }>
export type UpdateCategory = (id: string, name: string, slug: string) => Promise<void>
export type DeleteCategory = (id: string) => Promise<void>

export type AdminProductDetail = {
  id: string
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

export type GetAdminProduct = (id: string) => Promise<AdminProductDetail | null>

export type UploadProductImage = (input: { bytes: Uint8Array; contentType: string }) => Promise<{ url: string }>

// ── Admin Conversations ───────────────────────────────────────

export type ConversationPreview = {
  userId: string
  userName: string
  userEmail: string
  lastMessageText: string
  lastMessageAt: string
  unreadCount: number
}

export type ConversationMessage = {
  id: string
  text: string
  fromAdmin: boolean
  orderId: string | null
  orderNumber: number | null
  createdAt: string
}

export type ConversationDetail = {
  userId: string
  userName: string
  userEmail: string
  messages: ConversationMessage[]
  userOrders: { id: string; orderNumber: number; createdAt: string }[]
}

export type ReplyInput = {
  userId: string
  text: string
  orderId?: string
}

export type ListConversations = () => Promise<ConversationPreview[]>
export type GetConversation = (userId: string) => Promise<ConversationDetail | null>
export type ReplyToUser = (input: ReplyInput) => Promise<void>
export type MarkConversationRead = (userId: string) => Promise<void>

// ── Admin Orders ──────────────────────────────────────────────

export type AdminOrderSummary = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  userName: string
  userEmail: string
  itemCount: number
  createdAt: string
}

export type AdminOrderDetail = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  adminNote: string | null
  paypalOrderId: string | null
  createdAt: string
  userId: string
  userName: string
  userEmail: string
  items: OrderItemView[]
}

export type AdminOrderListParams = {
  status?: string
  search?: string
  page: number
  limit: number
}

export type AdminOrderListResponse = {
  items: AdminOrderSummary[]
  total: number
  page: number
  totalPages: number
}

export type UpdateOrderInput = {
  status: string
  trackingNumber?: string | null
  adminNote?: string | null
}

export type ListAdminOrders = (params: AdminOrderListParams) => Promise<AdminOrderListResponse>
export type GetAdminOrder = (orderId: string) => Promise<AdminOrderDetail | null>
export type UpdateAdminOrder = (orderId: string, input: UpdateOrderInput) => Promise<void>

// ── Admin Analytics ───────────────────────────────────────────

export type AnalyticsPeriod = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '365d'

export type AnalyticsDataPoint = {
  date: string   // YYYY-MM-DD (for 7d/30d), YYYY-MM-DD week start (90d), YYYY-MM-01 (365d)
  amount: number
}

export type AnalyticsCountPoint = {
  date: string
  count: number
}

export type AnalyticsResponse = {
  revenue: AnalyticsDataPoint[]
  orders: AnalyticsCountPoint[]
  summary: {
    totalRevenue: number
    totalOrders: number
    revenueChange: number | null   // % vs previous equal period; null when no baseline
    ordersChange: number | null
  }
}

export type GetAnalytics = (period: AnalyticsPeriod) => Promise<AnalyticsResponse>

// ── Sales ─────────────────────────────────────────────────────

export type SaleScope = 'ALL' | 'CATEGORIES' | 'PRODUCTS'

export type SaleInput = {
  name: string
  discount: number
  startsAt: string
  endsAt: string
  scope: SaleScope
  categoryIds: string[]
  productIds: string[]
}

export type SaleRecord = {
  id: string
  name: string
  discount: number
  startsAt: string
  endsAt: string
  scope: SaleScope
  categoryIds: string[]
  productIds: string[]
  createdAt: string
}

export type ActiveSale = {
  discount: number
  scope: SaleScope
  categoryIds: string[]
  productIds: string[]
}

export type CreateSale = (input: SaleInput) => Promise<{ id: string }>
export type UpdateSale = (id: string, input: SaleInput) => Promise<void>
export type DeleteSale = (id: string) => Promise<void>
export type ListSales = () => Promise<SaleRecord[]>
export type GetActiveSale = () => Promise<ActiveSale | null>
export type CountProductsInSale = (input: Pick<SaleInput, 'scope' | 'categoryIds' | 'productIds'>) => Promise<number>
