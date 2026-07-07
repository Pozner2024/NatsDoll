import type { AdminRepository, ListAdminContactMessages, AdminContactMessageListParams, AdminContactMessageListResponse } from '../types'

export function makeListAdminContactMessages(repo: AdminRepository): ListAdminContactMessages {
  return async (params: AdminContactMessageListParams): Promise<AdminContactMessageListResponse> => {
    const { items, total } = await repo.listAdminContactMessages(params)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    return { items, total, page: params.page, totalPages }
  }
}
