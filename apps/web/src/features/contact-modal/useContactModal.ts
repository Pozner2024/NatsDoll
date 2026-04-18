import { defineStore } from 'pinia'
import { ref, watch, readonly } from 'vue'
import { lockScroll, unlockScroll } from '@/shared'
import { sendContactMessage } from './contactApi'

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

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
  }

  async function submit(data: { name: string; email: string; message: string }) {
    submitStatus.value = 'loading'
    errorMessage.value = ''
    try {
      await sendContactMessage(data)
      submitStatus.value = 'success'
      closeTimerId = setTimeout(close, 2000)
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      submitStatus.value = 'error'
    }
  }

  watch(isOpen, (v) => {
    v ? lockScroll() : unlockScroll()
  })

  return {
    isOpen: readonly(isOpen),
    submitStatus: readonly(submitStatus),
    errorMessage: readonly(errorMessage),
    open,
    close,
    submit,
  }
})
