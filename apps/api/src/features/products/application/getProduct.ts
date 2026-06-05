import type { GetProduct, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

export function makeGetProduct(repo: ProductRepository, getActiveSale: GetActiveSale): GetProduct {
  return async (slug: string) => {
    const [product, sale] = await Promise.all([repo.findBySlug(slug), getActiveSale()])
    if (!product) return null
    if (!sale) return product

    const applies =
      sale.scope === 'ALL' ||
      (sale.scope === 'CATEGORIES' && !!product.categoryId && sale.categoryIds.includes(product.categoryId)) ||
      (sale.scope === 'PRODUCTS' && sale.productIds.includes(product.id))
    if (!applies) return product

    return {
      ...product,
      salePrice: Math.round(product.price * (1 - sale.discount / 100) * 100) / 100,
      salePercent: sale.discount,
    }
  }
}
