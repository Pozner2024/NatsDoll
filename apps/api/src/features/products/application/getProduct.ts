import type { GetProduct, ProductRepository } from '../types'

export function makeGetProduct(repo: ProductRepository): GetProduct {
  return (slug: string) => repo.findBySlug(slug)
}
