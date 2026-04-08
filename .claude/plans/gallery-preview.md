# Plan: Gallery Preview (Главная страница — превью галереи)

## Goal

Реализовать полную цепочку загрузки и отображения 11 фотографий Cloudinary в компоненте `GalleryGrid` на главной странице — от новой Prisma-модели до рендера `<img>` с данными из Pinia store.

## Context

- Стек: Vue 3 + Pinia + Vite + TypeScript + SCSS (фронт), Hono + Prisma + PostgreSQL (бэк)
- Архитектура фронта: FSD (pages → widgets → features → entities → shared)
- Архитектура бэка: 3 слоя (Application / Infrastructure / Presentation), composition root в app.ts
- Изображения: Cloudinary (URL-ы хранятся в БД)
- `packages/shared` собирается в `dist` — после изменений нужен `npm run build` в пакете

## Files to Modify

- `apps/api/prisma/schema.prisma` — добавить модель `GalleryPreviewItem`
- `apps/api/src/app.ts` — подключить роут галереи-превью
- `packages/shared/src/schemas/index.ts` — добавить `galleryPreviewItemSchema`
- `packages/shared/src/types/index.ts` — экспортировать тип `GalleryPreviewItem`
- `apps/web/src/widgets/gallery-grid/GalleryGrid.vue` — рендерить `<img>` из store

## Files to Create

- `apps/api/src/features/gallery-preview/infrastructure/galleryPreviewRepository.ts`
- `apps/api/src/features/gallery-preview/application/getGalleryPreview.ts`
- `apps/api/src/features/gallery-preview/presentation/galleryPreviewRoutes.ts`
- `apps/web/src/widgets/gallery-grid/galleryPreviewApi.ts`
- `apps/web/src/widgets/gallery-grid/store.ts`

## Steps

### Step 1: Prisma — модель GalleryPreviewItem [ВЫСОКИЙ РИСК — миграция]

Файл: `apps/api/prisma/schema.prisma`

Добавить модель:

```prisma
model GalleryPreviewItem {
  id        String   @id @default(cuid())
  position  Int      @unique
  imageUrl  String
  isActive  Boolean  @default(true)
  updatedAt DateTime @updatedAt
}
```

После — выполнить: `cd apps/api && npx prisma migrate dev --name add_gallery_preview`

### Step 2: Shared — Zod-схема и тип

Файл: `packages/shared/src/schemas/index.ts`

```ts
import { z } from 'zod'

export const galleryPreviewItemSchema = z.object({
  id: z.string(),
  position: z.number().int().min(1).max(11),
  imageUrl: z.string().url(),
})
```

Файл: `packages/shared/src/types/index.ts`

```ts
import { z } from 'zod'
import { galleryPreviewItemSchema } from '../schemas'

export type GalleryPreviewItem = z.infer<typeof galleryPreviewItemSchema>
```

После — выполнить: `cd packages/shared && npm run build`

### Step 3: Backend Infrastructure — репозиторий

Файл: `apps/api/src/features/gallery-preview/infrastructure/galleryPreviewRepository.ts`

```ts
import type { PrismaClient } from '@prisma/client'

export function createGalleryPreviewRepository(prisma: PrismaClient) {
  return {
    async findAllActive() {
      return prisma.galleryPreviewItem.findMany({
        where: { isActive: true },
        orderBy: { position: 'asc' },
        select: { id: true, position: true, imageUrl: true },
      })
    },
  }
}
```

### Step 4: Backend Application — use-case

Файл: `apps/api/src/features/gallery-preview/application/getGalleryPreview.ts`

```ts
import type { createGalleryPreviewRepository } from '../infrastructure/galleryPreviewRepository'

type Repo = ReturnType<typeof createGalleryPreviewRepository>

export async function getGalleryPreview(repo: Repo) {
  return repo.findAllActive()
}
```

### Step 5: Backend Presentation — Hono-роут

Файл: `apps/api/src/features/gallery-preview/presentation/galleryPreviewRoutes.ts`

```ts
import { Hono } from 'hono'
import type { createGalleryPreviewRepository } from '../infrastructure/galleryPreviewRepository'
import { getGalleryPreview } from '../application/getGalleryPreview'

type Repo = ReturnType<typeof createGalleryPreviewRepository>

export function createGalleryPreviewRoutes(repo: Repo) {
  const app = new Hono()

  app.get('/', async (c) => {
    const items = await getGalleryPreview(repo)
    return c.json({ items })
  })

  return app
}
```

### Step 6: Backend — подключить роут в app.ts

Файл: `apps/api/src/app.ts`

Добавить создание репозитория и монтирование роута на `/api/gallery-preview`.

### Step 7: Frontend — galleryPreviewApi.ts

Файл: `apps/web/src/widgets/gallery-grid/galleryPreviewApi.ts`

```ts
import { z } from 'zod'
import { galleryPreviewItemSchema } from '@natsdoll/shared'
import type { GalleryPreviewItem } from '@natsdoll/shared'

const responseSchema = z.object({
  items: z.array(galleryPreviewItemSchema),
})

export async function fetchGalleryPreview(): Promise<GalleryPreviewItem[]> {
  const res = await fetch(`${import.meta.env.VITE_API_URL}/api/gallery-preview`)
  if (!res.ok) throw new Error('Failed to fetch gallery preview')
  const data: unknown = await res.json()
  return responseSchema.parse(data).items
}
```

### Step 8: Frontend — Pinia store

Файл: `apps/web/src/widgets/gallery-grid/store.ts`

```ts
import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { GalleryPreviewItem } from '@natsdoll/shared'
import { fetchGalleryPreview } from './galleryPreviewApi'

export const useGalleryPreviewStore = defineStore('galleryPreview', () => {
  const items = ref<GalleryPreviewItem[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function loadPreview() {
    if (items.value.length > 0) return
    isLoading.value = true
    error.value = null
    try {
      items.value = await fetchGalleryPreview()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      isLoading.value = false
    }
  }

  function itemByPosition(position: number) {
    return items.value.find((item) => item.position === position)
  }

  return { items, isLoading, error, loadPreview, itemByPosition }
})
```

### Step 9: Frontend — обновить GalleryGrid.vue

Файл: `apps/web/src/widgets/gallery-grid/GalleryGrid.vue`

- Подключить store, вызвать `loadPreview()` в `onMounted`
- Заменить пустые `<div>` на `<div>` с вложенным `<img v-if="...">`
- Добавить стиль для `&__img { width: 100%; height: 100%; object-fit: cover; display: block; }`

## Risks

- Prisma миграция необратима — проверить схему перед выполнением
- После изменений в `packages/shared` обязательно `npm run build`
- Seed не нужен пока (фото ещё не загружены в Cloudinary)
