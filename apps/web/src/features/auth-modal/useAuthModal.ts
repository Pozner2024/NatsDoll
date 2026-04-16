import { ref, watch } from 'vue'
import { lockScroll, unlockScroll } from '@/shared'

type AuthMode = 'login' | 'register'

const isOpen = ref(false)
const mode = ref<AuthMode>('login')

function open(initialMode: AuthMode = 'login') {
  mode.value = initialMode
  isOpen.value = true
}

function close() {
  isOpen.value = false
}

watch(isOpen, (open) => {
  open ? lockScroll() : unlockScroll()
})

export function useAuthModal() {
  return { isOpen, mode, open, close }
}
