import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '../../../shared/lib/zValidator'
import type { ProductListParams, ProductListResponse, CategoryListItem, GetProduct } from '../types'

type ListProducts = (params: ProductListParams) => Promise<ProductListResponse>
type ListCategories = () => Promise<CategoryListItem[]>

const productListQuerySchema = z.object({
  category: z.string().optional().transform((v) => (v && v.length > 0 ? v : undefined)),
  sort: z.enum(['newest', 'price-asc', 'price-desc']).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

export function makeProductsRouter(
  listProducts: ListProducts,
  listCategories: ListCategories,
  getProduct: GetProduct,
) {
  const router = new Hono()

  router.get('/products', zValidator('query', productListQuerySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await listProducts(params)
    return c.json(result)
  })

  router.get('/products/:slug', async (c) => {
    const slug = c.req.param('slug')
    const product = await getProduct(slug)
    if (!product) return c.json({ error: 'Not found' }, 404)
    return c.json(product)
  })

  router.get('/categories', async (c) => {
    const result = await listCategories()
    return c.json(result)
  })

  return router
}
