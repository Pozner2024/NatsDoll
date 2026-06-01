import type { AdminRepository, CreateProduct, AdminProductInput } from '../types'

export function makeCreateProduct(repo: AdminRepository): CreateProduct {
  return (input: AdminProductInput) => repo.createProduct(input)
}
