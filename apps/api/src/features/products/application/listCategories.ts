import type { CategoryListItem, ProductRepository } from '../types'

export function makeListCategories(repo: ProductRepository) {
  return async function listCategories(): Promise<CategoryListItem[]> {
    return repo.listCategories()
  }
}
