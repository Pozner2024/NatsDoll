import { setActivePinia, createPinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppToaster from './AppToaster.vue'
import { useToast } from '../lib/useToast'

function mountToaster() {
  return mount(AppToaster, { global: { stubs: { teleport: true } } })
}

describe('AppToaster', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('рендерит тост с сообщением и типом', async () => {
    const wrapper = mountToaster()
    useToast().error('Network is down')
    await nextTick()

    const item = wrapper.find('.app-toaster__item')
    expect(item.exists()).toBe(true)
    expect(item.classes()).toContain('app-toaster__item--error')
    expect(item.text()).toContain('Network is down')
  })

  it('закрытие по кнопке убирает тост', async () => {
    const wrapper = mountToaster()
    useToast().success('Saved', 0)
    await nextTick()
    expect(wrapper.find('.app-toaster__item').exists()).toBe(true)

    await wrapper.find('.app-toaster__close').trigger('click')
    expect(wrapper.find('.app-toaster__item').exists()).toBe(false)
  })
})
