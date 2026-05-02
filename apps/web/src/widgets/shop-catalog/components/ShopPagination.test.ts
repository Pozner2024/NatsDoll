import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createRouter, createMemoryHistory } from 'vue-router'
import ShopPagination from './ShopPagination.vue'

function mountPag(currentPage: number, totalPages: number, query: Record<string, string> = {}) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/shop/:category?', name: 'shop', component: { template: '<div />' } },
    ],
  })
  return mount(ShopPagination, {
    props: { currentPage, totalPages, currentSort: query.sort ?? 'newest' },
    global: { plugins: [router] },
  })
}

function pageNumbers(wrapper: ReturnType<typeof mount>): string[] {
  return wrapper.findAll('a.shop-pagination__page, span.shop-pagination__page').map((el) => el.text())
}

describe('ShopPagination', () => {
  it('renders nothing when totalPages <= 1', () => {
    const wrapper = mountPag(1, 1)
    expect(wrapper.find('nav').exists()).toBe(false)
  })

  it('5 pages, current 1: 1 2 3 4 5 ›', () => {
    const wrapper = mountPag(1, 5)
    expect(pageNumbers(wrapper)).toEqual(['1', '2', '3', '4', '5'])
    expect(wrapper.find('.shop-pagination__prev').exists()).toBe(false)
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(true)
  })

  it('17 pages, current 1: 1 2 3 ... 17 ›', () => {
    const wrapper = mountPag(1, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '2', '3', '...', '17'])
  })

  it('17 pages, current 9: ‹ 1 ... 8 9 10 ... 17 ›', () => {
    const wrapper = mountPag(9, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '...', '8', '9', '10', '...', '17'])
    expect(wrapper.find('.shop-pagination__prev').exists()).toBe(true)
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(true)
  })

  it('17 pages, current 17: ‹ 1 ... 15 16 17', () => {
    const wrapper = mountPag(17, 17)
    expect(pageNumbers(wrapper)).toEqual(['1', '...', '15', '16', '17'])
    expect(wrapper.find('.shop-pagination__next').exists()).toBe(false)
  })

  it('page links preserve currentSort in query', () => {
    const wrapper = mountPag(1, 5, { sort: 'price-asc' })
    const link = wrapper.find('a.shop-pagination__page')
    expect(link.attributes('href')).toContain('sort=price-asc')
  })

  it('current page is rendered as span (non-clickable), others as anchors', () => {
    const wrapper = mountPag(2, 5)
    const items = wrapper.findAll('.shop-pagination__page')
    const current = items.find((el) => el.classes().includes('shop-pagination__page--current'))!
    expect(current.element.tagName.toLowerCase()).toBe('span')
    expect(current.text()).toBe('2')
  })
})
