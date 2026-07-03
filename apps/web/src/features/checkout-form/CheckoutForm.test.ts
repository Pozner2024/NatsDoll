import { setActivePinia, createPinia } from 'pinia'
import { mount, flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CheckoutForm from './CheckoutForm.vue'
import { useAddressStore } from '@/entities/address'
import { useAuthStore } from '@/entities/user'

vi.mock('@/entities/user', () => ({ useAuthStore: vi.fn() }))

function setLoggedIn(isLoggedIn: boolean): void {
  vi.mocked(useAuthStore).mockReturnValue({ isLoggedIn } as never)
}

describe('CheckoutForm.getValidatedAddress', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    setLoggedIn(true)
    vi.spyOn(useAddressStore(), 'load').mockResolvedValue()
  })

  it('возвращает null и не падает при пустой форме', () => {
    const wrapper = mount(CheckoutForm)
    expect((wrapper.vm as unknown as { getValidatedAddress: () => unknown }).getValidatedAddress()).toBeNull()
  })

  it('возвращает адрес, когда обязательные поля заполнены', async () => {
    const wrapper = mount(CheckoutForm)
    await wrapper.find('#cf-name').setValue('Nat')
    await wrapper.find('#cf-line1').setValue('1 St')
    await wrapper.find('#cf-city').setValue('NY')
    await wrapper.find('#cf-postal').setValue('10001')
    await wrapper.find('#cf-country').setValue('US')

    const result = (wrapper.vm as unknown as { getValidatedAddress: () => unknown }).getValidatedAddress()
    expect(result).toEqual({ fullName: 'Nat', line1: '1 St', city: 'NY', country: 'US', postalCode: '10001' })
  })
})

describe('CheckoutForm — загрузка адресной книги', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('гость: не запрашивает адреса (иначе 401 сотрёт гостевую корзину через clearAuth)', async () => {
    setLoggedIn(false)
    const load = vi.spyOn(useAddressStore(), 'load').mockResolvedValue()
    mount(CheckoutForm)
    await flushPromises()
    expect(load).not.toHaveBeenCalled()
  })

  it('залогинен: загружает адреса и префилл дефолтным адресом', async () => {
    setLoggedIn(true)
    const load = vi.spyOn(useAddressStore(), 'load').mockResolvedValue()
    mount(CheckoutForm)
    await flushPromises()
    expect(load).toHaveBeenCalled()
  })
})
