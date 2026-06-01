import type { AdminRepository, DeleteProduct } from '../types'

export function makeDeleteProduct(repo: AdminRepository): DeleteProduct {
  return (id: string) => repo.deleteProduct(id)
}
