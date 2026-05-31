import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'
import type { MessageView, SendMessageData } from './types'

const messageSchema = z.object({
  id: z.string(),
  text: z.string(),
  orderId: z.string().nullable(),
  orderNumber: z.number().nullable(),
  createdAt: z.string(),
})

export async function fetchMyMessages(): Promise<MessageView[]> {
  const res = await authFetch('/me/messages')
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to load messages'))
  return z.array(messageSchema).parse(await res.json())
}

export async function postMessage(data: SendMessageData): Promise<void> {
  const res = await authFetch('/me/messages', { method: 'POST', json: data })
  if (!res.ok) throw new Error(await apiErrorMessage(res, 'Failed to send message'))
}
