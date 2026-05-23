import { describe, it, expect } from 'vitest'
import { detectCategorySlug, makeUniqueSlug } from './import-etsy'

describe('detectCategorySlug', () => {
  it('распознаёт cake-toppers по фразе "cake topper"', () => {
    expect(detectCategorySlug('Birthday Cake Topper Heart', '')).toBe('cake-toppers')
  })

  it('cake-toppers выигрывает у birthday-gifts (специфичнее)', () => {
    expect(detectCategorySlug('Happy Birthday Cake Topper', 'birthday')).toBe('cake-toppers')
  })

  it('распознаёт dollhouse-miniature по "miniature"', () => {
    expect(detectCategorySlug('Pizza for Dolls Miniature 1:12 Scale', '')).toBe('dollhouse-miniature')
  })

  it('распознаёт graduation-gifts по "class of"', () => {
    expect(detectCategorySlug('Funny Gift Class Of 2023', '')).toBe('graduation-gifts')
  })

  it('распознаёт valentines-day-gifts по "valentine"', () => {
    expect(detectCategorySlug('Valentines Day Gift Bear', 'romantic, love')).toBe('valentines-day-gifts')
  })

  it('распознаёт halloween-gifts по "pumpkin"', () => {
    expect(detectCategorySlug('Tiny Pumpkin Charm', '')).toBe('halloween-gifts')
  })

  it('fallback на art-dolls если ничего не подошло', () => {
    expect(detectCategorySlug('Random unknown item', 'misc')).toBe('art-dolls')
  })

  it('учитывает поле TAGS вместе с TITLE', () => {
    expect(detectCategorySlug('Cute figurine', 'christmas, holiday')).toBe('christmas-gifts')
  })

  it('case-insensitive', () => {
    expect(detectCategorySlug('GRADUATION GIFT', '')).toBe('graduation-gifts')
  })
})

describe('makeUniqueSlug', () => {
  it('возвращает чистый slug если он свободен', () => {
    const taken = new Set<string>()
    expect(makeUniqueSlug('Sleeping Bunny', taken)).toBe('sleeping-bunny')
  })

  it('добавляет суффикс -2 если базовый slug занят', () => {
    const taken = new Set(['sleeping-bunny'])
    expect(makeUniqueSlug('Sleeping Bunny', taken)).toBe('sleeping-bunny-2')
  })

  it('инкрементирует суффикс при коллизии', () => {
    const taken = new Set(['sleeping-bunny', 'sleeping-bunny-2'])
    expect(makeUniqueSlug('Sleeping Bunny', taken)).toBe('sleeping-bunny-3')
  })

  it('регистрирует возвращённый slug в наборе taken', () => {
    const taken = new Set<string>()
    const slug = makeUniqueSlug('Pink Mermaid', taken)
    expect(taken.has(slug)).toBe(true)
  })

  it('обрабатывает кириллицу и спецсимволы через slugify strict', () => {
    const taken = new Set<string>()
    const slug = makeUniqueSlug('Cute Bunny! 🐰 #handmade', taken)
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })
})
