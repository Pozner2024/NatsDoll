export type CartItem = {
  id: string
  productId: string
  productSlug: string
  productName: string
  productImage: string | null
  unitPrice: number
  originalUnitPrice?: number
  quantity: number
  subtotal: number
  message: string | null
}

export type Cart = {
  items: CartItem[]
  totalAmount: number
  itemCount: number
}
