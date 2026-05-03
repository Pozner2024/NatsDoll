import { describe, it, expect, vi } from 'vitest'
import { makeGetProduct } from './getProduct'
import type { ProductDetail, ProductRepository } from '../types'

const detail: ProductDetail = {
  id: 'p1',
  slug: 'aurora-doll',
  name: 'Aurora',
  description: 'A beautiful art doll.',
  price: 148,
  images: ['img1.jpg', 'img2.jpg'],
  stock: 1,
  category: 'Art Dolls',
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
    const getProduct = makeGetProduct(makeRepo())
    const result = await getProduct('aurora-doll')
    expect(result).toEqual(detail)
  })

  it('returns null when not found', async () => {
    const getProduct = makeGetProduct(makeRepo(null))
    const result = await getProduct('not-found')
    expect(result).toBeNull()
  })

  it('calls findBySlug with the given slug', async () => {
    const repo = makeRepo()
    const getProduct = makeGetProduct(repo)
    await getProduct('aurora-doll')
    expect(repo.findBySlug).toHaveBeenCalledWith('aurora-doll')
  })
})
