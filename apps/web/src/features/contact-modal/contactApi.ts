import { apiFetch } from '@/shared'

export async function sendContactMessage(data: {
  name: string
  email: string
  message: string
}): Promise<void> {
  const res = await apiFetch('/contact', {
    method: 'POST',
    json: data,
  })
  if (!res.ok) throw new Error('Failed to send message')
}
