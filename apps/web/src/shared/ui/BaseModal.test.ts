import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import BaseModal from './BaseModal.vue'

function mountModal(props: { isOpen: boolean; labelledBy?: string } = { isOpen: false }) {
  return mount(BaseModal, {
    props,
    slots: { default: '<input data-test="first" /><button data-test="last">ok</button>' },
    attachTo: document.body,
    global: { stubs: { Teleport: false, Transition: false } },
  })
}

describe('BaseModal', () => {
  beforeEach(() => {
    document.body.replaceChildren()
    document.body.style.overflow = ''
  })

  afterEach(() => {
    document.body.style.overflow = ''
  })

  it('не рендерит контент когда isOpen=false', () => {
    const wrapper = mountModal({ isOpen: false })
    expect(document.querySelector('.base-modal')).toBeNull()
    wrapper.unmount()
  })

  it('рендерит контент когда isOpen=true', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    expect(document.querySelector('.base-modal')).not.toBeNull()
    wrapper.unmount()
  })

  it('эмитит close при клике на кнопку ×', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    const closeBtn = document.querySelector<HTMLButtonElement>('.base-modal__close')
    closeBtn?.click()
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('эмитит close при клике на overlay (вне контента)', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    const overlay = document.querySelector<HTMLElement>('.base-modal__overlay')
    overlay?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('НЕ эмитит close при клике внутри .base-modal', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    const modal = document.querySelector<HTMLElement>('.base-modal')
    modal?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(wrapper.emitted('close')).toBeFalsy()
    wrapper.unmount()
  })

  it('эмитит close при нажатии Escape', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(wrapper.emitted('close')).toBeTruthy()
    wrapper.unmount()
  })

  it('эмитит open при переходе isOpen false → true', async () => {
    const wrapper = mountModal({ isOpen: false })
    await wrapper.setProps({ isOpen: true })
    expect(wrapper.emitted('open')).toBeTruthy()
    wrapper.unmount()
  })

  it('блокирует body scroll при открытии и снимает при закрытии', async () => {
    const wrapper = mountModal({ isOpen: false })
    expect(document.body.style.overflow).toBe('')
    await wrapper.setProps({ isOpen: true })
    expect(document.body.style.overflow).toBe('hidden')
    await wrapper.setProps({ isOpen: false })
    expect(document.body.style.overflow).toBe('')
    wrapper.unmount()
  })

  it('снимает scroll lock при unmount если модалка была открыта', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    expect(document.body.style.overflow).toBe('hidden')
    wrapper.unmount()
    expect(document.body.style.overflow).toBe('')
  })

  it('возвращает фокус на предыдущий элемент при закрытии', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const wrapper = mountModal({ isOpen: false })
    await wrapper.setProps({ isOpen: true })
    await nextTick()
    await wrapper.setProps({ isOpen: false })

    expect(document.activeElement).toBe(trigger)
    wrapper.unmount()
  })

  it('переводит фокус на первый focusable элемент при открытии (кнопка ×)', async () => {
    const wrapper = mountModal({ isOpen: false })
    await wrapper.setProps({ isOpen: true })
    await nextTick()
    const closeBtn = document.querySelector<HTMLElement>('.base-modal__close')
    expect(document.activeElement).toBe(closeBtn)
    wrapper.unmount()
  })

  it('прокидывает labelledBy в aria-labelledby', async () => {
    const wrapper = mountModal({ isOpen: true, labelledBy: 'modal-title' })
    await nextTick()
    const modal = document.querySelector('.base-modal')
    expect(modal?.getAttribute('aria-labelledby')).toBe('modal-title')
    wrapper.unmount()
  })

  it('устанавливает aria-modal=true и role=dialog', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()
    const modal = document.querySelector('.base-modal')
    expect(modal?.getAttribute('role')).toBe('dialog')
    expect(modal?.getAttribute('aria-modal')).toBe('true')
    wrapper.unmount()
  })

  it('focus trap: Tab с последнего элемента возвращает на первый (×)', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()

    const last = document.querySelector<HTMLElement>('[data-test="last"]')!
    const closeBtn = document.querySelector<HTMLElement>('.base-modal__close')!
    last.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')
    last.dispatchEvent(event)

    expect(preventSpy).toHaveBeenCalled()
    expect(document.activeElement).toBe(closeBtn)
    wrapper.unmount()
  })

  it('focus trap: Shift+Tab с первого элемента (×) переводит на последний', async () => {
    const wrapper = mountModal({ isOpen: true })
    await nextTick()

    const closeBtn = document.querySelector<HTMLElement>('.base-modal__close')!
    const last = document.querySelector<HTMLElement>('[data-test="last"]')!
    closeBtn.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    const preventSpy = vi.spyOn(event, 'preventDefault')
    closeBtn.dispatchEvent(event)

    expect(preventSpy).toHaveBeenCalled()
    expect(document.activeElement).toBe(last)
    wrapper.unmount()
  })
})
