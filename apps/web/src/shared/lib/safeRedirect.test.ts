import { describe, it, expect } from 'vitest'
import { resolveSafeRedirect } from './safeRedirect'

const ORIGIN = 'https://natsdoll.com'

describe('resolveSafeRedirect', () => {
  it('возвращает "/" для null', () => {
    expect(resolveSafeRedirect(null, ORIGIN)).toBe('/')
  })

  it('возвращает "/" для пустой строки', () => {
    expect(resolveSafeRedirect('', ORIGIN)).toBe('/')
  })

  it('возвращает относительный путь как есть', () => {
    expect(resolveSafeRedirect('/cart', ORIGIN)).toBe('/cart')
  })

  it('сохраняет search и hash', () => {
    expect(resolveSafeRedirect('/shop?id=1#top', ORIGIN)).toBe('/shop?id=1#top')
  })

  it('возвращает "/" для absolute URL на другой origin', () => {
    expect(resolveSafeRedirect('https://evil.com/path', ORIGIN)).toBe('/')
  })

  it('возвращает "/" для protocol-relative URL', () => {
    expect(resolveSafeRedirect('//evil.com/path', ORIGIN)).toBe('/')
  })

  it('возвращает путь для absolute URL на тот же origin', () => {
    expect(resolveSafeRedirect(`${ORIGIN}/account`, ORIGIN)).toBe('/account')
  })

  it('возвращает "/" для javascript: схемы (другой origin)', () => {
    expect(resolveSafeRedirect('javascript:alert(1)', ORIGIN)).toBe('/')
  })

  it('возвращает "/" для data: схемы', () => {
    expect(resolveSafeRedirect('data:text/html,<script>alert(1)</script>', ORIGIN)).toBe('/')
  })
})
