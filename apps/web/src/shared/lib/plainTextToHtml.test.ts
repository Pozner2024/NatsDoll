import { describe, it, expect } from 'vitest'
import { plainTextToHtml } from './plainTextToHtml'

describe('plainTextToHtml', () => {
  it('двойной перевод строки разбивает текст на абзацы', () => {
    expect(plainTextToHtml('First paragraph.\n\nSecond paragraph.')).toBe(
      '<p>First paragraph.</p><p>Second paragraph.</p>',
    )
  })

  it('одиночный перевод строки внутри абзаца становится <br>', () => {
    expect(plainTextToHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>')
  })

  it('три и более переводов строки не создают пустых абзацев', () => {
    expect(plainTextToHtml('A\n\n\n\nB')).toBe('<p>A</p><p>B</p>')
  })

  it('текст с готовой HTML-разметкой возвращает без изменений', () => {
    const html = '<p>Already <strong>formatted</strong></p>'
    expect(plainTextToHtml(html)).toBe(html)
  })

  it('обрезает пробелы по краям абзацев', () => {
    expect(plainTextToHtml('  Hello  \n\n  World  ')).toBe('<p>Hello</p><p>World</p>')
  })

  it('пустая строка возвращает пустую строку', () => {
    expect(plainTextToHtml('')).toBe('')
  })
})
