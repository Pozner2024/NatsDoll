import type { AdminRepository, DeleteSale } from '../types'

export function makeDeleteSale(repo: AdminRepository): DeleteSale {
  return (id: string) => repo.deleteSale(id)
}
