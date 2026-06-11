import type { SitemapProductItem, ProductRepository } from '../types'

export function makeListProductsForSitemap(repo: ProductRepository) {
  return async function listProductsForSitemap(): Promise<SitemapProductItem[]> {
    return repo.findAllForSitemap()
  }
}
