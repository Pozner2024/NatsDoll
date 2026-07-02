export type ShippingAddress = {
  fullName: string
  line1: string
  line2?: string
  city: string
  country: string
  postalCode: string
}

export type OrderItemView = {
  id: string
  productId: string
  productSlug: string
  productName: string
  productImage: string | null
  quantity: number
  price: number
  originalPrice: number | null
  subtotal: number
  message: string | null
}

export type OrderDetail = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  createdAt: string
  paymentClaimed: boolean
  items: OrderItemView[]
}

export type OrderSummary = {
  id: string
  orderNumber: number
  status: string
  totalAmount: number
  itemCount: number
  createdAt: string
  firstItemImage: string | null
}
