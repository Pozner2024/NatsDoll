import { ref, watch, effectScope } from 'vue'
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

const scope = effectScope(true)
scope.run(() => {
  watch(isOpen, (v) => {
    v ? lockScroll() : unlockScroll()
  })
})

export function useAuthModal() {
  return { isOpen, mode, open, close }
}
