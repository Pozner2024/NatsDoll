import { ref, readonly } from 'vue'
import { useOrderStore } from '@/entities/order'
import type { ShippingAddress } from '@/entities/order'
import { useAddressStore } from '@/entities/address'
import type { Address } from '@/entities/address'
import { createGuestOrder, GuestEmailTakenError } from './guestCheckoutApi'

export type PreparedOrder = { orderId: string; orderNumber: number; amountUsd: number }

type GuestParams = {
  email: string
  items: { productId: string; quantity: number; message: string | null }[]
  amountUsd: number
}

function addressInBook(addresses: ReadonlyArray<Address>, a: ShippingAddress): boolean {
  return addresses.some(x =>
    x.fullName === a.fullName
    && x.line1 === a.line1
    && (x.line2 ?? '') === (a.line2 ?? '')
    && x.city === a.city
    && x.country === a.country
    && x.postalCode === a.postalCode,
  )
}

export function usePendingOrder() {
  const orderStore = useOrderStore()
  const addressStore = useAddressStore()
  const pending = ref<PreparedOrder | null>(null)
  const error = ref('')

  async function saveAddressToBook(address: ShippingAddress): Promise<void> {
    if (addressInBook(addressStore.addresses, address)) return
    try {
      await addressStore.add(address)
    } catch {
      void 0
    }
  }

  async function prepare(address: ShippingAddress, guestParams?: GuestParams): Promise<PreparedOrder | null> {
    if (pending.value) return pending.value
    error.value = ''
    try {
      if (guestParams) {
        const { orderId, orderNumber } = await createGuestOrder({
          email: guestParams.email,
          shippingAddress: address,
          items: guestParams.items,
        })
        pending.value = { orderId, orderNumber, amountUsd: guestParams.amountUsd }
        return pending.value
      }
      const orderId = await orderStore.create(address)
      const order = orderStore.currentOrder
      if (!order) {
        error.value = 'Could not create order'
        return null
      }
      await saveAddressToBook(address)
      pending.value = { orderId, orderNumber: order.orderNumber, amountUsd: order.totalAmount }
      return pending.value
    } catch (e) {
      if (e instanceof GuestEmailTakenError) throw e
      error.value = e instanceof Error ? e.message : 'Could not create order'
      return null
    }
  }

  return { pending: readonly(pending), error: readonly(error), prepare }
}
