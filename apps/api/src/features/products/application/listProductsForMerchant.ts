import type { MerchantProductItem, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'
import { salePricing } from '../../../shared/lib'

export function makeListProductsForMerchant(repo: ProductRepository, getActiveSale: GetActiveSale) {
  return async function listProductsForMerchant(): Promise<MerchantProductItem[]> {
    const [products, sale] = await Promise.all([repo.findAllForMerchant(), getActiveSale()])
    return products.map((product) => {
      const { salePrice } = salePricing(product, sale)
      return salePrice === undefined ? product : { ...product, salePrice }
    })
  }
}
