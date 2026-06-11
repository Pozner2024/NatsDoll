import { loadTestEnv } from './loadTestEnv'

// Выполняется в каждом тест-воркере ДО импорта PrismaClient: валидирует тестовый
// DATABASE_URL (предохранитель) и проставляет секреты для tokens.ts.
loadTestEnv()
