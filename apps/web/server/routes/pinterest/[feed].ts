import { buildPinterestRss, type PinterestProduct } from '../../utils/pinterestFeed'

const PINTEREST_DATA_CACHE_TTL_MS = 60 * 60_000

let cachedProducts: PinterestProduct[] | null = null
let cachedAt = 0

async function loadProducts(): Promise<PinterestProduct[]> {
  if (cachedProducts && Date.now() - cachedAt <= PINTEREST_DATA_CACHE_TTL_MS) return cachedProducts

  const apiBase = process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'
  try {
    const products = await $fetch<PinterestProduct[]>(`${apiBase}/products/pinterest-data`)
    cachedProducts = products
    cachedAt = Date.now()
    return products
  } catch (e) {
    console.error('Pinterest feed data fetch failed', e)
    if (cachedProducts) return cachedProducts
    throw createError({ statusCode: 503, statusMessage: 'Feed temporarily unavailable' })
  }
}

export default defineEventHandler(async (event) => {
  const feedKey = (getRouterParam(event, 'feed') ?? '').replace(/\.xml$/, '')
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  const xml = buildPinterestRss(feedKey, await loadProducts(), siteUrl, Date.now())
  if (!xml) throw createError({ statusCode: 404, statusMessage: 'Feed not found' })

  setHeader(event, 'content-type', 'application/rss+xml; charset=utf-8')
  return xml
})
