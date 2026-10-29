import { buildMerchantFeed, type MerchantProduct } from '../utils/merchantFeed'

const MERCHANT_FEED_CACHE_TTL_MS = 60 * 60_000

let cachedXml: string | null = null
let cachedAt = 0

export default defineEventHandler(async (event) => {
  if (!cachedXml || Date.now() - cachedAt > MERCHANT_FEED_CACHE_TTL_MS) {
    const apiBase = process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'
    const siteUrl = useRuntimeConfig(event).public.siteUrl
    try {
      const products = await $fetch<MerchantProduct[]>(`${apiBase}/products/merchant-data`)
      cachedXml = buildMerchantFeed(products, siteUrl)
      cachedAt = Date.now()
    } catch (e) {
      console.error('Merchant feed data fetch failed', e)
      if (!cachedXml) throw createError({ statusCode: 503, statusMessage: 'Feed temporarily unavailable' })
    }
  }

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return cachedXml
})
