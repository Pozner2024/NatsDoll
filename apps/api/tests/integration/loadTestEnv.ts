import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// Каталог apps/api — относительно этого файла (tests/integration/), не зависит от cwd:
// vitest запускается из корня репозитория с --root apps/api, поэтому process.cwd() ≠ apps/api.
const API_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

// Загружает и ВАЛИДИРУЕТ окружение для интеграционных тестов.
// Предохранитель: запуск падает, если DATABASE_URL указывает не на тестовую базу
// (имя не оканчивается на `_test`) — чтобы тесты никогда не затёрли dev/prod данные
// через TRUNCATE. Вызывается и в globalSetup, и в каждом воркере (setupFiles).
export function loadTestEnv(): string {
  if (!process.env.DATABASE_URL) {
    // Локально читаем apps/api/.env.test. В CI DATABASE_URL приходит из env job'а —
    // тогда файла может не быть, это нормально.
    try {
      const content = readFileSync(resolve(API_DIR, '.env.test'), 'utf8')
      for (const line of content.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith('#')) continue
        const eq = trimmed.indexOf('=')
        if (eq === -1) continue
        const key = trimmed.slice(0, eq).trim()
        let value = trimmed.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (!(key in process.env)) process.env[key] = value
      }
    } catch {
      // .env.test необязателен, если DATABASE_URL задан в окружении
    }
  }

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      '[integration] DATABASE_URL не задан. Создайте apps/api/.env.test (см. .env.test.example) или задайте переменную в CI.',
    )
  }

  let dbName: string
  try {
    dbName = new URL(url).pathname.replace(/^\//, '')
  } catch {
    throw new Error('[integration] DATABASE_URL не является валидным URL')
  }

  if (!/_test$/.test(dbName)) {
    throw new Error(
      `[integration] ПРЕДОХРАНИТЕЛЬ: отказ запуска — имя базы "${dbName}" не оканчивается на "_test". ` +
        'Это защита dev/prod данных от случайного TRUNCATE.',
    )
  }

  // Секреты для tokens.ts (HMAC/JWT) — детерминированные, как в юнит-setup.
  process.env.JWT_SECRET ??= 'test-jwt-secret'
  process.env.HMAC_SECRET ??= 'test-hmac-secret'

  return url
}
