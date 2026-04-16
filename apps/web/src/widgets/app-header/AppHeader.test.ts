import { describe, it, expect } from 'vitest'
import { nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import AppHeader from './AppHeader.vue'
import BurgerMenu from './components/BurgerMenu.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/shop/:category?', component: { template: '<div />' } },
    { path: '/gallery', component: { template: '<div />' } },
    { path: '/contact', component: { template: '<div />' } },
    { path: '/login', component: { template: '<div />' } },
    { path: '/cart', component: { template: '<div />' } },
  ],
})

function mountHeader() {
  return mount(AppHeader, {
    global: { plugins: [router, createPinia()] },
    attachTo: document.body,
  })
}

function burgerProps(wrapper: ReturnType<typeof mountHeader>) {
  return wrapper.findComponent(BurgerMenu).props()
}

describe('AppHeader — бургер-кнопка', () => {
  it('меню закрыто по умолчанию', () => {
    const wrapper = mountHeader()
    expect(burgerProps(wrapper).isOpen).toBe(false)
  })

  it('клик на бургер открывает меню', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    expect(burgerProps(wrapper).isOpen).toBe(true)
  })

  it('повторный клик закрывает меню', async () => {
    const wrapper = mountHeader()
    const btn = wrapper.find('.app-header__burger')
    await btn.trigger('click')
    await btn.trigger('click')
    expect(burgerProps(wrapper).isOpen).toBe(false)
  })
})

describe('AppHeader — клик вне header', () => {
  it('закрывает меню при клике вне', async () => {
    const wrapper = mountHeader()
    await wrapper.find('.app-header__burger').trigger('click')
    expect(burgerProps(wrapper).isOpen).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await nextTick()

    expect(burgerProps(wrapper).isOpen).toBe(false)
  })
})
