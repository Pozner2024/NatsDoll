import { setActivePinia, createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CheckoutForm from './CheckoutForm.vue'
import { useAddressStore } from '@/entities/address'

describe('CheckoutForm.getValidatedAddress', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
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
