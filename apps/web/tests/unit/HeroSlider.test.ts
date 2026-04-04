import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import { HeroSlider } from '@/features/hero'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: { template: '<div />' } },
    { path: '/shop/:category?', component: { template: '<div />' } },
  ],
})

function mountSlider() {
  return mount(HeroSlider, {
    global: { plugins: [router] },
  })
}

describe('HeroSlider', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('рендерит три слайда', () => {
    const wrapper = mountSlider()
    expect(wrapper.findAll('.hero-slider__slide')).toHaveLength(3)
  })

  it('показывает текст и кнопку', () => {
    const wrapper = mountSlider()
    expect(wrapper.find('.hero-slider__text').text()).toBe('Find a unique gift here.')
    expect(wrapper.find('.hero-slider__btn').text()).toBe('The shop')
  })

  it('активный слайд по умолчанию — первый', () => {
    const wrapper = mountSlider()
    expect(wrapper.find('.hero-slider__slide--active').exists()).toBe(true)
    const slides = wrapper.findAll('.hero-slider__slide')
    expect(slides[0].classes()).toContain('hero-slider__slide--active')
  })

  it('клик по кнопке "вперёд" переходит на следующий слайд', async () => {
    const wrapper = mountSlider()
    await wrapper.find('.hero-slider__arrow--next').trigger('click')
    const slides = wrapper.findAll('.hero-slider__slide')
    expect(slides[1].classes()).toContain('hero-slider__slide--active')
  })

  it('клик по кнопке "назад" переходит на последний слайд (с первого)', async () => {
    const wrapper = mountSlider()
    await wrapper.find('.hero-slider__arrow--prev').trigger('click')
    const slides = wrapper.findAll('.hero-slider__slide')
    expect(slides[2].classes()).toContain('hero-slider__slide--active')
  })

  it('автоплей переключает слайд через 4 секунды', async () => {
    const wrapper = mountSlider()
    vi.advanceTimersByTime(4000)
    await wrapper.vm.$nextTick()
    const slides = wrapper.findAll('.hero-slider__slide')
    expect(slides[1].classes()).toContain('hero-slider__slide--active')
  })

  it('рендерит три точки-индикатора', () => {
    const wrapper = mountSlider()
    expect(wrapper.findAll('.hero-slider__dot')).toHaveLength(3)
  })

  it('клик по точке переключает на нужный слайд', async () => {
    const wrapper = mountSlider()
    const dots = wrapper.findAll('.hero-slider__dot')
    await dots[2].trigger('click')
    const slides = wrapper.findAll('.hero-slider__slide')
    expect(slides[2].classes()).toContain('hero-slider__slide--active')
  })

  it('очищает таймер при unmount', () => {
    const clearSpy = vi.spyOn(window, 'clearInterval')
    const wrapper = mountSlider()
    wrapper.unmount()
    expect(clearSpy).toHaveBeenCalled()
  })
})
