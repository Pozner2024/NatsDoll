import { Hono } from 'hono'
import { z } from 'zod/v3'
import { zValidator } from '@hono/zod-validator'
import { requireAdmin } from '../../../shared/middleware'
import type {
  GetDashboard, MarkAllMessagesRead,
  ListAdminProducts, CreateProduct, UpdateProduct, DeleteProduct, TogglePublish,
  ListCategoriesWithCount, CreateCategory, UpdateCategory, DeleteCategory,
  GetAdminProduct,
  ListConversations, GetConversation, ReplyToUser, MarkConversationRead,
  ListAdminOrders, GetAdminOrder, UpdateAdminOrder,
} from '../types'

const productListQuerySchema = z.object({
  search: z.string().optional(),
  categoryId: z.string().optional(),
  status: z.enum(['published', 'draft']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
})

const productBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string(),
  price: z.number().positive(),
  stock: z.number().int().min(0),
  categoryId: z.string().min(1),
  images: z.array(z.string()),
  messageOptions: z.array(z.string()).max(10),
  isPublished: z.boolean(),
})

const categoryBodySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
})

const orderListQuerySchema = z.object({
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

const orderUpdateBodySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED']),
  trackingNumber: z.string().nullable().optional(),
  adminNote: z.string().nullable().optional(),
})

const replyBodySchema = z.object({
  userId: z.string().min(1),
  text: z.string().min(1).max(2000),
  orderId: z.string().optional(),
})

export function makeAdminRouter(
  getDashboard: GetDashboard,
  markAllMessagesRead: MarkAllMessagesRead,
  listAdminProducts: ListAdminProducts,
  createProduct: CreateProduct,
  updateProduct: UpdateProduct,
  deleteProduct: DeleteProduct,
  togglePublish: TogglePublish,
  listCategoriesWithCount: ListCategoriesWithCount,
  createCategory: CreateCategory,
  updateCategory: UpdateCategory,
  deleteCategory: DeleteCategory,
  getAdminProduct: GetAdminProduct,
  listConversations: ListConversations,
  getConversation: GetConversation,
  replyToUser: ReplyToUser,
  markConversationRead: MarkConversationRead,
  listAdminOrders: ListAdminOrders,
  getAdminOrder: GetAdminOrder,
  updateAdminOrder: UpdateAdminOrder,
) {
  const router = new Hono()

  router.use('*', requireAdmin)

  router.get('/dashboard', async (c) => {
    const data = await getDashboard()
    return c.json(data)
  })

  router.patch('/messages/mark-all-read', async (c) => {
    await markAllMessagesRead()
    return c.json({ ok: true })
  })

  router.get('/messages/conversations', async (c) => {
    const data = await listConversations()
    return c.json(data)
  })

  router.get('/messages/conversations/:userId', async (c) => {
    const userId = c.req.param('userId')
    const data = await getConversation(userId)
    if (!data) return c.json({ error: 'Not found' }, 404)
    return c.json(data)
  })

  router.post('/messages/reply', zValidator('json', replyBodySchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Validation failed' }, 422)
  }), async (c) => {
    const { userId, text, orderId } = c.req.valid('json')
    await replyToUser({ userId, text, orderId })
    return c.json({ ok: true }, 201)
  })

  router.patch('/messages/conversations/:userId/mark-read', async (c) => {
    const userId = c.req.param('userId')
    await markConversationRead(userId)
    return c.json({ ok: true })
  })

  router.get('/products', zValidator('query', productListQuerySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await listAdminProducts(params)
    return c.json(result)
  })

  router.post('/products', zValidator('json', productBodySchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Validation failed' }, 422)
  }), async (c) => {
    const input = c.req.valid('json')
    const result = await createProduct(input)
    return c.json(result, 201)
  })

  router.put('/products/:id', zValidator('json', productBodySchema), async (c) => {
    const id = c.req.param('id')
    const input = c.req.valid('json')
    await updateProduct(id, input)
    return c.json({ ok: true })
  })

  router.delete('/products/:id', async (c) => {
    const id = c.req.param('id')
    await deleteProduct(id)
    return c.json({ ok: true })
  })

  router.patch('/products/:id/toggle-publish', async (c) => {
    const id = c.req.param('id')
    const result = await togglePublish(id)
    return c.json(result)
  })

  router.get('/products/:id', async (c) => {
    const id = c.req.param('id')
    const product = await getAdminProduct(id)
    if (!product) return c.json({ error: 'Not found' }, 404)
    return c.json(product)
  })

  router.get('/categories', async (c) => {
    const result = await listCategoriesWithCount()
    return c.json(result)
  })

  router.post('/categories', zValidator('json', categoryBodySchema), async (c) => {
    const { name, slug } = c.req.valid('json')
    const result = await createCategory(name, slug)
    return c.json(result, 201)
  })

  router.put('/categories/:id', zValidator('json', categoryBodySchema), async (c) => {
    const id = c.req.param('id')
    const { name, slug } = c.req.valid('json')
    await updateCategory(id, name, slug)
    return c.json({ ok: true })
  })

  router.delete('/categories/:id', async (c) => {
    const id = c.req.param('id')
    await deleteCategory(id)
    return c.json({ ok: true })
  })

  router.get('/orders', zValidator('query', orderListQuerySchema), async (c) => {
    const params = c.req.valid('query')
    const result = await listAdminOrders(params)
    return c.json(result)
  })

  router.get('/orders/:id', async (c) => {
    const id = c.req.param('id')
    const order = await getAdminOrder(id)
    if (!order) return c.json({ error: 'Not found' }, 404)
    return c.json(order)
  })

  router.patch('/orders/:id', zValidator('json', orderUpdateBodySchema, (result, c) => {
    if (!result.success) return c.json({ error: 'Validation failed' }, 422)
  }), async (c) => {
    const id = c.req.param('id')
    const { status, trackingNumber, adminNote } = c.req.valid('json')
    await updateAdminOrder(id, {
      status,
      trackingNumber: trackingNumber ?? null,
      adminNote: adminNote ?? null,
    })
    return c.json({ ok: true })
  })

  return router
}
