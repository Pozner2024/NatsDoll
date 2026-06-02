import type { AdminRepository, ListAdminOrders, AdminOrderListParams, AdminOrderListResponse } from '../types'

export function makeListAdminOrders(repo: AdminRepository): ListAdminOrders {
  return async (params: AdminOrderListParams): Promise<AdminOrderListResponse> => {
    const LIMIT = params.limit
    const { items, total } = await repo.listAdminOrders(params)
    return {
      items,
      total,
      page: params.page,
      totalPages: Math.ceil(total / LIMIT),
    }
  }
}
