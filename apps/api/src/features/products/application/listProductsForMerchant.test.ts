import { describe, it, expect, vi } from 'vitest'
import { makeListProductsForMerchant } from './listProductsForMerchant'
import type { MerchantProductItem, ProductRepository } from '../types'
import type { GetActiveSale } from '../../admin/types'

const noSale: GetActiveSale = async () => null

const item: MerchantProductItem = {
  id: 'p1',
  slug: 'aurora-doll',
  name: 'Aurora Doll',
  description: 'Handmade doll',
  price: 100,
  images: ['https://example.com/1.webp'],
  stock: 1,
  categoryId: 'c1',
  category: 'Art Dolls',
  categorySlug: 'art-dolls',
}

function makeRepo(items: MerchantProductItem[] = [item]): ProductRepository {
  return {
    findMany: vi.fn(),
    listCategories: vi.fn(),
    findBySlug: vi.fn(),
    findAllForSitemap: vi.fn(),
    findAllForPinterest: vi.fn(),
    findAllForMerchant: vi.fn().mockResolvedValue(items),
  }
}

describe('listProductsForMerchant', () => {
  it('returns products unchanged when there is no sale', async () => {
    const listProductsForMerchant = makeListProductsForMerchant(makeRepo(), noSale)

    expect(await listProductsForMerchant()).toEqual([item])
  })

  it('adds sale price only to products covered by the active sale', async () => {
    const other = { ...item, id: 'p2', categoryId: 'c2' }
    const categorySale: GetActiveSale = async () => ({ discount: 20, scope: 'CATEGORIES', categoryIds: ['c1'], productIds: [] })
    const listProductsForMerchant = makeListProductsForMerchant(makeRepo([item, other]), categorySale)

    expect(await listProductsForMerchant()).toEqual([{ ...item, salePrice: 80 }, other])
  })
})
