type SitemapProduct = { slug: string; updatedAt: string }
type SitemapCategory = { slug: string }

const SITEMAP_CACHE_TTL_MS = 60 * 60_000

let cachedXml: string | null = null
let cachedAt = 0

function urlTag(loc: string, lastmod?: string): string {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
}

async function buildSitemap(siteUrl: string): Promise<string> {
  const apiBase = process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'

  const [products, categories] = await Promise.all([
    $fetch<SitemapProduct[]>(`${apiBase}/products/sitemap-data`),
    $fetch<SitemapCategory[]>(`${apiBase}/categories`),
  ])

  const latestMod = products
    .map((p) => p.updatedAt.slice(0, 10))
    .sort()
    .at(-1)

  const urls = [
    urlTag(`${siteUrl}/`, latestMod),
    urlTag(`${siteUrl}/gallery`, latestMod),
    urlTag(`${siteUrl}/shop`, latestMod),
    urlTag(`${siteUrl}/shop/on-sale`, latestMod),
    ...categories.map((c) => urlTag(`${siteUrl}/shop/${c.slug}`, latestMod)),
    ...products.map((p) => urlTag(`${siteUrl}/product/${p.slug}`, p.updatedAt.slice(0, 10))),
  ]

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
}

export default defineEventHandler(async (event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl

  if (!cachedXml || Date.now() - cachedAt > SITEMAP_CACHE_TTL_MS) {
    try {
      cachedXml = await buildSitemap(siteUrl)
      cachedAt = Date.now()
    } catch (e) {
      console.error('Sitemap build failed', e)
      if (!cachedXml) throw createError({ statusCode: 503, statusMessage: 'Sitemap temporarily unavailable' })
    }
  }

  setHeader(event, 'content-type', 'application/xml')
  return cachedXml
})
