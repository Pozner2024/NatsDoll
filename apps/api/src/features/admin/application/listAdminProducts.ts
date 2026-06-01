import type { AdminRepository, ListAdminProducts, AdminProductListParams, AdminProductListResponse } from '../types'

export function makeListAdminProducts(repo: AdminRepository): ListAdminProducts {
  return async function listAdminProducts(params: AdminProductListParams): Promise<AdminProductListResponse> {
    const { items, total } = await repo.listProducts(params)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    return { items, total, page: params.page, totalPages }
  }
}
