/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'

const { fetchPaymentConfig, mockAuthState, mockOrderState, createGuestOrder, GuestEmailTakenError } = vi.hoisted(() => {
  class GuestEmailTakenErrorClass extends Error {
    constructor() {
      super('An account with this email exists. Please sign in.')
      this.name = 'GuestEmailTakenError'
    }
  }
  return {
    fetchPaymentConfig: vi.fn(),
    mockAuthState: { isLoggedIn: true },
    mockOrderState: { myOrders: [] as { id: string; orderNumber: number; status: string; totalAmount: number }[] },
    createGuestOrder: vi.fn(),
    GuestEmailTakenError: GuestEmailTakenErrorClass,
  }
})

const cancelOrderMock = vi.fn(async (id: string) => {
  mockOrderState.myOrders = mockOrderState.myOrders.filter((o) => o.id !== id)
})

vi.mock('@/entities/order', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/entities/order')>()
  return {
    ...actual,
    useOrderStore: () => ({
      get myOrders() { return mockOrderState.myOrders },
      loadMyOrders: vi.fn(),
      cancel: cancelOrderMock,
    }),
  }
})

vi.mock('@/features/paypal-payment', () => ({
  PaypalPayment: { name: 'PaypalPayment', template: '<div class="paypal-stub" />' },
  fetchPaymentConfig,
}))

vi.mock('@/features/woo-payment', () => ({
  WooPayButton: { name: 'WooPayButton', template: '<div class="woo-pay-stub" />' },
}))

vi.mock('@/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared')>()
  return {
    ...actual,
    fetchShippingSettings: vi.fn().mockResolvedValue({ baseCost: 12, perExtraItemCost: 1 }),
  }
})

vi.mock('@/entities/cart', () => ({
  useCartStore: () => ({
    items: [{ id: '1', quantity: 1, productName: 'Clay ring', unitPrice: 25, subtotal: 25 }],
    itemCount: 1,
    totalAmount: 25,
    guestItems: [{ productId: 'p1', quantity: 1, message: null }],
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
    get isLoggedIn() { return mockAuthState.isLoggedIn },
    initAuth: vi.fn(),
  }),
}))

vi.mock('@/widgets/cart-page/guestCheckoutApi', () => ({
  createGuestOrder,
  GuestEmailTakenError,
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

const mockAddress = { fullName: 'Test User', line1: '1 Main St', city: 'New York', country: 'US', postalCode: '10001' }

const CheckoutFormStub = defineComponent({
  setup(_, { expose }) {
    expose({ getValidatedAddress: () => mockAddress })
    return () => h('div')
  },
})

function mountWidget() {
  return mount(CartPageWidget, {
    global: {
      plugins: [router],
      stubs: { CheckoutForm: CheckoutFormStub, CartLineItem: true },
    },
  })
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  mockAuthState.isLoggedIn = true
  mockOrderState.myOrders = []
})

describe('CartPageWidget — выбор кнопки оплаты по конфигу', () => {
  it('показывает PayPal, когда оплата включена и есть clientId', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: 'abc', mode: 'SANDBOX', serverFlow: true, external: false })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(true)
    expect(wrapper.find('.woo-pay-stub').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('Place order')
  })

  it('показывает «Place order» как fallback, когда оплата выключена', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.paypal-stub').exists()).toBe(false)
    expect(wrapper.text()).toContain('Place order')
  })

  it('в external-режиме показывает WooPayButton вместо PayPal-кнопок', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: null, mode: 'LIVE', serverFlow: false, external: true })
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.findComponent({ name: 'WooPayButton' }).exists()).toBe(true)
    expect(wrapper.findComponent({ name: 'PaypalPayment' }).exists()).toBe(false)
  })

  it('включена, но без clientId → fallback «Place order»', async () => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false })
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

