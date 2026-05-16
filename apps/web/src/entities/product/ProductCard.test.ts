import { describe, it, expect } from 'vitest'
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

function mountCard(product: Product, extraProps: Record<string, unknown> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: { template: '<div />' } },
      { path: '/product/:slug', component: { template: '<div />' } },
    ],
  })
  return mount(ProductCard, {
    props: { product, ...extraProps },
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

  it('wraps product image and name in router-links to /product/:slug', () => {
    const wrapper = mountCard(baseProduct)
    const links = wrapper.findAll('a[href="/product/sleeping-bunny"]')
    expect(links.length).toBeGreaterThan(0)
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

  it('hides button when hideButton prop is true', () => {
    const wrapper = mountCard(baseProduct, { hideButton: true })
    expect(wrapper.find('button.product-card__btn').exists()).toBe(false)
  })

  it('shows button by default when hideButton is not passed', () => {
    const wrapper = mountCard(baseProduct)
    expect(wrapper.find('button.product-card__btn').exists()).toBe(true)
  })

})
