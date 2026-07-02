type SitemapProduct = { slug: string; updatedAt: string }
type SitemapCategory = { slug: string }

function urlTag(loc: string, lastmod?: string): string {
  return `  <url><loc>${loc}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ''}</url>`
}

export default defineEventHandler(async (event) => {
  const apiBase = process.env.NUXT_API_INTERNAL_URL ?? 'http://localhost:3000'
  const siteUrl = useRuntimeConfig(event).public.siteUrl

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
    ...categories.map((c) => urlTag(`${siteUrl}/shop/${c.slug}`, latestMod)),
    ...products.map((p) => urlTag(`${siteUrl}/product/${p.slug}`, p.updatedAt.slice(0, 10))),
  ]

  setHeader(event, 'content-type', 'application/xml')
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`
})
