import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const DashboardStatsSchema = z.object({
  ordersToday: z.number(),
  revenueToday: z.number(),
  revenueMonth: z.number(),
  newMessages: z.number(),
  activeListings: z.number(),
})

const RecentOrderSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  createdAt: z.string(),
  userName: z.string(),
})

const RecentMessageSchema = z.object({
  id: z.string(),
  text: z.string(),
  createdAt: z.string(),
  userName: z.string(),
  orderNumber: z.number().nullable(),
  isReadByAdmin: z.boolean(),
})

const DashboardResponseSchema = z.object({
  stats: DashboardStatsSchema,
  recentOrders: z.array(RecentOrderSchema),
  recentMessages: z.array(RecentMessageSchema),
})

export type DashboardResponse = z.infer<typeof DashboardResponseSchema>
export type RecentOrder = z.infer<typeof RecentOrderSchema>
export type RecentMessage = z.infer<typeof RecentMessageSchema>

export function useDashboard() {
  const data = ref<DashboardResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/dashboard')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load dashboard data')
        return
      }
      data.value = DashboardResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load dashboard data'
    } finally {
      isLoading.value = false
    }
  }

  onMounted(refresh)

  return { data, isLoading, error, refresh }
}
