import { ref, watch } from 'vue'
import { lockScroll, unlockScroll } from '@/shared'
import { sendContactMessage } from './contactApi'

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

const isOpen = ref(false)
const submitStatus = ref<SubmitStatus>('idle')
let closeTimerId: ReturnType<typeof setTimeout> | null = null

function clearCloseTimer() {
  if (closeTimerId !== null) {
    clearTimeout(closeTimerId)
    closeTimerId = null
  }
}

function open() {
  clearCloseTimer()
  isOpen.value = true
  submitStatus.value = 'idle'
}

function close() {
  clearCloseTimer()
  isOpen.value = false
}

async function submit(data: { name: string; email: string; message: string }) {
  submitStatus.value = 'loading'
  try {
    await sendContactMessage(data)
    submitStatus.value = 'success'
    closeTimerId = setTimeout(close, 2000)
  } catch {
    submitStatus.value = 'error'
  }
}

watch(isOpen, (open) => {
  open ? lockScroll() : unlockScroll()
})

export function useContactModal() {
  return { isOpen, submitStatus, open, close, submit }
}
