import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import CategoryPills from './CategoryPills.vue'
import type { Category } from '@/entities/category'

const categories: Category[] = [
  { id: '1', slug: 'animals', name: 'Animals' },
  { id: '2', slug: 'sweet', name: 'Sweet' },
]

function mountPills(activeSlug: string | undefined, currentSort = 'newest') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  return mount(CategoryPills, {
    props: { categories, activeSlug, currentSort },
    global: { plugins: [router] },
  })
}

describe('CategoryPills', () => {
  it('renders "All" pill plus one per category', () => {
    const wrapper = mountPills(undefined)
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills).toHaveLength(3)
    expect(pills[0]!.text()).toBe('All')
    expect(pills[1]!.text()).toBe('Animals')
    expect(pills[2]!.text()).toBe('Sweet')
  })

  it('marks "All" pill active when activeSlug is undefined', () => {
    const wrapper = mountPills(undefined)
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills[0]!.classes()).toContain('category-pills__pill--active')
    expect(pills[1]!.classes()).not.toContain('category-pills__pill--active')
  })

  it('marks correct pill active when activeSlug is set', () => {
    const wrapper = mountPills('animals')
    const pills = wrapper.findAll('a.category-pills__pill')
    expect(pills[0]!.classes()).not.toContain('category-pills__pill--active')
    expect(pills[1]!.classes()).toContain('category-pills__pill--active')
  })

  it('"All" link goes to /shop, preserves sort, drops page', () => {
    const wrapper = mountPills('animals', 'price-asc')
    const allLink = wrapper.findAll('a.category-pills__pill')[0]!
    const href = allLink.attributes('href')!
    expect(href).toContain('/shop')
    expect(href).toContain('sort=price-asc')
    expect(href).not.toContain('page=')
    expect(href).not.toContain('/shop/animals')
  })

  it('"All" link drops sort=newest from URL when sort is default', () => {
    const wrapper = mountPills('animals', 'newest')
    const allLink = wrapper.findAll('a.category-pills__pill')[0]!
    const href = allLink.attributes('href')!
    expect(href).not.toContain('sort=')
    expect(href).toContain('/shop')
  })

  it('category link goes to /shop/:slug, preserves sort, drops page', () => {
    const wrapper = mountPills(undefined, 'price-asc')
    const animalsLink = wrapper.findAll('a.category-pills__pill')[1]!
    const href = animalsLink.attributes('href')!
    expect(href).toContain('/shop/animals')
    expect(href).toContain('sort=price-asc')
    expect(href).not.toContain('page=')
  })
})
