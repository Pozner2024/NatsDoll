import { defineStore } from 'pinia'
import { ref, readonly } from 'vue'
import { sendContactMessage } from './contactApi'

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

const SUCCESS_CLOSE_DELAY_MS = 2000

export const useContactModal = defineStore('contact-modal', () => {
  const isOpen = ref(false)
  const submitStatus = ref<SubmitStatus>('idle')
  const errorMessage = ref('')
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
    errorMessage.value = ''
  }

  function close() {
    clearCloseTimer()
    isOpen.value = false
    submitStatus.value = 'idle'
    errorMessage.value = ''
  }

  async function submit(data: { name: string; email: string; message: string }) {
    submitStatus.value = 'loading'
    errorMessage.value = ''
    try {
      await sendContactMessage(data)
      submitStatus.value = 'success'
      closeTimerId = setTimeout(close, SUCCESS_CLOSE_DELAY_MS)
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      submitStatus.value = 'error'
    }
  }

  return {
    isOpen: readonly(isOpen),
    submitStatus: readonly(submitStatus),
    errorMessage: readonly(errorMessage),
    open,
    close,
    submit,
  }
})
