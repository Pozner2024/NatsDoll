import type { AdminRepository, MoveProductCategory } from '../types'

export function makeMoveProductCategory(repo: AdminRepository): MoveProductCategory {
  return (id: string, categoryId: string) => repo.moveProductCategory(id, categoryId)
}
