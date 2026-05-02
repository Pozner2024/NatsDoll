import { describe, it, expect } from 'vitest'
import { navItems, staticShopItems } from './navigationConfig'

describe('navItems', () => {
  it('каждый пункт имеет label и to', () => {
    for (const item of navItems) {
      expect(item.label).toBeTruthy()
      expect(item.to).toBeTruthy()
    }
  })

  it('все пути начинаются с /', () => {
    for (const item of navItems) {
      expect(item.to).toMatch(/^\//)
    }
  })

  it('нет дублирующихся путей', () => {
    const paths = navItems.map((i) => i.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})

describe('staticShopItems', () => {
  it('каждый пункт имеет label и to', () => {
    for (const item of staticShopItems) {
      expect(item.label).toBeTruthy()
      expect(item.to).toBeTruthy()
    }
  })

  it('все пути начинаются с /shop', () => {
    for (const item of staticShopItems) {
      expect(item.to).toMatch(/^\/shop/)
    }
  })

  it('нет дублирующихся путей', () => {
    const paths = staticShopItems.map((i) => i.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
