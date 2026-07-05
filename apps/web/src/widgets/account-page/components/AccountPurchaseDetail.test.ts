import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { flushPromises } from '@vue/test-utils'
import AccountPurchaseDetail from './AccountPurchaseDetail.vue'

const loadOrder = vi.fn()
const fetchPaymentConfig = vi.fn()
const state: { currentOrder: unknown; loading: boolean; error: string | null } = {
  currentOrder: null,
  loading: false,
  error: null,
}

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
  fetchPaymentConfig: () => fetchPaymentConfig(),
}))

vi.mock('@/features/woo-payment', () => ({
  WooPayButton: { name: 'WooPayButton', template: '<div class="woo-stub" />' },
}))

vi.mock('@/shared', () => ({
  formatPrice: (n: number) => `$${n}`,
  formatDate: (d: string) => d,
}))

vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'o1' } }),
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
    createdAt: '2026-06-30T00:00:00.000Z',
    items: [{ id: 'i1', productSlug: 'p', productName: 'P', productImage: null, subtotal: 17, quantity: 1, price: 17, originalPrice: null, message: null }],
    shippingAddress: { fullName: 'N', line1: '1 St', city: 'NYC', postalCode: '10001', country: 'US' },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  state.currentOrder = null
  state.loading = false
  state.error = null
  fetchPaymentConfig.mockResolvedValue({ external: false })
})

describe('AccountPurchaseDetail — payment gate', () => {
  it('PENDING без claim → показывает кнопки оплаты', () => {
    state.currentOrder = makeOrder('PENDING')
    const wrapper = mount(AccountPurchaseDetail, { global: { stubs: { AppButton: true } } })
    expect(wrapper.find('.purchase-detail__payment').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
  })

  it('оплаченный заказ → блок оплаты скрыт', () => {
    state.currentOrder = makeOrder('PAID')
    const wrapper = mount(AccountPurchaseDetail, { global: { stubs: { AppButton: true } } })
    expect(wrapper.find('.purchase-detail__payment').exists()).toBe(false)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
  })

  it('PENDING + paymentClaimed → «оплата проверяется», кнопки оплаты скрыты (защита от повторного списания)', () => {
    state.currentOrder = makeOrder('PENDING', true)
    const wrapper = mount(AccountPurchaseDetail, { global: { stubs: { AppButton: true } } })
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.find('.purchase-detail__payment-pending').text()).toContain('being verified')
  })

  it('PENDING + external-конфиг → рендерится WooPayButton, PaypalPayment — нет', async () => {
    state.currentOrder = makeOrder('PENDING')
    fetchPaymentConfig.mockResolvedValue({ external: true, clientId: null })
    const wrapper = mount(AccountPurchaseDetail, { global: { stubs: { AppButton: true } } })
    await flushPromises()
    expect(wrapper.find('.woo-stub').exists()).toBe(true)
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
  })
})
