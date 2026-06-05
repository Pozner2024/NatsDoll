export type CartItemView = {
  id: string
  productId: string
  productCategoryId: string
  productSlug: string
  productName: string
  productImage: string | null
  unitPrice: number
  quantity: number
  subtotal: number
  message: string | null
}

export type CartView = {
  items: CartItemView[]
  totalAmount: number
  itemCount: number
}

export type AddToCartParams = {
  userId: string
  productId: string
  quantity: number
  message: string | null
}

export type UpdateQuantityParams = {
  userId: string
  itemId: string
  quantity: number
}

export type AddToCart = (params: AddToCartParams) => Promise<CartView>
export type GetCart = (userId: string) => Promise<CartView>
export type UpdateQuantity = (params: UpdateQuantityParams) => Promise<CartView>
export type RemoveFromCart = (userId: string, itemId: string) => Promise<CartView>

export type ProductSnapshot = {
  id: string
  price: number
  stock: number
  messageOptions: string[]
  isAvailable: boolean
}

export interface CartRepository {
  getOrCreateCartId(userId: string): Promise<string>
  findProductForCart(productId: string): Promise<ProductSnapshot | null>
  findCartItem(cartId: string, productId: string, message: string | null): Promise<{ id: string; quantity: number } | null>
  findCartItemById(itemId: string): Promise<{ id: string; cartId: string; productId: string } | null>
  createCartItem(cartId: string, productId: string, quantity: number, message: string | null): Promise<void>
  updateCartItemQuantity(itemId: string, quantity: number): Promise<void>
  deleteCartItem(itemId: string): Promise<void>
  getCartView(userId: string): Promise<CartView>
}
