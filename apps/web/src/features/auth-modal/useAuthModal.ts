import { defineStore } from 'pinia'
import { ref, watch, readonly } from 'vue'
import { lockScroll, unlockScroll } from '@/shared'

type AuthMode = 'login' | 'register' | 'verify-pending'

export const useAuthModal = defineStore('auth-modal', () => {
  const isOpen = ref(false)
  const mode = ref<AuthMode>('login')

  function open(initialMode: Exclude<AuthMode, 'verify-pending'> = 'login') {
    mode.value = initialMode
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
    mode.value = 'login'
  }

  function showVerifyPending() {
    mode.value = 'verify-pending'
  }

  watch(isOpen, (v) => {
    v ? lockScroll() : unlockScroll()
  })

  return { isOpen: readonly(isOpen), mode: readonly(mode), open, close, showVerifyPending }
})
