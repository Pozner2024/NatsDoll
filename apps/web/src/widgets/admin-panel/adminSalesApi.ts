import { ref, onMounted } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

export const SaleScopeSchema = z.enum(['ALL', 'CATEGORIES', 'PRODUCTS'])

export const SaleRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  discount: z.number(),
  startsAt: z.string(),
  endsAt: z.string(),
  scope: SaleScopeSchema,
  categoryIds: z.array(z.string()),
  productIds: z.array(z.string()),
  createdAt: z.string(),
})

export type SaleRecord = z.infer<typeof SaleRecordSchema>
export type SaleScope = z.infer<typeof SaleScopeSchema>

export type SaleInput = {
  name: string
  discount: number
  startsAt: string
  endsAt: string
  scope: SaleScope
  categoryIds: string[]
  productIds: string[]
}

export function saleStatus(sale: SaleRecord): 'active' | 'scheduled' | 'ended' {
  const now = new Date()
  const start = new Date(sale.startsAt)
  const end = new Date(sale.endsAt)
  if (end < now) return 'ended'
  if (start > now) return 'scheduled'
  return 'active'
}

export function useAdminSales() {
  const sales = ref<SaleRecord[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load() {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch('/admin/sales')
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load sales')
        return
      }
      sales.value = z.array(SaleRecordSchema).parse(await res.json())
    } catch {
      error.value = 'Failed to load sales'
    } finally {
      isLoading.value = false
    }
  }

  async function deleteSale(id: string) {
    const res = await authFetch(`/admin/sales/${id}`, { method: 'DELETE' })
    if (!res.ok) return
    await load()
  }

  onMounted(load)
  return { sales, isLoading, error, load, deleteSale }
}

export async function saveSale(id: string | null, input: SaleInput): Promise<{ ok: boolean; error?: string }> {
  const url = id ? `/admin/sales/${id}` : '/admin/sales'
  const method = id ? 'PUT' : 'POST'
  try {
    const res = await authFetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) return { ok: false, error: await apiErrorMessage(res, 'Failed to save sale') }
    return { ok: true }
  } catch {
    return { ok: false, error: 'Network error' }
  }
}

export async function fetchSalePreviewCount(
  input: Pick<SaleInput, 'scope' | 'categoryIds' | 'productIds'>,
): Promise<number | null> {
  try {
    const params = new URLSearchParams()
    params.set('scope', input.scope)
    if (input.scope === 'CATEGORIES') params.set('categoryIds', input.categoryIds.join(','))
    if (input.scope === 'PRODUCTS') params.set('productIds', input.productIds.join(','))
    const res = await authFetch(`/admin/sales/preview-count?${params}`)
    if (!res.ok) return null
    const data = await res.json() as { count: number }
    return data.count
  } catch {
    return null
  }
}
