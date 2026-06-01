import type { AdminRepository, CreateCategory } from '../types'

export function makeCreateCategory(repo: AdminRepository): CreateCategory {
  return (name: string, slug: string) => repo.createCategory(name, slug)
}
