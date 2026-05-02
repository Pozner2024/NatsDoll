import type { ProductListParams, ProductListResponse, ProductRepository } from '../types'

export function makeListProducts(repo: ProductRepository) {
  return async function listProducts(params: ProductListParams): Promise<ProductListResponse> {
    const { items, total } = await repo.findMany(params)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    return { items, total, page: params.page, totalPages }
  }
}
