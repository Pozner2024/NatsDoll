import { describe, it, expect } from 'vitest'
import { detectCategorySlug } from './import-etsy'

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
