import type { AdminRepository, GetActiveSale } from '../types'

export function makeGetActiveSale(repo: AdminRepository): GetActiveSale {
  return () => repo.getActiveSale()
}
