import { apiPost } from '@/shared'

export function sendContactMessage(data: {
  name: string
  email: string
  message: string
}): Promise<void> {
  return apiPost('/contact', data, 'Failed to send message')
}
