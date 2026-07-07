import { ref, watch } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const ContactMessageSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  message: z.string(),
  createdAt: z.string(),
})

const ContactMessageListResponseSchema = z.object({
  items: z.array(ContactMessageSchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

export type AdminContactMessage = z.infer<typeof ContactMessageSchema>
export type AdminContactMessageListResponse = z.infer<typeof ContactMessageListResponseSchema>

export function useAdminContactMessages() {
  const data = ref<AdminContactMessageListResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const page = ref(1)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/contact-messages?page=${page.value}&limit=20`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load messages')
        return
      }
      data.value = ContactMessageListResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load messages'
    } finally {
      isLoading.value = false
    }
  }

  watch(page, refresh)

  return { data, isLoading, error, page, refresh }
}
