import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import AppImage from './AppImage.vue'

describe('AppImage', () => {
  it('рендерит img с переданными src и alt', () => {
    const wrapper = mount(AppImage, { props: { src: '/pic.webp', alt: 'A doll' } })
    const img = wrapper.find('img')
    expect(img.attributes('src')).toBe('/pic.webp')
    expect(img.attributes('alt')).toBe('A doll')
  })

  it('после события load помечает картинку загруженной', async () => {
    const wrapper = mount(AppImage, { props: { src: '/pic.webp', alt: 'A doll' } })
    await wrapper.find('img').trigger('load')
    expect(wrapper.find('img').classes()).toContain('app-image--loaded')
  })

  it('пробрасывает fallthrough-атрибуты на img', () => {
    const wrapper = mount(AppImage, {
      props: { src: '/pic.webp', alt: '' },
      attrs: { loading: 'lazy', decoding: 'async', class: 'product-card__img' },
    })
    const img = wrapper.find('img')
    expect(img.attributes('loading')).toBe('lazy')
    expect(img.attributes('decoding')).toBe('async')
    expect(img.classes()).toContain('product-card__img')
  })
})
