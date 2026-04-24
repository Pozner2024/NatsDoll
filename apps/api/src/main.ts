// Этот файл отвечает за запуск сервера на нужном порту, настройку периодической 
// «уборки» базы данных от устаревших токенов и механизм **Graceful Shutdown** — безопасное завершение работы, которое 
// гарантирует, что все соединения с базой данных будут корректно закрыты при остановке сервера

// Короткое саммари для погружения в бэкенд:
// ### 1. **Слои:**
//   **Application:** Бизнес-логика (use-cases), где один файл отвечает за одну операцию (например, `login.ts`).
//   **Infrastructure:** Работа с БД через репозитории Prisma.
//   **Presentation:** HTTP-маршруты и обработчики Hono.

// ### 2. Модель данных (База данных)
//  **`apps/api/prisma/schema.prisma`**. Описывает все сущности и связи.

// ### 3. **`apps/api/src/main.ts`**: Точка входа, где запускается сервер Hono
// и настраиваются системные процессы, такие как очистка устаревших токенов.
// **`apps/api/src/app.ts`**: Так называемый **Composition Root**. Это 
// единственный файл, который импортирует все слои (Application и
// Infrastructure) и связывает их в маршруты. Здесь же
// настраиваются CORS и обработка ошибок.

// ### 4. Разбор конкретной фичи (на примере Auth)  
// **`apps/api/src/features/auth/`**:
// **Infrastructure:** `authRepository.ts` — прямые запросы к Prisma
// **Application:** файлы вроде `login.ts` или `register.ts` — здесь
// находится чистая логика (хеширование паролей, выдача токенов)
// **Presentation:** `authRoutes.ts` — определение эндпоинтов,
// валидация входящих данных через **Zod** и применение Rate Limiting.

// ### 5. Общие инструменты (Shared)
// **`apps/api/src/shared/`**
// * Обработка ошибок базы данных (`handlePrismaError.ts`)
// *Middleware для проверки авторизации (`requireAuth.ts`) и ограничения
// частоты запросов (`rateLimit.ts`)
// *Утилиты для работы с JWT и хешированием токенов (`tokens.ts`)
// Точка входа бэкенд-приложения.** 


import { serve } from '@hono/node-server'
import { createApp } from './app'
import { prisma, cleanupExpiredAuthRecords } from './shared/infrastructure'

if (process.env.NODE_ENV === 'production' && !process.env.FRONTEND_URL) {
  throw new Error('FRONTEND_URL env variable is required in production')
}

const SHUTDOWN_TIMEOUT_MS = 10_000
const CLEANUP_INTERVAL_MS = 24 * 60 * 60_000

const port = Number(process.env.PORT || 3000)
const app = createApp()

const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`Server running on port ${port}`)
})

void cleanupExpiredAuthRecords(prisma)
const cleanupTimer = setInterval(() => void cleanupExpiredAuthRecords(prisma), CLEANUP_INTERVAL_MS)
cleanupTimer.unref()

let shuttingDown = false

async function shutdown(signal: string) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`Received ${signal}, shutting down gracefully...`)

  const forceExit = setTimeout(() => {
    console.error('Graceful shutdown timed out, forcing exit')
    process.exit(1)
  }, SHUTDOWN_TIMEOUT_MS)
  forceExit.unref()

  await new Promise<void>((resolve) => server.close(() => resolve()))
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))

process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err)
  await prisma.$disconnect()
  process.exit(1)
})

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason)
  await prisma.$disconnect()
  process.exit(1)
})
