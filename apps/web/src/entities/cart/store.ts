import { defineStore } from 'pinia'
import { computed, ref, readonly } from 'vue'
import type { Cart, CartItem } from './types'
import {
  fetchCart,
  addCartItem,
  updateCartItem,
  removeCartItem,
} from './cartApi'
import {
  type GuestCartItem,
  loadGuestItems,
  saveGuestItems,
  clearGuestItems,
  addGuestItem,
  updateGuestItem,
  removeGuestItem,
  guestItemCount,
  guestTotalAmount,
} from './guestCart'
import { useAuthStore } from '@/entities/user'

const emptyCart = (): Cart => ({ items: [], totalAmount: 0, itemCount: 0 })

function toCartItem(g: GuestCartItem): CartItem {
  return {
    id: g.productId,
    productId: g.productId,
    productSlug: g.productSlug,
    productName: g.productName,
    productImage: g.productImage,
    unitPrice: g.productPrice,
    quantity: g.quantity,
    subtotal: g.productPrice * g.quantity,
    message: g.message,
  }
}

export const useCartStore = defineStore('cart', () => {
  const cart = ref<Cart>(emptyCart())
  const guestItemsRef = ref<GuestCartItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  let loaded = false

  const items = computed<CartItem[]>(() => {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return guestItemsRef.value.map(toCartItem)
    return cart.value.items
  })

  const itemCount = computed(() => {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return guestItemCount(guestItemsRef.value)
    return cart.value.itemCount
  })

  const totalAmount = computed(() => {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) return guestTotalAmount(guestItemsRef.value)
    return cart.value.totalAmount
  })

  // Payload для /orders/guest (Task 12).
  // Для залогиненных пользователей маппит серверные items — на случай shared-компонентов.
  const guestItems = computed(() =>
    guestItemsRef.value.map(({ productId, quantity, message }) => ({ productId, quantity, message })),
  )

  // Сериализуем мутации корзины, чтобы параллельные клики (+/-/удаление)
  // применялись строго по порядку и ответы не приходили вразнобой.
  let mutationChain: Promise<unknown> = Promise.resolve()

  function enqueue<T>(op: () => Promise<T>): Promise<T> {
    const run = mutationChain.then(op, op)
    mutationChain = run.catch(() => {})
    return run
  }

  async function load(force = false): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      guestItemsRef.value = loadGuestItems()
      loaded = true
      return
    }
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

  // Вызывается из setAuth при входе: переносит гостевую корзину (localStorage)
  // в серверную, затем грузит серверную. Товар, который не влез в сток или
  // недоступен, молча пропускается — вход не должен падать из-за корзины.
  // Идёт через enqueue, чтобы сериализоваться с пользовательскими мутациями.
  async function mergeGuestCart(): Promise<void> {
    const pending = loadGuestItems()
    if (pending.length === 0) {
      await load(true)
      return
    }
    loading.value = true
    error.value = null
    try {
      const { latest, kept } = await enqueue(async () => {
        let latest: Cart | null = null
        const kept: GuestCartItem[] = []
        for (const g of pending) {
          try {
            latest = await addCartItem({ productId: g.productId, quantity: g.quantity, message: g.message })
          } catch (e) {
            // 4xx — товар постоянно неприменим (нет стока/недоступен/нужна надпись): отбрасываем.
            // 5xx или сетевая ошибка (статуса нет) — транзиент: сохраняем, чтобы не потерять молча.
            const status = (e as { status?: number }).status
            if (status === undefined || status >= 500) kept.push(g)
          }
        }
        return { latest, kept }
      })
      // Ни один товар не удалось перенести — не трогаем гостевую корзину, иначе
      // она пропадёт молча. Показываем текущую серверную корзину как есть.
      if (latest === null) {
        await load(true)
        return
      }
      cart.value = latest
      // Успешные удалены; в гостевой корзине оставляем только упавшие по транзиентной ошибке.
      if (kept.length > 0) {
        saveGuestItems(kept)
        guestItemsRef.value = kept
      } else {
        clearGuestItems()
        guestItemsRef.value = []
      }
      loaded = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load cart'
    } finally {
      loading.value = false
    }
  }

  async function add(input: {
    productId: string
    quantity: number
    message: string | null
    productSlug?: string
    productName?: string
    productImage?: string | null
    productPrice?: number
  }): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      const updated = addGuestItem(guestItemsRef.value, {
        productId: input.productId,
        productSlug: input.productSlug ?? '',
        quantity: input.quantity,
        message: input.message,
        productName: input.productName ?? '',
        productImage: input.productImage ?? null,
        productPrice: input.productPrice ?? 0,
      })
      guestItemsRef.value = updated
      saveGuestItems(updated)
      loaded = true
      return
    }
    cart.value = await enqueue(() =>
      addCartItem({ productId: input.productId, quantity: input.quantity, message: input.message }),
    )
    loaded = true
  }

  async function update(itemId: string, quantity: number): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      const updated = updateGuestItem(guestItemsRef.value, itemId, quantity)
      guestItemsRef.value = updated
      saveGuestItems(updated)
      return
    }
    cart.value = await enqueue(() => updateCartItem(itemId, quantity))
  }

  async function remove(itemId: string): Promise<void> {
    const auth = useAuthStore()
    if (!auth.isLoggedIn) {
      const updated = removeGuestItem(guestItemsRef.value, itemId)
      guestItemsRef.value = updated
      saveGuestItems(updated)
      return
    }
    cart.value = await enqueue(() => removeCartItem(itemId))
  }

  function reset(): void {
    cart.value = emptyCart()
    guestItemsRef.value = []
    clearGuestItems()
    loaded = false
    error.value = null
  }

  return {
    cart: readonly(cart),
    items,
    itemCount,
    totalAmount,
    guestItems,
    loading: readonly(loading),
    error: readonly(error),
    load,
    mergeGuestCart,
    add,
    update,
    remove,
    reset,
  }
})
