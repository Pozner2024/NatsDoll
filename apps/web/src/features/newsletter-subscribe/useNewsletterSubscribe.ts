import { ref } from 'vue'
import { subscribeToNewsletter } from './newsletterApi'

type State = 'idle' | 'loading' | 'success' | 'error'

export function useNewsletterSubscribe() {
  const email = ref('')
  const state = ref<State>('idle')
  const errorMessage = ref('')

  async function handleSubmit() {
    state.value = 'loading'
    errorMessage.value = ''
    try {
      await subscribeToNewsletter(email.value)
      state.value = 'success'
      email.value = ''
    } catch (err) {
      errorMessage.value = err instanceof Error ? err.message : 'Subscription failed'
      state.value = 'error'
    }
  }

  return { email, state, errorMessage, handleSubmit }
}
