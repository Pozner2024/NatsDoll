import { describe, it, expect } from 'vitest'
import { metaDescription, productSeoTitle, DEFAULT_OG_IMAGE } from './seo'

describe('metaDescription', () => {
  it('strips html tags and collapses whitespace', () => {
    expect(metaDescription('<p>Hello <strong>world</strong></p>\n\nSecond  line')).toBe(
      'Hello world Second line',
    )
  })

  it('returns short text as is', () => {
    expect(metaDescription('A handmade cat')).toBe('A handmade cat')
  })

  it('truncates long text at word boundary with ellipsis', () => {
    const long = 'word '.repeat(60).trim()
    const result = metaDescription(long)
    expect(result.length).toBeLessThanOrEqual(160)
    expect(result.endsWith('…')).toBe(true)
    expect(result).not.toContain('wor…')
  })

  it('returns empty string for empty input', () => {
    expect(metaDescription('')).toBe('')
  })
})

describe('productSeoTitle', () => {
  it('короткое имя отдаёт целиком с брендом', () => {
    expect(productSeoTitle('Four Leaf Clover Gift')).toBe('Four Leaf Clover Gift — NatsDoll')
  })

  it('длинное имя обрезает по границе слова, бренд в конце', () => {
    const long =
      "Four Leaf Clover Good luck Gift Lucky Gift Clover for Luck Unique Clover with Four Leafs Personalized Irish gift St Patrick's Day Gift"
    const result = productSeoTitle(long)
    expect(result.endsWith(' — NatsDoll')).toBe(true)
    expect(result.length).toBeLessThanOrEqual(65)
    const namePart = result.slice(0, -' — NatsDoll'.length)
    expect(long.startsWith(namePart)).toBe(true)
    expect(long[namePart.length]).toBe(' ')
  })

  it('убирает висячую запятую/дефис на месте обрезки', () => {
    const long = `Cute Cat Figurine, Polymer Clay Miniature, ${'x'.repeat(60)}`
    const result = productSeoTitle(long.slice(0, 43) + long.slice(43))
    expect(result).not.toMatch(/[,\-–—] — NatsDoll$/)
  })

  it('схлопывает лишние пробелы', () => {
    expect(productSeoTitle('  Tiny   Cat  ')).toBe('Tiny Cat — NatsDoll')
  })
})

describe('DEFAULT_OG_IMAGE', () => {
  it('is an absolute url', () => {
    expect(DEFAULT_OG_IMAGE).toMatch(/^https:\/\//)
  })
})
