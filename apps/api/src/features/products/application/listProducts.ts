import type { ProductListParams, ProductListResponse, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'
import { salePricing } from '../../../shared/lib'

export function makeListProducts(repo: ProductRepository, getActiveSale: GetActiveSale) {
  return async function listProducts(params: ProductListParams): Promise<ProductListResponse> {
    const sale = await getActiveSale()
    const { items, total } = await repo.findMany(params, sale)
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    const enriched = items.map((item) => ({
      ...item,
      ...salePricing(item, sale),
    }))
    return { items: enriched, total, page: params.page, totalPages }
  }
}
