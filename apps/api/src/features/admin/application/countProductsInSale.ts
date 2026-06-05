import type { AdminRepository, CountProductsInSale } from '../types'

export function makeCountProductsInSale(repo: AdminRepository): CountProductsInSale {
  return (input) => repo.countProductsInSale(input)
}
