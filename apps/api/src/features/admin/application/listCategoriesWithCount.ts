import type { AdminRepository, ListCategoriesWithCount } from '../types'

export function makeListCategoriesWithCount(repo: AdminRepository): ListCategoriesWithCount {
  return () => repo.listCategoriesWithCount()
}
