import { readFileSync } from 'node:fs'
import { parse } from 'csv-parse/sync'
import slugify from 'slugify'

export interface EtsyRow {
  TITLE: string
  DESCRIPTION: string
  PRICE: string
  QUANTITY: string
  TAGS: string
  IMAGE1: string
  IMAGE2: string
  IMAGE3: string
  IMAGE4: string
  IMAGE5: string
  IMAGE6: string
  IMAGE7: string
  IMAGE8: string
  IMAGE9: string
  IMAGE10: string
}

type CategoryRule = readonly [slug: string, keywords: readonly string[]]

const CATEGORY_RULES: readonly CategoryRule[] = [
  ['cake-toppers',         ['cake topper', 'cake-topper']],
  ['dollhouse-miniature',  ['dollhouse', 'miniature', '1:12', '1/12']],
  ['party-favors-bulk',    ['bulk', 'party favor', 'pack of']],
  ['halloween-gifts',      ['halloween', 'pumpkin', 'spooky']],
  ['christmas-gifts',      ['christmas', 'xmas', 'santa']],
  ['valentines-day-gifts', ['valentine', 'romantic']],
  ['graduation-gifts',     ['graduation', 'class of', 'graduate']],
  ['birthday-gifts',       ['birthday']],
  ['motivational-gifts',   ['motivational', 'inspirational']],
] as const

const FALLBACK_CATEGORY = 'art-dolls'

export function detectCategorySlug(title: string, tags: string): string {
  const haystack = `${title} ${tags}`.toLowerCase()
  for (const [slug, keywords] of CATEGORY_RULES) {
    if (keywords.some((kw) => haystack.includes(kw))) {
      return slug
    }
  }
  return FALLBACK_CATEGORY
}

export function makeUniqueSlug(title: string, taken: Set<string>): string {
  const base = slugify(title, { lower: true, strict: true })
  if (!taken.has(base)) {
    taken.add(base)
    return base
  }
  let n = 2
  while (taken.has(`${base}-${n}`)) {
    n++
  }
  const slug = `${base}-${n}`
  taken.add(slug)
  return slug
}

export function parseCsv(path: string): EtsyRow[] {
  const raw = readFileSync(path, 'utf-8')
  const rows: EtsyRow[] = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  })
  return rows
}
