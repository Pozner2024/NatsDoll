import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { createPinia } from 'pinia'
import DesktopNav from './DesktopNav.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/shop/:category?', component: { template: '<div />' } },
    { path: '/gallery', component: { template: '<div />' } },
    { path: '/cart', component: { template: '<div />' } },
    { path: '/account', name: 'account', component: { template: '<div />' } },
  ],
})

async function mountNav() {
  await router.push('/')
  await router.isReady()
  return mount(DesktopNav, { global: { plugins: [router, createPinia()] }, attachTo: document.body })
}

function openShop(wrapper: Awaited<ReturnType<typeof mountNav>>) {
  return wrapper.find('.desktop-nav__link--toggle').trigger('click')
}

describe('DesktopNav — shop dropdown a11y', () => {
  it('закрывается по Escape', async () => {
    const wrapper = await mountNav()
    await openShop(wrapper)
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(true)

    await wrapper.find('.desktop-nav__link--toggle').trigger('keydown.escape')
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(false)
  })

  it('закрывается по клику вне dropdown', async () => {
    const wrapper = await mountNav()
    await openShop(wrapper)
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(true)

    document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(false)
  })

  it('закрывается при уходе фокуса из dropdown', async () => {
    const wrapper = await mountNav()
    await openShop(wrapper)
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(true)

    const outside = document.createElement('button')
    document.body.appendChild(outside)

    await wrapper.find('.desktop-nav__dropdown').trigger('focusout', { relatedTarget: outside })
    expect(wrapper.find('.desktop-nav__submenu').exists()).toBe(false)
  })
})

