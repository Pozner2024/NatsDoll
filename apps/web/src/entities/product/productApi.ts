import { z } from 'zod'
import { apiFetch } from '@/shared'
import type { Product, ProductListResponse, ProductListParams, ProductDetail } from './types'

const ProductSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  price: z.number(),
  image: z.string().nullable(),
  stock: z.number().int().min(0),
}) satisfies z.ZodType<Product>

const ProductListResponseSchema = z.object({
  items: z.array(ProductSchema),
  total: z.number().int().min(0),
  page: z.number().int().min(1),
  totalPages: z.number().int().min(0),
}) satisfies z.ZodType<ProductListResponse>

const ProductDetailSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  price: z.number(),
  images: z.array(z.string()),
  stock: z.number().int().min(0),
  category: z.string(),
}) satisfies z.ZodType<ProductDetail>

export async function fetchProduct(slug: string): Promise<ProductDetail | null> {
  const res = await apiFetch(`/products/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return ProductDetailSchema.parse(data)
}

export async function fetchProducts(params: ProductListParams): Promise<ProductListResponse> {
  const search = new URLSearchParams()
  if (params.category) search.set('category', params.category)
  search.set('sort', params.sort)
  search.set('page', String(params.page))
  search.set('limit', String(params.limit))

  const res = await apiFetch(`/products?${search.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data: unknown = await res.json()
  return ProductListResponseSchema.parse(data)
}
