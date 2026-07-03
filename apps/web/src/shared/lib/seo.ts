export const DEFAULT_OG_IMAGE = 'https://storage.yandexcloud.net/natsdoll/gallery1/p1.webp'

const META_DESCRIPTION_MAX = 160
const TITLE_NAME_MAX = 50
const TITLE_BRAND_SUFFIX = ' — NatsDoll'

export function productSeoTitle(name: string): string {
  const clean = name.replace(/\s+/g, ' ').trim()
  if (clean.length <= TITLE_NAME_MAX) return `${clean}${TITLE_BRAND_SUFFIX}`
  const cut = clean.slice(0, TITLE_NAME_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  const truncated = cut
    .slice(0, lastSpace > 0 ? lastSpace : cut.length)
    .replace(/[,;:\-–—]+$/, '')
  return `${truncated}${TITLE_BRAND_SUFFIX}`
}

export function metaDescription(source: string): string {
  const text = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length <= META_DESCRIPTION_MAX) return text
  const cut = text.slice(0, META_DESCRIPTION_MAX - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`
}
