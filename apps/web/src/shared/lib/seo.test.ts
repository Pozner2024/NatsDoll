import { describe, it, expect } from 'vitest'
import { metaDescription, DEFAULT_OG_IMAGE } from './seo'

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

describe('DEFAULT_OG_IMAGE', () => {
  it('is an absolute url', () => {
    expect(DEFAULT_OG_IMAGE).toMatch(/^https:\/\//)
  })
})
