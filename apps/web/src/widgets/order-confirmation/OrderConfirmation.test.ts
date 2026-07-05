import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { reactive } from 'vue'
import { mount, flushPromises } from '@vue/test-utils'
import OrderConfirmation from './OrderConfirmation.vue'

const loadOrder = vi.fn()
const state = reactive<{ currentOrder: unknown; loading: boolean; error: string | null }>({
  currentOrder: null,
  loading: false,
  error: null,
})
const routeQuery: { value: Record<string, string> } = { value: {} }

vi.mock('@/entities/order', () => ({
  useOrderStore: () => ({
    get currentOrder() { return state.currentOrder },
    get loading() { return state.loading },
    get error() { return state.error },
    loadOrder,
  }),
}))

const fetchPaymentConfig = vi.fn()

vi.mock('@/features/paypal-payment', () => ({
  PaypalPayment: { name: 'PaypalPayment', template: '<div class="paypal-stub" />' },
  fetchPaymentConfig: () => fetchPaymentConfig(),
}))

vi.mock('@/features/woo-payment', () => ({
  WooPayButton: { name: 'WooPayButton', template: '<div class="woo-stub" />' },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery.value }),
  RouterLink: { name: 'RouterLink', template: '<a><slot /></a>' },
}))

function makeOrder(status: string, paymentClaimed = false, isGuestAccount = false) {
  return {
    id: 'o1',
    orderNumber: 17,
    status,
    totalAmount: 29,
    shippingCost: 12,
    paymentClaimed,
    isGuestAccount,
    items: [{ id: 'i1', productSlug: 'p', productName: 'P', productImage: null, subtotal: 17, quantity: 1, message: null }],
    shippingAddress: { fullName: 'N', line1: '1 St', city: 'NYC', postalCode: '10001', country: 'US' },
  }
}

async function mountIt() {
  const wrapper = mount(OrderConfirmation, {
    props: { orderId: 'o1' },
    global: { stubs: { AppButton: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  vi.clearAllMocks()
  state.currentOrder = null
  state.loading = false
  state.error = null
  routeQuery.value = {}
  loadOrder.mockResolvedValue(undefined)
  fetchPaymentConfig.mockResolvedValue({ external: false })
})

describe('OrderConfirmation', () => {
  it('всегда перезагружает заказ при монтировании, даже если он уже в сторе (свежий статус)', async () => {
    // регресс-гард: кэш pending-заказа из корзины не должен скрывать актуальный PAID
    state.currentOrder = makeOrder('PENDING')
    await mountIt()
    expect(loadOrder).toHaveBeenCalledWith('o1')
  })

  it('PENDING → показывает блок оплаты и подзаголовок «complete your payment»', async () => {
    state.currentOrder = makeOrder('PENDING')
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
    expect(wrapper.find('.order-confirmation__subtitle').text()).toContain('complete your payment')
  })

  it('isGuestAccount → показывает подсказку про сброс пароля', async () => {
    state.currentOrder = makeOrder('PENDING', false, true)
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__guest-note').exists()).toBe(true)
    expect(wrapper.text()).toContain('Forgot password')
  })

  it('не гостевой аккаунт → подсказки нет', async () => {
    state.currentOrder = makeOrder('PENDING', false, false)
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__guest-note').exists()).toBe(false)
  })

  it('оплаченный заказ → блок оплаты скрыт, благодарственный подзаголовок', async () => {
    state.currentOrder = makeOrder('PAID')
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(false)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__subtitle').text()).toContain('Thank you')
  })

  it('PENDING + ?claimed=1 (client-режим) → «оплата проверяется», без кнопок оплаты', async () => {
    state.currentOrder = makeOrder('PENDING')
    routeQuery.value = { claimed: '1' }
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('being verified')
  })

  it('PENDING + paymentClaimed без ?claimed=1 → оплата скрыта (защита от повторного списания)', async () => {
    // Заход из «My orders»/dashboard без query: источник истины — order.paymentClaimed,
    // иначе повторно показалась бы кнопка оплаты уже оплаченного (client-mode) заказа.
    state.currentOrder = makeOrder('PENDING', true)
    const wrapper = await mountIt()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('being verified')
  })

  it('PENDING + ?paid=1 → «Payment is being processed…», без PaypalPayment/WooPayButton', async () => {
    state.currentOrder = makeOrder('PENDING')
    routeQuery.value = { paid: '1' }
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('Payment is being processed')
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.woo-stub').exists()).toBe(false)
  })

  it('PENDING + ?paid=1 → подзаголовок «Payment is being processed», не «complete your payment»', async () => {
    state.currentOrder = makeOrder('PENDING')
    routeQuery.value = { paid: '1' }
    const wrapper = await mountIt()
    expect(wrapper.find('.order-confirmation__subtitle').text()).toContain('Payment is being processed')
  })

  it('external-конфиг без ?paid=1 → рендерится WooPayButton, PaypalPayment — нет', async () => {
    state.currentOrder = makeOrder('PENDING')
    fetchPaymentConfig.mockResolvedValue({ external: true, clientId: null })
    const wrapper = await mountIt()
    expect(wrapper.find('.woo-stub').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
  })

  it('не-external конфиг → PaypalPayment, как раньше', async () => {
    state.currentOrder = makeOrder('PENDING')
    fetchPaymentConfig.mockResolvedValue({ external: false })
    const wrapper = await mountIt()
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
    expect(wrapper.find('.woo-stub').exists()).toBe(false)
  })

  describe('поллинг после возврата с оплаты', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('вызывает loadOrder повторно каждые 3с, пока статус PENDING; после PAID сообщение исчезает', async () => {
      state.currentOrder = makeOrder('PENDING')
      routeQuery.value = { paid: '1' }
      const wrapper = mount(OrderConfirmation, {
        props: { orderId: 'o1' },
        global: { stubs: { AppButton: true } },
      })
      await flushPromises()
      expect(loadOrder).toHaveBeenCalledTimes(1)

      loadOrder.mockImplementationOnce(async () => {
        state.currentOrder = makeOrder('PAID')
      })

      await vi.advanceTimersByTimeAsync(3000)
      expect(loadOrder).toHaveBeenCalledTimes(2)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.order-confirmation__payment-pending').exists()).toBe(false)
    })

    it('после исчерпания поллинга кнопка оплаты не возвращается, сообщение о задержке', async () => {
      state.currentOrder = makeOrder('PENDING')
      routeQuery.value = { paid: '1' }
      const wrapper = mount(OrderConfirmation, {
        props: { orderId: 'o1' },
        global: { stubs: { AppButton: true } },
      })
      await flushPromises()

      await vi.advanceTimersByTimeAsync(40 * 3000)
      await flushPromises()
      await wrapper.vm.$nextTick()

      expect(wrapper.find('.paypal-stub').exists()).toBe(false)
      expect(wrapper.find('.woo-stub').exists()).toBe(false)
      expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('taking longer')
    })
  })
})
