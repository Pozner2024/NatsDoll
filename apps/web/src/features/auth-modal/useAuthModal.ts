import { ref, watch } from 'vue'

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
  document.body.style.overflow = open ? 'hidden' : ''
})

export function useAuthModal() {
  return { isOpen, mode, open, close }
}
