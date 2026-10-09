import type { AdminRepository, UpdateCategoryDescription } from '../types'

export function makeUpdateCategoryDescription(repo: AdminRepository): UpdateCategoryDescription {
  return (id: string, description: string) => repo.updateCategoryDescription(id, description.trim())
}
