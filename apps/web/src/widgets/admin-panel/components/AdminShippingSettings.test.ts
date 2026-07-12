import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

vi.mock('../adminShippingApi', () => ({
  fetchShippingSettings: vi.fn(),
  saveShippingSettings: vi.fn(),
}))

import { fetchShippingSettings, saveShippingSettings } from '../adminShippingApi'
import AdminShippingSettings from './AdminShippingSettings.vue'

const mockFetch = vi.mocked(fetchShippingSettings)
const mockSave = vi.mocked(saveShippingSettings)

async function mountLoaded(rates = { baseCost: 12, perExtraItemCost: 1 }) {
  mockFetch.mockResolvedValue({ ...rates })
  mockSave.mockResolvedValue({ ...rates })
  const wrapper = mount(AdminShippingSettings)
  await flushPromises()
  return wrapper
}

describe('AdminShippingSettings', () => {
  beforeEach(() => {
    mockFetch.mockReset()
    mockSave.mockReset()
  })

  it('загружает текущие ставки в поля формы', async () => {
    const wrapper = await mountLoaded({ baseCost: 15, perExtraItemCost: 3 })
    const inputs = wrapper.findAll('input[type="number"]')
    expect((inputs[0]!.element as HTMLInputElement).value).toBe('15')
    expect((inputs[1]!.element as HTMLInputElement).value).toBe('3')
  })

  it('сохраняет изменённые ставки через saveShippingSettings', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0]!.setValue('20')
    await inputs[1]!.setValue('4')

    await wrapper.find('.shipping-settings__save').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith({ baseCost: 20, perExtraItemCost: 4 })
    expect(wrapper.find('.shipping-settings__ok').exists()).toBe(true)
  })

  it('принимает нулевую ставку (бесплатная доставка)', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0]!.setValue('0')

    await wrapper.find('.shipping-settings__save').trigger('click')
    await flushPromises()

    expect(mockSave).toHaveBeenCalledWith({ baseCost: 0, perExtraItemCost: 1 })
  })

  it('отклоняет отрицательную ставку до отправки на сервер', async () => {
    const wrapper = await mountLoaded()
    const inputs = wrapper.findAll('input[type="number"]')
    await inputs[0]!.setValue('-1')

    await wrapper.find('.shipping-settings__save').trigger('click')
    await flushPromises()

    expect(mockSave).not.toHaveBeenCalled()
    expect(wrapper.find('.shipping-settings__error').exists()).toBe(true)
  })

  it('показывает ошибку при сбое сохранения', async () => {
    const wrapper = await mountLoaded()
    mockSave.mockRejectedValueOnce(new Error('Network down'))

    await wrapper.find('.shipping-settings__save').trigger('click')
    await flushPromises()

    expect(wrapper.find('.shipping-settings__error').text()).toContain('Network down')
  })
})
