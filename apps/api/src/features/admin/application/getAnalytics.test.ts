import { describe, it, expect, vi } from 'vitest'
import { makeGetAnalytics } from './getAnalytics'
import type { AdminRepository, AnalyticsResponse } from '../types'

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

const mockResponse: AnalyticsResponse = {
  revenue: [{ date: '2026-05-27', amount: 100 }],
  orders: [{ date: '2026-05-27', count: 3 }],
  summary: { totalRevenue: 100, totalOrders: 3, revenueChange: 10, ordersChange: -5 },
}

describe('getAnalytics', () => {
  it('delegates to repo.getAnalyticsData with the given period', async () => {
    const repo = makeRepo()
    vi.mocked(repo.getAnalyticsData).mockResolvedValue(mockResponse)
    const getAnalytics = makeGetAnalytics(repo)
    const result = await getAnalytics('7d')
    expect(result).toEqual(mockResponse)
    expect(repo.getAnalyticsData).toHaveBeenCalledWith('7d')
  })
})
