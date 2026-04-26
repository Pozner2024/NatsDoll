/**
 * Скрипт первичного наполнения базы данных (Database Seeding).** Позволяет за одну команду развернуть готовую к    
 * работе структуру магазина: создает базовое дерево категорий (Art Dolls, Gifts и др.) и инициализирует сетку главной   
 * галереи изображениями из облачного хранилища. Использование метода **upsert** гарантирует безопасность данных при     
 * повторных запусках, предотвращая появление дубликатов»
 */

import { PrismaClient, GallerySection } from '@prisma/client' 

const prisma = new PrismaClient()

const categories = [
  { name: 'Art Dolls', slug: 'art-dolls' },
  { name: 'Birthday Gifts', slug: 'birthday-gifts' },
  { name: 'Christmas Gifts', slug: 'christmas-gifts' },
  { name: 'Valentines Day Gifts', slug: 'valentines-day-gifts' },
  { name: 'Halloween Gifts', slug: 'halloween-gifts' },
  { name: 'Graduation Gifts', slug: 'graduation-gifts' },
  { name: 'Cake Toppers', slug: 'cake-toppers' },
  { name: 'Dollhouse Miniature', slug: 'dollhouse-miniature' },
  { name: 'Party favors BULK', slug: 'party-favors-bulk' },
]

const BASE_URL =
  process.env.YANDEX_STORAGE_URL ??
  `${process.env.YANDEX_S3_ENDPOINT}/${process.env.YANDEX_S3_BUCKET}`

const galleryItems = [
  ...Array.from({ length: 9 }, (_, i) => ({
    gallery: GallerySection.HOME_PREVIEW,
    position: i + 1,
    imageUrl: `${BASE_URL}/gallery1/p${i + 1}.webp`,
  })),
  ...Array.from({ length: 9 }, (_, i) => ({
    gallery: GallerySection.HOME_POOL,
    position: i + 1,
    imageUrl: `${BASE_URL}/gallery2/p${i + 1}.webp`,
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_1,
    position: i + 1,
    imageUrl: `${BASE_URL}/collection%20mermaids/m${i + 1}.webp`,
  })),
]

async function main() {
  console.log('Seeding categories...')

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {},
      create: category,
    })
  }

  console.log(`Seeded ${categories.length} categories.`)

  console.log('Seeding gallery...')

  for (const item of galleryItems) {
    await prisma.galleryItem.upsert({
      where: { gallery_position: { gallery: item.gallery, position: item.position } },
      update: { imageUrl: item.imageUrl },
      create: item,
    })
  }

  console.log(`Seeded ${galleryItems.length} gallery items.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
