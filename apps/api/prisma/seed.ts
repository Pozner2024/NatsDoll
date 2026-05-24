/**
 * Скрипт первичного наполнения базы данных (Database Seeding).** Позволяет за одну команду развернуть готовую к    
 * работе структуру магазина: создает базовое дерево категорий (Art Dolls, Gifts и др.) и инициализирует сетку главной   
 * галереи изображениями из облачного хранилища. Использование метода **upsert** гарантирует безопасность данных при     
 * повторных запусках, предотвращая появление дубликатов»
 */

import { PrismaClient, GallerySection } from '@prisma/client'
import { hash } from '@node-rs/argon2'
import slugify from 'slugify'

const prisma = new PrismaClient()

const categories = [
  { name: 'Art Dolls', slug: 'art-dolls', position: 10 },
  { name: 'Birthday Gifts', slug: 'birthday-gifts', position: 20 },
  { name: 'Christmas Gifts', slug: 'christmas-gifts', position: 30 },
  { name: 'Motivational Gifts', slug: 'motivational-gifts', position: 35 },
  { name: 'Valentines Day Gifts', slug: 'valentines-day-gifts', position: 40 },
  { name: 'Halloween Gifts', slug: 'halloween-gifts', position: 50 },
  { name: 'Graduation Gifts', slug: 'graduation-gifts', position: 60 },
  { name: 'Cake Toppers', slug: 'cake-toppers', position: 70 },
  { name: 'Dollhouse Miniature', slug: 'dollhouse-miniature', position: 80 },
  { name: 'Party favors BULK', slug: 'party-favors-bulk', position: 90 },
]

const messageOptionsByCategory: Record<string, string[]> = {
  'birthday-gifts': ['Happy Birthday', 'Many happy returns', 'With love'],
  'christmas-gifts': ['Merry Christmas', 'Happy Holidays', 'Season\'s Greetings'],
  'valentines-day-gifts': ['Be my Valentine', 'With all my love', 'You are my heart'],
  'graduation-gifts': ['Congrats, Graduate!', 'Class of 2026', 'Proud of you'],
  'cake-toppers': ['Happy Birthday', 'Congrats', 'With love'],
}

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
    imageUrl: `${BASE_URL}/mermaids/m${i + 1}.webp`,
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_2,
    position: i + 1,
    imageUrl: `${BASE_URL}/sushi/s${i + 1}.webp`,
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_3,
    position: i + 1,
    imageUrl: `${BASE_URL}/dolls/d${i + 1}.webp`,
  })),
  ...Array.from({ length: 7 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_4,
    position: i + 1,
    imageUrl: `${BASE_URL}/berries/b${i + 1}.webp`,
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_5,
    position: i + 1,
    imageUrl: `${BASE_URL}/food/f${i + 1}.webp`,
  })),
  ...Array.from({ length: 14 }, (_, i) => ({
    gallery: GallerySection.COLLECTION_6,
    position: i + 1,
    imageUrl: `${BASE_URL}/halloween/h${i + 1}.webp`,
  })),
]

const sampleProducts = [
  { name: 'Sleeping bunny figurine', categorySlug: 'art-dolls', price: 24.0, stock: 5, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Bunny'] },
  { name: 'Forest fox magnet', categorySlug: 'birthday-gifts', price: 12.5, stock: 0, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Fox'] },
  { name: 'Mini cake topper — heart', categorySlug: 'cake-toppers', price: 8.0, stock: 12, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Heart'] },
  { name: 'Halloween pumpkin earrings', categorySlug: 'halloween-gifts', price: 18.0, stock: 3, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Pumpkin'] },
  { name: 'Christmas tree miniature', categorySlug: 'christmas-gifts', price: 30.0, stock: 2, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Tree'] },
  { name: 'Valentines bear with heart', categorySlug: 'valentines-day-gifts', price: 22.0, stock: 7, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Bear'] },
  { name: 'Graduation cap badge', categorySlug: 'graduation-gifts', price: 15.0, stock: 4, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Cap'] },
  { name: 'Tiny dollhouse teapot', categorySlug: 'dollhouse-miniature', price: 9.5, stock: 8, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Teapot'] },
  { name: 'Party favor — unicorn pack of 10', categorySlug: 'party-favors-bulk', price: 45.0, stock: 1, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Unicorns'] },
  { name: 'Strawberry charm', categorySlug: 'art-dolls', price: 6.0, stock: 20, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Strawberry'] },
  { name: 'Sushi set magnets', categorySlug: 'cake-toppers', price: 14.0, stock: 0, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Sushi'] },
  { name: 'Mermaid figurine', categorySlug: 'art-dolls', price: 32.0, stock: 6, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Mermaid'] },
  { name: 'Cute hedgehog brooch', categorySlug: 'birthday-gifts', price: 11.0, stock: 9, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Hedgehog'] },
  { name: 'Mini food platter', categorySlug: 'dollhouse-miniature', price: 16.5, stock: 5, images: ['https://placehold.co/400x400/f5e8d6/8a6f4a?text=Platter'] },
]

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? 'Admin'

  if (!email || !password) {
    console.log('Skipping admin seed: ADMIN_EMAIL or ADMIN_PASSWORD is not set.')
    return
  }

  const passwordHash = await hash(password)
  await prisma.user.upsert({
    where: { email },
    update: { role: 'ADMIN', emailVerified: true },
    create: { email, name, passwordHash, role: 'ADMIN', emailVerified: true },
  })
  console.log(`Seeded admin user: ${email}`)
}

async function main() {
  console.log('Seeding admin...')
  await seedAdmin()

  console.log('Seeding categories...')

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, position: category.position },
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

  console.log('Seeding products...')

  const categoriesBySlug = new Map(
    (await prisma.category.findMany()).map((c) => [c.slug, c.id]),
  )

  for (const p of sampleProducts) {
    const categoryId = categoriesBySlug.get(p.categorySlug)
    if (!categoryId) {
      console.warn(`Skipping ${p.name}: category ${p.categorySlug} not found`)
      continue
    }
    const baseSlug = slugify(p.name, { lower: true, strict: true })
    const messageOptions = messageOptionsByCategory[p.categorySlug] ?? []
    await prisma.product.upsert({
      where: { slug: baseSlug },
      update: {
        name: p.name,
        price: p.price,
        stock: p.stock,
        images: p.images,
        messageOptions,
        isPublished: true,
        categoryId,
      },
      create: {
        name: p.name,
        slug: baseSlug,
        description: `Handmade polymer clay item: ${p.name}.`,
        price: p.price,
        stock: p.stock,
        images: p.images,
        messageOptions,
        isPublished: true,
        categoryId,
      },
    })
  }

  console.log(`Seeded ${sampleProducts.length} products.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
