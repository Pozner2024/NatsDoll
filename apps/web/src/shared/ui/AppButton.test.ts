import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import AppButton from './AppButton.vue'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/shop', component: { template: '<div />' } },
  ],
})

function mountButton(props: { to?: string } = {}, slot = 'Click me') {
  return mount(AppButton, {
    props,
    slots: { default: slot },
    global: { plugins: [router] },
  })
}

describe('AppButton — без пропа to', () => {
  it('рендерит тег button', () => {
    const wrapper = mountButton()
    expect(wrapper.find('button').exists()).toBe(true)
  })

  it('не рендерит RouterLink', () => {
    const wrapper = mountButton()
    expect(wrapper.find('a').exists()).toBe(false)
  })

  it('отображает содержимое слота', () => {
    const wrapper = mountButton()
    expect(wrapper.text()).toBe('Click me')
  })

  it('имеет класс app-button', () => {
    const wrapper = mountButton()
    expect(wrapper.find('button').classes()).toContain('app-button')
  })
})

describe('AppButton — с пропом to', () => {
  it('рендерит RouterLink (тег a)', async () => {
    const wrapper = mountButton({ to: '/shop' })
    await router.isReady()
    expect(wrapper.find('a').exists()).toBe(true)
  })

  it('не рендерит тег button', async () => {
    const wrapper = mountButton({ to: '/shop' })
    await router.isReady()
    expect(wrapper.find('button').exists()).toBe(false)
  })

  it('ссылка ведёт на указанный маршрут', async () => {
    const wrapper = mountButton({ to: '/shop' })
    await router.isReady()
    expect(wrapper.find('a').attributes('href')).toBe('/shop')
  })

  it('отображает содержимое слота', async () => {
    const wrapper = mountButton({ to: '/shop' }, 'The shop')
    await router.isReady()
    expect(wrapper.text()).toBe('The shop')
  })

  it('имеет класс app-button', async () => {
    const wrapper = mountButton({ to: '/shop' })
    await router.isReady()
    expect(wrapper.find('a').classes()).toContain('app-button')
  })
})
