import { describe, it, expect, vi } from 'vitest'
import { makeGetProduct } from './getProduct'
import type { ProductDetail, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

const noSale: GetActiveSale = async () => null
const allSale20: GetActiveSale = async () => ({ discount: 20, scope: 'ALL', categoryIds: [], productIds: [] })

const detail: ProductDetail = {
  id: 'p1',
  slug: 'aurora-doll',
  name: 'Aurora',
  description: 'A beautiful art doll.',
  price: 148,
  images: ['img1.jpg', 'img2.jpg'],
  stock: 1,
  category: 'Art Dolls',
  categorySlug: 'art-dolls',
  messageOptions: [],
}

function makeRepo(result: ProductDetail | null = detail) {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn().mockResolvedValue(result),
  } as unknown as ProductRepository
}

describe('getProduct', () => {
  it('returns product when found', async () => {
    const getProduct = makeGetProduct(makeRepo(), noSale)
    const result = await getProduct('aurora-doll')
    expect(result).toEqual(detail)
  })

  it('returns null when not found', async () => {
    const getProduct = makeGetProduct(makeRepo(null), noSale)
    const result = await getProduct('not-found')
    expect(result).toBeNull()
  })

  it('calls findBySlug with the given slug', async () => {
    const repo = makeRepo()
    const getProduct = makeGetProduct(repo, noSale)
    await getProduct('aurora-doll')
    expect(repo.findBySlug).toHaveBeenCalledWith('aurora-doll')
  })

  it('enriches product with salePrice and salePercent when ALL sale is active', async () => {
    const getProduct = makeGetProduct(makeRepo(), allSale20)
    const result = await getProduct('aurora-doll')
    expect(result?.salePrice).toBe(Math.round(148 * 0.8 * 100) / 100)
    expect(result?.salePercent).toBe(20)
  })

  it('does not enrich product when no sale is active', async () => {
    const getProduct = makeGetProduct(makeRepo(), noSale)
    const result = await getProduct('aurora-doll')
    expect(result?.salePrice).toBeUndefined()
    expect(result?.salePercent).toBeUndefined()
  })

  it('enriches product when PRODUCTS scope includes it', async () => {
    const sale: GetActiveSale = async () => ({
      discount: 15,
      scope: 'PRODUCTS',
      categoryIds: [],
      productIds: ['p1'],
    })
    const getProduct = makeGetProduct(makeRepo(), sale)
    const result = await getProduct('aurora-doll')
    expect(result?.salePrice).toBe(Math.round(148 * 0.85 * 100) / 100)
  })

  it('does not enrich product when PRODUCTS scope does not include it', async () => {
    const sale: GetActiveSale = async () => ({
      discount: 15,
      scope: 'PRODUCTS',
      categoryIds: [],
      productIds: ['other-product'],
    })
    const getProduct = makeGetProduct(makeRepo(), sale)
    const result = await getProduct('aurora-doll')
    expect(result?.salePrice).toBeUndefined()
  })
})
