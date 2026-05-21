import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import type { Cart } from './types'
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from './cartApi'

const EMPTY_CART: Cart = { items: [], totalAmount: 0, itemCount: 0 }

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart>(EMPTY_CART)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loaded = false

  const itemCount = computed(() => cart.value.itemCount)
  const totalAmount = computed(() => cart.value.totalAmount)
  const items = computed(() => cart.value.items)

  async function load(force = false): Promise<void> {
    if (loaded && !force) return
    loading.value = true
    error.value = null
    try {
      cart.value = await fetchCart()
      loaded = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load cart'
    } finally {
      loading.value = false
    }
  }

  async function add(input: { productId: string; quantity: number; message: string | null }): Promise<void> {
    cart.value = await addCartItem(input)
    loaded = true
  }

  async function update(itemId: string, quantity: number): Promise<void> {
    cart.value = await updateCartItem(itemId, quantity)
  }

  async function remove(itemId: string): Promise<void> {
    cart.value = await removeCartItem(itemId)
  }

  function reset(): void {
    cart.value = EMPTY_CART
    loaded = false
    error.value = null
  }

  return {
    cart: readonly(cart),
    items,
    itemCount,
    totalAmount,
    loading: readonly(loading),
    error: readonly(error),
    load,
    add,
    update,
    remove,
    reset,
  }
})
