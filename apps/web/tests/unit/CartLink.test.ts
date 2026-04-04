/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CartLink from '../../src/features/navigation/CartLink.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/cart', component: { template: '<div />' } },
  ],
})

function mountCartLink() {
  return mount(CartLink, {
    global: { plugins: [router] },
  })
}

describe('CartLink — разметка', () => {
  it('рендерит ссылку на /cart', () => {
    const wrapper = mountCartLink()
    expect(wrapper.find('a').attributes('href')).toBe('/cart')
  })

  it('содержит текст Cart', () => {
    const wrapper = mountCartLink()
    expect(wrapper.text()).toContain('Cart')
  })

  it('aria-label равен "Cart" когда корзина пуста', () => {
    const wrapper = mountCartLink()
    expect(wrapper.find('a').attributes('aria-label')).toBe('Cart')
  })

  it('бейдж не показывается когда cartCount = 0', () => {
    const wrapper = mountCartLink()
    expect(wrapper.find('.cart-link__badge').exists()).toBe(false)
  })
})

describe('CartLink — эмиты', () => {
  it('эмитит navigate при клике на ссылку', async () => {
    const wrapper = mountCartLink()
    await wrapper.find('a').trigger('click')
    expect(wrapper.emitted('navigate')).toBeTruthy()
  })
})
