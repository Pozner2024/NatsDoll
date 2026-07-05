import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOrderStore } from './store'
import * as api from './orderApi'

vi.mock('./orderApi')

const mockAddress = {
  fullName: 'Natasha', line1: '123 St', city: 'NY', country: 'US', postalCode: '10001',
}

const mockOrder = {
  id: 'order-1', orderNumber: 1, status: 'PENDING', totalAmount: 20, shippingCost: 0,
  shippingAddress: mockAddress, createdAt: '2026-05-21T00:00:00.000Z', paymentClaimed: false, items: [],
}

describe('useOrderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('initial state is empty', () => {
    const store = useOrderStore()
    expect(store.currentOrder).toBeNull()
    expect(store.myOrders).toEqual([])
    expect(store.loading).toBe(false)
  })

  it('create() places order and returns orderId', async () => {
    vi.mocked(api.placeOrder).mockResolvedValue(mockOrder)
    const store = useOrderStore()
    const id = await store.create(mockAddress)
    expect(id).toBe('order-1')
    expect(store.currentOrder?.id).toBe('order-1')
  })

  it('create() throws and sets error on failure', async () => {
    vi.mocked(api.placeOrder).mockRejectedValue(new Error('Cart is empty'))
    const store = useOrderStore()
    await expect(store.create(mockAddress)).rejects.toThrow('Cart is empty')
    expect(store.error).toBe('Cart is empty')
  })

  it('loadOrder() sets currentOrder', async () => {
    vi.mocked(api.fetchOrder).mockResolvedValue(mockOrder)
    const store = useOrderStore()
    await store.loadOrder('order-1')
    expect(store.currentOrder?.id).toBe('order-1')
  })

  it('loadMyOrders() sets myOrders', async () => {
    vi.mocked(api.fetchMyOrders).mockResolvedValue([
      { id: 'o1', orderNumber: 1, status: 'PENDING', totalAmount: 20, itemCount: 1,
        createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null },
    ])
    const store = useOrderStore()
    await store.loadMyOrders()
    expect(store.myOrders).toHaveLength(1)
  })

  it('cancel() removes the order from myOrders', async () => {
    vi.mocked(api.fetchMyOrders).mockResolvedValue([
      { id: 'o1', orderNumber: 1, status: 'PENDING', totalAmount: 20, itemCount: 1,
        createdAt: '2026-05-21T00:00:00.000Z', firstItemImage: null },
    ])
    vi.mocked(api.cancelOrder).mockResolvedValue(undefined)
    const store = useOrderStore()
    await store.loadMyOrders()
    await store.cancel('o1')
    expect(store.myOrders).toHaveLength(0)
    expect(api.cancelOrder).toHaveBeenCalledWith('o1')
  })
})
