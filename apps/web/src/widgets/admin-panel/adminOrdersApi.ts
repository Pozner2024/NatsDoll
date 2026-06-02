import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { z } from 'zod'
import { authFetch, apiErrorMessage } from '@/shared'

const OrderSummarySchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  userName: z.string(),
  userEmail: z.string(),
  itemCount: z.number(),
  createdAt: z.string(),
})

const OrderItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  productSlug: z.string(),
  productName: z.string(),
  productImage: z.string().nullable(),
  quantity: z.number(),
  price: z.number(),
  subtotal: z.number(),
  message: z.string().nullable(),
})

const ShippingAddressSchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  country: z.string(),
  postalCode: z.string(),
})

const OrderDetailSchema = z.object({
  id: z.string(),
  orderNumber: z.number(),
  status: z.string(),
  totalAmount: z.number(),
  shippingCost: z.number(),
  shippingAddress: ShippingAddressSchema,
  trackingNumber: z.string().nullable(),
  adminNote: z.string().nullable(),
  createdAt: z.string(),
  userName: z.string(),
  userEmail: z.string(),
  items: z.array(OrderItemSchema),
})

const OrderListResponseSchema = z.object({
  items: z.array(OrderSummarySchema),
  total: z.number(),
  page: z.number(),
  totalPages: z.number(),
})

export type AdminOrderSummary = z.infer<typeof OrderSummarySchema>
export type AdminOrderDetail = z.infer<typeof OrderDetailSchema>
export type AdminOrderListResponse = z.infer<typeof OrderListResponseSchema>
export type UpdateOrderInput = {
  status: string
  trackingNumber: string | null
  adminNote: string | null
}

export type AdminOrderFilters = {
  status: string
  search: string
  page: number
}

export function useAdminOrders() {
  const data = ref<AdminOrderListResponse | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const filters = ref<AdminOrderFilters>({ status: '', search: '', page: 1 })

  async function refresh() {
    isLoading.value = true
    error.value = null
    try {
      const params = new URLSearchParams()
      params.set('page', String(filters.value.page))
      params.set('limit', '20')
      if (filters.value.status) params.set('status', filters.value.status)
      if (filters.value.search) params.set('search', filters.value.search)

      const res = await authFetch(`/admin/orders?${params}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load orders')
        return
      }
      data.value = OrderListResponseSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load orders'
    } finally {
      isLoading.value = false
    }
  }

  function setFilter(patch: Partial<AdminOrderFilters>) {
    if (patch.status !== undefined || patch.search !== undefined) {
      filters.value = { ...filters.value, ...patch, page: 1 }
    } else {
      filters.value = { ...filters.value, ...patch }
    }
  }

  watch(filters, refresh, { deep: true })

  return { data, isLoading, error, filters, setFilter, refresh }
}

export function useAdminOrderDetail(orderId: Ref<string | null>) {
  const order = ref<AdminOrderDetail | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function load(id: string) {
    isLoading.value = true
    error.value = null
    try {
      const res = await authFetch(`/admin/orders/${id}`)
      if (!res.ok) {
        error.value = await apiErrorMessage(res, 'Failed to load order')
        return
      }
      order.value = OrderDetailSchema.parse(await res.json())
    } catch {
      error.value = 'Failed to load order'
    } finally {
      isLoading.value = false
    }
  }

  watch(orderId, (id) => {
    if (id) load(id)
    else order.value = null
  })

  return { order, isLoading, error, reload: () => orderId.value ? load(orderId.value) : Promise.resolve() }
}

export async function updateAdminOrder(id: string, payload: UpdateOrderInput): Promise<void> {
  const res = await authFetch(`/admin/orders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const msg = await apiErrorMessage(res, 'Failed to update order')
    throw new Error(msg)
  }
}
