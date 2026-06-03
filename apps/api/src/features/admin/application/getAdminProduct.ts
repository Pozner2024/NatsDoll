import type { AdminRepository, GetAdminProduct } from '../types'

export function makeGetAdminProduct(repo: AdminRepository): GetAdminProduct {
  return (id: string) => repo.getProduct(id)
}
