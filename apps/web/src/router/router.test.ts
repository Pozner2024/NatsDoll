import { describe, it, expect } from 'vitest'
import router from '@/router'
import { staticShopItems } from '@/widgets/app-header'

const STATIC_ROUTES = ['/gallery', '/account', '/cart']

describe('router', () => {
  it('маршрут / существует', () => {
    const match = router.resolve('/')
    expect(match.matched.length).toBeGreaterThan(0)
  })

  it.each(STATIC_ROUTES)('маршрут %s существует', (path) => {
    const match = router.resolve(path)
    expect(match.matched.length).toBeGreaterThan(0)
  })

  it('статичные пункты shop резолвятся роутером', () => {
    for (const item of staticShopItems) {
      const match = router.resolve(item.to)
      expect(match.matched.length, `нет маршрута для ${item.to}`).toBeGreaterThan(0)
    }
  })

  it('параметрический /shop/:category резолвится для произвольного slug', () => {
    const match = router.resolve('/shop/any-category-slug')
    expect(match.matched.length).toBeGreaterThan(0)
  })
})
