import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ReviewsSlider from './ReviewsSlider.vue'

function mountSlider() {
  return mount(ReviewsSlider)
}

describe('ReviewsSlider', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('рендерит карточки отзывов', () => {
    const wrapper = mountSlider()
    expect(wrapper.findAll('.review-card').length).toBeGreaterThan(0)
  })

  it('первая карточка активна по умолчанию', () => {
    const wrapper = mountSlider()
    const track = wrapper.find('.reviews-slider__track')
    expect(track.attributes('style')).toMatch(/translateX\(-?0%\)/)
  })

  it('автоплей переключает слайд через 5 секунд', async () => {
    const wrapper = mountSlider()
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()
    const track = wrapper.find('.reviews-slider__track')
    expect(track.attributes('style')).toContain('translateX(-100%)')
  })

  it('показывает счётчик в формате "1 / N"', () => {
    const wrapper = mountSlider()
    const counter = wrapper.find('.review-card__counter')
    expect(counter.text()).toMatch(/^1 \/ \d+$/)
  })

  it('рендерит карточки только в окне вокруг текущего слайда, остальные слайды пустые', () => {
    const wrapper = mountSlider()
    expect(wrapper.findAll('.reviews-slider__slide').length).toBeGreaterThan(100)
    expect(wrapper.findAll('.review-card').length).toBeLessThanOrEqual(12)
  })

  it('при переключении слайда карточки рендерятся в новом окне', async () => {
    const wrapper = mountSlider()
    vi.advanceTimersByTime(5000)
    await wrapper.vm.$nextTick()

    const slides = wrapper.findAll('.reviews-slider__slide')
    expect(slides[1]!.find('.review-card').exists()).toBe(true)
    expect(wrapper.findAll('.review-card').length).toBeLessThanOrEqual(12)
  })

  it('циклический перескок (свайп назад с первого слайда) отключает анимацию трека', async () => {
    const wrapper = mountSlider()
    const viewport = wrapper.find('.reviews-slider__viewport')

    await viewport.trigger('touchstart', { changedTouches: [{ clientX: 100 }] })
    await viewport.trigger('touchend', { changedTouches: [{ clientX: 200 }] })
    await wrapper.vm.$nextTick()

    const style = wrapper.find('.reviews-slider__track').attributes('style') ?? ''
    expect(style).not.toMatch(/translateX\(-?0%\)/)
    expect(style).toContain('transition: none')
  })

  it('обычный переход на соседний слайд не отключает анимацию', async () => {
    const wrapper = mountSlider()
    const viewport = wrapper.find('.reviews-slider__viewport')

    await viewport.trigger('touchstart', { changedTouches: [{ clientX: 200 }] })
    await viewport.trigger('touchend', { changedTouches: [{ clientX: 100 }] })
    await wrapper.vm.$nextTick()

    const style = wrapper.find('.reviews-slider__track').attributes('style') ?? ''
    expect(style).toContain('translateX(-100%)')
    expect(style).not.toContain('transition: none')
  })
})
