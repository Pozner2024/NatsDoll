import type { AdminRepository, ListSales } from '../types'

export function makeListSales(repo: AdminRepository): ListSales {
  return () => repo.listSales()
}
