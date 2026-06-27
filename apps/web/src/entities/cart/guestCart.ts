export type GuestCartItem = {
  productId: string
  quantity: number
  message: string | null
  productName: string
  productImage: string | null
  productPrice: number
}

export type GuestCheckoutItem = {
  productId: string
  quantity: number
  message: string | null
}

const STORAGE_KEY = 'natsdoll_guest_cart'

export function loadGuestItems(): GuestCartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as GuestCartItem[]
  } catch {
    return []
  }
}

export function saveGuestItems(items: GuestCartItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export function clearGuestItems(): void {
  localStorage.removeItem(STORAGE_KEY)
}

export function addGuestItem(
  items: GuestCartItem[],
  input: {
    productId: string
    quantity: number
    message: string | null
    productName: string
    productImage: string | null
    productPrice: number
  },
): GuestCartItem[] {
  const existing = items.find(i => i.productId === input.productId)
  if (existing) {
    return items.map(i =>
      i.productId === input.productId
        ? { ...i, quantity: i.quantity + input.quantity, message: input.message }
        : i,
    )
  }
  return [...items, { ...input }]
}

export function updateGuestItem(items: GuestCartItem[], productId: string, quantity: number): GuestCartItem[] {
  return items.map(i => (i.productId === productId ? { ...i, quantity } : i))
}

export function removeGuestItem(items: GuestCartItem[], productId: string): GuestCartItem[] {
  return items.filter(i => i.productId !== productId)
}

export function guestItemCount(items: GuestCartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0)
}

export function guestTotalAmount(items: GuestCartItem[]): number {
  return items.reduce((sum, i) => sum + i.productPrice * i.quantity, 0)
}
