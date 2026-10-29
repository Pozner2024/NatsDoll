import { escapeXml, truncate } from './xml'

export type MerchantProduct = {
  id: string
  slug: string
  name: string
  description: string
  price: number
  salePrice?: number
  images: string[]
  stock: number
  category: string
}

const BRAND = 'NatsDoll'
const TITLE_MAX_LENGTH = 150
const DESCRIPTION_MAX_LENGTH = 5000
const ADDITIONAL_IMAGES_MAX = 10

function money(amount: number): string {
  return `${amount.toFixed(2)} USD`
}

function tag(name: string, value: string): string {
  return `      <g:${name}>${escapeXml(value)}</g:${name}>`
}

function itemTag(siteUrl: string, product: MerchantProduct, image: string): string {
  const tags = [
    tag('id', product.id),
    tag('title', truncate(product.name, TITLE_MAX_LENGTH)),
    tag('description', truncate(product.description || product.name, DESCRIPTION_MAX_LENGTH)),
    tag('link', `${siteUrl}/product/${product.slug}`),
    tag('image_link', image),
    ...product.images.slice(1, ADDITIONAL_IMAGES_MAX + 1).map((url) => tag('additional_image_link', url)),
    tag('availability', product.stock > 0 ? 'in_stock' : 'out_of_stock'),
    tag('price', money(product.price)),
    ...(product.salePrice !== undefined ? [tag('sale_price', money(product.salePrice))] : []),
    tag('condition', 'new'),
    tag('brand', BRAND),
    tag('identifier_exists', 'no'),
    tag('product_type', product.category),
  ]
  return `    <item>\n${tags.join('\n')}\n    </item>`
}

export function buildMerchantFeed(products: MerchantProduct[], siteUrl: string): string {
  const items = products.flatMap((product) => {
    const image = product.images[0]
    return image ? [itemTag(siteUrl, product, image)] : []
  })

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>NatsDoll</title>
    <link>${siteUrl}/</link>
    <description>Handmade polymer clay miniatures and gifts by NatsDoll</description>
${items.join('\n')}
  </channel>
</rss>`
}
