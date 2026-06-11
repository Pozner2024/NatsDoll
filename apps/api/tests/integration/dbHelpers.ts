import { PrismaClient } from '@prisma/client'

// Клиент строится с ЯВНЫМ url из валидированного окружения, минуя singleton из
// shared/infrastructure — так интеграционные тесты физически не могут подключиться
// к dev/prod базе даже при кривом env.
export function makeTestPrisma(): PrismaClient {
  return new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  })
}

// Полный список таблиц (имена моделей Prisma = имена таблиц, @@map нет).
const TABLES = [
  'OrderItem',
  'Order',
  'CartItem',
  'Cart',
  'RefreshToken',
  'EmailVerification',
  'PasswordReset',
  'Favorite',
  'Address',
  'Review',
  'Message',
  'Product',
  'Category',
  'Sale',
  'NewsletterSubscriber',
  'ContactMessage',
  'GalleryItem',
  'User',
]

// TRUNCATE ... CASCADE намеренно обходит onDelete: Restrict — это допустимо ТОЛЬКО
// для очистки тестовой БД между тестами, никогда в прод-коде.
export async function truncateAll(prisma: PrismaClient): Promise<void> {
  const list = TABLES.map((t) => `"${t}"`).join(', ')
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`)
}
