import type { AdminRepository, UpdateProduct, AdminProductInput } from '../types'

export function makeUpdateProduct(repo: AdminRepository): UpdateProduct {
  return (id: string, input: AdminProductInput) => repo.updateProduct(id, input)
}
