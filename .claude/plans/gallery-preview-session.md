# Gallery Preview — сессия 2026-04-05

## Что сделано

### GalleryGrid виджет (`apps/web/src/widgets/gallery-grid/`)
- Создан `GalleryGrid.vue` — CSS Grid 9×15, высота `calc(100dvh - var(--header-height))`
- 11 объединённых ячеек через `grid-template-areas`
- Создан `index.ts`
- Подключён в `HomePage.vue` под HeroSlider

### AppHeader
- Изменён `position: sticky` с `top: 0`

### Prisma schema
- В `apps/api/prisma/schema.prisma` добавлена модель `GalleryPreviewItem`
- **Миграция НЕ выполнена** — не было `.env` файла с `DATABASE_URL`

## Что осталось сделать (по плану `.claude/plans/gallery-preview.md`)

1. ⬜ **Создать `apps/api/.env`** с `DATABASE_URL` (нужен PostgreSQL)
2. ⬜ **Выполнить миграцию**: `cd apps/api && npx prisma migrate dev --name add_gallery_preview`
3. ⬜ **Shared пакет** (`packages/shared/src/schemas/index.ts` и `types/index.ts`) — добавить `galleryPreviewItemSchema` и `GalleryPreviewItem`, затем `npm run build`
4. ⬜ **Бэкенд** — создать 3 файла:
   - `apps/api/src/features/gallery-preview/infrastructure/galleryPreviewRepository.ts`
   - `apps/api/src/features/gallery-preview/application/getGalleryPreview.ts`
   - `apps/api/src/features/gallery-preview/presentation/galleryPreviewRoutes.ts`
5. ⬜ **Подключить роут** в `apps/api/src/app.ts`
6. ⬜ **Фронтенд** — создать 2 файла:
   - `apps/web/src/widgets/gallery-grid/galleryPreviewApi.ts`
   - `apps/web/src/widgets/gallery-grid/store.ts`
7. ⬜ **Обновить `GalleryGrid.vue`** — подключить store, рендерить `<img>` с `object-fit: cover`

## Первый шаг завтра

Создать `apps/api/.env` с рабочим `DATABASE_URL` и выполнить миграцию.
