import { describe, it, expect } from 'vitest'
import { escapeXml, truncate } from './xml'

describe('truncate', () => {
  it('collapses whitespace and cuts on a word boundary', () => {
    expect(truncate('Tiny  glass\nbottle with a crab', 16)).toBe('Tiny glass…')
  })

  it('returns short text unchanged', () => {
    expect(truncate('Short', 100)).toBe('Short')
  })
})

describe('escapeXml', () => {
  it('escapes XML special characters', () => {
    expect(escapeXml(`Salt & "Pepper" <3 'n'`)).toBe('Salt &amp; &quot;Pepper&quot; &lt;3 &apos;n&apos;')
  })
})
