import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import FaqSection from './FaqSection.vue'
import { FAQ_ITEMS } from './faq'

function mountFaqSection() {
  return mount(FaqSection)
}

describe('FaqSection — список вопросов', () => {
  it('рендерит все вопросы из FAQ_ITEMS', () => {
    const wrapper = mountFaqSection()
    const questions = wrapper.findAll('.faq-section__question')
    expect(questions).toHaveLength(FAQ_ITEMS.length)
  })

  it('отображает текст каждого вопроса', () => {
    const wrapper = mountFaqSection()
    const questions = wrapper.findAll('.faq-section__question')
    FAQ_ITEMS.forEach((item, i) => {
      expect(questions[i].text()).toContain(item.question)
    })
  })

  it('изначально все кнопки имеют aria-expanded="false"', () => {
    const wrapper = mountFaqSection()
    const buttons = wrapper.findAll('.faq-section__question')
    buttons.forEach(btn => {
      expect(btn.attributes('aria-expanded')).toBe('false')
    })
  })
})

describe('FaqSection — открытие/закрытие', () => {
  it('клик на вопрос добавляет класс --open на элемент', async () => {
    const wrapper = mountFaqSection()
    const items = wrapper.findAll('.faq-section__item')
    const button = items[0].find('.faq-section__question')

    await button.trigger('click')

    expect(items[0].classes()).toContain('faq-section__item--open')
  })

  it('клик на вопрос устанавливает aria-expanded="true"', async () => {
    const wrapper = mountFaqSection()
    const button = wrapper.findAll('.faq-section__question')[0]

    await button.trigger('click')

    expect(button.attributes('aria-expanded')).toBe('true')
  })

  it('повторный клик на открытый элемент закрывает его', async () => {
    const wrapper = mountFaqSection()
    const items = wrapper.findAll('.faq-section__item')
    const button = items[0].find('.faq-section__question')

    await button.trigger('click')
    expect(items[0].classes()).toContain('faq-section__item--open')

    await button.trigger('click')
    expect(items[0].classes()).not.toContain('faq-section__item--open')
  })

  it('повторный клик сбрасывает aria-expanded обратно в "false"', async () => {
    const wrapper = mountFaqSection()
    const button = wrapper.findAll('.faq-section__question')[0]

    await button.trigger('click')
    await button.trigger('click')

    expect(button.attributes('aria-expanded')).toBe('false')
  })

  it('открытие одного элемента не открывает остальные', async () => {
    const wrapper = mountFaqSection()
    const items = wrapper.findAll('.faq-section__item')
    const button = items[1].find('.faq-section__question')

    await button.trigger('click')

    items.forEach((item, i) => {
      if (i === 1) {
        expect(item.classes()).toContain('faq-section__item--open')
      } else {
        expect(item.classes()).not.toContain('faq-section__item--open')
      }
    })
  })

  it('клик на другой вопрос переключает открытый элемент', async () => {
    const wrapper = mountFaqSection()
    const items = wrapper.findAll('.faq-section__item')
    const firstButton = items[0].find('.faq-section__question')
    const secondButton = items[1].find('.faq-section__question')

    await firstButton.trigger('click')
    expect(items[0].classes()).toContain('faq-section__item--open')

    await secondButton.trigger('click')
    expect(items[0].classes()).not.toContain('faq-section__item--open')
    expect(items[1].classes()).toContain('faq-section__item--open')
  })
})
