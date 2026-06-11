export const DEFAULT_OG_IMAGE = 'https://storage.yandexcloud.net/natsdoll/gallery1/p1.webp'

const META_DESCRIPTION_MAX = 160

export function metaDescription(source: string): string {
  const text = source.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  if (text.length <= META_DESCRIPTION_MAX) return text
  const cut = text.slice(0, META_DESCRIPTION_MAX - 1)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : cut.length)}…`
}
