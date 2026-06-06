export type SaleRule = {
  scope: 'ALL' | 'CATEGORIES' | 'PRODUCTS'
  categoryIds: string[]
  productIds: string[]
  discount: number
}

export function saleApplies(sale: SaleRule, productId: string, categoryId: string): boolean {
  return (
    sale.scope === 'ALL' ||
    (sale.scope === 'CATEGORIES' && sale.categoryIds.includes(categoryId)) ||
    (sale.scope === 'PRODUCTS' && sale.productIds.includes(productId))
  )
}

export function applyDiscount(price: number, discount: number): number {
  return Math.round(price * (1 - discount / 100) * 100) / 100
}
