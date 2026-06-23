/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

const { fetchPaymentConfig } = vi.hoisted(() => ({ fetchPaymentConfig: vi.fn() }))

vi.mock('@/features/paypal-payment', () => ({
  PaypalPayment: { name: 'PaypalPayment', template: '<div class="paypal-stub" />' },
  fetchPaymentConfig,
}))

vi.mock('@/entities/cart', () => ({
  useCartStore: () => ({
    items: [{ id: '1', quantity: 1 }],
    itemCount: 1,
    totalAmount: 25,
    loading: false,
    error: null,
    load: vi.fn(),
    reset: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}))

vi.mock('@/entities/user', () => ({
  useAuthStore: () => ({
    authReady: true,
    isLoggedIn: true,
    initAuth: vi.fn(),
  }),
}))

import CartPageWidget from './CartPageWidget.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/cart', component: { template: '<div />' } },
    { path: '/shop', component: { template: '<div />' } },
    { path: '/orders/:id', name: 'order-confirmation', component: { template: '<div />' } },
  ],
})

function mountWidget() {
  return mount(CartPageWidget, {
    global: {
      plugins: [router],
      stubs: { CheckoutForm: true, CartLineItem: true },
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

describe('CartPageWidget — выбор кнопки оплаты по конфигу', () => {
  it('показывает PayPal, когда оплата включена и есть clientId', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: 'abc', mode: 'SANDBOX', serverFlow: true })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('Place order')
  })

  it('показывает «Place order» как fallback, когда оплата выключена', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('Place order')
  })

  it('включена, но без clientId → fallback «Place order»', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: null, mode: 'SANDBOX', serverFlow: false })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('Place order')
  })

  it('ошибка загрузки конфига не ломает checkout → «Place order»', async () => {
    fetchPaymentConfig.mockRejectedValue(new Error('network'))
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('Place order')
  })
})
