import { describe, it, expect } from 'vitest'
import { buildPinterestRss, scheduleReleases, truncate, FEED_START_MS, PINS_PER_DAY, type PinterestProduct } from './pinterestFeed'

const DAY_MS = 24 * 60 * 60_000
const SITE = 'https://natsdoll.com'

function product(overrides: Partial<PinterestProduct>): PinterestProduct {
  return {
    id: 'p1',
    slug: 'p-1',
    name: 'Product',
    description: 'Description',
    image: 'https://example.com/1.webp',
    categorySlug: 'christmas-gifts',
    createdAt: '2026-06-01T00:00:00.000Z',
    ...overrides,
  }
}

function backlog(count: number, categorySlug = 'christmas-gifts'): PinterestProduct[] {
  return Array.from({ length: count }, (_, i) => product({ id: `id-${i}`, slug: `p-${i}`, categorySlug }))
}

describe('scheduleReleases', () => {
  it('spreads releases evenly through the day', () => {
    const releases = scheduleReleases(backlog(PINS_PER_DAY + 1)).map((s) => s.releaseAt)
    const interval = DAY_MS / PINS_PER_DAY

    expect(releases).toEqual(Array.from({ length: PINS_PER_DAY + 1 }, (_, i) => FEED_START_MS + i * interval))
  })

  it('keeps the same order regardless of input order', () => {
    const items = backlog(10)
    const a = scheduleReleases(items).map((s) => s.product.id)
    const b = scheduleReleases([...items].reverse()).map((s) => s.product.id)

    expect(a).toEqual(b)
  })

  it('queues products created after the start behind the backlog', () => {
    const fresh = product({ id: 'new', createdAt: new Date(FEED_START_MS + 1).toISOString() })
    const scheduled = scheduleReleases([fresh, ...backlog(PINS_PER_DAY * 2)])

    expect(scheduled.at(-1)?.product.id).toBe('new')
    expect(scheduled.at(-1)?.releaseAt).toBe(FEED_START_MS + 2 * DAY_MS)
  })

  it('releases a new product at creation time once the backlog is done', () => {
    const createdAt = FEED_START_MS + 30 * DAY_MS
    const scheduled = scheduleReleases([product({ id: 'new', createdAt: new Date(createdAt).toISOString() })])

    expect(scheduled[0]?.releaseAt).toBe(createdAt)
  })
})

describe('truncate', () => {
  it('collapses whitespace and cuts on a word boundary', () => {
    expect(truncate('Tiny  glass\nbottle with a crab', 16)).toBe('Tiny glass…')
  })

  it('returns short text unchanged', () => {
    expect(truncate('Short', 100)).toBe('Short')
  })
})

describe('buildPinterestRss', () => {
  it('returns null for an unknown feed', () => {
    expect(buildPinterestRss('unknown', backlog(1), SITE, FEED_START_MS)).toBeNull()
  })

  it('includes only released products of the feed categories', () => {
    const items = [...backlog(PINS_PER_DAY * 2), product({ id: 'other', slug: 'other', categorySlug: 'art-dolls' })]
    const xml = buildPinterestRss('christmas-gifts', items, SITE, FEED_START_MS + DAY_MS - 1) ?? ''

    expect(xml).not.toContain('/product/other')
    expect(xml.match(/<item>/g)?.length).toBeLessThanOrEqual(PINS_PER_DAY)
  })

  it('combines several categories in one feed', () => {
    const items = [
      product({ id: 'a', slug: 'bulk', categorySlug: 'party-favors-bulk' }),
      product({ id: 'b', slug: 'topper', categorySlug: 'cake-toppers' }),
    ]
    const xml = buildPinterestRss('party-favors', items, SITE, FEED_START_MS + DAY_MS) ?? ''

    expect(xml).toContain(`${SITE}/product/bulk`)
    expect(xml).toContain(`${SITE}/product/topper`)
  })

  it('skips products without an image and escapes text', () => {
    const items = [
      product({ id: 'a', slug: 'a', name: 'Salt & Pepper <3' }),
      product({ id: 'b', slug: 'b', image: null }),
    ]
    const xml = buildPinterestRss('christmas-gifts', items, SITE, FEED_START_MS + DAY_MS) ?? ''

    expect(xml).toContain('<title>Salt &amp; Pepper &lt;3</title>')
    expect(xml).toContain('<enclosure url="https://example.com/1.webp" type="image/webp" length="0" />')
    expect(xml).not.toContain('/product/b<')
  })

  it('shows nothing before the feed start', () => {
    const xml = buildPinterestRss('christmas-gifts', backlog(3), SITE, FEED_START_MS - 1) ?? ''

    expect(xml).not.toContain('<item>')
  })
})
