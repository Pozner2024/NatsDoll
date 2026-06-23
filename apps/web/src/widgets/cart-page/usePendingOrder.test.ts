import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePendingOrder } from './usePendingOrder'
import { useOrderStore } from '@/entities/order'
import { useAddressStore } from '@/entities/address'

const address = {
  fullName: 'Nat', line1: '1 St', city: 'NY', country: 'US', postalCode: '10001',
}
const order = {
  id: 'ord-1', orderNumber: 42, status: 'PENDING', totalAmount: 37, shippingCost: 12,
  shippingAddress: address, createdAt: '2026-06-23T00:00:00.000Z', items: [],
}

describe('usePendingOrder', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('создаёт заказ и возвращает orderId/orderNumber/amountUsd', async () => {
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'create').mockResolvedValue('ord-1')
    vi.spyOn(orderStore, 'currentOrder', 'get').mockReturnValue(order)
    vi.spyOn(useAddressStore(), 'add').mockResolvedValue()

    const { prepare, pending } = usePendingOrder()
    const result = await prepare(address)

    expect(result).toEqual({ orderId: 'ord-1', orderNumber: 42, amountUsd: 37 })
    expect(pending.value).toEqual(result)
  })

  it('переиспользует заказ: повторный prepare не создаёт новый', async () => {
    const orderStore = useOrderStore()
    const createSpy = vi.spyOn(orderStore, 'create').mockResolvedValue('ord-1')
    vi.spyOn(orderStore, 'currentOrder', 'get').mockReturnValue(order)
    vi.spyOn(useAddressStore(), 'add').mockResolvedValue()

    const { prepare } = usePendingOrder()
    await prepare(address)
    await prepare(address)

    expect(createSpy).toHaveBeenCalledTimes(1)
  })

  it('при ошибке create возвращает null и пишет error', async () => {
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'create').mockRejectedValue(new Error('Not enough stock'))

    const { prepare, error, pending } = usePendingOrder()
    const result = await prepare(address)

    expect(result).toBeNull()
    expect(error.value).toBe('Not enough stock')
    expect(pending.value).toBeNull()
  })

  it('сохраняет адрес в книгу, если такого там ещё нет', async () => {
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'create').mockResolvedValue('ord-1')
    vi.spyOn(orderStore, 'currentOrder', 'get').mockReturnValue(order)
    const addressStore = useAddressStore()
    const addSpy = vi.spyOn(addressStore, 'add').mockResolvedValue()

    const { prepare } = usePendingOrder()
    await prepare(address)

    expect(addSpy).toHaveBeenCalledWith(address)
  })

  it('ошибка сохранения адреса не ломает создание заказа', async () => {
    const orderStore = useOrderStore()
    vi.spyOn(orderStore, 'create').mockResolvedValue('ord-1')
    vi.spyOn(orderStore, 'currentOrder', 'get').mockReturnValue(order)
    vi.spyOn(useAddressStore(), 'add').mockRejectedValue(new Error('addr fail'))

    const { prepare } = usePendingOrder()
    const result = await prepare(address)

    expect(result).toEqual({ orderId: 'ord-1', orderNumber: 42, amountUsd: 37 })
  })
})
