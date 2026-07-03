import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import PaypalPayment from './PaypalPayment.vue'
import * as api from './paypalPaymentApi'

vi.mock('./paypalPaymentApi')

type ButtonsOptions = {
  onClick: (data: unknown, actions: { resolve: () => void; reject: () => void }) => void
  createOrder: (data: unknown, actions: unknown) => Promise<string>
  onApprove: (data: unknown, actions: unknown) => Promise<void>
  onError: () => void
}

let captured: ButtonsOptions
const render = vi.fn()

function installPaypal() {
  ;(window as unknown as { paypal: unknown }).paypal = {
    Buttons: vi.fn((opts: ButtonsOptions) => { captured = opts; return { render } }),
  }
}

function mountServer(config: Partial<{ enabled: boolean; clientId: string | null; serverFlow: boolean; external: boolean }> = {}) {
  vi.mocked(api.fetchPaymentConfig).mockResolvedValue({
    enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: true, external: false, ...config,
  } as never)
  return mount(PaypalPayment, { props: { orderId: 'o1', orderNumber: 7, amountUsd: 25 } })
}

beforeEach(() => {
  vi.clearAllMocks()
  render.mockClear()
  installPaypal()
})
afterEach(() => {
  delete (window as unknown as { paypal?: unknown }).paypal
})

describe('PaypalPayment', () => {
  it('показывает ошибку и не рендерит кнопки, если платежи выключены', async () => {
    const wrapper = mountServer({ enabled: false })
    await flushPromises()
    expect(wrapper.find('.paypal-payment__error').text()).toContain('temporarily unavailable')
    expect(render).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('рендерит кнопки PayPal при включённой оплате', async () => {
    const wrapper = mountServer()
    await flushPromises()
    expect(render).toHaveBeenCalledTimes(1)
    expect(wrapper.find('.paypal-payment__error').exists()).toBe(false)
    wrapper.unmount()
  })

  describe('server flow', () => {
    it('createOrder создаёт серверный заказ, onApprove капчурит и эмитит paid', async () => {
      vi.mocked(api.createServerPaypalOrder).mockResolvedValue('pp-order-1')
      vi.mocked(api.captureServerPayment).mockResolvedValue(undefined as never)
      const wrapper = mountServer()
      await flushPromises()

      const ppId = await captured.createOrder(null, null)
      expect(api.createServerPaypalOrder).toHaveBeenCalledWith('o1')
      expect(ppId).toBe('pp-order-1')

      await captured.onApprove(null, null)
      expect(api.captureServerPayment).toHaveBeenCalledWith('o1')
      expect(wrapper.emitted('paid')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('client flow', () => {
    function actions() {
      return { order: { create: vi.fn().mockResolvedValue('pp-1'), capture: vi.fn().mockResolvedValue({ id: 'cap-1' }) } }
    }

    it('createOrder проставляет invoice_id natsdoll-<orderNumber>', async () => {
      const wrapper = mountServer({ serverFlow: false })
      await flushPromises()
      const act = actions()
      await captured.createOrder(null, act)
      expect(act.order.create).toHaveBeenCalledWith(expect.objectContaining({
        purchase_units: [expect.objectContaining({
          invoice_id: 'natsdoll-7',
          custom_id: 'natsdoll-7',
          amount: { currency_code: 'USD', value: '25.00' },
        })],
      }))
      wrapper.unmount()
    })

    it('onApprove капчурит на клиенте, клеймит на сервере и эмитит claimed', async () => {
      vi.mocked(api.claimClientPayment).mockResolvedValue(undefined as never)
      const wrapper = mountServer({ serverFlow: false })
      await flushPromises()
      const act = actions()
      await captured.createOrder(null, act)
      await captured.onApprove(null, act)
      expect(act.order.capture).toHaveBeenCalled()
      expect(api.claimClientPayment).toHaveBeenCalledWith('o1', 'cap-1')
      expect(wrapper.emitted('claimed')).toHaveLength(1)
      wrapper.unmount()
    })
  })

  describe('onClick / onValidate', () => {
    it('reject, когда onValidate возвращает false', async () => {
      const onValidate = vi.fn().mockReturnValue(false)
      vi.mocked(api.fetchPaymentConfig).mockResolvedValue({
        enabled: true, clientId: 'cid', mode: 'SANDBOX', serverFlow: true, external: false,
      } as never)
      const wrapper = mount(PaypalPayment, { props: { orderId: 'o1', orderNumber: 7, amountUsd: 25, onValidate } })
      await flushPromises()

      const resolve = vi.fn(); const reject = vi.fn()
      captured.onClick(null, { resolve, reject })
      expect(reject).toHaveBeenCalled()
      expect(resolve).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('resolve, когда onValidate отсутствует', async () => {
      const wrapper = mountServer()
      await flushPromises()
      const resolve = vi.fn(); const reject = vi.fn()
      captured.onClick(null, { resolve, reject })
      expect(resolve).toHaveBeenCalled()
      expect(reject).not.toHaveBeenCalled()
      wrapper.unmount()
    })
  })
})
