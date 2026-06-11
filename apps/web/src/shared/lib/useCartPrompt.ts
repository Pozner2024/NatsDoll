import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'

export const useCartPrompt = defineStore('cart-prompt', () => {
  const isOpen = ref(false)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return { isOpen: readonly(isOpen), open, close }
})
