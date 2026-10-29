import { describe, it, expect } from 'vitest'
import { buildMerchantFeed, type MerchantProduct } from './merchantFeed'

const SITE = 'https://natsdoll.com'

function product(overrides: Partial<MerchantProduct>): MerchantProduct {
  return {
    id: 'p1',
    slug: 'p-1',
    name: 'Product',
    description: 'Description',
    price: 12.8,
    images: ['https://example.com/1.webp'],
    stock: 1,
    category: 'Christmas Gifts',
    categorySlug: 'christmas-gifts',
    ...overrides,
  }
}

describe('buildMerchantFeed', () => {
  it('describes a product with Google attributes', () => {
    const xml = buildMerchantFeed([product({})], SITE)

    expect(xml).toContain('<g:id>p1</g:id>')
    expect(xml).toContain(`<g:link>${SITE}/product/p-1</g:link>`)
    expect(xml).toContain('<g:image_link>https://example.com/1.webp</g:image_link>')
    expect(xml).toContain('<g:availability>in_stock</g:availability>')
    expect(xml).toContain('<g:price>12.80 USD</g:price>')
    expect(xml).toContain('<g:condition>new</g:condition>')
    expect(xml).toContain('<g:brand>NatsDoll</g:brand>')
    expect(xml).toContain('<g:identifier_exists>no</g:identifier_exists>')
    expect(xml).toContain('<g:product_type>Christmas Gifts</g:product_type>')
    expect(xml).not.toContain('sale_price')
  })

  it('sets Google category to figurines by default and dollhouse accessories for miniatures', () => {
    const xml = buildMerchantFeed([product({}), product({ id: 'p2', categorySlug: 'dollhouse-miniature' })], SITE)

    expect(xml).toContain('<g:id>p1</g:id>')
    expect(xml.match(/<g:google_product_category>5609<\/g:google_product_category>/g)?.length).toBe(1)
    expect(xml.match(/<g:google_product_category>2497<\/g:google_product_category>/g)?.length).toBe(1)
  })

  it('adds sale price when the product is on sale', () => {
    const xml = buildMerchantFeed([product({ price: 20, salePrice: 16 })], SITE)

    expect(xml).toContain('<g:price>20.00 USD</g:price>')
    expect(xml).toContain('<g:sale_price>16.00 USD</g:sale_price>')
  })

  it('marks products without stock as out of stock', () => {
    const xml = buildMerchantFeed([product({ stock: 0 })], SITE)

    expect(xml).toContain('<g:availability>out_of_stock</g:availability>')
  })

  it('lists up to ten additional images', () => {
    const images = Array.from({ length: 13 }, (_, i) => `https://example.com/${i}.webp`)
    const xml = buildMerchantFeed([product({ images })], SITE)

    expect(xml.match(/<g:additional_image_link>/g)?.length).toBe(10)
    expect(xml).not.toContain('<g:additional_image_link>https://example.com/0.webp<')
  })

  it('skips products without images and escapes text', () => {
    const xml = buildMerchantFeed([product({ name: 'Salt & Pepper <3' }), product({ id: 'p2', images: [] })], SITE)

    expect(xml).toContain('<g:title>Salt &amp; Pepper &lt;3</g:title>')
    expect(xml).not.toContain('<g:id>p2</g:id>')
  })

  it('falls back to the name when description is empty', () => {
    const xml = buildMerchantFeed([product({ description: '' })], SITE)

    expect(xml).toContain('<g:description>Product</g:description>')
  })
})
