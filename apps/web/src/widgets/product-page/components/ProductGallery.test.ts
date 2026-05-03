import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProductGallery from './ProductGallery.vue'

const images = ['img1.jpg', 'img2.jpg', 'img3.jpg', 'img4.jpg']

describe('ProductGallery', () => {
  it('renders main image as first image by default', () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora' } })
    expect(wrapper.find('.product-gallery__main-img').attributes('src')).toBe('img1.jpg')
  })

  it('renders 4 thumbnails', () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora' } })
    expect(wrapper.findAll('.product-gallery__thumb')).toHaveLength(4)
  })

  it('first thumbnail is active by default', () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora' } })
    const thumbs = wrapper.findAll('.product-gallery__thumb')
    expect(thumbs[0]!.classes()).toContain('product-gallery__thumb--active')
  })

  it('clicking a thumbnail changes the main image', async () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora' } })
    const thumbs = wrapper.findAll('.product-gallery__thumb')
    await thumbs[1]!.trigger('click')
    expect(wrapper.find('.product-gallery__main-img').attributes('src')).toBe('img2.jpg')
    expect(thumbs[1]!.classes()).toContain('product-gallery__thumb--active')
    expect(thumbs[0]!.classes()).not.toContain('product-gallery__thumb--active')
  })

  it('shows sold-out badge when stock is 0', () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora', stock: 0 } })
    expect(wrapper.find('.product-gallery__badge').exists()).toBe(true)
    expect(wrapper.find('.product-gallery__badge').text()).toBe('Sold out')
  })

  it('hides badge when stock > 0', () => {
    const wrapper = mount(ProductGallery, { props: { images, name: 'Aurora', stock: 1 } })
    expect(wrapper.find('.product-gallery__badge').exists()).toBe(false)
  })
})
