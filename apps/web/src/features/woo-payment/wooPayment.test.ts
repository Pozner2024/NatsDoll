import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import WooPayButton from './WooPayButton.vue'

vi.mock('./wooPaymentApi', () => ({ createWooPayment: vi.fn() }))
import { createWooPayment } from './wooPaymentApi'

describe('WooPayButton', () => {
  beforeEach(() => {
    vi.mocked(createWooPayment).mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: vi.fn() },
    })
  })

  it('клик: prepareOrder → createWooPayment → emit redirecting → location.assign', async () => {
    vi.mocked(createWooPayment).mockResolvedValue('https://pay.example.com/x')
    const prepareOrder = vi.fn().mockResolvedValue({ orderId: 'o1' })
    const wrapper = mount(WooPayButton, { props: { prepareOrder } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).toHaveBeenCalledWith('o1')
    expect(wrapper.emitted('redirecting')).toHaveLength(1)
    expect(window.location.assign).toHaveBeenCalledWith('https://pay.example.com/x')
  })

  it('onValidate=false — ничего не происходит', async () => {
    const wrapper = mount(WooPayButton, { props: { orderId: 'o1', onValidate: () => false } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).not.toHaveBeenCalled()
  })

  it('prepareOrder вернул null — редиректа нет', async () => {
    const wrapper = mount(WooPayButton, { props: { prepareOrder: vi.fn().mockResolvedValue(null) } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(createWooPayment).not.toHaveBeenCalled()
  })

  it('ошибка API показывается под кнопкой', async () => {
    vi.mocked(createWooPayment).mockRejectedValue(new Error('External payment is not available'))
    const wrapper = mount(WooPayButton, { props: { orderId: 'o1' } })
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('External payment is not available')
    expect(wrapper.emitted('redirecting')).toBeUndefined()
  })
})
