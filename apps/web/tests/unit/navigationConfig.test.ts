import { describe, it, expect } from 'vitest'
import { navItems, shopCategories } from '@/features/navigation/navigationConfig'

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

describe('shopCategories', () => {
  it('каждая категория имеет label и to', () => {
    for (const cat of shopCategories) {
      expect(cat.label).toBeTruthy()
      expect(cat.to).toBeTruthy()
    }
  })

  it('все пути начинаются с /shop', () => {
    for (const cat of shopCategories) {
      expect(cat.to).toMatch(/^\/shop/)
    }
  })

  it('нет дублирующихся путей', () => {
    const paths = shopCategories.map((c) => c.to)
    expect(new Set(paths).size).toBe(paths.length)
  })
})
