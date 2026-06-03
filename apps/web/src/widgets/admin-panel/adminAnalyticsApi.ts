import { ref, watch } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const AnalyticsDataPointSchema = z.object({
  date: z.string(),
  amount: z.number(),
})

const AnalyticsCountPointSchema = z.object({
  date: z.string(),
  count: z.number(),
})

const AnalyticsResponseSchema = z.object({
  revenue: z.array(AnalyticsDataPointSchema),
  orders: z.array(AnalyticsCountPointSchema),
  summary: z.object({
    totalRevenue: z.number(),
    totalOrders: z.number(),
    revenueChange: z.number(),
    ordersChange: z.number(),
  }),
})

export type AnalyticsResponse = z.infer<typeof AnalyticsResponseSchema>
export type AnalyticsPeriod = 'today' | 'yesterday' | '7d' | '30d' | '90d' | '365d'

export function useAnalytics(period: ReturnType<typeof ref<AnalyticsPeriod>>) {
  const data = ref<AnalyticsResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/analytics?period=${period.value}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load analytics')
        return
      }
      data.value = AnalyticsResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load analytics'
    } finally {
      isLoading.value = false
    }
  }

  watch(period, refresh, { immediate: true })

  return { data, isLoading, error, refresh }
}
