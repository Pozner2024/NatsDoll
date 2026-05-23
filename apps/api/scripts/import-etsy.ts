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
