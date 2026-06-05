import type { ProductListParams, ProductListResponse, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

function applySaleToItem(
  item: { id: string; price: number; categoryId?: string },
  sale: Awaited<ReturnType<GetActiveSale>>,
): { salePrice?: number; salePercent?: number } {
  if (!sale) return {}
  const applies =
    sale.scope === 'ALL' ||
    (sale.scope === 'CATEGORIES' && !!item.categoryId && sale.categoryIds.includes(item.categoryId)) ||
    (sale.scope === 'PRODUCTS' && sale.productIds.includes(item.id))
  if (!applies) return {}
  return {
    salePrice: Math.round(item.price * (1 - sale.discount / 100) * 100) / 100,
    salePercent: sale.discount,
  }
}

export function makeListProducts(repo: ProductRepository, getActiveSale: GetActiveSale) {
  return async function listProducts(params: ProductListParams): Promise<ProductListResponse> {
    const [{ items, total }, sale] = await Promise.all([
      repo.findMany(params),
      getActiveSale(),
    ])
    const totalPages = total === 0 ? 0 : Math.ceil(total / params.limit)
    const enriched = items.map((item) => ({
      ...item,
      ...applySaleToItem(item, sale),
    }))
    return { items: enriched, total, page: params.page, totalPages }
  }
}
