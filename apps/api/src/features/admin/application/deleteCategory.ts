import type { AdminRepository, DeleteCategory } from '../types'

export function makeDeleteCategory(repo: AdminRepository): DeleteCategory {
  return (id: string) => repo.deleteCategory(id)
}
