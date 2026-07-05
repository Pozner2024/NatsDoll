import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import type { OrderDetail, OrderSummary, ShippingAddress } from './types'
import { placeOrder, fetchMyOrders, fetchOrder, cancelOrder } from './orderApi'

export const useOrderStore = defineStore('order', () => {
  const currentOrder = ref<OrderDetail | null>(null)
  const myOrders = ref<OrderSummary[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function create(shippingAddress: ShippingAddress): Promise<string> {
    loading.value = true
    error.value = null
    try {
      const order = await placeOrder(shippingAddress)
      currentOrder.value = order
      return order.id
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to place order'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function loadMyOrders(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      myOrders.value = await fetchMyOrders()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load orders'
    } finally {
      loading.value = false
    }
  }

  async function loadOrder(orderId: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      currentOrder.value = await fetchOrder(orderId)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Order not found'
    } finally {
      loading.value = false
    }
  }

  async function cancel(orderId: string): Promise<void> {
    await cancelOrder(orderId)
    myOrders.value = myOrders.value.filter((o) => o.id !== orderId)
  }

  return {
    currentOrder: readonly(currentOrder),
    myOrders: readonly(myOrders),
    loading: readonly(loading),
    error: readonly(error),
    create,
    loadMyOrders,
    loadOrder,
    cancel,
  }
})
