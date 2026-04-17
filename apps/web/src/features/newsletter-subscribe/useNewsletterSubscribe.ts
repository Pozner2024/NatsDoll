import { ref } from 'vue'
import { z } from 'zod'
import { subscribeToNewsletter } from './newsletterApi'

type State = 'idle' | 'loading' | 'success' | 'error'

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: 'Please enter your email' })
  .email({ message: 'Invalid email format' })

export function useNewsletterSubscribe() {
  const email = ref('')
  const state = ref<State>('idle')
  const errorMessage = ref('')

  async function handleSubmit() {
    const parsed = emailSchema.safeParse(email.value)
    if (!parsed.success) {
      errorMessage.value = parsed.error.issues[0]?.message ?? 'Invalid email format'
      state.value = 'error'
      return
    }

    state.value = 'loading'
    errorMessage.value = ''
    try {
      await subscribeToNewsletter(parsed.data)
      state.value = 'success'
      email.value = ''
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Subscription failed'
      state.value = 'error'
    }
  }

  return { email, state, errorMessage, handleSubmit }
}
