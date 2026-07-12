import { describe, it, expect, vi } from 'vitest'
import { makeGetDashboard } from './getDashboard'
import type { AdminRepository, DashboardResponse } from '../types'

function makeRepo(): AdminRepository {
  return {
    getDashboardData: vi.fn(),
    markAllMessagesRead: vi.fn(),
    listConversations: vi.fn(),
    getConversation: vi.fn(),
    replyToUser: vi.fn(),
    markConversationRead: vi.fn(),
    listProducts: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    togglePublish: vi.fn(),
    moveProductCategory: vi.fn(),
    listCategoriesWithCount: vi.fn(),
    createCategory: vi.fn(),
    updateCategory: vi.fn(),
    deleteCategory: vi.fn(),
    getProduct: vi.fn(),
    listAdminOrders: vi.fn(),
    getAdminOrder: vi.fn(),
    updateAdminOrder: vi.fn(),
    getAnalyticsData: vi.fn(),
    createSale: vi.fn(),
    updateSale: vi.fn(),
    deleteSale: vi.fn(),
    listSales: vi.fn().mockResolvedValue([]),
    getActiveSale: vi.fn().mockResolvedValue(null),
    countProductsInSale: vi.fn().mockResolvedValue(0),
    listAdminContactMessages: vi.fn(),
    getAllProductImageUrls: vi.fn().mockResolvedValue([]),
  }
}

const mockResponse: DashboardResponse = {
  stats: {
    ordersToday: 3,
    revenueToday: 150.5,
    revenueMonth: 2400,
    newMessages: 2,
    activeListings: 12,
  },
  recentOrders: [],
  recentMessages: [],
}

describe('getDashboard', () => {
  it('delegates to repo.getDashboardData', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getDashboardData).mockResolvedValue(mockResponse)
    const getDashboard = makeGetDashboard(repo)
    const result = await getDashboard()
    expect(result).toEqual(mockResponse)
    expect(repo.getDashboardData).toHaveBeenCalledOnce()
  })
})
