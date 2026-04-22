import { apiPost } from '@/shared'

export function subscribeToNewsletter(email: string): Promise<void> {
  return apiPost('/newsletter/subscribe', { email }, 'Subscription failed')
}