describe('CartPageWidget — guest checkout (email field)', () => {
  beforeEach(() => {
    mockAuthState.isLoggedIn = false
    fetchPaymentConfig.mockResolvedValue({ enabled: false, clientId: null, mode: 'SANDBOX', serverFlow: false, external: false })
  })

  it('гость видит поле Email', async () => {
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('#guest-email').exists()).toBe(true)
  })

  it('залогиненный не видит поле Email', async () => {
    mockAuthState.isLoggedIn = true
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('#guest-email').exists()).toBe(false)
  })

  it('сабмит без email блокируется — показывает ошибку, createGuestOrder не вызывается', async () => {
    createGuestOrder.mockResolvedValue({ orderId: 'o1', orderNumber: 1 })
    const wrapper = mountWidget()
    await flushPromises()

    await wrapper.find('.cart-page__checkout').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cart-page__guest-email-error').exists()).toBe(true)
    expect(createGuestOrder).not.toHaveBeenCalled()
  })

  it('с email вызывает createGuestOrder с правильным payload', async () => {
    createGuestOrder.mockResolvedValue({ orderId: 'o1', orderNumber: 1 })
    const wrapper = mountWidget()
    await flushPromises()

    const input = wrapper.find<HTMLInputElement>('#guest-email')
    await input.setValue('test@example.com')

    // Trigger prepareOrder via placeOrderFallback (Place order button)
    await wrapper.find('.cart-page__checkout').trigger('click')
    await flushPromises()

    expect(createGuestOrder).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'test@example.com',
        items: [{ productId: 'p1', quantity: 1, message: null }],
      }),
    )
  })

  it('GuestEmailTakenError → показывает сообщение с предложением войти', async () => {
    createGuestOrder.mockRejectedValue(new GuestEmailTakenError())
    const wrapper = mountWidget()
    await flushPromises()

    const input = wrapper.find<HTMLInputElement>('#guest-email')
    await input.setValue('taken@example.com')

    await wrapper.find('.cart-page__checkout').trigger('click')
    await flushPromises()

    expect(wrapper.find('.cart-page__guest-email-taken').exists()).toBe(true)
    expect(wrapper.text()).toContain('An account with this email exists')
    expect(wrapper.find('.cart-page__sign-in-btn').exists()).toBe(true)
  })
})

describe('CartPageWidget — незавершённый заказ (баннер)', () => {
  beforeEach(() => {
    fetchPaymentConfig.mockResolvedValue({ enabled: true, clientId: 'abc', mode: 'SANDBOX', serverFlow: true, external: false })
  })

  it('нет PENDING-заказа → баннер не показывается', async () => {
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.cart-page__pending-order').exists()).toBe(false)
  })

  it('есть PENDING-заказ → баннер с номером и суммой, кнопки Pay/Cancel', async () => {
    mockOrderState.myOrders = [{ id: 'o30', orderNumber: 30, status: 'PENDING', totalAmount: 67.7 }]
    const wrapper = mountWidget()
    await flushPromises()
    const banner = wrapper.find('.cart-page__pending-order')
    expect(banner.exists()).toBe(true)
    expect(banner.text()).toContain('#30')
    expect(banner.text()).toContain('$67.70')
  })

  it('гость не видит баннер (не запрашивается myOrders)', async () => {
    mockAuthState.isLoggedIn = false
    mockOrderState.myOrders = [{ id: 'o30', orderNumber: 30, status: 'PENDING', totalAmount: 67.7 }]
    const wrapper = mountWidget()
    await flushPromises()
    expect(wrapper.find('.cart-page__pending-order').exists()).toBe(false)
  })

  it('клик Cancel order → вызывает cancel и скрывает баннер', async () => {
    mockOrderState.myOrders = [{ id: 'o30', orderNumber: 30, status: 'PENDING', totalAmount: 67.7 }]
    const wrapper = mountWidget()
    await flushPromises()

    await wrapper.find('.cart-page__pending-order-cancel').trigger('click')
    await flushPromises()

    expect(cancelOrderMock).toHaveBeenCalledWith('o30')
    expect(wrapper.find('.cart-page__pending-order').exists()).toBe(false)
  })

  it('клик Pay → переходит на order-confirmation этого заказа', async () => {
    mockOrderState.myOrders = [{ id: 'o30', orderNumber: 30, status: 'PENDING', totalAmount: 67.7 }]
    const wrapper = mountWidget()
    await flushPromises()

    await wrapper.find('.cart-page__pending-order-btn').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/orders/o30')
  })
})
