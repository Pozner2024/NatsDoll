import { ref } from 'vue'
import { sendContactMessage } from './contactApi'

type SubmitStatus = 'idle' | 'loading' | 'success' | 'error'

const isOpen = ref(false)
const submitStatus = ref<SubmitStatus>('idle')

function open() {
  isOpen.value = true
  submitStatus.value = 'idle'
}

function close() {
  isOpen.value = false
}

async function submit(data: { name: string; email: string; message: string }) {
  submitStatus.value = 'loading'
  try {
    await sendContactMessage(data)
    submitStatus.value = 'success'
    setTimeout(close, 2000)
  } catch {
    submitStatus.value = 'error'
  }
}

export function useContactModal() {
  return { isOpen, submitStatus, open, close, submit }
}
