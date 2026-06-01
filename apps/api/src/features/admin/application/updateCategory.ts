import type { AdminRepository, UpdateCategory } from '../types'

export function makeUpdateCategory(repo: AdminRepository): UpdateCategory {
  return (id: string, name: string, slug: string) => repo.updateCategory(id, name, slug)
}
