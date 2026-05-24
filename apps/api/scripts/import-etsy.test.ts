import { describe, it, expect } from 'vitest'
import { detectCategorySlug, makeUniqueSlug, parseMessageOptions, type EtsyRow } from './import-etsy'

function makeRow(fields: Partial<EtsyRow>): EtsyRow {
  return {
    TITLE: '', DESCRIPTION: '', PRICE: '', QUANTITY: '', TAGS: '',
    IMAGE1: '', IMAGE2: '', IMAGE3: '', IMAGE4: '', IMAGE5: '',
    IMAGE6: '', IMAGE7: '', IMAGE8: '', IMAGE9: '', IMAGE10: '',
    'VARIATION 1 TYPE': '', 'VARIATION 1 NAME': '', 'VARIATION 1 VALUES': '',
    'VARIATION 2 TYPE': '', 'VARIATION 2 NAME': '', 'VARIATION 2 VALUES': '',
    ...fields,
  }
}

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

describe('parseMessageOptions', () => {
  it('извлекает значения из VARIATION 1 если NAME = "message"', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'message',
      'VARIATION 1 VALUES': 'Happy Birthday,With love,Many returns',
    })
    expect(parseMessageOptions(row)).toEqual(['Happy Birthday', 'With love', 'Many returns'])
  })

  it('извлекает значения из VARIATION 2 если NAME там = "message"', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'flavor',
      'VARIATION 1 VALUES': 'vanilla,chocolate',
      'VARIATION 2 NAME': 'message',
      'VARIATION 2 VALUES': 'Boo!,Trick or Treat',
    })
    expect(parseMessageOptions(row)).toEqual(['Boo!', 'Trick or Treat'])
  })

  it('распознаёт опечатку "mesage"', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'mesage',
      'VARIATION 1 VALUES': 'If you were a fruit,your own text',
    })
    expect(parseMessageOptions(row)).toEqual(['If you were a fruit'])
  })

  it('фильтрует токен "your own text" в любом регистре', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'message',
      'VARIATION 1 VALUES': 'Hi,your own text,Bye,Your Own Text,YOUR OWN TEXT',
    })
    expect(parseMessageOptions(row)).toEqual(['Hi', 'Bye'])
  })

  it('декодирует HTML-entities (&#39; → апостроф)', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'message',
      'VARIATION 1 VALUES': "Don&#39;t be crabby,I&#39;m so lucky",
    })
    expect(parseMessageOptions(row)).toEqual(["Don't be crabby", "I'm so lucky"])
  })

  it('декодирует &amp; &quot; &lt; &gt;', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'message',
      'VARIATION 1 VALUES': 'Salt &amp; Pepper,&quot;Hello&quot;,5 &lt; 10',
    })
    expect(parseMessageOptions(row)).toEqual(['Salt & Pepper', '"Hello"', '5 < 10'])
  })

  it('возвращает [] если ни одна вариация не "message"', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'flavor',
      'VARIATION 1 VALUES': 'vanilla,chocolate',
      'VARIATION 2 NAME': 'packing',
      'VARIATION 2 VALUES': 'gift wrapping,no gift wrapping',
    })
    expect(parseMessageOptions(row)).toEqual([])
  })

  it('возвращает [] если все колонки пустые', () => {
    expect(parseMessageOptions(makeRow({}))).toEqual([])
  })

  it('case-insensitive name ("Message", "MESSAGE")', () => {
    expect(parseMessageOptions(makeRow({
      'VARIATION 1 NAME': 'Message',
      'VARIATION 1 VALUES': 'Hi',
    }))).toEqual(['Hi'])
    expect(parseMessageOptions(makeRow({
      'VARIATION 1 NAME': 'MESSAGE',
      'VARIATION 1 VALUES': 'Hi',
    }))).toEqual(['Hi'])
  })

  it('trim значений и фильтр пустых', () => {
    const row = makeRow({
      'VARIATION 1 NAME': 'message',
      'VARIATION 1 VALUES': '  Hi  ,, Bye  ,',
    })
    expect(parseMessageOptions(row)).toEqual(['Hi', 'Bye'])
  })
})
