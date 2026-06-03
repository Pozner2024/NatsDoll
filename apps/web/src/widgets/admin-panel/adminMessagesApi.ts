import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const ConversationPreviewSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  lastMessageText: z.string(),
  lastMessageAt: z.string(),
  unreadCount: z.number(),
})

const ConversationMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  fromAdmin: z.boolean(),
  orderId: z.string().nullable(),
  orderNumber: z.number().nullable(),
  createdAt: z.string(),
})

const ConversationDetailSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  messages: z.array(ConversationMessageSchema),
  userOrders: z.array(z.object({
    id: z.string(),
    orderNumber: z.number(),
    createdAt: z.string(),
  })),
})

export type ConversationPreview = z.infer<typeof ConversationPreviewSchema>
export type ConversationMessage = z.infer<typeof ConversationMessageSchema>
export type ConversationDetail = z.infer<typeof ConversationDetailSchema>

export function useConversations() {
  const conversations = ref<ConversationPreview[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/messages/conversations')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load conversations')
        return
      }
      conversations.value = z.array(ConversationPreviewSchema).parse(await res.json())
    } catch {
      error.value = 'Failed to load conversations'
    } finally {
      isLoading.value = false
    }
  }

  return { conversations, isLoading, error, refresh }
}

export function useConversationThread(userId: Ref<string | null>) {
  const thread = ref<ConversationDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/messages/conversations/${id}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load conversation')
        return
      }
      thread.value = ConversationDetailSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load conversation'
    } finally {
      isLoading.value = false
    }
  }

  watch(userId, (id) => {
    if (id) load(id)
    else thread.value = null
  })

  return { thread, isLoading, error, reload: () => userId.value ? load(userId.value) : Promise.resolve() }
}

export async function replyToUser(payload: { userId: string; text: string; orderId?: string }): Promise<void> {
  const res = await authFetch('/admin/messages/reply', {
    method: 'POST',
    json: payload,
  })
  if (!res.ok) {
    const msg = await apiErrorMessage(res, 'Failed to send reply')
    throw new Error(msg)
  }
}

export async function markConversationRead(userId: string): Promise<void> {
  await authFetch(`/admin/messages/conversations/${userId}/mark-read`, { method: 'PATCH' })
}
