import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import type { Cart } from './types'
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from './cartApi'

const emptyCart = (): Cart => ({ items: [], totalAmount: 0, itemCount: 0 })

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart>(emptyCart())
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loaded = false

  const itemCount = computed(() => cart.value.itemCount)
  const totalAmount = computed(() => cart.value.totalAmount)
  const items = computed(() => cart.value.items)

  // Сериализуем мутации корзины, чтобы параллельные клики (+/-/удаление)
  // применялись строго по порядку и ответы не приходили вразнобой.
  let mutationChain: Promise<unknown> = Promise.resolve()

  function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = mutationChain.then(op, op)
    mutationChain = run.catch(() => {})
    return run
  }

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
    cart.value = await enqueue(() => addCartItem(input))
    loaded = true
  }

  async function update(itemId: string, quantity: number): Promise<void> {
    cart.value = await enqueue(() => updateCartItem(itemId, quantity))
  }

  async function remove(itemId: string): Promise<void> {
    cart.value = await enqueue(() => removeCartItem(itemId))
  }

  function reset(): void {
    cart.value = emptyCart()
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
