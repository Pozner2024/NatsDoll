import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import OrderConfirmation from './OrderConfirmation.vue'

const loadOrder = vi.fn()
const state: { currentOrder: unknown; loading: boolean; error: string | null } = {
  currentOrder: null,
  loading: false,
  error: null,
}
const routeQuery: { value: Record<string, string> } = { value: {} }

vi.mock('@/entities/order', () => ({
  useOrderStore: () => ({
    get currentOrder() { return state.currentOrder },
    get loading() { return state.loading },
    get error() { return state.error },
    loadOrder,
  }),
}))

vi.mock('@/features/paypal-payment', () => ({
  PaypalPayment: { name: 'PaypalPayment', template: '<div class="paypal-stub" />' },
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ query: routeQuery.value }),
  RouterLink: { name: 'RouterLink', template: '<a><slot /></a>' },
}))

function makeOrder(status: string, paymentClaimed = false) {
  return {
    id: 'o1',
    orderNumber: 17,
    status,
    totalAmount: 29,
    shippingCost: 12,
    paymentClaimed,
    items: [{ id: 'i1', productSlug: 'p', productName: 'P', productImage: null, subtotal: 17, quantity: 1, message: null }],
    shippingAddress: { fullName: 'N', line1: '1 St', city: 'NYC', postalCode: '10001', country: 'US' },
  }
}

function mountIt() {
  return mount(OrderConfirmation, {
    props: { orderId: 'o1' },
    global: { stubs: { AppButton: true } },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  state.currentOrder = null
  state.loading = false
  state.error = null
  routeQuery.value = {}
})

describe('OrderConfirmation', () => {
  it('всегда перезагружает заказ при монтировании, даже если он уже в сторе (свежий статус)', () => {
    // регресс-гард: кэш pending-заказа из корзины не должен скрывать актуальный PAID
    state.currentOrder = makeOrder('PENDING')
    mountIt()
    expect(loadOrder).toHaveBeenCalledWith('o1')
  })

  it('PENDING → показывает блок оплаты и подзаголовок «complete your payment»', () => {
    state.currentOrder = makeOrder('PENDING')
    const wrapper = mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
    expect(wrapper.find('.order-confirmation__subtitle').text()).toContain('complete your payment')
  })

  it('оплаченный заказ → блок оплаты скрыт, благодарственный подзаголовок', () => {
    state.currentOrder = makeOrder('PAID')
    const wrapper = mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(false)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__subtitle').text()).toContain('Thank you')
  })

  it('PENDING + ?claimed=1 (client-режим) → «оплата проверяется», без кнопок оплаты', () => {
    state.currentOrder = makeOrder('PENDING')
    routeQuery.value = { claimed: '1' }
    const wrapper = mountIt()
    expect(wrapper.find('.order-confirmation__payment').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('being verified')
  })

  it('PENDING + paymentClaimed без ?claimed=1 → оплата скрыта (защита от повторного списания)', () => {
    // Заход из «My orders»/dashboard без query: источник истины — order.paymentClaimed,
    // иначе повторно показалась бы кнопка оплаты уже оплаченного (client-mode) заказа.
    state.currentOrder = makeOrder('PENDING', true)
    const wrapper = mountIt()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.order-confirmation__payment-pending').text()).toContain('being verified')
  })
})
