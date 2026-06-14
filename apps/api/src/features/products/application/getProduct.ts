import type { GetProduct, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'
import { salePricing } from '../../../shared/lib'

export function makeGetProduct(repo: ProductRepository, getActiveSale: GetActiveSale): GetProduct {
  return async (slug: string) => {
    const [product, sale] = await Promise.all([repo.findBySlug(slug), getActiveSale()])
    if (!product) return null
    return { ...product, ...salePricing(product, sale) }
  }
}
