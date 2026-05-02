import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ProductCard from './ProductCard.vue'
import type { Product } from './types'

const baseProduct: Product = {
  id: 'p1',
  slug: 'sleeping-bunny',
  name: 'Sleeping bunny',
  price: 24,
  image: 'https://example.com/bunny.jpg',
  stock: 5,
}

function mountCard(product: Product) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  return mount(ProductCard, {
    props: { product },
    global: { plugins: [router] },
  })
}

describe('ProductCard', () => {
  it('renders name, formatted price, and image', () => {
    const wrapper = mountCard(baseProduct)
    expect(wrapper.text()).toContain('Sleeping bunny')
    expect(wrapper.text()).toContain('$24.00')
    expect(wrapper.find('img').attributes('src')).toBe('https://example.com/bunny.jpg')
  })

  it('renders placeholder when image is null', () => {
    const wrapper = mountCard({ ...baseProduct, image: null })
    expect(wrapper.find('img').exists()).toBe(false)
    expect(wrapper.find('.product-card__placeholder').exists()).toBe(true)
  })

  it('wraps product info in router-link to /product/:slug', () => {
    const wrapper = mountCard(baseProduct)
    const link = wrapper.find('a.product-card__link')
    expect(link.exists()).toBe(true)
    expect(link.attributes('href')).toBe('/product/sleeping-bunny')
  })

  it('renders enabled "Add to cart" button when stock > 0', () => {
    const wrapper = mountCard(baseProduct)
    const btn = wrapper.find('button.product-card__btn')
    expect(btn.text()).toBe('Add to cart')
    expect(btn.attributes('disabled')).toBeUndefined()
  })

  it('renders disabled "Sold out" button and badge when stock === 0', () => {
    const wrapper = mountCard({ ...baseProduct, stock: 0 })
    const btn = wrapper.find('button.product-card__btn')
    expect(btn.text()).toBe('Sold out')
    expect(btn.attributes('disabled')).toBeDefined()
    expect(wrapper.find('.product-card__badge').text()).toBe('Sold out')
  })

  it('button click calls console.log("add to cart", id) and does NOT trigger navigation', async () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const wrapper = mountCard(baseProduct)

    const btn = wrapper.find('button.product-card__btn')
    await btn.trigger('click')

    expect(spy).toHaveBeenCalledWith('add to cart', 'p1')
    spy.mockRestore()
  })
})
