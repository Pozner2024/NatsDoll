import { createHash } from 'node:crypto'
import { escapeXml, truncate } from './xml'

export type PinterestProduct = {
  id: string
  slug: string
  name: string
  description: string
  image: string | null
  categorySlug: string
  createdAt: string
}

type ScheduledProduct = { product: PinterestProduct; releaseAt: number }

export const PINTEREST_FEEDS: Record<string, { title: string; categories: string[] }> = {
  'christmas-gifts': { title: 'Christmas Gifts', categories: ['christmas-gifts'] },
  'halloween-gifts': { title: 'Halloween Gifts', categories: ['halloween-gifts'] },
  'valentines-day-gifts': { title: "Valentine's Day Gifts", categories: ['valentines-day-gifts'] },
  'dollhouse-miniature': { title: 'Dollhouse Miniature', categories: ['dollhouse-miniature'] },
  'art-dolls': { title: 'Art Dolls', categories: ['art-dolls'] },
  'birthday-gifts': { title: 'Birthday Gifts', categories: ['birthday-gifts'] },
  'motivational-gifts': { title: 'Motivational Gifts', categories: ['motivational-gifts'] },
  'graduation-gifts': { title: 'Graduation Gifts', categories: ['graduation-gifts'] },
  'party-favors': { title: 'Wedding & Party Favors', categories: ['party-favors-bulk', 'cake-toppers'] },
}

export const PINS_PER_DAY = 8
export const FEED_START_MS = Date.parse('2026-10-28T00:00:00Z')

const DAY_MS = 24 * 60 * 60_000
const FEED_MAX_ITEMS = 200
const TITLE_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 500

function shuffleKey(id: string): string {
  return createHash('md5').update(id).digest('hex')
}

function feedKeyOf(categorySlug: string): string {
  return Object.keys(PINTEREST_FEEDS).find((key) => PINTEREST_FEEDS[key]?.categories.includes(categorySlug)) ?? categorySlug
}

function interleaveByFeed(products: PinterestProduct[]): PinterestProduct[] {
  const groups = new Map<string, PinterestProduct[]>()
  for (const product of products) {
    const key = feedKeyOf(product.categorySlug)
    groups.set(key, [...(groups.get(key) ?? []), product])
  }

  const queues = [...groups.keys()]
    .sort()
    .map((key) => (groups.get(key) ?? []).sort((a, b) => shuffleKey(a.id).localeCompare(shuffleKey(b.id))))
  const longest = Math.max(0, ...queues.map((q) => q.length))

  return Array.from({ length: longest }, (_, round) => queues.flatMap((q) => q[round] ?? []))
    .flat()
}

export function scheduleReleases(
  products: PinterestProduct[],
  startMs = FEED_START_MS,
  perDay = PINS_PER_DAY,
): ScheduledProduct[] {
  const backlog = interleaveByFeed(products.filter((p) => Date.parse(p.createdAt) < startMs))
  const fresh = products
    .filter((p) => Date.parse(p.createdAt) >= startMs)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt))

  return [...backlog, ...fresh].map((product, i) => ({
    product,
    releaseAt: Math.max(startMs + Math.floor((i * DAY_MS) / perDay), Date.parse(product.createdAt)),
  }))
}

function imageType(url: string): string {
  if (url.endsWith('.png')) return 'image/png'
  if (url.endsWith('.webp')) return 'image/webp'
  return 'image/jpeg'
}

function itemTag(siteUrl: string, { product, releaseAt }: ScheduledProduct, image: string): string {
  const link = `${siteUrl}/product/${product.slug}`
  return `    <item>
      <title>${escapeXml(truncate(product.name, TITLE_MAX_LENGTH))}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <description>${escapeXml(truncate(product.description, DESCRIPTION_MAX_LENGTH))}</description>
      <pubDate>${new Date(releaseAt).toUTCString()}</pubDate>
      <enclosure url="${escapeXml(image)}" type="${imageType(image)}" length="0" />
      <media:content url="${escapeXml(image)}" medium="image" />
    </item>`
}

export function buildPinterestRss(
  feedKey: string,
  products: PinterestProduct[],
  siteUrl: string,
  nowMs: number,
): string | null {
  const feed = PINTEREST_FEEDS[feedKey]
  if (!feed) return null

  const items = scheduleReleases(products)
    .filter(({ product, releaseAt }) => releaseAt <= nowMs && product.image && feed.categories.includes(product.categorySlug))
    .sort((a, b) => b.releaseAt - a.releaseAt)
    .slice(0, FEED_MAX_ITEMS)
    .map((scheduled) => itemTag(siteUrl, scheduled, scheduled.product.image as string))

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/">
  <channel>
    <title>${escapeXml(`NatsDoll — ${feed.title}`)}</title>
    <link>${siteUrl}/</link>
    <description>${escapeXml(`Handmade polymer clay ${feed.title.toLowerCase()} by NatsDoll`)}</description>
${items.join('\n')}
  </channel>
</rss>`
}
