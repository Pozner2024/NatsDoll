import { describe, it, expect } from 'vitest'
import router from '@/router'
import { shopCategories } from '@/widgets/app-header'

const STATIC_ROUTES = ['/gallery', '/login', '/cart']

describe('router', () => {
  it('маршрут / существует', () => {
    const match = router.resolve('/')
    expect(match.matched.length).toBeGreaterThan(0)
  })

  it.each(STATIC_ROUTES)('маршрут %s существует', (path) => {
    const match = router.resolve(path)
    expect(match.matched.length).toBeGreaterThan(0)
  })

  it('все пути shopCategories резолвятся роутером', () => {
    for (const cat of shopCategories) {
      const match = router.resolve(cat.to)
      expect(match.matched.length, `нет маршрута для ${cat.to}`).toBeGreaterThan(0)
    }
  })
})
