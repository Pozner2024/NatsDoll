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

export interface AdminRepository {
  getDashboardData(): Promise<DashboardResponse>
  markAllMessagesRead(): Promise<void>
}

export type GetDashboard = () => Promise<DashboardResponse>
export type MarkAllMessagesRead = () => Promise<void>
