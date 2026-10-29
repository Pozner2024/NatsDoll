import type { PinterestProductItem, ProductRepository } from '../types'

export function makeListProductsForPinterest(repo: ProductRepository) {
  return async function listProductsForPinterest(): Promise<PinterestProductItem[]> {
    return repo.findAllForPinterest()
  }
}
