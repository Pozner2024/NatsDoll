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
  subtotal: number
  message: string | null
}

export type OrderDetail = {
  id: string
  orderNumber: number
  userId: string
  status: string
  totalAmount: number
  shippingCost: number
  shippingAddress: ShippingAddress
  trackingNumber: string | null
  createdAt: string
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

export type CartItemForCheckout = {
  id: string
  productId: string
  productName: string
  productImage: string | null
  productPrice: number
  productStock: number
  productIsAvailable: boolean
  quantity: number
  message: string | null
}

export type CreateOrder = (userId: string, shippingAddress: ShippingAddress) => Promise<OrderDetail>
export type GetMyOrders = (userId: string) => Promise<OrderSummary[]>
export type GetOrder = (userId: string, orderId: string) => Promise<OrderDetail>

export interface OrderRepository {
  getCartItemsForCheckout(userId: string): Promise<CartItemForCheckout[]>
  createOrderFromCart(
    userId: string,
    items: CartItemForCheckout[],
    totalAmount: number,
    shippingCost: number,
    shippingAddress: ShippingAddress,
  ): Promise<OrderDetail>
  getMyOrders(userId: string): Promise<OrderSummary[]>
  getOrderById(orderId: string): Promise<OrderDetail | null>
}
