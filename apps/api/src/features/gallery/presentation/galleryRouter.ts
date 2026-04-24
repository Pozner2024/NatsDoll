import { Hono } from 'hono'
import type { HomeGallery } from '../types'

type GetHomeGallery = () => Promise<HomeGallery>

// GET /gallery/home — возвращает фронту превью и пул товаров для главной страницы
export function makeGalleryRouter(getHomeGallery: GetHomeGallery) {
  const router = new Hono()

  router.get('/home', async (c) => {
    const data = await getHomeGallery()
    return c.json(data)
  })

  return router
}
// Полная цепочка обработки одного HTTP-запроса от фронта до базы данных и 
  // обратно. То есть что происходит, когда Vue-компонент на главной странице
  // запрашивает данные галереи — шаг за шагом через все слои бэкенда.

//   GET /gallery/home  (фронт)
//     ↓
//   galleryRouter      ← этот файл
//     ↓
//   getHomeGallery()   (use-case)
//     ↓
//   repo.getHomePreview() + repo.getHomePool()  (параллельно)
//     ↓
//   Prisma → PostgreSQL
//     ↓
//   { preview: [...], pool: [...] }  → обратно фронту